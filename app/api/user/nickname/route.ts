import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as any).id as string
  const { data } = await supabaseServer
    .from("users")
    .select("nickname")
    .eq("id", userId)
    .single()

  return NextResponse.json({ nickname: data?.nickname ?? null })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as any).id as string
  const { nickname } = await req.json()

  // 유효성 검사
  const trimmed = (nickname ?? "").trim()
  if (trimmed.length < 2 || trimmed.length > 10) {
    return NextResponse.json({ error: "닉네임은 2~10자여야 합니다." }, { status: 400 })
  }
  if (!/^[가-힣a-zA-Z0-9_]+$/.test(trimmed)) {
    return NextResponse.json({ error: "한글, 영문, 숫자, 밑줄(_)만 사용 가능합니다." }, { status: 400 })
  }

  // 중복 확인
  const { data: existing } = await supabaseServer
    .from("users")
    .select("id")
    .eq("nickname", trimmed)
    .neq("id", userId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: "이미 사용 중인 닉네임입니다." }, { status: 409 })
  }

  const { error } = await supabaseServer
    .from("users")
    .update({ nickname: trimmed })
    .eq("id", userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ nickname: trimmed })
}
