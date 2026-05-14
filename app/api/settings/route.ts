import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabaseServer"

export async function GET() {
  const { data } = await supabaseServer
    .from("site_settings")
    .select("key, value")

  const map: Record<string, string> = {}
  for (const row of data ?? []) map[row.key] = row.value

  return NextResponse.json({
    defaultDailyGoal: parseInt(map["default_daily_goal"] ?? "6"),
  })
}
