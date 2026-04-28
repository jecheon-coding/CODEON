import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

// POST /api/admin/parent-requests/[id] — 승인 또는 거절
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const adminId = (session?.user as any)?.id
  if ((session?.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const { action } = await req.json() as { action: "approve" | "reject" }
  if (action !== "approve" && action !== "reject")
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })

  // 요청 조회
  const { data: req_, error: reqErr } = await supabaseServer
    .from("parent_link_requests")
    .select("id, parent_user_id, student_name, status")
    .eq("id", id)
    .single()

  if (reqErr || !req_)
    return NextResponse.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 })

  if (req_.status !== "pending")
    return NextResponse.json({ error: "이미 처리된 요청입니다." }, { status: 409 })

  if (action === "reject") {
    await supabaseServer
      .from("parent_link_requests")
      .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: adminId })
      .eq("id", id)

    return NextResponse.json({ success: true })
  }

  // ── 승인: 학생 계정 찾기 ────────────────────────────────────────────────
  const { data: students } = await supabaseServer
    .from("users")
    .select("id, name")
    .eq("name", req_.student_name)
    .eq("role", "student")
    .eq("is_active", true)

  if (!students || students.length === 0) {
    return NextResponse.json(
      { error: `"${req_.student_name}" 이름의 학생 계정을 찾을 수 없습니다.` },
      { status: 404 }
    )
  }

  // 이름이 같은 학생이 여러 명이면 첫 번째 사용 (운영 상황상 희귀)
  const studentId = students[0].id

  // 이미 연결됐는지 확인
  const { data: existing } = await supabaseServer
    .from("parent_student_links")
    .select("id")
    .eq("parent_user_id", req_.parent_user_id)
    .eq("student_user_id", studentId)
    .maybeSingle()

  if (!existing) {
    const { error: linkErr } = await supabaseServer
      .from("parent_student_links")
      .insert({
        parent_user_id:  req_.parent_user_id,
        student_user_id: studentId,
        relationship:    "parent",
      })

    if (linkErr)
      return NextResponse.json({ error: linkErr.message }, { status: 500 })
  }

  // 요청 상태 업데이트
  await supabaseServer
    .from("parent_link_requests")
    .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: adminId })
    .eq("id", id)

  return NextResponse.json({ success: true })
}
