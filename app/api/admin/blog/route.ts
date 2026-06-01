import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { createSupabaseServer } from "@/lib/supabaseServer"

async function isAdmin() {
  const session = await getServerSession(authOptions)
  return (session?.user as any)?.role === "admin"
}

// GET /api/admin/blog — 전체 블로그 글 목록
export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const db = createSupabaseServer()
  const { data, error } = await db
    .from("blog_posts")
    .select("*")
    .order("published_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/admin/blog — 글 직접 등록
export async function POST(req: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { title, slug, content, summary, key_points, tags, source_urls, is_published } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: "제목을 입력하세요" }, { status: 400 })
  if (!slug?.trim())  return NextResponse.json({ error: "슬러그를 입력하세요" }, { status: 400 })

  const db = createSupabaseServer()
  const { data, error } = await db
    .from("blog_posts")
    .insert({
      title:        title.trim(),
      slug:         slug.trim(),
      content:      content ?? "",
      summary:      summary ?? "",
      key_points:   key_points ?? [],
      tags:         tags ?? [],
      source_urls:  source_urls ?? [],
      is_published: is_published ?? false,
      published_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
