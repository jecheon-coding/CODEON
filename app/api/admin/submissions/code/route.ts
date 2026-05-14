import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

export const dynamic = "force-dynamic"

// GET /api/admin/submissions/code?userId=X&problemId=Y
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const userId    = req.nextUrl.searchParams.get("userId")
  const problemId = req.nextUrl.searchParams.get("problemId")

  if (!userId || !problemId)
    return NextResponse.json({ error: "userId, problemId 필수" }, { status: 400 })

  const { data, error } = await supabaseServer
    .from("submissions")
    .select("id, code, result, is_correct, created_at")
    .eq("user_id",    userId)
    .eq("problem_id", problemId)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(
    (data ?? []).map((s: any) => ({
      id:        s.id,
      code:      s.code ?? "",
      result:    s.result ?? "",
      isCorrect: s.is_correct,
      createdAt: s.created_at,
    }))
  )
}
