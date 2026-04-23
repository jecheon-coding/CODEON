import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabaseServer"
import { verifyPassword } from "@/lib/password"

export async function POST(req: NextRequest) {
  const { login_id, password } = await req.json()

  if (!login_id || !password) {
    return NextResponse.json({ error: "아이디와 비밀번호를 입력해 주세요." }, { status: 400 })
  }

  // ── 사용자 조회 ────────────────────────────────────────────
  const { data: user, error } = await supabaseServer
    .from("users")
    .select("id, login_id, password_hash, role, status, must_change_password, is_active, name")
    .eq("login_id", login_id)
    .single()

  if (error || !user) {
    return NextResponse.json({ error: "아이디 또는 비밀번호가 틀렸어요." }, { status: 401 })
  }

  // ── 계정 활성 여부 ─────────────────────────────────────────
  if (!user.is_active || user.status === "inactive") {
    return NextResponse.json({ error: "비활성화된 계정입니다. 선생님께 문의하세요." }, { status: 403 })
  }

  // ── 비밀번호 검증 ──────────────────────────────────────────
  const valid = await verifyPassword(password, user.password_hash ?? "")
  if (!valid) {
    return NextResponse.json({ error: "아이디 또는 비밀번호가 틀렸어요." }, { status: 401 })
  }

  // ── 응답 (세션 토큰은 클라이언트에서 NextAuth signIn 으로 처리) ──
  return NextResponse.json({
    id:                   user.id,
    name:                 user.name,
    role:                 user.role,
    status:               user.status,
    must_change_password: user.must_change_password,
  })
}
