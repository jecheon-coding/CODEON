import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

export const dynamic = "force-dynamic"

// GET /api/questions?problemId=xxx
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const problemId = searchParams.get("problemId")
  if (!problemId) return NextResponse.json({ error: "problemId required" }, { status: 400 })

  const { data: questions, error } = await supabaseServer
    .from("problem_questions")
    .select("id, nickname, question, created_at")
    .eq("problem_id", problemId)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!questions || questions.length === 0) return NextResponse.json([])

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
    answer_count: countMap[q.id] ?? 0,
  }))

  return NextResponse.json(result)
}

// POST /api/questions
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as any).id as string
  const { problemId, question } = await req.json()

  if (!problemId || !question?.trim()) {
    return NextResponse.json({ error: "필수 항목이 누락되었습니다." }, { status: 400 })
  }

  const { data: user } = await supabaseServer
    .from("users")
    .select("nickname")
    .eq("id", userId)
    .single()

  if (!user?.nickname) {
    return NextResponse.json({ error: "닉네임을 먼저 설정해주세요." }, { status: 403 })
  }

  const { data, error } = await supabaseServer
    .from("problem_questions")
    .insert({
      problem_id: problemId,
      user_id:    userId,
      nickname:   user.nickname,
      question:   question.trim(),
    })
    .select("id, nickname, question, created_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ...data, answer_count: 0 })
}
