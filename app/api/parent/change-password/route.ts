import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"
import { hashPassword } from "@/lib/password"

// POST /api/parent/change-password
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if ((session.user as any).role !== "parent")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { newPassword } = await req.json()
  if (!newPassword || newPassword.length < 6)
    return NextResponse.json({ error: "비밀번호는 6자 이상이어야 합니다." }, { status: 400 })

  const userId       = (session.user as any).id as string
  const passwordHash = await hashPassword(newPassword)

  const { error } = await supabaseServer.from("users").update({
    password_hash:        passwordHash,
    must_change_password: false,
  }).eq("id", userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
