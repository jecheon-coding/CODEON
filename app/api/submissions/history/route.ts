import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

// GET /api/submissions/history?problemId=xxx
// 현재 로그인 학생의 특정 문제 제출 기록 반환 (service role → RLS 영향 없음)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as any)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const problemId = req.nextUrl.searchParams.get("problemId")
  if (!problemId) return NextResponse.json({ error: "problemId required" }, { status: 400 })

  const { data, error } = await supabaseServer
    .from("submissions")
    .select("id, created_at, result, is_correct, code")
    .eq("user_id", userId)
    .eq("problem_id", problemId)
    .order("created_at", { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [])
}
