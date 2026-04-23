import { getServerSession } from "next-auth"
import { NextResponse }     from "next/server"
import { authOptions }      from "@/lib/authOptions"
import { supabaseServer }   from "@/lib/supabaseServer"

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as any)?.id as string | undefined
  if (!userId) return NextResponse.json({ error: "인증 필요" }, { status: 401 })

  // 배정된 과제+문제 조회 — assignment_problems는 assignments 아래에 중첩
  const { data: rows, error } = await supabaseServer
    .from("assignment_students")
    .select(`
      assignment_id,
      assignments (
        id, title, due_date,
        assignment_problems (
          problem_id,
          display_order,
          problems ( id, title, difficulty )
        )
      )
    `)
    .eq("student_user_id", userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 해당 학생의 제출 현황 Map<problemId, {isCorrect, submittedAt}>
  const { data: subs } = await supabaseServer
    .from("submissions")
    .select("problem_id, is_correct, created_at")
    .eq("user_id", userId)

  const subMap = new Map<string, { isCorrect: boolean | null; submittedAt: string }>()
  for (const s of subs ?? []) {
    const prev = subMap.get(s.problem_id)
    // 가장 최신 제출 유지 (정답이 있으면 정답 우선)
    if (!prev || s.is_correct === true || (!prev.isCorrect && s.created_at > prev.submittedAt)) {
      subMap.set(s.problem_id, { isCorrect: s.is_correct, submittedAt: s.created_at })
    }
  }

  // 결과 조립
  const result: {
    assignmentId:    string
    assignmentTitle: string
    dueDate:         string | null
    problemId:       string
    problemTitle:    string
    difficulty:      string | null
    displayOrder:    number
    isSubmitted:     boolean
    isCorrect:       boolean | null
    submittedAt:     string | null
  }[] = []

  for (const row of rows ?? []) {
    const assignment = row.assignments as any
    if (!assignment) continue

    for (const ap of (assignment.assignment_problems as any[]) ?? []) {
      const problem = ap.problems
      if (!problem) continue

      const sub = subMap.get(problem.id)
      result.push({
        assignmentId:    assignment.id,
        assignmentTitle: assignment.title,
        dueDate:         assignment.due_date ?? null,
        problemId:       problem.id,
        problemTitle:    problem.title,
        difficulty:      problem.difficulty ?? null,
        displayOrder:    ap.display_order ?? 0,
        isSubmitted:     !!sub,
        isCorrect:       sub?.isCorrect   ?? null,
        submittedAt:     sub?.submittedAt ?? null,
      })
    }
  }

  // 정렬: 미제출(0) → 재제출필요(1) → 제출완료(null,2) → 채점완료(3)
  // 같은 상태 내에서 dueDate 임박순
  function statusOrder(item: typeof result[0]) {
    if (!item.isSubmitted)            return 0
    if (item.isCorrect === false)     return 1
    if (item.isCorrect === null)      return 2
    return 3
  }

  result.sort((a, b) => {
    const diff = statusOrder(a) - statusOrder(b)
    if (diff !== 0) return diff
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
    if (a.dueDate) return -1
    if (b.dueDate) return 1
    return 0
  })

  return NextResponse.json(result)
}
