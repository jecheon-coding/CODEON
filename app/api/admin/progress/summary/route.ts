import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

export type ProgressSummaryRow = {
  studentId:   string
  studentName: string
  grade:       string | null
  class:       string | null
  solved:      number
  total:       number
}

// GET /api/admin/progress/summary
export async function GET() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const [
    { data: students },
    { data: problems },
    { data: submissions },
  ] = await Promise.all([
    supabaseServer
      .from("users")
      .select("id, name, grade, class")
      .eq("role", "student")
      .eq("status", "active"),
    supabaseServer
      .from("problems")
      .select("id")
      .eq("status", "published"),
    supabaseServer
      .from("submissions")
      .select("user_id, problem_id, is_correct"),
  ])

  const total = (problems ?? []).length

  // 학생별 정답 처리된 고유 문제 수
  const solvedMap = new Map<string, Set<string>>()
  for (const s of submissions ?? []) {
    if (!s.is_correct) continue
    if (!solvedMap.has(s.user_id)) solvedMap.set(s.user_id, new Set())
    solvedMap.get(s.user_id)!.add(s.problem_id)
  }

  const rows: ProgressSummaryRow[] = (students ?? []).map(st => ({
    studentId:   st.id,
    studentName: st.name,
    grade:       st.grade,
    class:       st.class,
    solved:      solvedMap.get(st.id)?.size ?? 0,
    total,
  }))

  rows.sort((a, b) => b.solved - a.solved || a.studentName.localeCompare(b.studentName))

  return NextResponse.json(rows)
}
