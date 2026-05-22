import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

export const dynamic = "force-dynamic"

// GET /api/learning/progress — 현재 유저의 완료 챕터 ID 목록
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as any).id as string

  const { data, error } = await supabaseServer
    .from("learning_progress")
    .select("chapter_id, completed_at")
    .eq("user_id", userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/learning/progress — 챕터 완료 표시 (UPSERT)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { chapter_id } = await req.json()
  if (!chapter_id) return NextResponse.json({ error: "chapter_id 필요" }, { status: 400 })

  const userId = (session.user as any).id as string

  const { data, error } = await supabaseServer
    .from("learning_progress")
    .upsert(
      { user_id: userId, chapter_id, completed_at: new Date().toISOString() },
      { onConflict: "user_id,chapter_id" }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// DELETE /api/learning/progress — 완료 취소
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { chapter_id } = await req.json()
  if (!chapter_id) return NextResponse.json({ error: "chapter_id 필요" }, { status: 400 })

  const userId = (session.user as any).id as string

  const { error } = await supabaseServer
    .from("learning_progress")
    .delete()
    .eq("user_id", userId)
    .eq("chapter_id", chapter_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
