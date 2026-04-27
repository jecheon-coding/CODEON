"use client"

import { useEffect, useState, useMemo } from "react"
import { useSession, signOut } from "next-auth/react"
import { redirect, useRouter } from "next/navigation"
import Link from "next/link"
import CodeOnLogo from "@/components/ui/CodeOnLogo"
import { PageLayout } from "@/components/ui/PageLayout"
import AiTutorChat from "@/components/ui/AiTutorChat"
import type { LucideIcon } from "lucide-react"
import {
  CheckCircle, Circle, ChevronRight, BookOpen,
  LogOut, ClipboardList, Award, Star, Zap,
  Code2, BarChart2, Trophy, MessageSquare, Clock,
  Activity, CheckSquare, ArrowRight, Sparkles,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useGoal } from "@/lib/goalContext"

// ── 아이콘 맵 ─────────────────────────────────────────────────────────────
const COURSE_ICON_MAP: Record<string, { Icon: LucideIcon; iconBg: string; iconColor: string }> = {
  basic:       { Icon: Code2,       iconBg: "bg-[#534AB7]/10", iconColor: "text-[#534AB7]" },
  algorithm:   { Icon: BarChart2,   iconBg: "bg-gray-100",    iconColor: "text-gray-500"  },
  certificate: { Icon: Award,       iconBg: "bg-gray-100",    iconColor: "text-gray-500"  },
  practical:   { Icon: Trophy,      iconBg: "bg-gray-100",    iconColor: "text-gray-500"  },
  challenge:   { Icon: Zap,         iconBg: "bg-orange-50",   iconColor: "text-[#D85A30]" },
  competition: { Icon: Star,        iconBg: "bg-amber-50",    iconColor: "text-[#BA7517]" },
}

// ── 과정 메타 ──────────────────────────────────────────────────────────────
const STUDY_COURSES = [
  { slug: "basic",       label: "기초 과정",    description: "파이썬 기본 문법과 코딩의 기초" },
  { slug: "algorithm",   label: "알고리즘 과정", description: "핵심 알고리즘으로 실력 향상" },
  { slug: "certificate", label: "자격증 과정",  description: "코딩 자격증 취득 대비" },
]

const EXTRA_COURSES = [
  { slug: "practical",   label: "실전 문제",    description: "학원 전용 기출 · 실력 검증" },
  { slug: "challenge",   label: "도전 문제",    description: "학생들이 직접 만든 문제, 누구나 참여" },
  { slug: "competition", label: "대회 준비 과정", description: "KOI · 정보올림피아드 대비" },
]

const ALL_COURSES = [...STUDY_COURSES, ...EXTRA_COURSES]

const COURSE_CATEGORY: Record<string, string> = {
  basic:       "파이썬기초",
  algorithm:   "파이썬알고리즘",
  certificate: "파이썬자격증",
  practical:   "파이썬실전",
  challenge:   "파이썬도전",
  competition: "파이썬대회",
}

// ── 타입 ───────────────────────────────────────────────────────────────────
export type Problem = { id: string; category: string; title?: string; status?: string }

type Submission = {
  id: string
  problem_id: string
  result: string
  is_correct: boolean
  created_at?: string
}

type CorrectSub = {
  problem_id: string
  created_at: string
}

type HomeworkItem = {
  assignmentId:    string
  assignmentTitle: string
  dueDate:         string | null
  problemId:       string
  problemTitle:    string
  difficulty:      string | null
  displayOrder:    number
  isSubmitted:     boolean
  isCorrect:       boolean | null
  submittedAt:     string | null
}

type CourseStat = {
  progress:     number
  completed:    number
  total:        number
  last_learned: string | null
  is_current:   boolean
}

const DAY_MS = 24 * 60 * 60 * 1000

// ── 날짜 포맷 ─────────────────────────────────────────────────────────────
function formatRelativeTime(dateStr?: string) {
  if (!dateStr) return ""
  const utcStr = /Z|[+-]\d{2}:?\d{2}$/.test(dateStr) ? dateStr : dateStr + "Z"
  const diff    = Date.now() - new Date(utcStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1)  return "방금 전"
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  return `${Math.floor(hours / 24)}일 전`
}

// ── 목표 도트 ─────────────────────────────────────────────────────────────
function GoalDot({ filled }: { filled: boolean }) {
  if (filled) {
    return (
      <span className="inline-flex animate-in zoom-in duration-300">
        <CheckCircle className="w-6 h-6 text-white drop-shadow" fill="rgba(255,255,255,0.9)" stroke="rgba(99,102,241,0.4)" strokeWidth={1.5} />
      </span>
    )
  }
  return <Circle className="w-6 h-6 text-white/30" strokeWidth={2} />
}

