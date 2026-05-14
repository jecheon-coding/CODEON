import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

async function isAdmin() {
  const session = await getServerSession(authOptions)
  return (session?.user as any)?.role === "admin"
}

// GET /api/admin/problems/[id] — 정답 제출 목록
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params

  const { data: subs, error } = await supabaseServer
    .from("submissions")
    .select("id, user_id, code, created_at")
    .eq("problem_id", id)
    .eq("is_correct", true)
    .order("created_at", { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!subs || subs.length === 0) return NextResponse.json([])

  const userIds = [...new Set(subs.map(s => s.user_id).filter(Boolean))]
  const { data: users } = await supabaseServer
    .from("users")
    .select("id, name")
    .in("id", userIds)

  const userMap = Object.fromEntries((users ?? []).map(u => [u.id, u.name]))

  return NextResponse.json(subs.map(s => ({
    id:        s.id,
    userName:  userMap[s.user_id] ?? "알 수 없음",
    code:      s.code,
    createdAt: s.created_at,
  })))
}

// PATCH /api/admin/problems/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  const allowed = [
    "title", "category", "difficulty", "topic", "content",
    "input_description", "output_description", "constraints",
    "initial_code", "hint",
    "example_input", "example_output", "image_url", "time_limit_ms",
    "gen_code", "sol_code", "status", "display_order", "comprehension_enabled",
  ]

  const update: Record<string, any> = {}
  for (const key of allowed) {
    if (key in body) update[key] = body[key] ?? null
  }

  if (Object.keys(update).length === 0)
    return NextResponse.json({ error: "변경할 필드가 없습니다." }, { status: 400 })

  const { error } = await supabaseServer.from("problems").update(update).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/problems/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const { error } = await supabaseServer.from("problems").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
