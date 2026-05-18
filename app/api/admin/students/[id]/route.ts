import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

async function isAdmin() {
  const session = await getServerSession(authOptions)
  return (session?.user as any)?.role === "admin"
}

// PATCH /api/admin/students/[id] — 학생 정보 수정 또는 계정 활성화
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { id } = await params
  const body = await req.json()

  // 계정 활성화 요청
  if (body.activate === true) {
    const { error } = await supabaseServer.from("users").update({
      is_active: true,
      status:    "active",
    }).eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  const { name, grade, cls } = body
  const { error } = await supabaseServer.from("users").update({
    name:  name?.trim()  || undefined,
    grade: grade?.trim() || null,
    class: cls?.trim()   || null,
  }).eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE /api/admin/students/[id] — 학생 비활성화
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { id } = await params

  const { error } = await supabaseServer.from("users").update({
    is_active: false,
    status:    "inactive",
  }).eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
