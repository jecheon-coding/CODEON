import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

export async function GET() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const currentMonth = new Date().toISOString().slice(0, 7)

  const [
    { data: students },
    { count: pendingProblems },
    { count: pendingLinks },
    { data: feedbackData },
    { data: asData },
    { data: subData },
  ] = await Promise.all([
    supabaseServer.from("users").select("id, status").eq("role", "student").eq("is_active", true),
    supabaseServer.from("problems").select("*", { count: "exact", head: true })
      .eq("is_community", true).eq("status", "pending"),
    supabaseServer.from("parent_link_requests").select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabaseServer.from("teacher_feedback").select("student_id").eq("month", currentMonth),
    supabaseServer.from("assignment_students").select("student_user_id"),
    supabaseServer.from("submissions").select("user_id, problem_id, is_correct"),
  ])

  const totalStudents   = students?.length ?? 0
  const pendingStudents = students?.filter(s => s.status === "pending").length ?? 0

  // students who have teacher_feedback this month
  const reviewedIds = new Set((feedbackData ?? []).map((f: any) => f.student_id))
  const activeIds   = new Set((students ?? []).map((s: any) => s.id))
  const unwrittenReviews = [...activeIds].filter(id => !reviewedIds.has(id)).length

  // students assigned to at least one assignment but have no correct submission for it
  const assignedIds = new Set((asData ?? []).map((a: any) => a.student_user_id))
  const correctIds  = new Set(
    (subData ?? []).filter((s: any) => s.is_correct).map((s: any) => s.user_id)
  )
  const unsubmittedCount = [...assignedIds].filter(id => !correctIds.has(id)).length

  return NextResponse.json({
    totalStudents,
    pendingStudents,
    unsubmittedCount,
    pendingProblems:   pendingProblems ?? 0,
    pendingLinks:      pendingLinks    ?? 0,
    unwrittenReviews,
  })
}
