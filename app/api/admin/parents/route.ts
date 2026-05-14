import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"
import { hashPassword } from "@/lib/password"

async function isAdmin() {
  const session = await getServerSession(authOptions)
  return (session?.user as any)?.role === "admin"
}

// GET /api/admin/parents
export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { data: parents, error } = await supabaseServer
    .from("users")
    .select("id, name, login_id, is_active, created_at, last_login_at")
    .eq("role", "parent")
    .eq("auth_provider", "credentials")
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const parentIds = (parents ?? []).map((p: any) => p.id)

  // 연결된 자녀 정보 조회
  const { data: links } = parentIds.length > 0
    ? await supabaseServer
        .from("parent_student_links")
        .select("parent_user_id, student_user_id")
        .in("parent_user_id", parentIds)
    : { data: [] }

  const studentIds = [...new Set((links ?? []).map((l: any) => l.student_user_id))]
  const { data: students } = studentIds.length > 0
    ? await supabaseServer
        .from("users")
        .select("id, name")
        .in("id", studentIds)
    : { data: [] }

  const studentMap = Object.fromEntries((students ?? []).map((s: any) => [s.id, s.name]))
  const linkMap: Record<string, string[]> = {}
  for (const l of links ?? []) {
    if (!linkMap[l.parent_user_id]) linkMap[l.parent_user_id] = []
    linkMap[l.parent_user_id].push(studentMap[l.student_user_id] ?? "알 수 없음")
  }

  return NextResponse.json(
    (parents ?? []).map((p: any) => ({
      id:           p.id,
      name:         p.name,
      loginId:      p.login_id,
      isActive:     p.is_active,
      createdAt:    p.created_at,
      lastLoginAt:  p.last_login_at,
      studentNames: linkMap[p.id] ?? [],
    }))
  )
}

// POST /api/admin/parents — 학부모 계정 생성
export async function POST(req: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { name, loginId, password } = await req.json()
  if (!name?.trim() || !loginId?.trim() || !password?.trim())
    return NextResponse.json({ error: "이름, 아이디, 비밀번호는 필수입니다." }, { status: 400 })

  const { data: existing } = await supabaseServer
    .from("users").select("id").eq("login_id", loginId.trim()).maybeSingle()
  if (existing)
    return NextResponse.json({ error: "이미 사용 중인 아이디입니다." }, { status: 409 })

  const passwordHash = await hashPassword(password)

  const { error } = await supabaseServer.from("users").insert({
    name:                 name.trim(),
    login_id:             loginId.trim(),
    password_hash:        passwordHash,
    role:                 "parent",
    status:               "active",
    is_active:            true,
    must_change_password: true,
    auth_provider:        "credentials",
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
