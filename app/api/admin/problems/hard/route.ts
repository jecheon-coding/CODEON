import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

export const dynamic = "force-dynamic"

// GET /api/admin/problems/hard — 정답률 낮은 문제 TOP 10 (최소 제출 5회 이상)
export async function GET() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { data: subs } = await supabaseServer
    .from("submissions")
    .select("problem_id, is_correct")

  if (!subs) return NextResponse.json([])

  // 문제별 제출 수 / 정답 수 집계
  const stats = new Map<string, { total: number; correct: number }>()
  for (const s of subs) {
    const cur = stats.get(s.problem_id) ?? { total: 0, correct: 0 }
    cur.total++
    if (s.is_correct) cur.correct++
    stats.set(s.problem_id, cur)
  }

  // 최소 5회 제출 + 정답률 계산 후 낮은 순 정렬
  const ranked = [...stats.entries()]
    .filter(([, s]) => s.total >= 5)
    .map(([id, s]) => ({ id, total: s.total, correct: s.correct, rate: Math.round(s.correct / s.total * 100) }))
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 10)

  if (ranked.length === 0) return NextResponse.json([])

  // 문제 제목 조회
  const ids = ranked.map(r => r.id)
  const { data: problems } = await supabaseServer
    .from("problems")
    .select("id, title, difficulty, topic")
    .in("id", ids)

  const probMap = new Map((problems ?? []).map(p => [p.id, p]))

  const result = ranked.map(r => ({
    id:         r.id,
    title:      probMap.get(r.id)?.title ?? r.id,
    difficulty: probMap.get(r.id)?.difficulty ?? "",
    topic:      probMap.get(r.id)?.topic ?? null,
    total:      r.total,
    correct:    r.correct,
    rate:       r.rate,
  }))

  return NextResponse.json(result)
}
