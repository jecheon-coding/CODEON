import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

export const dynamic = "force-dynamic"

// GET /api/questions/[id] — 질문 단건 + 답변 목록 + 문제 정보
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const { data: question, error } = await supabaseServer
    .from("problem_questions")
    .select("id, problem_id, nickname, question, user_id, created_at")
    .eq("id", id)
    .single()

  if (error || !question) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const [answersResult, problemResult] = await Promise.all([
    supabaseServer
      .from("problem_question_answers")
      .select("id, nickname, content, is_admin, user_id, created_at")
      .eq("question_id", id)
      .order("created_at", { ascending: true }),
    supabaseServer
      .from("problems")
      .select("number, title")
      .eq("id", question.problem_id)
      .single(),
  ])

  return NextResponse.json({
    question: {
      ...question,
      problemNumber: problemResult.data?.number ?? null,
      problemTitle:  problemResult.data?.title  ?? null,
    },
    answers: answersResult.data ?? [],
  })
}

// DELETE /api/questions/[id] — 어드민 전용 질문 삭제
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const { error } = await supabaseServer
    .from("problem_questions")
    .delete()
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
