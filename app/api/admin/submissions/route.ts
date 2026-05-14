import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

// GET /api/admin/submissions?filter=all
export async function GET() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  // assignment_students × assignment_problems 의 cross join → 제출 여부 확인
  const [
    { data: asData },   // assignment_students
    { data: apData },   // assignment_problems
    { data: aData },    // assignments
    { data: pData },    // problems (title)
    { data: uData },    // users (student name)
    { data: subData },  // submissions
  ] = await Promise.all([
    supabaseServer.from("assignment_students").select("assignment_id, student_user_id"),
    supabaseServer.from("assignment_problems").select("assignment_id, problem_id"),
    supabaseServer.from("assignments").select("id, title, due_date"),
    supabaseServer.from("problems").select("id, title"),
    supabaseServer.from("users").select("id, name").eq("role", "student"),
    supabaseServer.from("submissions").select("user_id, problem_id, is_correct, created_at"),
  ])

  const assignMap  = Object.fromEntries((aData  ?? []).map((a: any) => [a.id,   a]))
  const problemMap = Object.fromEntries((pData  ?? []).map((p: any) => [p.id,   p.title]))
  const userMap    = Object.fromEntries((uData  ?? []).map((u: any) => [u.id,   u.name]))

  // 제출 기록: (userId, problemId) → 최신 제출 + 제출 횟수
  const toUtcStr = (str: string) =>
    str && !str.endsWith("Z") && !str.includes("+") ? str + "Z" : str

  const subMap: Record<string, { isCorrect: boolean; createdAt: string; count: number }> = {}
  for (const s of subData ?? []) {
    const key = `${(s as any).user_id}__${(s as any).problem_id}`
    const cur = subMap[key]
    const createdAt = toUtcStr((s as any).created_at)
    if (!cur) {
      subMap[key] = { isCorrect: (s as any).is_correct, createdAt, count: 1 }
    } else {
      subMap[key].count++
      if (createdAt > cur.createdAt) {
        subMap[key].isCorrect = (s as any).is_correct
        subMap[key].createdAt = createdAt
      }
    }
  }

  const rows: object[] = []
  for (const as_ of asData ?? []) {
    const { assignment_id, student_user_id } = as_ as any
    const assignment = assignMap[assignment_id]
    if (!assignment) continue

    // 이 과제에 속한 문제들
    const problems = (apData ?? []).filter((ap: any) => ap.assignment_id === assignment_id)
    for (const ap of problems) {
      const { problem_id } = ap as any
      const key = `${student_user_id}__${problem_id}`
      const sub = subMap[key]
      rows.push({
        studentId:       student_user_id,
        studentName:     userMap[student_user_id] ?? "알 수 없음",
        assignmentId:    assignment_id,
        assignmentTitle: assignment.title,
        dueDate:         assignment.due_date ?? null,
        problemId:       problem_id,
        problemTitle:    problemMap[problem_id] ?? problem_id,
        isSubmitted:      !!sub,
        submittedAt:      sub?.createdAt ?? null,
        isCorrect:        sub ? sub.isCorrect : null,
        submissionCount:  sub?.count ?? 0,
      })
    }
  }

  return NextResponse.json(rows)
}
