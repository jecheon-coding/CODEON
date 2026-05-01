import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

export const dynamic = "force-dynamic"

async function isAdmin() {
  const session = await getServerSession(authOptions)
  return (session?.user as any)?.role === "admin"
}

// GET /api/admin/problems?full=true
export async function GET(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const full = req.nextUrl.searchParams.get("full") === "true"

  // select("*") 로 실제 존재하는 컬럼만 자동 반환 (미적용 마이그레이션 컬럼 오류 방지)
  const { data, error } = await supabaseServer
    .from("problems")
    .select("*")
    .order("id")

  const { data: tcRaw } = await supabaseServer.from("test_cases").select("problem_id")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const tcCount: Record<string, number> = {}
  for (const tc of tcRaw ?? []) {
    tcCount[(tc as any).problem_id] = (tcCount[(tc as any).problem_id] ?? 0) + 1
  }

  return NextResponse.json(
    (data ?? []).map(p => ({ ...p, test_case_count: tcCount[(p as any).id] ?? 0 }))
  )
}

// POST /api/admin/problems
export async function POST(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const { id, title, category, difficulty, topic, content,
    input_description, output_description, constraints,
    initial_code, hint, example_input, example_output } = body

  if (!id?.trim())    return NextResponse.json({ error: "ID는 필수입니다." }, { status: 400 })
  if (!title?.trim()) return NextResponse.json({ error: "제목은 필수입니다." }, { status: 400 })
  if (!category)      return NextResponse.json({ error: "코스를 선택하세요." }, { status: 400 })
  if (!difficulty)    return NextResponse.json({ error: "난이도를 선택하세요." }, { status: 400 })

  // display_order: migration 013이 적용된 경우에만 사용
  let nextOrder: number | null = null
  const { data: maxData, error: maxErr } = await supabaseServer
    .from("problems").select("display_order").eq("category", category)
    .order("display_order", { ascending: false }).limit(1)
  if (!maxErr) nextOrder = ((maxData?.[0] as any)?.display_order ?? 0) + 1

  const insertData: Record<string, any> = {
    id: id.trim(), title: title.trim(), category, difficulty,
    topic:              topic?.trim()             || null,
    content:            content?.trim()           || "",
    input_description:  input_description?.trim() || null,
    output_description: output_description?.trim()|| null,
    constraints:        constraints?.trim()       || null,
    initial_code:       initial_code?.trim()      || "",
    hint:               hint?.trim()              || null,
    example_input:      example_input?.trim()     || null,
    example_output:     example_output?.trim()    || null,
    status: "published", is_community: false,
  }
  if (nextOrder !== null) insertData.display_order = nextOrder

  const { error } = await supabaseServer.from("problems").insert(insertData)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, display_order: nextOrder })
}
