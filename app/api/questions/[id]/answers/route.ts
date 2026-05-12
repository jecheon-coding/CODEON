import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

export const dynamic = "force-dynamic"

// POST /api/questions/[id]/answers — 누구나 답변 가능
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: questionId } = await params
  const userId  = (session.user as any).id as string
  const isAdmin = (session.user as any).role === "admin"
  const { content } = await req.json()

  if (!content?.trim()) {
    return NextResponse.json({ error: "내용을 입력해주세요." }, { status: 400 })
  }

  // 닉네임 조회
  const { data: user } = await supabaseServer
    .from("users")
    .select("nickname")
    .eq("id", userId)
    .single()

  if (!user?.nickname) {
    return NextResponse.json({ error: "닉네임을 먼저 설정해주세요." }, { status: 403 })
  }

  const { data, error } = await supabaseServer
    .from("problem_question_answers")
    .insert({
      question_id: questionId,
      user_id:     userId,
      nickname:    user.nickname,
      content:     content.trim(),
      is_admin:    isAdmin,
    })
    .select("id, nickname, content, is_admin, user_id, created_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
