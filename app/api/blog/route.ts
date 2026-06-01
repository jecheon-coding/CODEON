import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServer } from "@/lib/supabaseServer"

// Python 파이프라인이 POST로 블로그 글을 전송하는 엔드포인트
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? ""
  if (auth !== `Bearer ${process.env.BLOG_API_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { title, slug, content, summary, key_points, tags, source_urls } = body

  if (!title || !slug || !content) {
    return NextResponse.json({ error: "title, slug, content는 필수입니다." }, { status: 400 })
  }

  const supabase = createSupabaseServer()
  const { data, error } = await supabase
    .from("blog_posts")
    .upsert(
      { title, slug, content, summary, key_points, tags, source_urls, published_at: new Date().toISOString() },
      { onConflict: "slug" }
    )
    .select("id")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}

// 학부모 페이지에서 최신 글 조회
export async function GET() {
  const supabase = createSupabaseServer()
  const { data, error } = await supabase
    .from("blog_posts")
    .select("id, title, slug, summary, key_points, tags, published_at")
    .order("published_at", { ascending: false })
    .limit(3)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
