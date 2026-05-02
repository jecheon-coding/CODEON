import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

export type WrongNoteItem = {
  problemId:    string
  problemTitle: string
  category:     string | null
  topic:        string | null
  difficulty:   string | null
  attemptCount: number
  lastAttemptAt: string
  solvedAt:     string | null
}

export type WrongNoteResponse = {
  needReview:     WrongNoteItem[]
  completed:      WrongNoteItem[]
  accuracy:       number
  totalCorrect:   number
  totalAttempted: number
}

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as any)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: subs } = await supabaseServer
    .from("submissions")
    .select("problem_id, is_correct, created_at")
    .eq("user_id", userId)

  if (!subs || subs.length === 0) {
    return NextResponse.json<WrongNoteResponse>({
      needReview: [], completed: [], accuracy: 0, totalCorrect: 0, totalAttempted: 0,
    })
  }

  // 문제별 제출 분류
  const correctIds = new Set<string>()
  const wrongIds   = new Set<string>()
  const subsByProblem: Record<string, { isCorrect: boolean; createdAt: string }[]> = {}

  for (const s of subs as { problem_id: string; is_correct: boolean; created_at: string }[]) {
    if (s.is_correct) correctIds.add(s.problem_id)
    else              wrongIds.add(s.problem_id)
    ;(subsByProblem[s.problem_id] ??= []).push({ isCorrect: s.is_correct, createdAt: s.created_at })
  }

  // 정답률: 정답 고유 문제 수 / 도전 고유 문제 수
  const totalAttempted = new Set([...correctIds, ...wrongIds]).size
  const accuracy       = totalAttempted > 0 ? Math.round(correctIds.size / totalAttempted * 100) : 0

  const needReviewIds = [...wrongIds].filter(id => !correctIds.has(id))
  const completedIds  = [...wrongIds].filter(id =>  correctIds.has(id))
  const allIds        = [...new Set([...needReviewIds, ...completedIds])]

  if (allIds.length === 0) {
    return NextResponse.json<WrongNoteResponse>({
      needReview: [], completed: [],
      accuracy, totalCorrect: correctIds.size, totalAttempted,
    })
  }

  // 문제 상세 조회 (supabaseServer → RLS 우회, 실제 제목·카테고리·토픽 반환)
  const { data: problems } = await supabaseServer
    .from("problems")
    .select("id, title, category, topic, difficulty")
    .in("id", allIds)

  const pMap = Object.fromEntries(
    (problems ?? []).map((p: any) => [p.id, p as { title: string; category: string | null; topic: string | null; difficulty: string | null }])
  )

  const toItem = (id: string): WrongNoteItem => {
    const ps   = subsByProblem[id] ?? []
    const prob = pMap[id]
    const sorted     = [...ps].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const lastAttemptAt = sorted[0]?.createdAt ?? ""
    const solvedAt   = ps.filter(s => s.isCorrect)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0]?.createdAt ?? null
    return {
      problemId:    id,
      problemTitle: prob?.title ?? id,
      category:     prob?.category ?? null,
      topic:        prob?.topic    ?? null,
      difficulty:   prob?.difficulty ?? null,
      attemptCount: ps.length,
      lastAttemptAt,
      solvedAt,
    }
  }

  return NextResponse.json<WrongNoteResponse>({
    needReview:     needReviewIds.map(toItem),
    completed:      completedIds.map(toItem),
    accuracy,
    totalCorrect:   correctIds.size,
    totalAttempted,
  })
}
