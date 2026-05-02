import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as any).id as string
  const role   = (session.user as any).role
  if (role !== "parent") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { studentName, phone, relationship } = await req.json()
  if (!studentName?.trim() || !phone?.trim() || !relationship?.trim()) {
    return NextResponse.json({ error: "필수 항목을 입력해주세요." }, { status: 400 })
  }

  // 이미 pending 요청이 있으면 중복 방지
  const { data: existing } = await supabaseServer
    .from("parent_link_requests")
    .select("id")
    .eq("parent_user_id", userId)
    .eq("student_name", studentName.trim())
    .eq("status", "pending")
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: "이미 대기 중인 요청이 있습니다." }, { status: 409 })
  }

  const { error } = await supabaseServer.from("parent_link_requests").insert({
    parent_user_id: userId,
    parent_name:    session.user.name ?? "",
    student_name:   studentName.trim(),
    phone:          phone.trim(),
    relationship:   relationship.trim(),
    status:         "pending",
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
