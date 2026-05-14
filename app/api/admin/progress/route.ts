import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

export type ProgressTopic = {
  name: string
  total: number
  solved: number
  correct: number   // 최종 정답 처리된 문제
  wrong: number     // 시도했지만 틀린 문제
  untouched: number // 아직 안 푼 문제
}

export type ProgressCategory = {
  name: string
  total: number
  solved: number
  topics: ProgressTopic[]
}

export type StudentProgress = {
  total: number
  solved: number
  categories: ProgressCategory[]
}

// GET /api/admin/progress?studentId=xxx
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const studentId = req.nextUrl.searchParams.get("studentId")
  if (!studentId)
    return NextResponse.json({ error: "studentId required" }, { status: 400 })

  const [{ data: problems }, { data: submissions }] = await Promise.all([
    supabaseServer
      .from("problems")
      .select("id, category, topic, status")
      .eq("status", "published"),
    supabaseServer
      .from("submissions")
      .select("problem_id, is_correct")
      .eq("user_id", studentId),
  ])

  // problem_id 별 최선 결과 집계
  const bestMap = new Map<string, boolean>()   // problemId → ever correct?
  const triedSet = new Set<string>()
  for (const s of submissions ?? []) {
    triedSet.add(s.problem_id)
    if (s.is_correct) bestMap.set(s.problem_id, true)
    else if (!bestMap.has(s.problem_id)) bestMap.set(s.problem_id, false)
  }

  // 카테고리 → 토픽 → 집계
  type TopicAcc = { total: number; solved: number; correct: number; wrong: number; untouched: number }
  const catMap = new Map<string, Map<string, TopicAcc>>()

  for (const p of problems ?? []) {
    if (!catMap.has(p.category)) catMap.set(p.category, new Map())
    const topicKey = p.topic ?? "기타"
    const tMap = catMap.get(p.category)!
    if (!tMap.has(topicKey)) tMap.set(topicKey, { total: 0, solved: 0, correct: 0, wrong: 0, untouched: 0 })
    const t = tMap.get(topicKey)!
    t.total++
    if (bestMap.get(p.id) === true)  { t.solved++; t.correct++ }
    else if (bestMap.has(p.id))      { t.solved++; t.wrong++ }
    else                             { t.untouched++ }
  }

  const CATEGORY_ORDER = ["파이썬기초", "파이썬알고리즘", "파이썬자격증", "파이썬실전", "파이썬도전"]
  const categories: ProgressCategory[] = []
  for (const catName of CATEGORY_ORDER) {
    const tMap = catMap.get(catName)
    if (!tMap) continue
    const topics: ProgressTopic[] = [...tMap.entries()].map(([name, acc]) => ({ name, ...acc }))
    const catTotal  = topics.reduce((s, t) => s + t.total,  0)
    const catSolved = topics.reduce((s, t) => s + t.correct, 0)
    categories.push({ name: catName, total: catTotal, solved: catSolved, topics })
  }
  // 순서에 없는 카테고리도 추가
  for (const [catName, tMap] of catMap.entries()) {
    if (CATEGORY_ORDER.includes(catName)) continue
    const topics: ProgressTopic[] = [...tMap.entries()].map(([name, acc]) => ({ name, ...acc }))
    const catTotal  = topics.reduce((s, t) => s + t.total,  0)
    const catSolved = topics.reduce((s, t) => s + t.correct, 0)
    categories.push({ name: catName, total: catTotal, solved: catSolved, topics })
  }

  const total  = categories.reduce((s, c) => s + c.total,  0)
  const solved = categories.reduce((s, c) => s + c.solved, 0)

  return NextResponse.json({ total, solved, categories } satisfies StudentProgress)
}
