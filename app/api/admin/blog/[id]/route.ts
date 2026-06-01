import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { createSupabaseServer } from "@/lib/supabaseServer"

async function isAdmin() {
  const session = await getServerSession(authOptions)
  return (session?.user as any)?.role === "admin"
}

// PATCH /api/admin/blog/[id] — 글 수정
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  const update: Record<string, any> = {}
  if ("title"        in body) update.title        = body.title
  if ("slug"         in body) update.slug         = body.slug
  if ("content"      in body) update.content      = body.content
  if ("summary"      in body) update.summary      = body.summary
  if ("key_points"   in body) update.key_points   = body.key_points
  if ("tags"         in body) update.tags         = body.tags
  if ("source_urls"  in body) update.source_urls  = body.source_urls
  if ("is_published" in body) update.is_published = body.is_published

  const db = createSupabaseServer()
  const { data, error } = await db
    .from("blog_posts")
    .update(update)
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/admin/blog/[id] — 글 삭제
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const db = createSupabaseServer()
  const { error } = await db.from("blog_posts").delete().eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
