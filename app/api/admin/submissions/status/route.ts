import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

async function isAdmin() {
  const session = await getServerSession(authOptions)
  return (session?.user as any)?.role === "admin"
}

// GET /api/admin/submissions/status?studentIds=s1,s2
// 선택한 학생들의 문제별 제출 현황 반환
export async function GET(req: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const studentIds = searchParams.get("studentIds")?.split(",").filter(Boolean) ?? []

  if (studentIds.length === 0) return NextResponse.json({})

  const { data } = await supabaseServer
    .from("submissions")
    .select("problem_id, is_correct")
    .in("user_id", studentIds)

  const status: Record<string, { submitted: boolean; isCorrect: boolean }> = {}
  for (const sub of data ?? []) {
    const pid = sub.problem_id
    if (!status[pid]) status[pid] = { submitted: false, isCorrect: false }
    status[pid].submitted = true
    if (sub.is_correct) status[pid].isCorrect = true
  }

  return NextResponse.json(status)
}
