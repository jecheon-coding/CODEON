import { getServerSession } from "next-auth"
import { NextResponse }     from "next/server"
import { authOptions }      from "@/lib/authOptions"
import { supabaseServer }   from "@/lib/supabaseServer"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user)                          return NextResponse.json({ error: "로그인 필요" },        { status: 401 })
  if ((session.user as any).role !== "parent") return NextResponse.json({ error: "학부모 계정 전용" }, { status: 403 })

  const parentId   = (session.user as any).id   as string
  const parentName = session.user.name           ?? ""

  const { studentName, phone, relationship } = await req.json()

  if (!studentName?.trim()) return NextResponse.json({ error: "학생 이름을 입력해 주세요." }, { status: 400 })
  if (!phone?.trim())       return NextResponse.json({ error: "연락처를 입력해 주세요." },    { status: 400 })

  // 이미 pending 요청이 있는지 확인
  const { data: existing } = await supabaseServer
    .from("parent_link_requests")
    .select("id")
    .eq("parent_user_id", parentId)
    .eq("status", "pending")
    .maybeSingle()

  if (existing) return NextResponse.json({ alreadyPending: true })

  const { error: insertError } = await supabaseServer
    .from("parent_link_requests")
    .insert({
      parent_user_id: parentId,
      parent_name:    parentName,
      student_name:   studentName.trim(),
      phone:          phone.trim(),
      relationship,
      status:         "pending",
    })

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
