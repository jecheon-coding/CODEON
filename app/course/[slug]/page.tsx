import { getServerSession } from "next-auth"
import { redirect, notFound } from "next/navigation"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"
import { buildProblemStatusMap } from "@/lib/submissionStatus"
import type { SubmissionSummaryRow } from "@/lib/submissionStatus"
import CourseClient from "./CourseClient"

const COURSE_CATEGORY: Record<string, string> = {
  basic:       "파이썬기초",
  algorithm:   "파이썬알고리즘",
  certificate: "파이썬자격증",
  practical:   "파이썬실전",
  challenge:   "파이썬도전",
  competition: "파이썬대회",
}

export default async function CoursePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/login")

  const { slug } = await params
  if (!(slug in COURSE_CATEGORY)) notFound()

  const category = COURSE_CATEGORY[slug]
  const userId   = (session.user as any).id as string

  const baseQuery = supabaseServer
    .from("problems")
    .select("id, title, category, topic, difficulty, status, content")
    .eq("category", category)
    .order("id")

  const { data: problems } = await (
    slug === "challenge" ? baseQuery.eq("status", "published") : baseQuery
  )

  const problemIds = (problems ?? []).map((p: { id: string }) => p.id)

  const { data: subs } = problemIds.length > 0
    ? await supabaseServer
        .from("submissions")
        .select("problem_id, is_correct")
        .eq("user_id", userId)
        .in("problem_id", problemIds)
    : { data: [] }

  // 전체 사용자 기준 문제별 통계
  const { data: allSubs } = problemIds.length > 0
    ? await supabaseServer
        .from("submissions")
        .select("problem_id, is_correct, user_id")
        .in("problem_id", problemIds)
    : { data: [] }

  type GlobalStat = { solvers: number; submissions: number; successRate: number | null }
  const globalStats: Record<string, GlobalStat> = {}
  {
    const tmp: Record<string, { submissions: number; solvers: Set<string>; challengers: Set<string> }> = {}
    for (const s of (allSubs ?? []) as { problem_id: string; is_correct: boolean; user_id: string }[]) {
      if (!tmp[s.problem_id]) tmp[s.problem_id] = { submissions: 0, solvers: new Set(), challengers: new Set() }
      tmp[s.problem_id].submissions++
      tmp[s.problem_id].challengers.add(s.user_id)
      if (s.is_correct) tmp[s.problem_id].solvers.add(s.user_id)
    }
    for (const [id, stat] of Object.entries(tmp)) {
      const challengers = stat.challengers.size
      globalStats[id] = {
        solvers:     stat.solvers.size,
        submissions: stat.submissions,
        successRate: challengers > 0 ? stat.solvers.size / challengers * 100 : null,
      }
    }
  }

  const statusMap = buildProblemStatusMap(
    problemIds,
    (subs ?? []) as SubmissionSummaryRow[],
  )

  return (
    <CourseClient
      slug={slug}
      problems={problems ?? []}
      statusMap={statusMap}
      globalStats={globalStats}
      userName={session.user.name ?? "학생"}
    />
  )
}
