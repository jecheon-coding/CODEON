import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

async function isAdmin() {
  const session = await getServerSession(authOptions)
  return (session?.user as any)?.role === "admin"
}

// GET /api/admin/assignments/[id] — detail with problemIds + studentIds
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { id } = await params

  const [{ data: assignment }, { data: problems }, { data: students }] = await Promise.all([
    supabaseServer.from("assignments").select("id, title, due_date").eq("id", id).maybeSingle(),
    supabaseServer.from("assignment_problems").select("problem_id, display_order").eq("assignment_id", id).order("display_order"),
    supabaseServer.from("assignment_students").select("student_user_id").eq("assignment_id", id),
  ])

  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({
    title:      assignment.title,
    dueDate:    assignment.due_date ?? null,
    problemIds: (problems ?? []).map((p: any) => p.problem_id),
    studentIds: (students ?? []).map((s: any) => s.student_user_id),
  })
}

// PATCH /api/admin/assignments/[id] — update title, dueDate, problems, students
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { id } = await params

  const { title, dueDate, problemIds, studentIds } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: "과제 제목을 입력해주세요." }, { status: 400 })

  const { error: updateErr } = await supabaseServer
    .from("assignments")
    .update({ title: title.trim(), due_date: dueDate || null })
    .eq("id", id)
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  await supabaseServer.from("assignment_problems").delete().eq("assignment_id", id)
  if (problemIds?.length > 0) {
    await supabaseServer.from("assignment_problems").insert(
      problemIds.map((pid: string, i: number) => ({ assignment_id: id, problem_id: pid, display_order: i }))
    )
  }

  await supabaseServer.from("assignment_students").delete().eq("assignment_id", id)
  if (studentIds?.length > 0) {
    await supabaseServer.from("assignment_students").insert(
      studentIds.map((sid: string) => ({ assignment_id: id, student_user_id: sid }))
    )
  }

  return NextResponse.json({ success: true })
}

// DELETE /api/admin/assignments/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { id } = await params

  const { error } = await supabaseServer.from("assignments").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
