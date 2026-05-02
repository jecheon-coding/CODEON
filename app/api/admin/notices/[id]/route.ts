import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

async function isAdmin() {
  const session = await getServerSession(authOptions)
  return (session?.user as any)?.role === "admin"
}

// PATCH /api/admin/notices/[id] — 수정
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  const update: Record<string, any> = {}
  if ("date"       in body) update.date       = body.date
  if ("content"    in body) update.content    = body.content
  if ("is_visible" in body) update.is_visible = body.is_visible

  if (Object.keys(update).length === 0)
    return NextResponse.json({ error: "변경할 항목이 없습니다" }, { status: 400 })

  const { data, error } = await supabaseServer
    .from("notices")
    .update(update)
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/admin/notices/[id] — 삭제
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const { error } = await supabaseServer.from("notices").delete().eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
