import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

async function isAdmin() {
  const session = await getServerSession(authOptions)
  return (session?.user as any)?.role === "admin"
}

// GET /api/admin/testcases?problemId=xxx
export async function GET(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const problemId = req.nextUrl.searchParams.get("problemId")
  if (!problemId) return NextResponse.json({ error: "problemId required" }, { status: 400 })

  const { data, error } = await supabaseServer
    .from("test_cases")
    .select("*")
    .eq("problem_id", problemId)
    .order("display_order", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/admin/testcases
export async function POST(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { problem_id, input, expected_output, is_hidden, display_order } = await req.json()

  if (!problem_id || expected_output === undefined) {
    return NextResponse.json({ error: "problem_id, expected_output 필수" }, { status: 400 })
  }

  const { data, error } = await supabaseServer
    .from("test_cases")
    .insert({ problem_id, input: input ?? null, expected_output, is_hidden: !!is_hidden, display_order: display_order ?? 1 })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
