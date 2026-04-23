"use client"

import { useEffect, useState, useMemo } from "react"
import { useSession, signOut } from "next-auth/react"
import { redirect, useRouter } from "next/navigation"
import Link from "next/link"
import CodeOnLogo from "@/components/ui/CodeOnLogo"
import type { LucideIcon } from "lucide-react"
import {
  CheckCircle, Circle, ChevronRight, Flame, BookOpen,
  TrendingUp, Target, Zap, ArrowRight,
  Trophy, LogOut, CheckSquare, ClipboardList,
  Star, Users, ShieldCheck, Sprout, BrainCircuit, Award,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

// ── 아이콘 맵 ─────────────────────────────────────────────────────────────
const COURSE_ICON_MAP: Record<string, { Icon: LucideIcon; iconBg: string; iconColor: string }> = {
  basic:       { Icon: Sprout,       iconBg: "bg-green-50",   iconColor: "text-green-600"  },
  algorithm:   { Icon: BrainCircuit, iconBg: "bg-violet-50",  iconColor: "text-violet-600" },
  certificate: { Icon: Award,        iconBg: "bg-amber-50",   iconColor: "text-amber-600"  },
  challenge:   { Icon: Flame,        iconBg: "bg-orange-50",  iconColor: "text-orange-500" },
  practical:   { Icon: ShieldCheck,  iconBg: "bg-blue-50",    iconColor: "text-blue-500"   },
}

// ── 과정 메타 ──────────────────────────────────────────────────────────────
// 학습 과정: 정규 커리큘럼 3개
const STUDY_COURSES = [
  { slug: "basic",       label: "기초 과정",    description: "파이썬 기본 문법과 코딩의 기초" },
  { slug: "algorithm",   label: "알고리즘 과정", description: "핵심 알고리즘으로 실력 향상" },
  { slug: "certificate", label: "자격증 과정",  description: "코딩 자격증 취득 대비" },
]

const ALL_COURSES = [...STUDY_COURSES, { slug: "practical", label: "실전 문제", description: "" }, { slug: "challenge", label: "도전 문제", description: "" }]

const COURSE_CATEGORY: Record<string, string> = {
  basic:       "파이썬기초",
  algorithm:   "파이썬알고리즘",
  certificate: "파이썬자격증",
  practical:   "파이썬실전",
  challenge:   "파이썬도전",
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

const TODAY_GOAL = 3
const DAY_MS     = 24 * 60 * 60 * 1000

// ── 날짜 포맷 ─────────────────────────────────────────────────────────────
function formatRelativeTime(dateStr?: string) {
  if (!dateStr) return ""
  // Supabase timestamp 컬럼이 Z/+00:00 없이 반환될 때 UTC로 강제 파싱
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
        <CheckCircle className="w-5 h-5 text-white drop-shadow" fill="rgba(255,255,255,0.9)" stroke="rgba(99,102,241,0.5)" strokeWidth={1.5} />
      </span>
    )
  }
  return <Circle className="w-5 h-5 text-white/30" strokeWidth={2} />
}

