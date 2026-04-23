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

  const { data: students, error } = await supabaseServer
    .from("users")
    .select("id, name, email, grade, class, status, login_id, student_code, created_at")
    .eq("role", "student")
    .in("status", ["pending", "active", "inactive"])
    .order("name")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 학부모 연결 여부 확인
  const ids = (students ?? []).map(s => s.id)
  const { data: links } = ids.length > 0
    ? await supabaseServer
        .from("parent_student_links")
        .select("student_user_id")
        .in("student_user_id", ids)
    : { data: [] }

  const linkedSet = new Set((links ?? []).map(l => l.student_user_id))

  return NextResponse.json(
    (students ?? []).map(s => ({ ...s, hasParentLink: linkedSet.has(s.id) }))
  )
}

export async function POST(req: Request) {
  if (!await guardAdmin()) return NextResponse.json({ error: "권한 없음" }, { status: 403 })

  const { name, grade, cls, loginId, password } = await req.json()
  if (!name?.trim() || !loginId?.trim() || !password?.trim())
    return NextResponse.json({ error: "이름, 로그인 ID, 비밀번호는 필수입니다" }, { status: 400 })

  // 비밀번호 해시 (bcrypt)
  const bcrypt = await import("bcryptjs")
  const passwordHash = await bcrypt.hash(password, 10)

  const { data, error } = await supabaseServer
    .from("users")
    .insert({
      name:           name.trim(),
      grade:          grade?.trim() || null,
      class:          cls?.trim()   || null,
      login_id:       loginId.trim(),
      password_hash:  passwordHash,
      role:           "student",
      status:         "active",
      auth_provider:  "credentials",
      must_change_password: false,
    })
    .select("id, name, grade, class, status, login_id")
    .single()

  if (error) {
    if (error.code === "23505")
      return NextResponse.json({ error: "이미 사용 중인 로그인 ID입니다" }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
