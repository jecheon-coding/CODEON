import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

export const dynamic = "force-dynamic"

// DELETE /api/questions/answers/[id] — 본인 또는 어드민
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const userId  = (session.user as any).id as string
  const isAdmin = (session.user as any).role === "admin"

  // 본인 확인 (어드민은 패스)
  if (!isAdmin) {
    const { data } = await supabaseServer
      .from("problem_question_answers")
      .select("user_id")
      .eq("id", id)
      .single()
    if (data?.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  const { error } = await supabaseServer
    .from("problem_question_answers")
    .delete()
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