// ── 통합 과정 카드 ────────────────────────────────────────────────────────
function CourseCard({
  slug, label, description, stat, isCurrent,
}: {
  slug: string; label: string; description: string; stat: CourseStat; isCurrent: boolean
}) {
  const { Icon, iconBg, iconColor } = COURSE_ICON_MAP[slug] ?? { Icon: BookOpen, iconBg: "bg-gray-100", iconColor: "text-gray-400" }
  const { progress, completed, total, last_learned } = stat

  const isChallenge   = slug === "challenge"
  const isCompetition = slug === "competition"
  const isExtra       = isChallenge || isCompetition

  const borderCls = isCurrent
    ? "border-[#534AB7] border-2 bg-[#534AB7]/5"
    : isCompetition ? "border-[#BA7517] border-2 bg-amber-50/40"
    : isChallenge   ? "border-[#D85A30]/40 border bg-orange-50/30"
    : "border-gray-200 border bg-white"

  const linkColor = isCurrent
    ? "text-[#534AB7]"
    : isCompetition ? "text-[#BA7517]"
    : isChallenge   ? "text-[#D85A30]"
    : "text-gray-400"

  const progressBarColor = isCurrent
    ? "bg-[#534AB7]"
    : isCompetition ? "bg-[#BA7517]"
    : isChallenge   ? "bg-[#D85A30]"
    : "bg-gray-300"

  return (
    <Link
      href={`/course/${slug}`}
      className={`group relative block rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${borderCls}`}
    >
      {/* 배지 */}
      {isCurrent && (
        <span className="absolute top-3 right-3 text-[10px] font-bold bg-[#534AB7] text-white px-2 py-0.5 rounded-full">학습 중</span>
      )}
      {isCompetition && !isCurrent && (
        <span className="absolute top-3 right-3 text-[10px] font-bold bg-[#BA7517] text-white px-2 py-0.5 rounded-full">NEW</span>
      )}
      {isChallenge && !isCurrent && (
        <span className="absolute top-3 right-3 text-[10px] font-bold bg-[#D85A30] text-white px-2 py-0.5 rounded-full">HOT</span>
      )}

      {/* 아이콘 */}
      <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center mb-3`}>
        <Icon className={`w-4 h-4 ${iconColor}`} strokeWidth={1.75} />
      </div>

      {/* 텍스트 */}
      <h3 className="text-sm font-bold text-gray-900 mb-1 leading-snug pr-10">{label}</h3>
      <p className="text-[11px] text-gray-500 leading-relaxed mb-3 line-clamp-2">{description}</p>

      {/* 진행률 */}
      <p className="text-[11px] text-gray-400 mb-1.5 tabular-nums">
        {completed}/{total > 0 ? `${total}문제` : "–"} · {progress}%
      </p>
      {total > 0 && progress > 0 && (
        <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden mb-2">
          <div className={`h-full rounded-full ${progressBarColor}`} style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* 하단 링크 */}
      <div className={`flex items-center gap-0.5 text-[11px] font-bold ${linkColor} transition-all group-hover:gap-1 mt-1`}>
        {last_learned
          ? (isCurrent ? "이어서 학습하기" : isExtra ? "이어서 도전하기" : "이어서 학습하기")
          : (isExtra ? "도전하기" : "학습 기록 없음 · 시작하기")}
        <ChevronRight className="w-3 h-3" />
      </div>
    </Link>
  )
}

// ── 대시보드 클라이언트 ────────────────────────────────────────────────────
export default function DashboardClient({ initialProblems }: { initialProblems: Problem[] }) {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() { redirect("/login") },
  })
  const router = useRouter()

  const [allProblems]         = useState<Problem[]>(initialProblems)
  const [submissions,        setSubmissions]       = useState<Submission[]>([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(true)
  const [correctSubs,        setCorrectSubs]        = useState<CorrectSub[]>([])
  const [loadingProgress,    setLoadingProgress]    = useState(true)
  const [wrongProblemIds,    setWrongProblemIds]    = useState<Set<string>>(new Set())
  const [homework,           setHomework]           = useState<HomeworkItem[]>([])
  const [loadingHomework,    setLoadingHomework]    = useState(true)
  const [hwExpanded,         setHwExpanded]         = useState(false)
  const [totalSubmitCount,   setTotalSubmitCount]   = useState<number | null>(null)
  const [aiChatOpen,         setAiChatOpen]         = useState(false)

  const userId   = (session?.user as any)?.id as string | undefined
  const userName = session?.user?.name ?? "학생"
  const { dailyGoal } = useGoal()

  // ── 데이터 로드 ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return
    ;(async () => {
      const [{ data }, { count }] = await Promise.all([
        supabase
          .from("submissions")
          .select("id, problem_id, result, is_correct, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("submissions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId),
      ])
      setSubmissions(data ?? [])
      setTotalSubmitCount(count ?? 0)
      setLoadingSubmissions(false)
    })()
  }, [userId])

  useEffect(() => {
    if (!userId) return
    ;(async () => {
      const { data } = await supabase
        .from("submissions")
        .select("problem_id, created_at")
        .eq("user_id", userId)
        .eq("is_correct", true)
        .order("created_at", { ascending: false })
      setCorrectSubs(data ?? [])
      setLoadingProgress(false)
    })()
  }, [userId])

  useEffect(() => {
    if (!userId) return
    ;(async () => {
      const { data } = await supabase
        .from("submissions")
        .select("problem_id")
        .eq("user_id", userId)
        .eq("is_correct", false)
      const ids = new Set((data ?? []).map((r: { problem_id: string }) => r.problem_id))
      setWrongProblemIds(ids)
    })()
  }, [userId])

  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`dashboard-submissions:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "submissions", filter: `user_id=eq.${userId}` },
        (payload) => {
          const newSub = payload.new as Submission
          setSubmissions(prev => [newSub, ...prev].slice(0, 20))
          setTotalSubmitCount(prev => (prev ?? 0) + 1)
          if (newSub.is_correct && newSub.created_at) {
            setCorrectSubs(prev => [{ problem_id: newSub.problem_id, created_at: newSub.created_at! }, ...prev])
          } else if (!newSub.is_correct) {
            setWrongProblemIds(prev => { const next = new Set(prev); next.add(newSub.problem_id); return next })
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  useEffect(() => {
    if (!userId) return
    fetch("/api/student/assignments")
      .then(r => r.ok ? r.json() : [])
      .then(data => { setHomework(data); setLoadingHomework(false) })
      .catch(() => setLoadingHomework(false))
  }, [userId])

  // ── 과정별 진도율 ──────────────────────────────────────────────────────
  const courseStats = useMemo<Record<string, CourseStat>>(() => {
    const result: Record<string, CourseStat> = {}
    let latestTimestamp = ""
    let latestSlug      = ""

    for (const [slug, category] of Object.entries(COURSE_CATEGORY)) {
      const courseProblems   = allProblems.filter(p =>
        p.category === category &&
        (category !== "파이썬도전" || !p.status || p.status === "published")
      )
      const total            = courseProblems.length
      const courseProblemSet = new Set(courseProblems.map(p => p.id))
      const completedSet     = new Set(correctSubs.filter(s => courseProblemSet.has(s.problem_id)).map(s => s.problem_id))
      const completed        = completedSet.size
      const progress         = total > 0 ? Math.round((completed / total) * 100) : 0
      const lastSub          = correctSubs.find(s => courseProblemSet.has(s.problem_id))
      const lastTs           = lastSub?.created_at ?? ""

      if (lastTs > latestTimestamp) { latestTimestamp = lastTs; latestSlug = slug }

      result[slug] = { progress, completed, total, last_learned: lastSub ? formatRelativeTime(lastSub.created_at) : null, is_current: false }
    }

    if (latestSlug) result[latestSlug] = { ...result[latestSlug], is_current: true }
    return result
  }, [allProblems, correctSubs])

  // ── 집계 ──────────────────────────────────────────────────────────────
  const total   = submissions.length
  const correct = submissions.filter(s => s.is_correct === true).length
  const wrong   = submissions.filter(s => s.is_correct === false).length
  const rate    = total > 0 ? Math.round((correct / total) * 100) : 0

  const correctProblemIds     = useMemo(() => new Set(correctSubs.map(s => s.problem_id)), [correctSubs])
  const attemptedProblemIds   = useMemo(() => new Set([...correctProblemIds, ...wrongProblemIds]), [correctProblemIds, wrongProblemIds])
  const correctProblemCount   = correctProblemIds.size
  const attemptedProblemCount = attemptedProblemIds.size
  const problemRate           = attemptedProblemCount > 0 ? Math.round(correctProblemCount / attemptedProblemCount * 100) : 0

  const wrongNoteCount    = useMemo(
    () => [...wrongProblemIds].filter(id => !correctProblemIds.has(id)).length,
    [wrongProblemIds, correctProblemIds],
  )

  const today          = new Date().toDateString()
  const todaySolved    = correctSubs.filter(s => {
    const utcStr = /Z|[+-]\d{2}:?\d{2}$/.test(s.created_at) ? s.created_at : s.created_at + "Z"
    return new Date(utcStr).toDateString() === today
  }).length
  const todayRemaining = Math.max(0, dailyGoal - todaySolved)

  const currentCourse = ALL_COURSES.find(c => courseStats[c.slug]?.is_current) ?? null
  const basicStat     = courseStats["basic"]
  const basicProgress = basicStat?.progress ?? 0

  const streak = useMemo(() => {
    if (correctSubs.length === 0) return 0
    const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0)
    const uniqueDays = new Set(correctSubs.map(s => {
      const utcStr = /Z|[+-]\d{2}:?\d{2}$/.test(s.created_at) ? s.created_at : s.created_at + "Z"
      const d = new Date(utcStr); d.setHours(0, 0, 0, 0); return d.getTime()
    }))
    let count = 0, checkDay = todayMidnight.getTime()
    if (!uniqueDays.has(checkDay)) checkDay -= DAY_MS
    while (uniqueDays.has(checkDay)) { count++; checkDay -= DAY_MS }
    return count
  }, [correctSubs])

  const aiSuggestion = useMemo(() => {
    if (total === 0)               return `${userName}님, 첫 문제를 풀어보세요. 잘 할 수 있어요.`
    if (rate >= 90 && total >= 5)  return `정답률이 매우 높아요! 다음 단계 과정에 도전해 보세요.`
    if (wrong > correct)           return `틀린 문제를 복습하면 실력이 빠르게 올라요.`
    if (streak >= 3)               return `${streak}일 연속 학습 중! 꾸준함이 실력을 만들어요.`
    if (todaySolved >= dailyGoal) return `오늘 목표 달성! 이 기세로 내일도 꾸준히 학습해 보세요.`
    if (currentCourse?.slug === "basic")
      return `기초를 탄탄히 다지고 있어요!\n정답률 ${rate}%에서 조금만 더 연습하면 금방 올라갈 거에요. 오늘 목표 ${dailyGoal}문제, 같이 풀어볼까요?`
    return `꾸준히 문제를 풀면 반드시 실력이 올라요!`
  }, [total, rate, wrong, correct, streak, todaySolved, currentCourse, userName])

  const problemTitles = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const p of allProblems) { if (p.title) map[p.id] = p.title }
    return map
  }, [allProblems])

  const lastSub     = submissions[0]
  const lastProblem = lastSub ? (problemTitles[lastSub.problem_id] ?? lastSub.problem_id) : null

  const nextProblemId = useMemo(() => {
    if (!lastSub) return null
    const lastCategory   = allProblems.find(p => p.id === lastSub.problem_id)?.category
    if (!lastCategory) return null
    const courseProblems = allProblems.filter(p => p.category === lastCategory)
    const solvedIds      = new Set(correctSubs.map(s => s.problem_id))
    const currentIdx     = courseProblems.findIndex(p => p.id === lastSub.problem_id)
    for (let i = currentIdx + 1; i < courseProblems.length; i++) { if (!solvedIds.has(courseProblems[i].id)) return courseProblems[i].id }
    for (let i = 0; i < currentIdx; i++) { if (!solvedIds.has(courseProblems[i].id)) return courseProblems[i].id }
    if (courseProblems.length > 1) return courseProblems[(currentIdx + 1) % courseProblems.length].id
    return null
  }, [lastSub, allProblems, correctSubs])

  const nextProblemTitle = nextProblemId ? (problemTitles[nextProblemId] ?? null) : null

  const sortedHomework = useMemo(() => {
    return [...homework].sort((a, b) => {
      const weightA = !a.isSubmitted ? 0 : (a.isCorrect === false ? 1 : 2)
      const weightB = !b.isSubmitted ? 0 : (b.isCorrect === false ? 1 : 2)
      return weightA - weightB
    })
  }, [homework])

  const hwTotal     = homework.length
  const hwSubmitted = homework.filter(h => h.isSubmitted).length

  const firstPendingHwId = sortedHomework.find(h => !h.isSubmitted || h.isCorrect === false)?.problemId ?? null

  const nextHref = firstPendingHwId
    ? `/problems/${firstPendingHwId}`
    : nextProblemId ? `/problems/${nextProblemId}`
    : currentCourse ? `/course/${currentCourse.slug}`
    : "/problems/max-number"

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F5F8]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#534AB7] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F5F8]" style={{ fontFamily: "var(--font-noto-sans-kr), var(--font-geist-sans), sans-serif" }}>

      {/* ── 네비게이션 ────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white border-b border-gray-100">
        <PageLayout className="h-14 flex items-center justify-between">
          <CodeOnLogo />
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-600">{userName}님</span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </button>
          </div>
        </PageLayout>
      </nav>

      <PageLayout className="pt-20 pb-20 space-y-4">

        {/* ══════════════════════════════════════════════════════
            1. 히어로 배너
        ══════════════════════════════════════════════════════ */}
        <div className="bg-gradient-to-br from-[#534AB7] to-[#185FA5] rounded-3xl px-8 py-7 text-white relative overflow-hidden">
          {/* 배경 장식 */}
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/5 rounded-full pointer-events-none" />
          <div className="absolute right-16 -bottom-8 w-32 h-32 bg-white/5 rounded-full pointer-events-none" />

          <div className="relative flex items-center justify-between gap-8">

            {/* 왼쪽: 목표 텍스트 */}
            <div className="flex-1 min-w-0">
              <p className="text-white/70 text-xs font-medium mb-3">
                {userName}님의 오늘 목표
                {currentCourse && <span className="ml-2 text-white/50">· {currentCourse.label} 진행 중</span>}
              </p>
              <h1 className="text-2xl font-black tracking-tight leading-tight mb-5">
                {todayRemaining > 0
                  ? <>오늘 문제 <span className="text-yellow-300">{todayRemaining}개</span> 더 풀면<br />목표 달성!</>
                  : <span className="flex items-center gap-2">오늘 학습 목표를 달성했어요! <Sparkles className="w-5 h-5 text-yellow-300" /></span>
                }
              </h1>
              <div className="flex items-center gap-2.5 mb-6">
                {Array.from({ length: dailyGoal }).map((_, i) => <GoalDot key={i} filled={i < todaySolved} />)}
                <span className="text-xs text-white/50 font-medium ml-1">{todaySolved}/{dailyGoal} 완료</span>
              </div>
              <button
                onClick={() => router.push(nextHref)}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-[#534AB7] rounded-xl font-bold text-sm hover:bg-white/90 active:scale-95 transition-all shadow-lg shadow-black/20"
              >
                {firstPendingHwId ? "숙제 풀기" : "다음 문제 풀기"}
              </button>
            </div>

            {/* 오른쪽: 통계 칩 */}
            <div className="hidden sm:flex flex-col gap-3 shrink-0">
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-6 py-4 text-center min-w-[96px]">
                <p className="text-3xl font-black tabular-nums leading-none">
                  {rate}<span className="text-base font-semibold opacity-60">%</span>
                </p>
                <p className="text-[11px] text-white/60 mt-1.5 font-medium whitespace-nowrap">오늘 정답률</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-6 py-4 text-center min-w-[96px]">
                <p className="text-3xl font-black tabular-nums leading-none">
                  {streak}<span className="text-base font-semibold opacity-60">일째</span>
                </p>
                <p className="text-[11px] text-white/60 mt-1.5 font-medium whitespace-nowrap">연속 출석 중</p>
              </div>
            </div>

          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            2. 스탯 카드 4개
        ══════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

          {/* 오답 노트 */}
          <button
            onClick={() => router.push("/history?filter=wrong")}
            className="group bg-white rounded-2xl p-5 text-left hover:shadow-md transition-all border border-gray-100"
          >
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
              <ClipboardList className="w-5 h-5 text-[#534AB7]" strokeWidth={1.75} />
            </div>
            <p className="text-2xl font-black text-gray-900 tabular-nums leading-none mb-1">
              {wrongNoteCount}<span className="text-sm font-medium text-gray-400">개</span>
            </p>
            <p className="text-xs text-gray-500 mb-3">오답 노트 · 다시 풀 문제</p>
            <div className="flex items-center gap-0.5 text-xs font-bold text-[#D85A30] group-hover:gap-1 transition-all">
              {wrongNoteCount > 0 ? "복습하기" : "새 문제 보기"} <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* 정답률 */}
          <button
            onClick={() => router.push("/history")}
            className="group bg-white rounded-2xl p-5 text-left hover:shadow-md transition-all border border-gray-100"
          >
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mb-4">
              <Activity className="w-5 h-5 text-[#639922]" strokeWidth={1.75} />
            </div>
            {loadingProgress ? (
              <div className="h-8 w-14 bg-gray-100 rounded animate-pulse mb-1" />
            ) : (
              <p className="text-2xl font-black text-gray-900 tabular-nums leading-none mb-1">
                {problemRate}<span className="text-sm font-medium text-gray-400">%</span>
              </p>
            )}
            <p className="text-xs text-gray-500 mb-0.5">
              {attemptedProblemCount}문제 중 {correctProblemCount}문제 정답
            </p>
            <p className="text-[10px] text-gray-400 mb-3">
              총 {totalSubmitCount ?? total}회 제출
            </p>
            <div className="flex items-center gap-0.5 text-xs font-bold text-[#639922] group-hover:gap-1 transition-all">
              제출 기록 <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* 기초 과정 진행률 */}
          <button
            onClick={() => router.push("/course/basic")}
            className="group bg-white rounded-2xl p-5 text-left hover:shadow-md transition-all border border-gray-100"
          >
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
              <Clock className="w-5 h-5 text-[#185FA5]" strokeWidth={1.75} />
            </div>
            {loadingProgress ? (
              <div className="h-8 w-14 bg-gray-100 rounded animate-pulse mb-1" />
            ) : (
              <p className="text-2xl font-black text-gray-900 tabular-nums leading-none mb-1">
                {basicProgress}<span className="text-sm font-medium text-gray-400">%</span>
              </p>
            )}
            <p className="text-xs text-gray-500 mb-3">기초 과정 진행률</p>
            <div className="flex items-center gap-0.5 text-xs font-bold text-[#185FA5] group-hover:gap-1 transition-all">
              이어 학습하기 <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* 오늘 목표 */}
          <button
            onClick={() => router.push("/goals")}
            className="group bg-white rounded-2xl p-5 text-left hover:shadow-md transition-all border border-gray-100"
          >
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center mb-4">
              <CheckSquare className="w-5 h-5 text-[#D85A30]" strokeWidth={1.75} />
            </div>
            {loadingProgress ? (
              <div className="h-8 w-14 bg-gray-100 rounded animate-pulse mb-1" />
            ) : (
              <p className="text-2xl font-black text-gray-900 tabular-nums leading-none mb-1">
                {todaySolved}<span className="text-sm font-medium text-gray-400">/{dailyGoal}</span>
              </p>
            )}
            <p className="text-xs text-gray-500 mb-3">오늘 목표 달성</p>
            <div className="flex items-center gap-0.5 text-xs font-bold text-[#D85A30] group-hover:gap-1 transition-all">
              {todaySolved >= dailyGoal
                ? <span className="flex items-center gap-1">목표 달성 <Sparkles className="w-3.5 h-3.5" /></span>
                : `${todayRemaining}개 남음`}
              {todaySolved < dailyGoal && <ChevronRight className="w-3.5 h-3.5" />}
            </div>
          </button>

        </div>

        {/* ══════════════════════════════════════════════════════
            3. 2컬럼 메인 레이아웃
        ══════════════════════════════════════════════════════ */}
        <div className="flex flex-col lg:flex-row gap-4 items-start">

          {/* ── 좌측 메인 ──────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* 3-1. 학습 과정 패널 */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 text-gray-500"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg></div>
                  <h2 className="text-base font-bold text-gray-900">학습 과정</h2>
                </div>
                <span className="text-xs text-gray-400">정규 커리큘럼 · 기초부터 자격증까지</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {ALL_COURSES.map(course => (
                  <CourseCard
                    key={course.slug}
                    slug={course.slug}
                    label={course.label}
                    description={course.description}
                    stat={courseStats[course.slug] ?? { progress: 0, completed: 0, total: 0, last_learned: null, is_current: false }}
                    isCurrent={!!courseStats[course.slug]?.is_current}
                  />
                ))}
              </div>
            </div>

            {/* 3-2. 마지막 학습 패널 */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <h2 className="text-sm font-bold text-gray-900">마지막 학습</h2>
                </div>
                {nextProblemId && (
                  <Link href={`/problems/${nextProblemId}`} className="text-xs font-semibold text-[#534AB7] hover:underline">
                    이어서 풀기
                  </Link>
                )}
              </div>

              {loadingSubmissions ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-[#534AB7] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !lastSub ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                    <BookOpen className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-sm font-semibold text-gray-600 mb-1">아직 풀이 기록이 없어요</p>
                  <p className="text-xs text-gray-400 mb-4">첫 문제를 풀고 학습을 시작해 보세요</p>
                  <button
                    onClick={() => router.push("/problems/max-number")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#534AB7] text-white rounded-xl text-xs font-bold hover:bg-[#443DA0] transition-all"
                  >
                    첫 문제 풀러 가기 <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div>
                  {/* 마지막 문제 카드 */}
                  <div className={`rounded-xl p-4 mb-3 ${lastSub.is_correct ? "bg-green-50 border border-green-100" : "bg-red-50 border border-red-100"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-gray-400 mb-1">마지막으로 푼 문제</p>
                        <p className={`text-sm font-bold leading-snug ${lastSub.is_correct ? "text-[#185FA5]" : "text-gray-800"}`}>
                          {lastProblem}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-1">
                          {formatRelativeTime(lastSub.created_at)}
                          {currentCourse && <span> · {currentCourse.label}</span>}
                          {nextProblemTitle && <span> &gt; {nextProblemTitle}</span>}
                        </p>
                      </div>
                      <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-lg ${lastSub.is_correct ? "bg-green-200 text-green-700" : "bg-red-200 text-red-700"}`}>
                        {lastSub.is_correct ? "정답" : "오답"}
                      </span>
                    </div>
                  </div>

                  {/* 액션 링크 */}
                  <div className="flex items-center gap-4 mb-4">
                    {nextProblemId && (
                      <Link href={`/problems/${nextProblemId}`}
                        className="flex items-center gap-0.5 text-xs font-bold text-[#534AB7] hover:underline">
                        이어서 풀기 <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                    <Link href={`/problems/${lastSub.problem_id}`}
                      className="text-xs font-medium text-gray-400 hover:text-gray-600">
                      다시 풀기
                    </Link>
                  </div>

                  {/* 최근 풀이 */}
                  {submissions.length > 1 && (
                    <div className="space-y-2">
                      {submissions.slice(1, 3).map((sub, i) => (
                        <button key={i} onClick={() => router.push(`/problems/${sub.problem_id}`)}
                          className="w-full flex items-center gap-2.5 py-1.5 hover:bg-gray-50 rounded-lg transition-colors px-1">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sub.is_correct ? "bg-[#639922]" : "bg-[#D85A30]"}`} />
                          <p className="text-xs text-gray-600 flex-1 text-left truncate">{problemTitles[sub.problem_id] ?? sub.problem_id}</p>
                          <span className="text-[11px] text-gray-400 shrink-0">{formatRelativeTime(sub.created_at)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>{/* end 좌측 */}

          {/* ── 우측 사이드바 ────────────────────────────────────── */}
          <div className="w-full lg:w-[300px] shrink-0 space-y-4">

            {/* 4-1. AI 튜터 */}
            <div className="relative rounded-2xl overflow-hidden"
              style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #2d2764 100%)" }}>
              {/* 배경 장식 */}
              <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />
              <div className="absolute -left-4 bottom-8 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />

              <div className="relative p-5">
                {/* 헤더 */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-sm font-bold text-white">AI 튜터</span>
                </div>
                <p className="text-xs text-white/50 mb-4 leading-relaxed">
                  막히는 부분 언제든지 물어보세요.<br />힌트를 드릴게요!
                </p>

                {/* AI 메시지 말풍선 */}
                <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-xl p-3.5 mb-4">
                  <p className="text-xs text-emerald-100 leading-relaxed whitespace-pre-line">
                    {aiSuggestion}
                  </p>
                </div>

                {/* 질문 버튼 */}
                <button
                  onClick={() => setAiChatOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border border-white/20 text-white/80 rounded-xl text-xs font-semibold hover:bg-white/10 transition-all"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  AI 튜터에게 질문하기
                </button>
              </div>
            </div>

            {/* 4-2. 오늘 학습 현황 */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="text-sm font-bold text-gray-900 mb-4">오늘 학습 현황</h2>

              {/* 오늘 목표 */}
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-600">오늘 목표</span>
                <span className="text-sm font-black text-[#D85A30] tabular-nums">{todaySolved}/{dailyGoal}</span>
              </div>
              <p className="text-[11px] text-gray-400 mb-4">
                {todayRemaining > 0
                  ? `${todayRemaining}문제 더 풀면 오늘 목표 완료`
                  : <span className="flex items-center gap-1">오늘 목표를 달성했어요! 잘했어요 <Sparkles className="w-3.5 h-3.5 text-[#D85A30]" /></span>}
              </p>

              {/* 통계 3박스 */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                <div className="bg-gray-50 rounded-xl py-3 text-center">
                  <p className="text-lg font-black text-gray-900 tabular-nums">{total}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">총제출</p>
                </div>
                <div className="bg-gray-50 rounded-xl py-3 text-center">
                  <p className="text-lg font-black text-[#639922] tabular-nums">{correct}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">정답</p>
                </div>
                <div className="bg-gray-50 rounded-xl py-3 text-center">
                  <p className="text-lg font-black text-[#D85A30] tabular-nums">{wrong}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">오답</p>
                </div>
              </div>

              {/* AI 추천 문제 */}
              {nextProblemId && (
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">AI 추천 문제</p>
                  <div className="flex items-center justify-between gap-2 bg-gray-50 rounded-xl p-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{nextProblemTitle ?? "다음 문제"}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {currentCourse?.label ?? "기초 과정"} · 난이도 <Star className="inline w-3 h-3 -mt-0.5 fill-current" /><Star className="inline w-3 h-3 -mt-0.5 fill-current" />
                      </p>
                    </div>
                    <button
                      onClick={() => router.push(`/problems/${nextProblemId}`)}
                      className="shrink-0 px-3 py-1.5 bg-[#534AB7] text-white text-xs font-bold rounded-lg hover:bg-[#443DA0] transition-colors"
                    >
                      바로 풀기
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 4-3. 오늘의 숙제 */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-900">오늘의 숙제</h2>
                {hwTotal > 0 && (
                  <span className="text-[11px] text-gray-400">{hwSubmitted}/{hwTotal}개 완료</span>
                )}
              </div>

              {loadingHomework ? (
                <div className="flex items-center justify-center py-6">
                  <div className="w-4 h-4 border-2 border-[#534AB7] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : hwTotal === 0 || hwSubmitted === hwTotal ? (
                <div className="flex flex-col items-center text-center py-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle className="w-6 h-6 text-emerald-500" />
                  </div>
                  <p className="text-sm font-bold text-gray-800 mb-1">오늘 숙제 모두 완료!</p>
                  <p className="text-[11px] text-gray-400 mb-4">추천 문제를 풀거나 복습해보세요</p>
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={() => router.push(nextProblemId ? `/problems/${nextProblemId}` : "/problems")}
                      className="flex-1 py-2 bg-[#534AB7] text-white text-xs font-bold rounded-xl hover:bg-[#443DA0] transition-colors"
                    >
                      추천 문제 풀기
                    </button>
                    <button
                      onClick={() => router.push("/history?filter=wrong")}
                      className="flex-1 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-200 transition-colors"
                    >
                      복습하러 가기
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {(hwExpanded ? sortedHomework : sortedHomework.slice(0, 3)).map((hw, i) => {
                    const isSubmitted = hw.isSubmitted
                    const isCorrect   = hw.isCorrect
                    const badgeLabel  = !isSubmitted ? "미제출" : isCorrect === false ? "진행중" : "완료"
                    const badgeCls    = !isSubmitted
                      ? "bg-red-50 text-red-600 border-red-100"
                      : isCorrect === false
                        ? "bg-amber-50 text-amber-600 border-amber-100"
                        : "bg-emerald-50 text-emerald-700 border-emerald-100"

                    return (
                      <div key={`${hw.assignmentId}-${hw.problemId}-${i}`}
                        className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{hw.problemTitle}</p>
                          <p className="text-[10px] text-gray-400 truncate mt-0.5">{hw.assignmentTitle}</p>
                        </div>
                        <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${badgeCls}`}>
                          {badgeLabel}
                        </span>
                        <button
                          onClick={() => router.push(`/problems/${hw.problemId}`)}
                          className="shrink-0 text-[10px] font-bold px-2 py-1 bg-[#534AB7]/10 text-[#534AB7] rounded-lg hover:bg-[#534AB7]/20 transition-colors"
                        >
                          풀기
                        </button>
                      </div>
                    )
                  })}

                  {homework.length > 3 && (
                    <button
                      onClick={() => setHwExpanded(v => !v)}
                      className="w-full text-center text-xs font-semibold text-[#534AB7] hover:text-[#443DA0] py-1.5 transition-colors"
                    >
                      {hwExpanded ? "접기 ▲" : `${homework.length - 3}개 더 보기 ▾`}
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>{/* end 우측 사이드바 */}

        </div>{/* end 2컬럼 */}

      </PageLayout>

      <AiTutorChat
        isOpen={aiChatOpen}
        onClose={() => setAiChatOpen(false)}
        userName={userName}
        currentCourse={currentCourse}
        rate={rate}
        todaySolved={todaySolved}
        dailyGoal={dailyGoal}
        wrong={wrong}
        nextProblemTitle={nextProblemTitle}
      />
    </div>
  )
}
