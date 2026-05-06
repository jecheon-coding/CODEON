import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

// POST /api/parent/consult  — 상담 신청 제출
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if ((session.user as any).role !== "parent")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { message } = await req.json()
  if (!message?.trim())
    return NextResponse.json({ error: "내용을 입력해주세요." }, { status: 400 })

  const parentId   = (session.user as any).id as string
  const parentName = session.user.name ?? "학부모"

  // 연결된 학생 이름 조회
  const { data: link } = await supabaseServer
    .from("parent_link_requests")
    .select("student_id, users!parent_link_requests_student_id_fkey(name)")
    .eq("parent_id", parentId)
    .eq("status", "approved")
    .limit(1)
    .maybeSingle()

  const studentName = (link?.users as any)?.name ?? null

  const { error } = await supabaseServer.from("consult_requests").insert({
    parent_id:    parentId,
    parent_name:  parentName,
    student_name: studentName,
    message:      message.trim(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
