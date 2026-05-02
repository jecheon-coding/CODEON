import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabaseServer"

// GET /api/notices?visible=true&limit=5
export async function GET(req: Request) {
  const limit = Math.min(20, parseInt(new URL(req.url).searchParams.get("limit") ?? "5"))
  const { data, error } = await supabaseServer
    .from("notices")
    .select("id, date, content, is_visible, created_at")
    .eq("is_visible", true)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
