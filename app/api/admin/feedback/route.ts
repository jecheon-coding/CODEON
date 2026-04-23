import { getServerSession } from "next-auth"
import { NextResponse }     from "next/server"
import { authOptions }      from "@/lib/authOptions"
import { supabaseServer }   from "@/lib/supabaseServer"

async function guardAdmin() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== "admin") return null
  return session
}

export async function GET(req: Request) {
  if (!await guardAdmin()) return NextResponse.json({ error: "권한 없음" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get("studentId")
  const month     = searchParams.get("month")

  if (!studentId) return NextResponse.json({ error: "studentId 필수" }, { status: 400 })

  let query = supabaseServer
    .from("teacher_feedback")
    .select("*")
    .eq("student_id", studentId)

  if (month) query = query.eq("month", month)
  else       query = query.is("month", null)

  const { data, error } = await query.maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? null)
}

export async function POST(req: Request) {
  if (!await guardAdmin()) return NextResponse.json({ error: "권한 없음" }, { status: 403 })

  const { studentId, month, summary, tip1, tip2, nextPlan } = await req.json()
  if (!studentId) return NextResponse.json({ error: "studentId 필수" }, { status: 400 })

  const now = new Date().toISOString()

  // 기존 행 조회
  let findQuery = supabaseServer
    .from("teacher_feedback")
    .select("id")
    .eq("student_id", studentId)

  if (month) findQuery = findQuery.eq("month", month)
  else       findQuery = findQuery.is("month", null)

  const { data: existing } = await findQuery.maybeSingle()

  const payload: Record<string, unknown> = {
    student_id: studentId,
    month:      month     || null,
    summary:    summary?.trim()  || null,
    tip1:       tip1?.trim()     || null,
    tip2:       tip2?.trim()     || null,
    next_plan:  nextPlan?.trim() || null,
    updated_at: now,
  }

  let error: { message: string } | null = null

  if (existing?.id) {
    const res = await supabaseServer
      .from("teacher_feedback")
      .update(payload)
      .eq("id", existing.id)
    error = res.error
  } else {
    const res = await supabaseServer
      .from("teacher_feedback")
      .insert({ ...payload, created_at: now })
    error = res.error
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
