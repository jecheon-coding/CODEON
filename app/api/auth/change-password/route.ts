import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"
import { hashPassword } from "@/lib/password"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as any)?.id

  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }

  const { new_password } = await req.json()

  if (!new_password || new_password.length < 6) {
    return NextResponse.json({ error: "비밀번호는 6자리 이상이어야 해요." }, { status: 400 })
  }

  const hash = await hashPassword(new_password)

  const { error } = await supabaseServer
    .from("users")
    .update({ password_hash: hash, must_change_password: false })
    .eq("id", userId)

  if (error) {
    return NextResponse.json({ error: "저장에 실패했어요. 다시 시도해 주세요." }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
