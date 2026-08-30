import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

export const dynamic = "force-dynamic"

const DIFF_SCORE: Record<string, number> = { "하": 10, "중": 25, "상": 50 }
const CAT_MULT: Record<string, number> = {
  "파이썬기초":     1.0,
  "파이썬자격증":   1.5,
  "파이썬실전":     1.5,
  "파이썬알고리즘": 2.0,
  "파이썬도전":     2.0,
  "파이썬대회":     3.0,
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as any).id as string
  const { problemId, question, answer, feedback, skipped } = await req.json()

  if (!problemId || !question) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  // 가산점 계산 (답변 시에만)
  let bonusScore = 0
  if (!skipped && answer?.trim()) {
    const { data: prob } = await supabaseServer
      .from("problems")
      .select("difficulty, category")
      .eq("id", problemId)
      .single()

    if (prob) {
      const base = DIFF_SCORE[prob.difficulty] ?? 10
      const cat  = CAT_MULT[prob.category]    ?? 1.0
      bonusScore = Math.round(base * cat * 0.1 * 10) / 10
    }
  }

  const { error } = await supabaseServer
    .from("comprehension_checks")
    .insert({
      user_id:     userId,
      problem_id:  problemId,
      question,
      answer:      skipped ? null : (answer ?? null),
      feedback:    skipped ? null : (feedback ?? null),
      skipped:     !!skipped,
      bonus_score: bonusScore,
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ bonusScore })
}
