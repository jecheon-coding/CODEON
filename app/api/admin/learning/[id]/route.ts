import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

async function isAdmin() {
  const session = await getServerSession(authOptions)
  return (session?.user as any)?.role === "admin"
}

// PATCH /api/admin/learning/[id] — 챕터 수정
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  const update: Record<string, any> = { updated_at: new Date().toISOString() }
  if ("title"         in body) update.title         = body.title
  if ("category"      in body) update.category      = body.category || null
  if ("content"       in body) update.content       = body.content
  if ("order_index"   in body) update.order_index   = body.order_index
  if ("is_published"  in body) update.is_published  = body.is_published
  if ("show_hint"     in body) update.show_hint     = body.show_hint
  if ("show_solution" in body) update.show_solution = body.show_solution
  if ("parent_id"     in body) update.parent_id     = body.parent_id || null

  const { data, error } = await supabaseServer
    .from("learning_chapters")
    .update(update)
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/admin/learning/[id] — 챕터 삭제
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const { error } = await supabaseServer.from("learning_chapters").delete().eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
