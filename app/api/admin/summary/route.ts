import { getServerSession } from "next-auth"
import { NextResponse }     from "next/server"
import { authOptions }      from "@/lib/authOptions"
import { supabaseServer }   from "@/lib/supabaseServer"

async function guardAdmin() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== "admin") return null
  return session
}

export async function GET() {
  if (!await guardAdmin()) return NextResponse.json({ error: "권한 없음" }, { status: 403 })

  const thisMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

  const [
    { count: totalStudents },
    { count: pendingStudents },
    { count: pendingProblems },
    { count: pendingLinks },
    { data: assignmentStudents },
    { data: submissions },
    { count: writtenReviews },
  ] = await Promise.all([
    supabaseServer.from("users").select("*", { count: "exact", head: true })
      .eq("role", "student").eq("status", "active"),
    supabaseServer.from("users").select("*", { count: "exact", head: true })
      .eq("role", "student").eq("status", "pending"),
    supabaseServer.from("problems").select("*", { count: "exact", head: true })
      .eq("status", "pending").eq("is_community", true),
    supabaseServer.from("parent_link_requests").select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    // 모든 과제 배정 건
    supabaseServer.from("assignment_students")
      .select("assignment_id, student_user_id"),
    // 정답 제출 건 (assignment_problems 경유로 집계)
    supabaseServer.from("submissions")
      .select("problem_id, user_id, is_correct")
      .eq("is_correct", true),
    // 이번 달 총평 작성 수
    supabaseServer.from("teacher_feedback").select("*", { count: "exact", head: true })
      .eq("month", thisMonth),
  ])

  // 미제출: assignment_students에서 배정된 문제 중 정답 없는 건
  // 간소화: assignment_students 건수 - 정답 제출 건수 (근사치)
  const assignedCount = assignmentStudents?.length ?? 0
  const solvedCount   = submissions?.length ?? 0
  const unsubmittedCount = Math.max(0, assignedCount - solvedCount)

  const unwrittenReviews = Math.max(0, (totalStudents ?? 0) - (writtenReviews ?? 0))

  return NextResponse.json({
    totalStudents:    totalStudents    ?? 0,
    pendingStudents:  pendingStudents  ?? 0,
    unsubmittedCount,
    pendingProblems:  pendingProblems  ?? 0,
    pendingLinks:     pendingLinks     ?? 0,
    unwrittenReviews,
  })
}
