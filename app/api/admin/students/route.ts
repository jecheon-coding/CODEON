import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"
import { hashPassword } from "@/lib/password"

async function isAdmin() {
  const session = await getServerSession(authOptions)
  return (session?.user as any)?.role === "admin"
}

// GET /api/admin/students
export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const [{ data: users }, { data: links }] = await Promise.all([
    supabaseServer.from("users")
      .select("id, name, grade, class, status, login_id, is_active")
      .eq("role", "student")
      .order("name"),
    supabaseServer.from("parent_student_links").select("student_user_id"),
  ])

  const linkedIds = new Set((links ?? []).map((l: any) => l.student_user_id))

  return NextResponse.json(
    (users ?? []).map((s: any) => ({
      id:            s.id,
      name:          s.name,
      grade:         s.grade ?? null,
      class:         s.class ?? null,
      status:        s.status,
      login_id:      s.login_id ?? null,
      hasParentLink: linkedIds.has(s.id),
    }))
  )
}

// POST /api/admin/students — 학생 등록
export async function POST(req: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { name, grade, cls, loginId, password } = await req.json()
  if (!name?.trim() || !loginId?.trim() || !password?.trim())
    return NextResponse.json({ error: "이름, 아이디, 비밀번호는 필수입니다." }, { status: 400 })

  // 아이디 중복 확인
  const { data: existing } = await supabaseServer
    .from("users").select("id").eq("login_id", loginId.trim()).maybeSingle()
  if (existing)
    return NextResponse.json({ error: "이미 사용 중인 아이디입니다." }, { status: 409 })

  const passwordHash = await hashPassword(password)
  const studentCode  = Math.floor(100000 + Math.random() * 900000).toString()

  const { error } = await supabaseServer.from("users").insert({
    name:                 name.trim(),
    grade:                grade?.trim() || null,
    class:                cls?.trim()   || null,
    login_id:             loginId.trim(),
    password_hash:        passwordHash,
    role:                 "student",
    status:               "active",
    is_active:            true,
    student_code:         studentCode,
    must_change_password: false,
    auth_provider:        "credentials",
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
