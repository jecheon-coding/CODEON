import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

// POST /api/parent/request-link — 자녀 연결 요청 제출
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as any).id as string
  const role   = (session.user as any).role
  if (role !== "parent") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { studentName, phone, relationship } = await req.json()
  if (!studentName?.trim() || !phone?.trim() || !relationship?.trim())
    return NextResponse.json({ error: "필수 항목을 입력해주세요." }, { status: 400 })

  // 이미 pending 요청이 있으면 중복 방지
  const { data: existing } = await supabaseServer
    .from("parent_link_requests")
    .select("id")
    .eq("parent_user_id", userId)
    .eq("student_name", studentName.trim())
    .eq("status", "pending")
    .maybeSingle()

  if (existing)
    return NextResponse.json({ error: "이미 대기 중인 요청이 있습니다." }, { status: 409 })

  // 부모 계정이 users 테이블에 존재하는지 확인
  const { data: parentUser } = await supabaseServer
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle()

  if (!parentUser)
    return NextResponse.json({ error: "학부모 계정 정보를 찾을 수 없습니다. 관리자에게 문의해 주세요." }, { status: 400 })

  const { error } = await supabaseServer.from("parent_link_requests").insert({
    parent_user_id: userId,
    parent_name:    session.user.name ?? "",
    student_name:   studentName.trim(),
    phone:          phone.trim(),
    relationship:   relationship.trim(),
    status:         "pending",
  })

  if (error) {
    console.error("[request-link] insert 실패:", error.message)
    return NextResponse.json({ error: "요청 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
