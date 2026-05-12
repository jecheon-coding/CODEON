import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

export const dynamic = "force-dynamic"

// GET /api/admin/questions — 전체 질문 목록 (어드민 전용)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: questions, error } = await supabaseServer
    .from("problem_questions")
    .select("id, problem_id, nickname, question, answer, answered_at, created_at")
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 문제 제목 조회
  const problemIds = [...new Set((questions ?? []).map(q => q.problem_id))]
  let titleMap: Record<string, string> = {}

  if (problemIds.length > 0) {
    const { data: problems } = await supabaseServer
      .from("problems")
      .select("id, title")
      .in("id", problemIds)

    for (const p of problems ?? []) {
      titleMap[p.id] = p.title
    }
  }

  const result = (questions ?? []).map(q => ({
    ...q,
    problemTitle: titleMap[q.problem_id] ?? null,
  }))

  return NextResponse.json(result)
}
