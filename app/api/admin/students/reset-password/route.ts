import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"
import { hashPassword } from "@/lib/password"

// POST /api/admin/students/reset-password
// { userId, newPassword }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { userId, newPassword } = await req.json()
  if (!userId)      return NextResponse.json({ error: "userId required" }, { status: 400 })
  if (!newPassword || newPassword.length < 4)
    return NextResponse.json({ error: "비밀번호는 4자 이상이어야 합니다." }, { status: 400 })

  const passwordHash = await hashPassword(newPassword)
  const { error } = await supabaseServer
    .from("users")
    .update({ password_hash: passwordHash })
    .eq("id", userId)
    .eq("role", "student")   // 학생 계정만 초기화 가능

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
