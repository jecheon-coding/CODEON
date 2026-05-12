import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

export const dynamic = "force-dynamic"

// PATCH /api/questions/[id] — 어드민 답변
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const adminId = (session.user as any).id as string
  const { answer } = await req.json()

  if (!answer?.trim()) {
    return NextResponse.json({ error: "답변 내용이 없습니다." }, { status: 400 })
  }

  const { data, error } = await supabaseServer
    .from("problem_questions")
    .update({
      answer:      answer.trim(),
      answered_by: adminId,
      answered_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, nickname, question, answer, answered_at, created_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/questions/[id] — 어드민 삭제
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
