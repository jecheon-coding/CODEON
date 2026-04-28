import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"
import { hashPassword } from "@/lib/password"

function randomPassword(len = 8) {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
}

// POST /api/admin/students/bulk — CSV 일괄 등록
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { students } = await req.json() as {
    students: { name: string; grade: string; cls: string; loginId: string }[]
  }

  if (!Array.isArray(students) || students.length === 0)
    return NextResponse.json({ error: "학생 데이터가 없습니다." }, { status: 400 })

  // 기존 login_id 중복 확인
  const loginIds = students.map(s => s.loginId.trim()).filter(Boolean)
  const { data: existing } = await supabaseServer
    .from("users").select("login_id").in("login_id", loginIds)

  const duplicates = new Set((existing ?? []).map((u: any) => u.login_id))
  const conflicts  = loginIds.filter(id => duplicates.has(id))
  if (conflicts.length > 0)
    return NextResponse.json({ error: `이미 사용 중인 아이디: ${conflicts.join(", ")}` }, { status: 409 })

  const rows = await Promise.all(
    students.map(async s => ({
      name:                 s.name.trim(),
      grade:                s.grade.trim() || null,
      class:                s.cls.trim()   || null,
      login_id:             s.loginId.trim(),
      password_hash:        await hashPassword(randomPassword()),
      role:                 "student",
      status:               "active",
      is_active:            true,
      student_code:         Math.floor(100000 + Math.random() * 900000).toString(),
      must_change_password: true,
      auth_provider:        "credentials",
    }))
  )

  const { error } = await supabaseServer.from("users").insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, count: rows.length })
}
