import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

// GET /api/admin/feedback?studentId=&month=
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get("studentId")
  const month     = searchParams.get("month")

  if (!studentId || !month) return NextResponse.json(null)

  const { data } = await supabaseServer
    .from("teacher_feedback")
    .select("summary, tip1, tip2, next_plan, month, updated_at")
    .eq("student_id", studentId)
    .eq("month", month)
    .maybeSingle()

  return NextResponse.json(data ?? null)
}

// POST /api/admin/feedback — upsert
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { studentId, month, summary, tip1, tip2, nextPlan } = await req.json()
  if (!studentId || !month)
    return NextResponse.json({ error: "studentId와 month는 필수입니다." }, { status: 400 })

  const { error } = await supabaseServer
    .from("teacher_feedback")
    .upsert(
      { student_id: studentId, month, summary, tip1, tip2, next_plan: nextPlan, updated_at: new Date().toISOString() },
      { onConflict: "student_id,month" }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
