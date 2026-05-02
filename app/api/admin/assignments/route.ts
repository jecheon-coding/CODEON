import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

async function isAdmin() {
  const session = await getServerSession(authOptions)
  return (session?.user as any)?.role === "admin"
}

// GET /api/admin/assignments
export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { data: assignments } = await supabaseServer
    .from("assignments")
    .select("id, title, description, due_date, created_at")
    .order("created_at", { ascending: false })

  if (!assignments || assignments.length === 0) return NextResponse.json([])

  const ids = assignments.map((a: any) => a.id)

  const [{ data: problems }, { data: students }] = await Promise.all([
    supabaseServer.from("assignment_problems")
      .select("assignment_id")
      .in("assignment_id", ids),
    supabaseServer.from("assignment_students")
      .select("assignment_id")
      .in("assignment_id", ids),
  ])

  const problemCount: Record<string, number> = {}
  const studentCount: Record<string, number> = {}
  for (const p of problems ?? []) problemCount[(p as any).assignment_id] = (problemCount[(p as any).assignment_id] ?? 0) + 1
  for (const s of students ?? []) studentCount[(s as any).assignment_id] = (studentCount[(s as any).assignment_id] ?? 0) + 1

  return NextResponse.json(
    assignments.map((a: any) => ({
      id:           a.id,
      title:        a.title,
      description:  a.description,
      dueDate:      a.due_date,
      problemCount: problemCount[a.id] ?? 0,
      studentCount: studentCount[a.id] ?? 0,
    }))
  )
}

// POST /api/admin/assignments — 과제 생성
export async function POST(req: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const session = await getServerSession(authOptions)
  const adminId = (session?.user as any)?.id

  const { title, dueDate, problemIds, studentIds } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: "과제 제목을 입력해주세요." }, { status: 400 })

  const { data: assignment, error } = await supabaseServer
    .from("assignments")
    .insert({ title: title.trim(), due_date: dueDate || null, created_by: adminId })
    .select("id")
    .single()

  if (error || !assignment) return NextResponse.json({ error: error?.message }, { status: 500 })

  const aId = assignment.id

  if (problemIds?.length > 0) {
    await supabaseServer.from("assignment_problems").insert(
      problemIds.map((pid: string, i: number) => ({ assignment_id: aId, problem_id: pid, display_order: i }))
    )
  }
  if (studentIds?.length > 0) {
    await supabaseServer.from("assignment_students").insert(
      studentIds.map((sid: string) => ({ assignment_id: aId, student_user_id: sid }))
    )
  }

  return NextResponse.json({ success: true, id: aId })
}
