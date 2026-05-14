import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { defaultDailyGoal } = await req.json()
  const goal = parseInt(defaultDailyGoal)
  if (isNaN(goal) || goal < 1 || goal > 20)
    return NextResponse.json({ error: "Invalid value" }, { status: 400 })

  const { error } = await supabaseServer
    .from("site_settings")
    .upsert({ key: "default_daily_goal", value: String(goal), updated_at: new Date().toISOString() })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, defaultDailyGoal: goal })
}
