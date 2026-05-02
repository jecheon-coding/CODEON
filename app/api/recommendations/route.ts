import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

const DIFF_ORDER: Record<string, number> = { "하": 0, "중": 1, "상": 2 }

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as any).id as string
  const limit  = Math.min(10, parseInt(req.nextUrl.searchParams.get("limit") ?? "3"))

  // ── 최근 제출 50개 (현재 과정 파악 + 오답 토픽 집계) ───────────────────
  const [{ data: recentSubs }, { data: solvedSubs }, { data: wrongSubs }] =
    await Promise.all([
      supabaseServer
        .from("submissions")
        .select("problem_id, is_correct")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseServer
        .from("submissions")
        .select("problem_id")
        .eq("user_id", userId)
        .eq("is_correct", true),
      supabaseServer
        .from("submissions")
        .select("problem_id")
        .eq("user_id", userId)
        .eq("is_correct", false),
    ])

  const solvedIds = new Set((solvedSubs ?? []).map(s => s.problem_id))
  const wrongIds  = new Set((wrongSubs  ?? []).map(s => s.problem_id))

  // ── 현재 진행 과정 파악 ────────────────────────────────────────────────
  const lastProblemId = recentSubs?.[0]?.problem_id
  let currentCategory = "파이썬기초"

  if (lastProblemId) {
    const { data: lastProb } = await supabaseServer
      .from("problems")
      .select("category")
      .eq("id", lastProblemId)
      .single()
    if (lastProb?.category) currentCategory = lastProb.category
  }

  // ── 최근 오답 토픽 집계 ────────────────────────────────────────────────
  const recentWrongIds = (recentSubs ?? []).filter(s => !s.is_correct).map(s => s.problem_id)
  const wrongTopicCount = new Map<string, number>()

  if (recentWrongIds.length > 0) {
    const { data: wrongProbs } = await supabaseServer
      .from("problems")
      .select("id, topic")
      .in("id", recentWrongIds)
    for (const p of wrongProbs ?? []) {
      if (p.topic) wrongTopicCount.set(p.topic, (wrongTopicCount.get(p.topic) ?? 0) + 1)
    }
  }

  // ── 현재 과정의 전체 문제 ──────────────────────────────────────────────
  const { data: courseProblems } = await supabaseServer
    .from("problems")
    .select("id, title, category, topic, difficulty")
    .eq("category", currentCategory)
    .order("id", { ascending: true })

  const total        = (courseProblems ?? []).length
  const solvedInCourse = (courseProblems ?? []).filter(p => solvedIds.has(p.id)).length
  const courseComplete = total > 0 && solvedInCourse === total

  // ── 미풀 문제 스코어링 ─────────────────────────────────────────────────
  const unsolved = (courseProblems ?? []).filter(p => !solvedIds.has(p.id))

  const scored = unsolved.map(p => {
    const topicWrongs = p.topic ? (wrongTopicCount.get(p.topic) ?? 0) : 0
    return { ...p, topicWrongs }
  })

  scored.sort((a, b) => {
    if (b.topicWrongs !== a.topicWrongs) return b.topicWrongs - a.topicWrongs
    return (DIFF_ORDER[a.difficulty ?? ""] ?? 1) - (DIFF_ORDER[b.difficulty ?? ""] ?? 1)
  })

  const problems = scored.slice(0, limit).map((p, i) => {
    const isWrong = wrongIds.has(p.id)

    let reason = "아직 안 푼 문제예요"
    if (p.topicWrongs > 0 && p.topic) reason = `최근 ${p.topic} 오답이 많아요`
    else if (i === 0 && !isWrong)     reason = "다음 단계 문제예요"

    return {
      id:         p.id,
      title:      p.title,
      category:   p.category,
      topic:      p.topic ?? null,
      difficulty: p.difficulty ?? null,
      status:     isWrong ? "오답" : "미풀",
      reason,
    }
  })

  return NextResponse.json({ problems, courseComplete, currentCategory })
}
