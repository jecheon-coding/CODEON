import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

// GET /api/student/assignments/check?problemId=xxx
// 이 학생의 활성 과제 중 해당 문제가 포함되는지, require_comprehension 여부 확인
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id
  if (!userId) return NextResponse.json({ requireComprehension: false, isAssigned: false })

  const problemId = req.nextUrl.searchParams.get("problemId")
  if (!problemId) return NextResponse.json({ requireComprehension: false, isAssigned: false })

  const now = new Date().toISOString()

  // 이 학생이 배정된 과제 목록
  const { data: asData } = await supabaseServer
    .from("assignment_students")
    .select("assignment_id")
    .eq("student_user_id", userId)

  if (!asData || asData.length === 0) return NextResponse.json({ requireComprehension: false, isAssigned: false })
  const assignmentIds = asData.map((a: any) => a.assignment_id)

  // 활성 과제 전체 조회
  const { data: assignments } = await supabaseServer
    .from("assignments")
    .select("id, require_comprehension")
    .in("id", assignmentIds)
    .or(`due_date.is.null,due_date.gt.${now}`)

  if (!assignments || assignments.length === 0) return NextResponse.json({ requireComprehension: false, isAssigned: false })

  const activeIds = assignments.map((a: any) => a.id)

  // 이 문제가 활성 과제에 포함되는지 확인
  const { data: ap } = await supabaseServer
    .from("assignment_problems")
    .select("assignment_id")
    .in("assignment_id", activeIds)
    .eq("problem_id", problemId)
    .limit(1)

  const isAssigned = !!(ap && ap.length > 0)
  const requireComprehension = isAssigned && assignments.some((a: any) =>
    a.require_comprehension && ap!.some((p: any) => p.assignment_id === a.id)
  )

  return NextResponse.json({ requireComprehension, isAssigned })
}
