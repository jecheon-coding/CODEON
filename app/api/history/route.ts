import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

export type HistorySubmission = {
  id:            string
  problem_id:    string
  problem_title: string
  category:      string | null
  topic:         string | null
  difficulty:    string | null
  is_correct:    boolean
  created_at:    string
}

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as any)?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: subData } = await supabaseServer
    .from("submissions")
    .select("id, problem_id, is_correct, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (!subData || subData.length === 0) return NextResponse.json([])

  // 고유 problem_id 목록으로 문제 상세 일괄 조회 (supabaseServer → RLS 우회)
  const problemIds = [...new Set(subData.map((s: any) => s.problem_id as string))]
  const { data: probData } = await supabaseServer
    .from("problems")
    .select("id, title, category, topic, difficulty")
    .in("id", problemIds)

  const probMap = Object.fromEntries(
    (probData ?? []).map((p: any) => [
      p.id as string,
      p as { title: string; category: string | null; topic: string | null; difficulty: string | null },
    ])
  )

  const result: HistorySubmission[] = (subData as any[]).map(s => {
    const prob = probMap[s.problem_id]
    return {
      id:            s.id,
      problem_id:    s.problem_id,
      problem_title: prob?.title    ?? s.problem_id,
      category:      prob?.category ?? null,
      topic:         prob?.topic    ?? null,
      difficulty:    prob?.difficulty ?? null,
      is_correct:    s.is_correct,
      created_at:    s.created_at,
    }
  })

  return NextResponse.json(result)
}
