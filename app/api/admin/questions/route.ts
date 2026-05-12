import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

export const dynamic = "force-dynamic"

// GET /api/admin/questions — 전체 질문 목록 (어드민 전용, 답변 수 포함)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: questions, error } = await supabaseServer
    .from("problem_questions")
    .select("id, problem_id, nickname, question, created_at")
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!questions || questions.length === 0) return NextResponse.json([])

  // 문제 제목 조회
  const problemIds = [...new Set(questions.map(q => q.problem_id))]
  const { data: problems } = await supabaseServer
    .from("problems")
    .select("id, title, number")
    .in("id", problemIds)

  const problemMap: Record<string, { title: string; number: number | null }> = {}
  for (const p of problems ?? []) {
    problemMap[p.id] = { title: p.title, number: p.number ?? null }
  }

  // 답변 수 집계
  const qIds = questions.map(q => q.id)
  const { data: counts } = await supabaseServer
    .from("problem_question_answers")
    .select("question_id")
    .in("question_id", qIds)

  const countMap: Record<string, number> = {}
  for (const r of counts ?? []) {
    countMap[r.question_id] = (countMap[r.question_id] ?? 0) + 1
  }

  const result = questions.map(q => ({
    ...q,
    problemTitle:  problemMap[q.problem_id]?.title  ?? null,
    problemNumber: problemMap[q.problem_id]?.number ?? null,
    answer_count:  countMap[q.id] ?? 0,
  }))

  return NextResponse.json(result)
}
