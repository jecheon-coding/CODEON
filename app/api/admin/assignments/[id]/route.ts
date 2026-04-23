import { getServerSession } from "next-auth"
import { NextResponse }     from "next/server"
import { authOptions }      from "@/lib/authOptions"
import { supabaseServer }   from "@/lib/supabaseServer"

async function guardAdmin() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== "admin") return null
  return session
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await guardAdmin()) return NextResponse.json({ error: "권한 없음" }, { status: 403 })

  const { id } = await params
  const { title, description, dueDate } = await req.json()
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (title       !== undefined) update.title       = title?.trim()       || null
  if (description !== undefined) update.description = description?.trim() || null
  if (dueDate     !== undefined) update.due_date     = dueDate             || null

  const { error } = await supabaseServer
    .from("assignments")
    .update(update)
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await guardAdmin()) return NextResponse.json({ error: "권한 없음" }, { status: 403 })

  const { id } = await params
  const { error } = await supabaseServer
    .from("assignments")
    .delete()
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
