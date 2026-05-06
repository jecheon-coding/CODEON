import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

async function isAdmin() {
  const session = await getServerSession(authOptions)
  return (session?.user as any)?.role === "admin"
}

// GET /api/admin/consult  — 전체 상담 목록
export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { data, error } = await supabaseServer
    .from("consult_requests")
    .select("id, parent_name, student_name, message, status, admin_memo, created_at, resolved_at")
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH /api/admin/consult  — 처리완료 / 메모 저장
export async function PATCH(req: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id, status, admin_memo } = await req.json()
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const updates: Record<string, any> = {}
  if (status)      updates.status      = status
  if (status === "resolved") updates.resolved_at = new Date().toISOString()
  if (admin_memo !== undefined) updates.admin_memo = admin_memo

  const { error } = await supabaseServer
    .from("consult_requests")
    .update(updates)
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
