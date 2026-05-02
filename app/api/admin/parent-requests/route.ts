import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

// GET /api/admin/parent-requests — 대기 중인 연결 요청 목록
export async function GET() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { data, error } = await supabaseServer
    .from("parent_link_requests")
    .select("id, parent_name, student_name, phone, relationship, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ requests: data ?? [] })
}
