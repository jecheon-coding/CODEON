import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

async function isAdmin() {
  const session = await getServerSession(authOptions)
  return (session?.user as any)?.role === "admin"
}

// GET /api/admin/learning — 전체 챕터 목록 (관리자)
export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { data, error } = await supabaseServer
    .from("learning_chapters")
    .select("*")
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/admin/learning — 챕터 추가
export async function POST(req: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { title, category, content, order_index, is_published, show_hint, show_solution, parent_id } = await req.json()
  if (!title?.trim())
    return NextResponse.json({ error: "제목을 입력하세요" }, { status: 400 })

  const { data, error } = await supabaseServer
    .from("learning_chapters")
    .insert({
      title:         title.trim(),
      category:      category || null,
      content:       content ?? "",
      order_index:   order_index ?? 0,
      is_published:  is_published ?? false,
      show_hint:     show_hint ?? true,
      show_solution: show_solution ?? true,
      parent_id:     parent_id || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
