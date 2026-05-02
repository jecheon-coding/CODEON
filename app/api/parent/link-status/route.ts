import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

// GET /api/parent/link-status — 가장 최근 연결 요청 상태 조회
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as any).id as string

  const { data } = await supabaseServer
    .from("parent_link_requests")
    .select("id, status, reject_reason, created_at")
    .eq("parent_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ data: data ?? null })
}