// ── 정규 과정 카드 ────────────────────────────────────────────────────────
function StudyCourseCard({ course, stat }: { course: typeof STUDY_COURSES[0]; stat: CourseStat }) {
  const { slug, label, description } = course
  const { progress, completed, total, last_learned, is_current } = stat
  const { Icon, iconBg, iconColor } = COURSE_ICON_MAP[slug]
  const inProgress = progress > 0 && !is_current

  return (
    <Link
      href={`/course/${slug}`}
      className={`
        group block rounded-2xl border-2 p-5
        transition-all duration-200 hover:-translate-y-1 hover:shadow-lg
        ${is_current
          ? "bg-indigo-50/40 dark:bg-indigo-900/10 border-indigo-500 shadow-md shadow-indigo-100 dark:shadow-indigo-900/20 hover:border-indigo-600"
          : "bg-white dark:bg-gray-800 border-transparent shadow-sm hover:border-indigo-200 dark:hover:border-indigo-700"
        }
      `}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105`}>
          <Icon className={`w-5 h-5 ${iconColor}`} strokeWidth={1.75} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white">{label}</h3>
            {is_current && (
              <span className="inline-flex items-center gap-1 text-[11px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold px-1.5 py-0.5 rounded-full leading-none">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                학습 중
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{description}</p>
        </div>
      </div>
      <div className="mb-3">
        <div className="flex justify-between items-center text-xs mb-1.5">
          <span className={`font-medium ${is_current ? "text-indigo-500" : "text-gray-500"}`}>진행률</span>
          <span className={`tabular-nums font-bold ${is_current ? "text-indigo-600" : "text-gray-600"}`}>
            {completed} / {total > 0 ? total : "–"}문제
          </span>
        </div>
        <div className={`w-full rounded-full h-2 overflow-hidden ${is_current ? "bg-indigo-100 dark:bg-indigo-900/30" : "bg-gray-100 dark:bg-gray-700"}`}>
          <div
            className={`h-full rounded-full transition-all duration-500 ${is_current ? "bg-gradient-to-r from-indigo-500 to-indigo-400" : inProgress ? "bg-indigo-300" : "bg-gray-200"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-right text-xs tabular-nums mt-0.5 text-gray-600">{progress}%</p>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-600 font-medium">{last_learned ? `${last_learned}에 학습` : "학습 기록 없음"}</span>
        <span className="inline-flex items-center gap-0.5 text-xs font-bold text-indigo-500 transition-all group-hover:gap-1">
          {progress > 0 ? "이어서 학습하기" : "시작하기"}
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Link>
  )
}

// ── 도전 문제 카드 — 오렌지/옐로우, 커뮤니티형 ─────────────────────────────
function ChallengeCard({ stat, challengeCount }: { stat: CourseStat; challengeCount: number }) {
  const { progress, completed, total, last_learned } = stat

  return (
    <Link
      href="/course/challenge"
      className="group relative block bg-gradient-to-br from-orange-50 to-amber-50/60 dark:from-gray-900 dark:to-gray-900 rounded-2xl border border-orange-100 dark:border-orange-800/40 p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-orange-300 dark:hover:border-orange-700"
    >
      {/* HOT 배지 */}
      <span className="absolute top-3 right-3 text-[10px] font-extrabold bg-orange-500 text-white px-2 py-0.5 rounded-full tracking-wide">HOT</span>
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5 text-orange-500" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-900 dark:text-white">도전 문제</h3>
            <div className="flex items-center gap-1 mt-0.5">
              <Users className="w-2.5 h-2.5 text-orange-500" />
              <span className="text-[11px] text-orange-600 dark:text-orange-400 font-semibold">누구나 참여 가능</span>
            </div>
          </div>
        </div>
      </div>

      {/* 설명 */}
      <p className="text-[13px] text-gray-600 dark:text-gray-300 leading-[1.75] mb-4">
        학생들이 직접 만든 문제에 도전하고, 나만의 문제도 공유해보세요.
      </p>

      {/* 진행률 */}
      <div className="mb-3">
        <div className="flex justify-between items-center text-xs mb-1.5">
          <span className="text-orange-500 font-medium">진행률</span>
          <span className="tabular-nums font-bold text-orange-600">{completed} / {total > 0 ? total : "–"}문제</span>
        </div>
        <div className="w-full rounded-full h-2 overflow-hidden bg-orange-100 dark:bg-orange-900/30">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-yellow-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-right text-xs tabular-nums mt-0.5 text-gray-600">{progress}%</p>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-600 font-medium">{last_learned ? `${last_learned}에 학습` : "아직 미시작"}</span>
        <span className="inline-flex items-center gap-0.5 text-xs font-bold text-orange-600 transition-all group-hover:gap-1">
          {progress > 0 ? "이어서 도전하기" : "도전하기"}
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Link>
  )
}

// ── 실전 문제 카드 — 블루/네이비, 검증형 ────────────────────────────────────
function PracticalCard({ stat }: { stat: CourseStat }) {
  const { progress, completed, total, last_learned } = stat

  return (
    <Link
      href="/course/practical"
      className="group relative block bg-gradient-to-br from-blue-50 to-indigo-50/60 dark:from-gray-900 dark:to-gray-900 rounded-2xl border border-blue-100 dark:border-blue-800/40 p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700"
    >
      {/* NEW 배지 */}
      <span className="absolute top-3 right-3 text-[10px] font-extrabold bg-blue-500 text-white px-2 py-0.5 rounded-full tracking-wide">NEW</span>
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-blue-500" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-900 dark:text-white">실전 문제</h3>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">시험 대비 · 실력 측정</span>
            </div>
          </div>
        </div>
      </div>

      {/* 설명 */}
      <p className="text-[13px] text-gray-600 dark:text-gray-300 leading-[1.75] mb-4">
        학원 전용 기출 문제로 실전 감각을 익히고 실력을 검증받으세요.
      </p>

      {/* 진행률 */}
      <div className="mb-3">
        <div className="flex justify-between items-center text-xs mb-1.5">
          <span className="text-blue-600 font-medium">진행률</span>
          <span className="tabular-nums font-bold text-blue-700">{completed} / {total > 0 ? total : "–"}문제</span>
        </div>
        <div className="w-full rounded-full h-2 overflow-hidden bg-blue-100 dark:bg-blue-900/30">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-right text-xs tabular-nums mt-0.5 text-gray-600">{progress}%</p>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-600 font-medium">{last_learned ? `${last_learned}에 학습` : "아직 미시작"}</span>
        <span className="inline-flex items-center gap-0.5 text-xs font-bold text-blue-600 transition-all group-hover:gap-1">
          {progress > 0 ? "이어서 풀기" : "시작하기"}
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
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

  const [allProblems] = useState<Problem[]>(initialProblems)
  const [submissions,        setSubmissions]       = useState<Submission[]>([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(true)
  const [correctSubs,        setCorrectSubs]        = useState<CorrectSub[]>([])
  const [loadingProgress,    setLoadingProgress]    = useState(true)
  const [wrongProblemIds,    setWrongProblemIds]    = useState<Set<string>>(new Set())
  const [homework,           setHomework]           = useState<HomeworkItem[]>([])
  const [loadingHomework,    setLoadingHomework]    = useState(true)
  const [hwExpanded,         setHwExpanded]         = useState(false)

  const userId   = (session?.user as any)?.id as string | undefined
  const userName = session?.user?.name ?? "학생"

  // ── 최근 제출 초기 로드 ────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return
    ;(async () => {
      const { data } = await supabase
        .from("submissions")
        .select("id, problem_id, result, is_correct, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20)
      setSubmissions(data ?? [])
      setLoadingSubmissions(false)
    })()
  }, [userId])

  // ── 정답 제출 초기 로드 ────────────────────────────────────────────────
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

  // ── 오답 문제 ID 로드 (오답 노트 카드 카운트 전용) ───────────────────────
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

  // ── Realtime 구독 ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`dashboard-submissions:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "submissions", filter: `user_id=eq.${userId}` },
        (payload) => {
          const newSub = payload.new as Submission
          setSubmissions(prev => [newSub, ...prev].slice(0, 20))
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

  // ── 배정된 숙제 로드 ──────────────────────────────────────────────────────
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
  const total          = submissions.length
  const correct        = submissions.filter(s => s.is_correct === true).length
  const wrong          = submissions.filter(s => s.is_correct === false).length
  const rate           = total > 0 ? Math.round((correct / total) * 100) : 0

  // 오답 노트 카드 숫자 — 미해결 오답 문제 수 (정답 처리된 문제 제외)
  const correctProblemIds = useMemo(() => new Set(correctSubs.map(s => s.problem_id)), [correctSubs])
  const wrongNoteCount    = useMemo(
    () => [...wrongProblemIds].filter(id => !correctProblemIds.has(id)).length,
    [wrongProblemIds, correctProblemIds],
  )
  const today          = new Date().toDateString()
  const todaySolved    = submissions.filter(s => s.is_correct === true && s.created_at && new Date(s.created_at).toDateString() === today).length
  const todayRemaining = Math.max(0, TODAY_GOAL - todaySolved)

  // 현재 학습 과정 — 정규 과정(study) 우선, 없으면 전체에서 찾기
  const currentCourse = ALL_COURSES.find(c => courseStats[c.slug]?.is_current) ?? null

  const basicStat      = courseStats["basic"]
  const basicProgress  = basicStat?.progress  ?? 0
  const basicCompleted = basicStat?.completed ?? 0
  const basicTotal     = basicStat?.total     ?? 0

  // ── 학습 스트릭 ───────────────────────────────────────────────────────
  const streak = useMemo(() => {
    if (correctSubs.length === 0) return 0
    const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0)
    const uniqueDays = new Set(correctSubs.map(s => { const d = new Date(s.created_at); d.setHours(0, 0, 0, 0); return d.getTime() }))
    let count = 0, checkDay = todayMidnight.getTime()
    if (!uniqueDays.has(checkDay)) checkDay -= DAY_MS
    while (uniqueDays.has(checkDay)) { count++; checkDay -= DAY_MS }
    return count
  }, [correctSubs])

  // ── AI 맞춤 제안 ──────────────────────────────────────────────────────
  const aiSuggestion = useMemo(() => {
    if (total === 0)               return `${userName}님, 첫 문제를 풀어보세요. 잘 할 수 있어요.`
    if (rate >= 90 && total >= 5)  return `정답률이 매우 높아요! 다음 단계 과정에 도전해 보세요`
    if (wrong > correct)           return `틀린 문제를 복습하면 실력이 빠르게 올라요`
    if (streak >= 3)               return `${streak}일 연속 학습 중! 꾸준함이 실력을 만들어요.`
    if (todaySolved >= TODAY_GOAL) return `오늘 목표 달성! 이 기세로 내일도 꾸준히 학습해 보세요.`
    if (currentCourse?.slug === "basic") return `기초를 탄탄히 다지고 있어요. 잘하고 있어요!`
    return `꾸준히 문제를 풀면 반드시 실력이 올라요!`
  }, [total, rate, wrong, correct, streak, todaySolved, currentCourse, userName])

  // ── 문제 제목 맵 ──────────────────────────────────────────────────────
  const problemTitles = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const p of allProblems) { if (p.title) map[p.id] = p.title }
    return map
  }, [allProblems])

  // ── 마지막 제출 & 다음 문제 ────────────────────────────────────────────
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

  // ── 숙제 우선순위 정렬 (미제출 > 진행중(오답) > 완료) ────────────────────────
  const sortedHomework = useMemo(() => {
    return [...homework].sort((a, b) => {
      const weightA = !a.isSubmitted ? 0 : (a.isCorrect === false ? 1 : 2)
      const weightB = !b.isSubmitted ? 0 : (b.isCorrect === false ? 1 : 2)
      return weightA - weightB
    })
  }, [homework])

  // ── 숙제 집계 ─────────────────────────────────────────────────────────────
  const hwTotal         = homework.length
  const hwSubmitted     = homework.filter(h => h.isSubmitted).length
  const hwRemaining     = hwTotal - hwSubmitted
  
  // 가장 시급한 과제(미제출 또는 오답)를 다음 풀이(CTA)로 지정
  const firstPendingHwId = sortedHomework.find(h => !h.isSubmitted || h.isCorrect === false)?.problemId ?? null

  const nextHref = firstPendingHwId
    ? `/problems/${firstPendingHwId}`
    : nextProblemId ? `/problems/${nextProblemId}`
    : currentCourse ? `/course/${currentCourse.slug}`
    : "/problems/max-number"

  // 도전 문제 수 (published만)
  const challengeCount = allProblems.filter(p =>
    p.category === COURSE_CATEGORY["challenge"] &&
    (!p.status || p.status === "published")
  ).length

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="opacity-90 hover:opacity-100 transition-opacity">
            <CodeOnLogo />
          </Link>
          <div className="flex items-center gap-3">
            {streak > 0 && (
              <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-orange-50 dark:bg-orange-900/30 rounded-full border border-orange-100 dark:border-orange-800">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-xs font-bold text-orange-600 dark:text-orange-400">{streak}일 연속</span>
              </div>
            )}
            <span className="text-sm text-gray-400 dark:text-gray-500 hidden sm:block">{userName}님</span>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">로그아웃</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 pt-20 pb-20 space-y-4">

        {/* ── 1. 히어로 ─────────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-3xl px-7 py-6 text-white relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full pointer-events-none" />
          <div className="absolute right-8 -bottom-6 w-28 h-28 bg-white/5 rounded-full pointer-events-none" />
          <div className="relative">

            <p className="text-indigo-200 text-xs font-medium mb-2">
              {userName}님의 오늘 목표
              {currentCourse && <span className="ml-2 text-indigo-300">· {currentCourse.label} 진행 중</span>}
            </p>

            <h1 className="text-xl font-extrabold tracking-tight leading-tight mb-4">
              {todayRemaining > 0
                ? <>오늘 문제 <span className="text-yellow-300">{todayRemaining}개</span> 더 풀면 목표 달성!</>
                : "오늘 학습 목표를 달성했어요."
              }
            </h1>

            {/* 목표 도트 */}
            <div className="flex items-center gap-2 mb-4">
              {Array.from({ length: TODAY_GOAL }).map((_, i) => <GoalDot key={i} filled={i < todaySolved} />)}
              <span className="text-xs text-white/60 font-medium ml-1">{todaySolved}/{TODAY_GOAL} 완료</span>
            </div>

            {/* CTA 버튼 — 단일 */}
            <div className="mt-2">
              <button
                onClick={() => router.push(nextHref)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-50 active:scale-95 transition-all shadow-lg shadow-indigo-700/25"
              >
                {firstPendingHwId ? "숙제 풀기" : "다음 문제 풀기"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>

        {/* ── 2. 요약 카드 4개 ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

          {/* 오답 노트 */}
          <button
            onClick={() => router.push("/history?filter=wrong")}
            className="group bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-left hover:border-red-200 hover:shadow-md transition-all flex flex-col"
          >
            <div className="w-9 h-9 bg-red-50 dark:bg-red-900/30 rounded-xl flex items-center justify-center mb-3 group-hover:bg-red-100 transition-colors">
              <ClipboardList className="w-4 h-4 text-red-500" strokeWidth={1.75} />
            </div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums leading-none">
              {wrongNoteCount}<span className="text-sm font-medium text-gray-400 ml-0.5">개</span>
            </p>
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 mt-1.5">오답 노트</p>
            <p className="text-[11px] text-slate-400 mt-0.5">다시 풀어야 할 문제</p>
            <div className="mt-auto pt-3 flex items-center gap-0.5 text-xs font-semibold text-red-500 group-hover:gap-1 transition-all">
              {wrongNoteCount > 0 ? "복습하기" : "새 문제 보기"}
              <ChevronRight className="w-3 h-3" />
            </div>
          </button>

          {/* 정답률 */}
          <button
            onClick={() => router.push("/stats")}
            className="group bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-left hover:border-blue-200 hover:shadow-md transition-all flex flex-col"
          >
            <div className="w-9 h-9 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
              <TrendingUp className="w-4 h-4 text-blue-500" strokeWidth={1.75} />
            </div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums leading-none">
              {rate}<span className="text-sm font-medium text-gray-400 ml-0.5">%</span>
            </p>
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 mt-1.5">정답률</p>
            <div className="mt-auto pt-3 flex items-center gap-0.5 text-xs font-semibold text-blue-500 group-hover:gap-1 transition-all">
              {total > 0 ? `제출 ${total}회` : "기록 없음"}
              <ChevronRight className="w-3 h-3" />
            </div>
          </button>

          {/* 기초 과정 진행률 */}
          <button
            onClick={() => router.push("/course/basic")}
            className="group bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-left hover:border-green-200 hover:shadow-md transition-all flex flex-col"
          >
            <div className="w-9 h-9 bg-green-50 dark:bg-green-900/30 rounded-xl flex items-center justify-center mb-3 group-hover:bg-green-100 transition-colors">
              <Target className="w-4 h-4 text-green-500" strokeWidth={1.75} />
            </div>
            {loadingProgress ? (
              <div className="h-8 w-14 bg-gray-100 dark:bg-gray-700 rounded animate-pulse mb-1" />
            ) : (
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums leading-none">
                {basicProgress}<span className="text-sm font-medium text-gray-400 ml-0.5">%</span>
              </p>
            )}
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 mt-1.5">기초 과정</p>
            <div className="mt-auto pt-3 flex items-center gap-0.5 text-xs font-semibold text-green-600 group-hover:gap-1 transition-all">
              {loadingProgress ? "–" : basicCompleted > 0 ? "이어 학습하기" : "시작하기"}
              <ChevronRight className="w-3 h-3" />
            </div>
          </button>

          {/* 오늘 목표 */}
          <button
            onClick={() => {
              const el = document.getElementById("homework-section")
              if (el) el.scrollIntoView({ behavior: "smooth", block: "center" })
              else router.push(nextHref)
            }}
            className="group bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 text-left hover:border-amber-200 hover:shadow-md transition-all flex flex-col"
          >
            <div className="w-9 h-9 bg-amber-50 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mb-3 group-hover:bg-amber-100 transition-colors">
              <CheckSquare className="w-4 h-4 text-amber-500" strokeWidth={1.75} />
            </div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums leading-none">
              {todaySolved}<span className="text-sm font-medium text-gray-400 ml-0.5">/{TODAY_GOAL}</span>
            </p>
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 mt-1.5">오늘 목표</p>
            <div className="mt-auto pt-3 flex items-center gap-0.5 text-xs font-semibold text-amber-600 group-hover:gap-1 transition-all">
              {todaySolved >= TODAY_GOAL ? "목표 달성" : `${todayRemaining}개 남음`}
              {todaySolved < TODAY_GOAL && <ChevronRight className="w-3 h-3" />}
            </div>
          </button>

        </div>

        {/* ── 3. 마지막 학습 + 오늘 학습 현황 ───────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* ── LEFT 컬럼: 마지막 학습 + 나의 활동 기록 ── */}
          <div className="flex flex-col gap-4">

            {/* 마지막 학습 */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-indigo-100 dark:border-indigo-900/40">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">마지막 학습</h2>

              {loadingSubmissions ? (
                <div className="flex items-center justify-center py-6">
                  <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !lastSub ? (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center mb-2">
                    <BookOpen className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">아직 풀이 기록이 없어요</p>
                  <p className="text-xs text-gray-400 mb-3">첫 문제를 풀고 학습을 시작해 보세요</p>
                  <button
                    onClick={() => router.push("/problems/max-number")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-400 text-white rounded-xl text-xs font-bold hover:bg-indigo-500 active:scale-95 transition-all"
                  >
                    첫 문제 풀러 가기 <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  {/* 마지막 풀이 블록 */}
                  <div className={`rounded-xl p-3 mb-2 ${lastSub.is_correct ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-gray-500 mb-0.5">마지막으로 푼 문제</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white leading-snug">{lastProblem}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{formatRelativeTime(lastSub.created_at)}</p>
                      </div>
                      <span className={`shrink-0 inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg ${lastSub.is_correct ? "bg-green-200 dark:bg-green-800/60 text-green-700 dark:text-green-300" : "bg-red-200 dark:bg-red-800/60 text-red-700 dark:text-red-300"}`}>
                        {lastSub.is_correct ? <><CheckCircle className="w-3 h-3" /> 정답</> : <><Trophy className="w-3 h-3" /> 오답</>}
                      </span>
                    </div>
                  </div>

                  {/* 액션 링크 */}
                  <div className="flex items-center justify-between mb-2">
                    {nextProblemId && nextProblemTitle ? (
                      <Link
                        href={`/problems/${nextProblemId}`}
                        className="flex items-center gap-0.5 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-semibold group/next transition-colors min-w-0"
                      >
                        <ChevronRight className="w-3.5 h-3.5 group-hover/next:translate-x-0.5 transition-transform shrink-0" />
                        <span className="underline underline-offset-2 truncate max-w-[130px]">{nextProblemTitle}</span>
                      </Link>
                    ) : <span />}
                    <Link
                      href={`/problems/${lastSub.problem_id}`}
                      className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold transition-colors shrink-0 ml-2"
                    >
                      다시 풀기
                    </Link>
                  </div>

                  {/* 최근 풀이 */}
                  {submissions.length > 1 && (
                    <>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">최근 풀이</p>
                      <div className="space-y-0.5">
                        {submissions.slice(1, 3).map((sub, i) => (
                          <button key={i} onClick={() => router.push(`/problems/${sub.problem_id}`)}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sub.is_correct ? "bg-green-400" : "bg-red-400"}`} />
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1 text-left">{problemTitles[sub.problem_id] ?? sub.problem_id}</p>
                            <span className="text-[11px] text-indigo-400 shrink-0">{formatRelativeTime(sub.created_at)}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {/* 나의 활동 기록 */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="mb-3">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">나의 활동 기록</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">지금까지 달성한 대표 성취</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {([
                  {
                    label: "첫 정답",
                    desc: correctSubs.length > 0 ? "달성 완료" : "아직 미달성",
                    earned: correctSubs.length > 0,
                    Icon: CheckCircle,
                    earnedColor: "text-green-500",
                    earnedBg:    "bg-green-50 border-green-100",
                    iconBg:      "bg-green-100",
                  },
                  {
                    label: "3일 연속",
                    desc: streak >= 3 ? `${streak}일 달성` : `현재 ${streak}일`,
                    earned: streak >= 3,
                    Icon: Flame,
                    earnedColor: "text-orange-500",
                    earnedBg:    "bg-orange-50 border-orange-100",
                    iconBg:      "bg-orange-100",
                  },
                  {
                    label: "숙제 완료",
                    desc: hwTotal > 0 ? `${hwSubmitted}/${hwTotal}개` : "배정 없음",
                    earned: hwTotal > 0 && hwSubmitted === hwTotal,
                    Icon: Award,
                    earnedColor: "text-amber-500",
                    earnedBg:    "bg-amber-50 border-amber-100",
                    iconBg:      "bg-amber-100",
                  },
                ] as const).map(({ label, desc, earned, Icon, earnedColor, earnedBg, iconBg }) => (
                  <div key={label}
                    className={`flex flex-col items-center text-center p-3 rounded-xl border transition-colors
                      ${earned ? earnedBg : "bg-gray-50 border-gray-100 dark:bg-gray-700/30 dark:border-gray-600"}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${earned ? iconBg : "bg-gray-100 dark:bg-gray-700"}`}>
                      <Icon className={`w-4 h-4 ${earned ? earnedColor : "text-gray-300"}`} strokeWidth={1.75} />
                    </div>
                    <p className={`text-[11px] font-bold leading-tight mb-0.5 ${earned ? "text-gray-800 dark:text-gray-100" : "text-gray-400"}`}>{label}</p>
                    <p className={`text-[10px] leading-tight ${earned ? "text-gray-500" : "text-gray-300"}`}>{desc}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>{/* end LEFT 컬럼 */}

          {/* 오늘 학습 현황 + 오늘의 숙제 — 세로 2카드 */}
          <div className="flex flex-col gap-4">

            {/* 오늘 학습 현황 (요약 전용) */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">오늘 학습 현황</h2>

              {/* 숙제 진행률 — 배정 과제 기준 (없으면 TODAY_GOAL fallback) */}
              {(() => {
                const pNumer   = hwTotal > 0 ? hwSubmitted : todaySolved
                const pDenom   = hwTotal > 0 ? hwTotal     : TODAY_GOAL
                const isDone   = pNumer >= pDenom
                const pct      = pDenom > 0 ? Math.min(100, Math.round((pNumer / pDenom) * 100)) : 0
                const subLabel = hwTotal > 0
                  ? (isDone ? "오늘 숙제 완료" : "오늘 숙제")
                  : (isDone ? "오늘 목표 달성" : "오늘 목표")
                const footLabel = hwTotal > 0
                  ? (isDone ? "내일도 꾸준히 학습해 보세요!" : `${hwRemaining}개 미제출`)
                  : (isDone ? "내일도 꾸준히 학습해 보세요!" : `${pDenom - pNumer}문제 더 풀면 오늘 목표 완료`)
                return (
                  <div className={`rounded-xl p-4 mb-4 ${isDone ? "bg-green-50 dark:bg-green-900/20" : "bg-amber-50 dark:bg-amber-900/20"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className={`text-sm font-bold ${isDone ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"}`}>{subLabel}</p>
                      <span className={`text-sm font-extrabold tabular-nums ${isDone ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
                        {pNumer}<span className="text-xs font-medium opacity-70">/{pDenom}</span>
                      </span>
                    </div>
                    <div className={`w-full rounded-full h-3 overflow-hidden ${isDone ? "bg-green-200 dark:bg-green-800" : "bg-amber-200 dark:bg-amber-800"}`}>
                      <div className={`h-full rounded-full transition-all duration-700 ${isDone ? "bg-gradient-to-r from-green-500 to-emerald-400" : "bg-gradient-to-r from-amber-500 to-yellow-400"}`}
                        style={{ width: `${pct}%` }} />
                    </div>
                    <p className={`text-xs mt-1.5 ${isDone ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>{footLabel}</p>
                  </div>
                )
              })()}

              {/* 누적 통계 */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">총 제출</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200 tabular-nums">{total}회</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">정답</span>
                  <span className="font-semibold text-green-600 tabular-nums">{correct}개</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">오답</span>
                  <span className="font-semibold text-red-500 tabular-nums">{wrong}개</span>
                </div>
                <div className="pt-1">
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-full rounded-full transition-all duration-700" style={{ width: `${rate}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>정답률</span>
                    <span className="tabular-nums font-semibold text-indigo-500">{rate}%</span>
                  </div>
                </div>
              </div>

              {/* AI 맞춤 제안 */}
              <div className="flex items-start gap-2 px-3 py-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl mb-3 border border-indigo-100 dark:border-indigo-800/50">
                <Zap className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
                <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">{aiSuggestion}</p>
              </div>

              {/* 추천 문제 */}
              {nextProblemId ? (
                <button
                  onClick={() => router.push(`/problems/${nextProblemId}`)}
                  className="w-full flex items-center justify-between px-3.5 py-3 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl transition-all group border border-indigo-100 dark:border-indigo-800"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Zap className="w-4 h-4 text-indigo-500 shrink-0" />
                    <div className="text-left min-w-0">
                      <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">추천 문제</p>
                      <p className="text-xs text-indigo-500 truncate">{nextProblemTitle ?? "다음 문제로 이동"}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-white bg-indigo-500 hover:bg-indigo-600 px-2.5 py-1 rounded-lg transition-colors shrink-0 ml-2">
                    바로 풀기
                  </span>
                </button>
              ) : currentCourse ? (
                <button
                  onClick={() => router.push(`/course/${currentCourse.slug}`)}
                  className="w-full flex items-center justify-between px-3.5 py-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all group border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800"
                >
                  <div className="flex items-center gap-2.5">
                    {(() => { const m = COURSE_ICON_MAP[currentCourse.slug]; return m ? <div className={`w-8 h-8 ${m.iconBg} rounded-lg flex items-center justify-center shrink-0`}><m.Icon className={`w-4 h-4 ${m.iconColor}`} strokeWidth={1.75} /></div> : <BookOpen className="w-5 h-5 text-gray-400" /> })()}
                    <div className="text-left">
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-300 group-hover:text-indigo-700 transition-colors">{currentCourse.label}</p>
                      <p className="text-xs text-gray-500 group-hover:text-indigo-500 transition-colors">이어서 학습하기</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                </button>
              ) : null}
            </div>

            {/* 오늘의 숙제 카드 */}
            <div id="homework-section" className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 scroll-mt-24">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">오늘의 숙제</h2>
                {hwTotal > 0 && (
                  <span className="text-[11px] font-semibold text-gray-400 tabular-nums">전체 {hwTotal}개</span>
                )}
              </div>
              {hwTotal > 0 && (
                <p className="text-xs text-gray-500 mb-4">배정된 {hwTotal}개 중 {hwSubmitted}개 완료</p>
              )}

              {loadingHomework ? (
                <div className="flex items-center justify-center py-6">
                  <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : hwTotal === 0 ? (
                /* 빈 상태 */
                <div className="flex flex-col items-center justify-center py-5 text-center">
                  <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center mb-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-0.5">오늘의 숙제를 모두 완료했어요</p>
                  <p className="text-xs text-gray-400 mb-4">이제 추천 문제를 풀거나 지난 문제를 복습해보세요</p>
                  <div className="flex gap-2">
                    <button onClick={() => router.push(nextProblemId ? `/problems/${nextProblemId}` : "/problems")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 text-white text-xs font-bold rounded-xl hover:bg-indigo-600 transition-colors">
                      <Zap className="w-3.5 h-3.5" /> 추천 문제 풀기
                    </button>
                    <button onClick={() => router.push("/history?filter=wrong")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                      복습하러 가기
                    </button>
                  </div>
                </div>
              ) : hwSubmitted === hwTotal ? (
                /* 전체 완료 */
                <div className="flex flex-col items-center justify-center py-5 text-center">
                  <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center mb-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                  <p className="text-sm font-bold text-green-700 dark:text-green-400 mb-0.5">오늘의 숙제를 모두 완료했어요!</p>
                  <p className="text-xs text-gray-400 mb-4">이제 추천 문제를 풀거나 지난 문제를 복습해보세요</p>
                  <div className="flex gap-2">
                    <button onClick={() => router.push(nextProblemId ? `/problems/${nextProblemId}` : "/problems")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 text-white text-xs font-bold rounded-xl hover:bg-indigo-600 transition-colors">
                      <Zap className="w-3.5 h-3.5" /> 추천 문제 풀기
                    </button>
                    <button onClick={() => router.push("/history?filter=wrong")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                      복습하러 가기
                    </button>
                  </div>
                </div>
              ) : (
                /* 숙제 목록 */
                <div className="space-y-1.5">
                  {(hwExpanded ? sortedHomework : sortedHomework.slice(0, 3)).map((hw, i) => {
                    const isSubmitted = hw.isSubmitted
                    const isCorrect   = hw.isCorrect

                    let badgeLabel = "완료";
                    let badgeCls   = "bg-emerald-50 text-emerald-700 border-emerald-100";
                    let btnLabel   = "다시 보기";
                    let btnCls     = "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300";

                    if (!isSubmitted) {
                      badgeLabel = "미제출";
                      badgeCls   = "bg-red-50 text-red-600 border-red-100";
                      btnLabel   = "바로 풀기";
                      btnCls     = "bg-indigo-500 hover:bg-indigo-600 text-white";
                    } else if (isCorrect === false) {
                      badgeLabel = "진행중";
                      badgeCls   = "bg-amber-50 text-amber-700 border-amber-100";
                      btnLabel   = "이어서 하기";
                      btnCls     = "bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300";
                    }

                    const diffDot = hw.difficulty === "쉬움" ? "bg-green-400"
                      : hw.difficulty === "보통" ? "bg-amber-400"
                      : hw.difficulty === "어려움" ? "bg-red-400"
                      : null

                    return (
                      <div key={`${hw.assignmentId}-${hw.problemId}-${i}`}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-colors
                          ${!isSubmitted ? "border-red-100 bg-red-50/40 dark:bg-red-900/10 dark:border-red-800/30" : "border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {diffDot && <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${diffDot}`} />}
                            <p className={`text-sm font-semibold truncate ${!isSubmitted ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-300"}`}>
                              {hw.problemTitle}
                            </p>
                          </div>
                          <p className="text-[11px] text-gray-400 truncate mt-0.5">{hw.assignmentTitle}</p>
                        </div>
                        <span className={`shrink-0 text-[11px] font-semibold px-1.5 py-0.5 rounded-full border ${badgeCls}`}>
                          {badgeLabel}
                        </span>
                        <button
                          onClick={() => router.push(`/problems/${hw.problemId}`)}
                          className={`shrink-0 inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-1 rounded-lg transition-colors ${btnCls}`}
                        >
                          {btnLabel} <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  })}

                  {homework.length > 3 && (
                    <button
                      onClick={() => setHwExpanded(v => !v)}
                      className="w-full text-center text-xs font-semibold text-indigo-500 hover:text-indigo-700 py-2 transition-colors"
                    >
                      {hwExpanded ? "접기 ▲" : `${homework.length - 3}개 더 보기 ▾`}
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>{/* end flex-col */}

        </div>

        {/* ── 4-A. 학습 과정 섹션 (정규 커리큘럼) ───────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">학습 과정</h2>
            <span className="ml-auto text-xs text-gray-500">정규 커리큘럼 · 기초부터 자격증까지</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {STUDY_COURSES.map(course => (
              <StudyCourseCard
                key={course.slug}
                course={course}
                stat={courseStats[course.slug] ?? { progress: 0, completed: 0, total: 0, last_learned: null, is_current: false }}
              />
            ))}
          </div>
        </div>

        {/* ── 4-B. 탐험 학습 섹션 (도전 + 실전) ─────────────────────── */}
        <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">탐험 학습</h2>
            <span className="ml-auto text-xs text-gray-500">도전 & 실력 검증</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* 도전 문제 — 앞에 배치 */}
            <ChallengeCard
              stat={courseStats["challenge"] ?? { progress: 0, completed: 0, total: 0, last_learned: null, is_current: false }}
              challengeCount={challengeCount}
            />
            {/* 실전 문제 — 뒤에 배치 */}
            <PracticalCard
              stat={courseStats["practical"] ?? { progress: 0, completed: 0, total: 0, last_learned: null, is_current: false }}
            />
          </div>
        </div>

      </div>
    </div>
  )
}
