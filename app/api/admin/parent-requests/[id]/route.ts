import { getServerSession } from "next-auth"
import { NextResponse }     from "next/server"
import { authOptions }      from "@/lib/authOptions"
import { supabaseServer }   from "@/lib/supabaseServer"

async function guardAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  if ((session.user as any).role !== "admin") return null
  return session
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const session = await guardAdmin()
  if (!session) return NextResponse.json({ error: "권한 없음" }, { status: 403 })

  const adminId = (session.user as any).id as string
  const { action, studentUserId, rejectReason } = await req.json()

  if (action === "approve") {
    if (!studentUserId) return NextResponse.json({ error: "학생을 선택해 주세요." }, { status: 400 })

    const { error: updateErr } = await supabaseServer
      .from("parent_link_requests")
      .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: adminId })
      .eq("id", id)
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    const { data: linkReq } = await supabaseServer
      .from("parent_link_requests")
      .select("parent_user_id, relationship")
      .eq("id", id)
      .single()

    if (linkReq) {
      await supabaseServer
        .from("parent_student_links")
        .upsert({
          parent_user_id:  linkReq.parent_user_id,
          student_user_id: studentUserId,
          relationship:    linkReq.relationship,
        })
    }

    return NextResponse.json({ ok: true })
  }

  if (action === "reject") {
    const { error: updateErr } = await supabaseServer
      .from("parent_link_requests")
      .update({
        status:        "rejected",
        reject_reason: rejectReason ?? null,
        reviewed_at:   new Date().toISOString(),
        reviewed_by:   adminId,
      })
      .eq("id", id)
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "잘못된 action" }, { status: 400 })
}
