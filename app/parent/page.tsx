import { getServerSession } from "next-auth"
import { redirect }         from "next/navigation"
import { authOptions }      from "@/lib/authOptions"
import { supabaseServer }   from "@/lib/supabaseServer"
import { calcAccuracy }     from "@/lib/accuracyUtils"
import ParentDashboardClient, { type ParentDashboardProps, type TeacherInput } from "./ParentDashboardClient"

const COURSE_CATEGORY: Record<string, string> = {
  basic:       "파이썬기초",
  algorithm:   "파이썬알고리즘",
  certificate: "파이썬자격증",
  practical:   "파이썬실전",
  challenge:   "파이썬도전",
}
const COURSE_LABEL: Record<string, string> = {
  basic: "기초 과정", algorithm: "알고리즘 과정",
  certificate: "자격증 과정", practical: "실전 문제", challenge: "도전 문제",
}

export default async function ParentPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user)                         redirect("/login?role=parent")
  if ((session.user as any).role !== "parent") redirect("/login?role=parent")

  const parentId   = (session.user as any).id as string
  const parentName = (session.user.name ?? "학부모").replace(/님$/, "")

  // ── 자녀 연결 조회 ──────────────────────────────────────────────────────
  const { data: links } = await supabaseServer
    .from("parent_student_links")
    .select("student_user_id")
    .eq("parent_user_id", parentId)

  const studentId = links?.[0]?.student_user_id ?? null

  if (!studentId) {
    // 승인된 연결 없음 → pending 요청 확인
    const { data: pendingReq } = await supabaseServer
      .from("parent_link_requests")
      .select("status")
      .eq("parent_user_id", parentId)
      .eq("status", "pending")
      .maybeSingle()

    if (pendingReq) redirect("/parent/pending")
    else            redirect("/parent/request-link")
  }

  // ── 강사 입력 조회 ───────────────────────────────────────────────────────
  const { data: tf } = await supabaseServer
    .from("teacher_feedback")
    .select("*")
    .eq("student_id", studentId)
    .maybeSingle()

  const teacherInput: TeacherInput | null = tf ? {
    attitude:     tf.attitude     ?? "",
    summary:      tf.summary      ?? "",
    tips:         [tf.tip1 ?? "", tf.tip2 ?? ""],
    needsConsult: tf.needs_consult ?? false,
    notices: [
      ...(tf.notice1_label ? [{ label: tf.notice1_label, date: tf.notice1_date ?? "" }] : []),
      ...(tf.notice2_label ? [{ label: tf.notice2_label, date: tf.notice2_date ?? "" }] : []),
    ],
    bundleNames: (tf.bundle_names as Record<string, string>) ?? {},
    updatedAt:   tf.updated_at ?? null,
  } : null

  // ── 학생 정보 ────────────────────────────────────────────────────────────
  const { data: student } = await supabaseServer
    .from("users")
    .select("*")
    .eq("id", studentId)
    .single()

  // ── 제출 기록 전체 ───────────────────────────────────────────────────────
  const { data: rawSubs } = await supabaseServer
    .from("submissions")
    .select("problem_id, is_correct, created_at")
    .eq("user_id", studentId)
    .order("created_at", { ascending: true })

  const subs = rawSubs ?? []

  // ── 문제 목록 ────────────────────────────────────────────────────────────
  const { data: problems } = await supabaseServer
    .from("problems")
    .select("id, title, category, topic, difficulty")

  const allProblems = problems ?? []
  const problemMap  = new Map(allProblems.map(p => [p.id, p]))

  // ── 기본 집계 (고유 문제 기준 정답률) ──────────────────────────────────────
  const {
    correctProblemCount,
    attemptedProblemCount,
    rate,
    totalSubmitCount,
  } = calcAccuracy(subs)
  const total   = totalSubmitCount
  const correct = correctProblemCount
  const wrong   = attemptedProblemCount - correctProblemCount

  // ── 기간 분리 ────────────────────────────────────────────────────────────
  const now          = new Date()
  const toUTC        = (s: string) => /Z|[+-]\d{2}:?\d{2}$/.test(s) ? s : s + "Z"
  const msPerDay     = 86_400_000

  const weekStart    = new Date(now.getTime() - 7  * msPerDay)
  const prevWeekStart= new Date(now.getTime() - 14 * msPerDay)

  const weekSubs     = subs.filter(s => new Date(toUTC(s.created_at)) >= weekStart)
  const prevWeekSubs = subs.filter(s => {
    const t = new Date(toUTC(s.created_at))
    return t >= prevWeekStart && t < weekStart
  })

  const weekTotal    = weekSubs.length  // 제출 횟수 (KPI: "이번 주 N문제 제출")
  const weekCorrect  = weekSubs.filter(s => s.is_correct).length
  const { attemptedProblemCount: weekAttemptedProblemCount, rate: weekRate } = calcAccuracy(weekSubs)
  const { rate: prevWeekRate } = calcAccuracy(prevWeekSubs)
  const rateChange   = weekRate - prevWeekRate

  // ── 이번 주 학습 시간 추정 (세션 기반) ──────────────────────────────────
  // 30분 이내 연속 제출 = 같은 세션, 마지막 문제 +5분 추가
  const weekStudyMinutes = (() => {
    if (weekSubs.length === 0) return 0
    const SESSION_GAP = 30 * 60 * 1000
    const LAST_MIN    = 5
    const times = weekSubs
      .map(s => new Date(toUTC(s.created_at)).getTime())
      .sort((a, b) => a - b)
    let total = 0, start = times[0], end = times[0]
    for (let i = 1; i < times.length; i++) {
      if (times[i] - end < SESSION_GAP) { end = times[i] }
      else { total += (end - start) / 60000 + LAST_MIN; start = times[i]; end = times[i] }
    }
    total += (end - start) / 60000 + LAST_MIN
    return Math.round(total)
  })()

  // ── 연속 학습일 ──────────────────────────────────────────────────────────
  const correctDays = new Set(
    subs.filter(s => s.is_correct).map(s => {
      const d = new Date(toUTC(s.created_at))
      d.setHours(0, 0, 0, 0)
      return d.getTime()
    })
  )
  let streak = 0
  let check  = new Date(now); check.setHours(0, 0, 0, 0)
  if (!correctDays.has(check.getTime())) check = new Date(check.getTime() - msPerDay)
  while (correctDays.has(check.getTime())) { streak++; check = new Date(check.getTime() - msPerDay) }

  // ── 마지막 학습일 ────────────────────────────────────────────────────────
  const lastStudyDate = subs.length > 0
    ? new Date(toUTC(subs[subs.length - 1].created_at)).toLocaleDateString("ko-KR", {
        month: "long", day: "numeric", weekday: "short",
      })
    : null

  // ── 일별 데이터 (최근 7일) ───────────────────────────────────────────────
  const DAY_KO = ["일", "월", "화", "수", "목", "금", "토"]
  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const day     = new Date(now.getTime() - (6 - i) * msPerDay)
    day.setHours(0, 0, 0, 0)
    const nextDay = new Date(day.getTime() + msPerDay)
    const daySubs = subs.filter(s => {
      const t = new Date(toUTC(s.created_at))
      return t >= day && t < nextDay
    })
    return {
      day:     DAY_KO[day.getDay()],
      date:    day.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }),
      count:   daySubs.length,
      correct: daySubs.filter(s => s.is_correct).length,
    }
  })

  // ── 주별 데이터 (최근 4주) ───────────────────────────────────────────────
  const monthlyData = Array.from({ length: 4 }, (_, i) => {
    const wStart = new Date(now.getTime() - (3 - i) * 7 * msPerDay - 7 * msPerDay)
    const wEnd   = new Date(wStart.getTime() + 7 * msPerDay)
    wStart.setHours(0, 0, 0, 0); wEnd.setHours(0, 0, 0, 0)
    const wSubs  = subs.filter(s => {
      const t = new Date(toUTC(s.created_at))
      return t >= wStart && t < wEnd
    })
    return {
      week:    `${i + 1}주차`,
      count:   wSubs.length,
      correct: wSubs.filter(s => s.is_correct).length,
    }
  })

  // ── 과정별 진도 ──────────────────────────────────────────────────────────
  const correctProblemIds = new Set(subs.filter(s => s.is_correct).map(s => s.problem_id))
  const courseStats: ParentDashboardProps["courseStats"] = {}
  for (const [slug, category] of Object.entries(COURSE_CATEGORY)) {
    const cp        = allProblems.filter(p => p.category === category)
    const completed = cp.filter(p => correctProblemIds.has(p.id)).length
    courseStats[slug] = {
      label:     COURSE_LABEL[slug],
      total:     cp.length,
      completed,
      rate:      cp.length > 0 ? Math.round((completed / cp.length) * 100) : 0,
    }
  }

  // ── 주제별 성취도 ────────────────────────────────────────────────────────
  const topicMap = new Map<string, { correct: number; total: number }>()
  for (const s of subs) {
    const topic = problemMap.get(s.problem_id)?.topic
    if (!topic) continue
    const cur = topicMap.get(topic) ?? { correct: 0, total: 0 }
    topicMap.set(topic, { correct: cur.correct + (s.is_correct ? 1 : 0), total: cur.total + 1 })
  }
  const topicStats = Array.from(topicMap.entries())
    .map(([topic, d]) => ({ topic, ...d, rate: Math.round((d.correct / d.total) * 100) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

  // ── 현재 과정 파악 ───────────────────────────────────────────────────────
  let currentSlug = "basic"
  if (subs.length > 0) {
    const lastSub  = subs[subs.length - 1]
    const lastProb = problemMap.get(lastSub.problem_id)
    if (lastProb) {
      const found = Object.entries(COURSE_CATEGORY).find(([, c]) => c === lastProb.category)
      if (found) currentSlug = found[0]
    }
  }

  // ── 실제 과제 조회 (관리자가 배정한 과제) ─────────────────────────────────
  const [{ data: asRows }, { data: apRows }, { data: aRows }] = await Promise.all([
    supabaseServer.from("assignment_students")
      .select("assignment_id")
      .eq("student_user_id", studentId),
    supabaseServer.from("assignment_problems")
      .select("assignment_id, problem_id, display_order"),
    supabaseServer.from("assignments")
      .select("id, title, due_date")
      .order("due_date", { ascending: true, nullsFirst: false }),
  ])

  const assignedIds = new Set((asRows ?? []).map((r: any) => r.assignment_id as string))

  const assignments: ParentDashboardProps["assignments"] = (aRows ?? [])
    .filter((a: any) => assignedIds.has(a.id))
    .map((a: any) => {
      const problemRows = ((apRows ?? []) as any[])
        .filter(ap => ap.assignment_id === a.id)
        .sort((ap1, ap2) => ap1.display_order - ap2.display_order)
      const problems = problemRows.map(ap => {
        const p = problemMap.get(ap.problem_id)
        return {
          id:          ap.problem_id as string,
          title:       p?.title       ?? "알 수 없음",
          difficulty:  p?.difficulty  ?? "medium",
          topic:       p?.topic       ?? null,
          isCorrect:   correctProblemIds.has(ap.problem_id),
          isAttempted: subs.some(s => s.problem_id === ap.problem_id),
        }
      })
      return {
        id:             a.id as string,
        title:          a.title as string,
        dueDate:        a.due_date ?? null,
        problems,
        completedCount: problems.filter(p => p.isCorrect).length,
        totalCount:     problems.length,
      }
    })

  // ── 최근 제출 (10건) ──────────────────────────────────────────────────────
  const recentSubs: ParentDashboardProps["recentSubs"] = [...subs]
    .reverse()
    .slice(0, 10)
    .map(s => {
      const p = problemMap.get(s.problem_id)
      return {
        title:     p?.title ?? "알 수 없음",
        isCorrect: s.is_correct,
        createdAt: s.created_at,
        topic:     p?.topic ?? null,
      }
    })

  const stats: ParentDashboardProps["stats"] = {
    total, correct, wrong, rate,
    correctProblemCount, attemptedProblemCount,
    weekTotal, weekCorrect, weekAttemptedProblemCount, weekRate,
    prevWeekRate, rateChange, streak, lastStudyDate, weekStudyMinutes,
    currentCourse: COURSE_LABEL[currentSlug] ?? "기초 과정",
  }

  return (
    <ParentDashboardClient
      parentName={parentName}
      student={student}
      teacherInput={teacherInput}
      stats={stats}
      weeklyData={weeklyData}
      monthlyData={monthlyData}
      courseStats={courseStats}
      topicStats={topicStats}
      assignments={assignments}
      recentSubs={recentSubs}
    />
  )
}
