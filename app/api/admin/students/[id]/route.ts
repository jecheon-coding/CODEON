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
  const { name, grade, cls, status } = await req.json()
  const update: Record<string, unknown> = {}
  if (name   !== undefined) update.name   = name?.trim()  || null
  if (grade  !== undefined) update.grade  = grade?.trim() || null
  if (cls    !== undefined) update.class  = cls?.trim()   || null
  if (status !== undefined) update.status = status

  const { data, error } = await supabaseServer
    .from("users")
    .update(update)
    .eq("id", id)
    .select("id, name, grade, class, status, login_id")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await guardAdmin()) return NextResponse.json({ error: "권한 없음" }, { status: 403 })

  const { id } = await params
  const { error } = await supabaseServer
    .from("users")
    .update({ status: "inactive" })
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
