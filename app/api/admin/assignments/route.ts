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

  const { data: assignments, error } = await supabaseServer
    .from("assignments")
    .select(`
      id, title, description, due_date, created_at,
      assignment_problems (problem_id),
      assignment_students (student_user_id)
    `)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(
    (assignments ?? []).map(a => ({
      id:           a.id,
      title:        a.title,
      description:  a.description,
      dueDate:      a.due_date,
      createdAt:    a.created_at,
      problemCount: (a.assignment_problems as unknown[]).length,
      studentCount: (a.assignment_students as unknown[]).length,
    }))
  )
}

export async function POST(req: Request) {
  const session = await guardAdmin()
  if (!session) return NextResponse.json({ error: "권한 없음" }, { status: 403 })

  const adminId = (session.user as { id?: string }).id
  const { title, description, dueDate, problemIds, studentIds } = await req.json()

  if (!title?.trim() || !Array.isArray(problemIds) || problemIds.length === 0)
    return NextResponse.json({ error: "제목과 문제는 필수입니다" }, { status: 400 })

  const { data: assignment, error } = await supabaseServer
    .from("assignments")
    .insert({
      title:       title.trim(),
      description: description?.trim() || null,
      due_date:    dueDate || null,
      created_by:  adminId,
    })
    .select("id")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const aId = assignment.id

  await Promise.all([
    supabaseServer.from("assignment_problems").insert(
      problemIds.map((pid: string, i: number) => ({
        assignment_id: aId, problem_id: pid, display_order: i,
      }))
    ),
    studentIds?.length > 0
      ? supabaseServer.from("assignment_students").insert(
          studentIds.map((sid: string) => ({
            assignment_id: aId, student_user_id: sid,
          }))
        )
      : Promise.resolve(),
  ])

  return NextResponse.json({ id: aId }, { status: 201 })
}
