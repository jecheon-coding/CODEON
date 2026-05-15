import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

export const dynamic = "force-dynamic"

// POST /api/submissions
// 제출 결과 저장 (service role → RLS 영향 없음)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as any)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { problem_id, code, output, result, is_correct } = body

  if (!problem_id) return NextResponse.json({ error: "problem_id required" }, { status: 400 })

  const { error } = await supabaseServer
    .from("submissions")
    .insert({ user_id: userId, problem_id, code, output, result, is_correct })

  if (error) {
    console.error("[submissions] 저장 실패:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
