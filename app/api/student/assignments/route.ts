import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

// GET /api/student/assignments
// Returns HomeworkItem[] for the current student — all active assignments they are assigned to
export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // 1. Find all assignments this student is assigned to
  const { data: asData } = await supabaseServer
    .from("assignment_students")
    .select("assignment_id")
    .eq("student_user_id", userId)

  if (!asData || asData.length === 0) return NextResponse.json([])

  const assignmentIds = asData.map((a: any) => a.assignment_id)

  // 2. Fetch assignment details + problems for those assignments
  // Only fetch active assignments (no due_date OR due_date in the future)
  const now = new Date().toISOString()
  const [
    { data: assignments },
    { data: apData },
    { data: subData },
  ] = await Promise.all([
    supabaseServer
      .from("assignments")
      .select("id, title, due_date")
      .in("id", assignmentIds)
      .or(`due_date.is.null,due_date.gt.${now}`),
    supabaseServer
      .from("assignment_problems")
      .select("assignment_id, problem_id, display_order")
      .in("assignment_id", assignmentIds),
    supabaseServer
      .from("submissions")
      .select("problem_id, is_correct, created_at")
      .eq("user_id", userId),
  ])

  const assignMap = Object.fromEntries((assignments ?? []).map((a: any) => [a.id, a]))

  // Filter assignment_problems to only active assignments
  const activeIds = new Set((assignments ?? []).map((a: any) => a.id))
  const activeApData = (apData ?? []).filter((ap: any) => activeIds.has(ap.assignment_id))

  // Latest submission per problem
  const subMap: Record<string, { isCorrect: boolean; createdAt: string }> = {}
  for (const s of subData ?? []) {
    const cur = subMap[(s as any).problem_id]
    if (!cur || (s as any).created_at > cur.createdAt) {
      subMap[(s as any).problem_id] = { isCorrect: (s as any).is_correct, createdAt: (s as any).created_at }
    }
  }

  // 3. Fetch problem titles + difficulties
  const problemIds = activeApData.map((ap: any) => ap.problem_id)
  if (problemIds.length === 0) return NextResponse.json([])

  const { data: problems } = await supabaseServer
    .from("problems")
    .select("id, title, difficulty")
    .in("id", problemIds)

  const problemMap = Object.fromEntries((problems ?? []).map((p: any) => [p.id, p]))

  // 4. Build HomeworkItem[]
  const items = activeApData.map((ap: any) => {
    const assignment = assignMap[ap.assignment_id]
    const problem    = problemMap[ap.problem_id] ?? {}
    const sub        = subMap[ap.problem_id]
    return {
      assignmentId:    ap.assignment_id,
      assignmentTitle: assignment?.title ?? "",
      dueDate:         assignment?.due_date ?? null,
      problemId:       ap.problem_id,
      problemTitle:    problem.title ?? ap.problem_id,
      difficulty:      problem.difficulty ?? null,
      displayOrder:    ap.display_order ?? 0,
      isSubmitted:     !!sub,
      isCorrect:       sub ? sub.isCorrect : null,
      submittedAt:     sub?.createdAt ?? null,
    }
  })

  // Sort: unsubmitted first, then wrong, then correct; within group by displayOrder
  items.sort((a: any, b: any) => {
    const w = (x: any) => !x.isSubmitted ? 0 : (x.isCorrect === false ? 1 : 2)
    return w(a) - w(b) || a.displayOrder - b.displayOrder
  })

  return NextResponse.json(items)
}
