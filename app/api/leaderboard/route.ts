import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

export const dynamic = "force-dynamic"

const DIFF_SCORE: Record<string, number> = { "하": 10, "중": 25, "상": 50 }
const CAT_MULT: Record<string, number> = {
  "파이썬기초":     1.0,
  "파이썬자격증":   1.5,
  "파이썬실전":     1.5,
  "파이썬알고리즘": 2.0,
  "파이썬도전":     2.0,
  "파이썬대회":     3.0,
}
const accMult = (n: number) => n === 1 ? 1.0 : n === 2 ? 0.8 : 0.6

function maskName(name: string): string {
  if (!name) return "익명"
  if (name.length <= 2) return name[0] + "*"
  return name[0] + "*".repeat(name.length - 2) + name[name.length - 1]
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const myId = (session.user as any).id as string

  // 전체 제출 내역 + 이해 확인 가산점 조회
  const [
    { data: subs, error: subErr },
    { data: problems },
    { data: users },
    { data: bonusRows },
  ] = await Promise.all([
    supabaseServer
      .from("submissions")
      .select("user_id, problem_id, is_correct, created_at")
      .order("created_at", { ascending: true }),
    supabaseServer
      .from("problems")
      .select("id, difficulty, category"),
    supabaseServer
      .from("users")
      .select("id, name")
      .eq("role", "student")
      .eq("status", "active"),
    supabaseServer
      .from("comprehension_checks")
      .select("user_id, bonus_score")
      .eq("skipped", false),
  ])

  if (subErr) return NextResponse.json({ error: subErr.message }, { status: 500 })

  const probMap = new Map((problems ?? []).map(p => [p.id, p]))

  // 유저별 이해 확인 가산점 합산
  const bonusMap = new Map<string, number>()
  for (const row of bonusRows ?? []) {
    bonusMap.set(row.user_id, (bonusMap.get(row.user_id) ?? 0) + Number(row.bonus_score))
  }

  const userMap = new Map((users ?? []).map(u => [u.id, u.name as string]))
  const studentIds = new Set(userMap.keys())

  // (user_id, problem_id) 별 제출 분석
  type SubInfo = { attempts: number; solved: boolean; firstCorrectIdx: number }
  const subGroups = new Map<string, SubInfo>()

  for (const s of subs ?? []) {
    if (!studentIds.has(s.user_id)) continue
    const key = `${s.user_id}::${s.problem_id}`
    const cur = subGroups.get(key) ?? { attempts: 0, solved: false, firstCorrectIdx: 0 }
    cur.attempts++
    if (s.is_correct && !cur.solved) {
      cur.solved = true
      cur.firstCorrectIdx = cur.attempts
    }
    subGroups.set(key, cur)
  }

  // 유저별 점수 합산
  const userScores = new Map<string, { score: number; solvedCount: number }>()

  for (const [key, info] of subGroups) {
    if (!info.solved) continue
    const [userId, problemId] = key.split("::")
    const prob = probMap.get(problemId)
    if (!prob) continue

    const base = DIFF_SCORE[prob.difficulty] ?? 10
    const cat  = CAT_MULT[prob.category] ?? 1.0
    const acc  = accMult(info.firstCorrectIdx)
    const score = Math.round(base * cat * acc * 10) / 10

    const cur = userScores.get(userId) ?? { score: 0, solvedCount: 0 }
    cur.score = Math.round((cur.score + score) * 10) / 10
    cur.solvedCount++
    userScores.set(userId, cur)
  }

  // 이해 확인 가산점 반영
  for (const [userId, bonus] of bonusMap) {
    const cur = userScores.get(userId)
    if (cur) cur.score = Math.round((cur.score + bonus) * 10) / 10
  }

  // 랭킹 정렬
  const ranked = [...userScores.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .map(([ userId, { score, solvedCount }], idx) => ({
      rank:        idx + 1,
      userId,
      maskedName:  maskName(userMap.get(userId) ?? "익명"),
      score,
      solvedCount,
      isMe:        userId === myId,
    }))

  const myEntry = ranked.find(r => r.isMe)
  const myRank  = myEntry?.rank ?? null
  const myScore = myEntry?.score ?? 0

  return NextResponse.json({
    leaderboard: ranked.slice(0, 50),
    myRank,
    myScore,
    total: ranked.length,
  })
}
