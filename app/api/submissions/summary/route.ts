import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

export const dynamic = "force-dynamic"

// GET /api/submissions/summary
// 대시보드에 필요한 제출 통계 일괄 반환 (service role → RLS 우회)
export async function GET() {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as any)?.id as string | undefined
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [recentRes, countRes, correctRes, wrongRes] = await Promise.all([
    supabaseServer
      .from("submissions")
      .select("id, problem_id, result, is_correct, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),

    supabaseServer
      .from("submissions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),

    supabaseServer
      .from("submissions")
      .select("problem_id, created_at")
      .eq("user_id", userId)
      .eq("is_correct", true)
      .order("created_at", { ascending: false }),

    supabaseServer
      .from("submissions")
      .select("problem_id, created_at")
      .eq("user_id", userId)
      .eq("is_correct", false)
      .order("created_at", { ascending: false }),
  ])

  return NextResponse.json({
    recent:      recentRes.data   ?? [],
    totalCount:  countRes.count   ?? 0,
    correctSubs: correctRes.data  ?? [],
    wrongSubs:   wrongRes.data    ?? [],
  })
}
