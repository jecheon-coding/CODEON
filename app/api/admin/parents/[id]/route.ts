import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"
import { hashPassword } from "@/lib/password"

async function isAdmin() {
  const session = await getServerSession(authOptions)
  return (session?.user as any)?.role === "admin"
}

// PATCH /api/admin/parents/[id] — 비밀번호 재설정 또는 활성화 토글
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  const update: Record<string, any> = {}

  if (body.password) {
    update.password_hash        = await hashPassword(body.password)
    update.must_change_password = true
  }
  if (typeof body.isActive === "boolean") {
    update.is_active = body.isActive
    update.status    = body.isActive ? "active" : "inactive"
  }

  if (Object.keys(update).length === 0)
    return NextResponse.json({ error: "변경할 내용이 없습니다." }, { status: 400 })

  const { error } = await supabaseServer.from("users").update(update).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/parents/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const { error } = await supabaseServer.from("users").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
