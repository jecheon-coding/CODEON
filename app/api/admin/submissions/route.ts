import { getServerSession } from "next-auth"
import { NextResponse }     from "next/server"
import { authOptions }      from "@/lib/authOptions"
import { supabaseServer }   from "@/lib/supabaseServer"

async function guardAdmin() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== "admin") return null
  return session
}

export async function GET(req: Request) {
  if (!await guardAdmin()) return NextResponse.json({ error: "권한 없음" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const filter = searchParams.get("filter") ?? "all" // all | unsubmitted

  // 모든 과제-문제-학생 배정 건 조회
  const { data: rows, error } = await supabaseServer
    .from("assignment_students")
    .select(`
      student_user_id,
      assignment_id,
      assignments ( id, title, due_date,
        assignment_problems ( problem_id,
          problems ( id, title )
        )
      ),
      users!assignment_students_student_user_id_fkey ( id, name )
    `)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 제출 현황 조회
  const { data: subs } = await supabaseServer
    .from("submissions")
    .select("problem_id, user_id, is_correct, created_at")

  const subMap = new Map<string, { isCorrect: boolean; submittedAt: string }>()
  for (const s of subs ?? []) {
    const key = `${s.user_id}:${s.problem_id}`
    if (!subMap.has(key) || s.is_correct) {
      subMap.set(key, { isCorrect: s.is_correct, submittedAt: s.created_at })
    }
  }

  const result: unknown[] = []
  for (const row of rows ?? []) {
    const assignment = row.assignments as any
    const student    = (row as any).users
    if (!assignment || !student) continue

    for (const ap of assignment.assignment_problems ?? []) {
      const problem = ap.problems
      if (!problem) continue
      const key = `${row.student_user_id}:${problem.id}`
      const sub = subMap.get(key)

      result.push({
        studentId:       row.student_user_id,
        studentName:     student.name,
        assignmentId:    assignment.id,
        assignmentTitle: assignment.title,
        dueDate:         assignment.due_date,
        problemId:       problem.id,
        problemTitle:    problem.title,
        isSubmitted:     !!sub,
        submittedAt:     sub?.submittedAt ?? null,
        isCorrect:       sub?.isCorrect   ?? null,
      })
    }
  }

  const filtered = filter === "unsubmitted"
    ? result.filter((r: any) => !r.isSubmitted)
    : result

  // 최신 제출 순 → 미제출 후순위
  filtered.sort((a: any, b: any) => {
    if (!a.isSubmitted && b.isSubmitted) return 1
    if (a.isSubmitted && !b.isSubmitted) return -1
    return (b.submittedAt ?? "").localeCompare(a.submittedAt ?? "")
  })

  return NextResponse.json(filtered)
}
