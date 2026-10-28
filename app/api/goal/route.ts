import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

// GET /api/goal — 로그인한 사용자 개인의 일일 목표(없으면 null)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const userId = (session.user as any).id as string

  const { data, error } = await supabaseServer
    .from("users")
    .select("daily_goal")
    .eq("id", userId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ dailyGoal: data?.daily_goal ?? null })
}

// PATCH /api/goal — 개인 일일 목표 저장
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const userId = (session.user as any).id as string

  const { dailyGoal } = await req.json()
  const goal = parseInt(dailyGoal)
  if (isNaN(goal) || goal < 1 || goal > 20)
    return NextResponse.json({ error: "Invalid value" }, { status: 400 })

  const { error } = await supabaseServer
    .from("users")
    .update({ daily_goal: goal })
    .eq("id", userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, dailyGoal: goal })
}
