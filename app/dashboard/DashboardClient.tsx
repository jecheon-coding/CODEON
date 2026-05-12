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
  Play, RefreshCw, KeyRound, X, AlertCircle, Loader2, CheckCheck, Pencil, UserCircle2,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useGoal } from "@/lib/goalContext"

// ── 카테고리 → 표시 라벨 ────────────────────────────────────────────────────
const CATEGORY_LABEL: Record<string, string> = {
  "파이썬기초":     "기초",
  "파이썬알고리즘": "알고리즘",
  "파이썬자격증":   "자격증",
  "파이썬실전":     "실전",
  "파이썬도전":     "도전",
  "파이썬대회":     "대회",
}

// ── 난이도 배지 클래스 ────────────────────────────────────────────────────
const DIFF_CLS: Record<string, string> = {
  "하": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "중": "bg-amber-50   text-amber-700   border-amber-200",
  "상": "bg-red-50     text-red-700     border-red-200",
}

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
export type Problem = { id: string; category: string; title?: string; status?: string; difficulty?: string }

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

function formatMonthDay(dateStr?: string) {
  if (!dateStr) return ""
  const utcStr = /Z|[+-]\d{2}:?\d{2}$/.test(dateStr) ? dateStr : dateStr + "Z"
  const d = new Date(utcStr)
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
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
  const [wrongSubs,          setWrongSubs]          = useState<{ problem_id: string; created_at: string }[]>([])
  const [homework,           setHomework]           = useState<HomeworkItem[]>([])
  const [loadingHomework,    setLoadingHomework]    = useState(true)
  const [hwExpanded,         setHwExpanded]         = useState(false)
  const [totalSubmitCount,   setTotalSubmitCount]   = useState<number | null>(null)
  const [aiChatOpen,         setAiChatOpen]         = useState(false)
  const [resumeTab,          setResumeTab]          = useState<"continue" | "next" | "retry">("continue")
  const [wrongProblemDetailsMap, setWrongProblemDetailsMap] = useState<Record<string, { title: string; category: string | null; topic: string | null }>>({})

  const [lastProblemDetail,  setLastProblemDetail]  = useState<{ title: string; category: string; topic: string | null } | null>(null)
  const [nextProblemFromApi, setNextProblemFromApi] = useState<{ id: string; title: string } | null | undefined>(undefined)
  const [loadingProblemDetail, setLoadingProblemDetail] = useState(false)
  const [recommendations, setRecommendations] = useState<{
    problems: { id: string; title: string; category: string | null; topic: string | null; difficulty: string | null; status: "미풀" | "오답"; reason: string }[]
    courseComplete: boolean
  } | null | undefined>(undefined)

  const userId   = (session?.user as any)?.id as string | undefined
  const userName = session?.user?.name ?? "학생"
  const { dailyGoal } = useGoal()

  // 비밀번호 변경 모달
  const [pwModal,   setPwModal]   = useState(false)
  const [pwNew,     setPwNew]     = useState("")
  const [pwConfirm, setPwConfirm] = useState("")
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError,   setPwError]   = useState("")
  const [pwDone,    setPwDone]    = useState(false)

  // 닉네임
  const [nickname,       setNickname]       = useState<string | null>(null)
  const [nicknameModal,  setNicknameModal]  = useState(false)
  const [nicknameInput,  setNicknameInput]  = useState("")
  const [nicknameError,  setNicknameError]  = useState("")
  const [nicknameSaving, setNicknameSaving] = useState(false)
  const [nicknameDone,   setNicknameDone]   = useState(false)

  const handlePwChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pwNew !== pwConfirm) { setPwError("비밀번호가 일치하지 않습니다."); return }
    if (pwNew.length < 6)    { setPwError("비밀번호는 6자 이상이어야 합니다."); return }
    setPwLoading(true); setPwError("")
    try {
      const res  = await fetch("/api/student/change-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: pwNew }),
      })
      const data = await res.json()
      if (!res.ok) { setPwError(data.error ?? "오류가 발생했습니다."); return }
      setPwDone(true)
      setTimeout(() => { setPwModal(false); setPwNew(""); setPwConfirm(""); setPwDone(false) }, 1500)
    } catch { setPwError("네트워크 오류가 발생했습니다.") }
    finally  { setPwLoading(false) }
  }

  // ── 데이터 로드 ───────────────────────────────────────────────────────
  // 닉네임 fetch — 미설정 시 모달 자동 표시
  useEffect(() => {
    if (!userId) return
    fetch("/api/user/nickname")
      .then(r => r.json())
      .then(d => {
        setNickname(d.nickname ?? null)
        if (!d.nickname) setNicknameModal(true)
      })
      .catch(() => {})
  }, [userId])

  const handleNicknameSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setNicknameError("")
    setNicknameSaving(true)
    try {
      const res  = await fetch("/api/user/nickname", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: nicknameInput }),
      })
      const data = await res.json()
      if (!res.ok) { setNicknameError(data.error ?? "오류가 발생했습니다."); return }
      setNickname(data.nickname)
      setNicknameDone(true)
      setTimeout(() => { setNicknameModal(false); setNicknameDone(false); setNicknameInput("") }, 1200)
    } catch { setNicknameError("네트워크 오류가 발생했습니다.") }
    finally  { setNicknameSaving(false) }
  }

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
        .select("problem_id, created_at")
        .eq("user_id", userId)
        .eq("is_correct", false)
        .order("created_at", { ascending: false })
      setWrongSubs(data ?? [])
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
            setWrongSubs(prev => [{ problem_id: newSub.problem_id, created_at: newSub.created_at ?? new Date().toISOString() }, ...prev])
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

  // ── 마지막 문제 상세 + 다음 문제 fetch ────────────────────────────────
  useEffect(() => {
    const id = submissions[0]?.problem_id
    if (!id || !userId) { setNextProblemFromApi(null); return }
    setLoadingProblemDetail(true)
    Promise.all([
      fetch(`/api/problems/${id}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/problems/next?currentId=${id}`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([detail, next]) => {
      setLastProblemDetail(detail)
      setNextProblemFromApi(next ?? null)
      setLoadingProblemDetail(false)
    })
  }, [submissions[0]?.problem_id, userId])

  // ── 추천 문제 fetch ────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return
    fetch("/api/recommendations?limit=3")
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
      .then(data => setRecommendations(data))
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
  const wrongProblemIds       = useMemo(() => new Set(wrongSubs.map(s => s.problem_id)), [wrongSubs])
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


  // 추천 문제: 현재 과정의 미풀 문제 3개


  // 오답 복습: 미해결 오답 최대 5개 (날짜 포함)
  const wrongReviewProblems = useMemo(() => {
    const seen = new Set<string>()
    const result: { id: string; title: string; category: string | null; createdAt: string }[] = []
    for (const s of wrongSubs) {
      if (!correctProblemIds.has(s.problem_id) && !seen.has(s.problem_id)) {
        seen.add(s.problem_id)
        const prob = allProblems.find(p => p.id === s.problem_id)
        result.push({
          id:        s.problem_id,
          title:     problemTitles[s.problem_id] ?? s.problem_id,
          category:  prob?.category ?? null,
          createdAt: s.created_at,
        })
      }
      if (result.length >= 5) break
    }
    return result
  }, [wrongSubs, correctProblemIds, problemTitles, allProblems])

  useEffect(() => {
    const ids = wrongReviewProblems.map(p => p.id)
    if (ids.length === 0) return
    Promise.all(
      ids.map(id =>
        fetch(`/api/problems/${id}`).then(r => r.ok ? r.json() : null).catch(() => null)
      )
    ).then(results => {
      const updates: Record<string, { title: string; category: string | null; topic: string | null }> = {}
      results.forEach((data, i) => {
        if (data) updates[ids[i]] = { title: data.title ?? ids[i], category: data.category ?? null, topic: data.topic ?? null }
      })
      if (Object.keys(updates).length > 0)
        setWrongProblemDetailsMap(prev => ({ ...prev, ...updates }))
    })
  }, [wrongReviewProblems])

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
    : nextProblemFromApi?.id ? `/problems/${nextProblemFromApi.id}`
    : nextProblemId ? `/problems/${nextProblemId}`
    : currentCourse ? `/course/${currentCourse.slug}`
    : "/courses"

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
            {/* 닉네임 표시 */}
            <div className="flex items-center gap-1.5">
              <UserCircle2 className="w-4 h-4 text-[#534AB7]" />
              {nickname ? (
                <span className="text-sm font-bold text-[#534AB7]">{nickname}</span>
              ) : (
                <span className="text-sm text-gray-400">닉네임 없음</span>
              )}
              <button
                onClick={() => { setNicknameModal(true); setNicknameInput(nickname ?? ""); setNicknameError("") }}
                className="p-0.5 text-gray-400 hover:text-[#534AB7] transition-colors"
                title="닉네임 수정"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>
            <button
              onClick={() => { setPwModal(true); setPwNew(""); setPwConfirm(""); setPwError(""); setPwDone(false) }}
              className="text-sm font-medium text-gray-600 hover:text-[#534AB7] transition-colors"
            >
              {userName}님
            </button>
            <button
              onClick={() => router.push("/mystats")}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#534AB7] font-medium transition-colors"
            >
              <BarChart2 className="w-4 h-4" />
              내 통계
            </button>
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

      {/* 비밀번호 변경 모달 */}
      {pwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-7 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#534AB7]" />
                <h3 className="text-base font-extrabold text-gray-900">비밀번호 변경</h3>
              </div>
              <button onClick={() => setPwModal(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            {pwDone ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <CheckCheck className="w-10 h-10 text-emerald-500" />
                <p className="text-sm font-bold text-emerald-600">비밀번호가 변경되었습니다.</p>
              </div>
            ) : (
              <form onSubmit={handlePwChange} className="flex flex-col gap-4">
                {pwError && (
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />{pwError}
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-600">새 비밀번호</label>
                  <input type="password" value={pwNew} onChange={e => setPwNew(e.target.value)}
                    placeholder="6자 이상" required minLength={6}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#534AB7]" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-600">비밀번호 확인</label>
                  <input type="password" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)}
                    placeholder="위와 동일하게" required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#534AB7]" />
                </div>
                <button type="submit" disabled={pwLoading}
                  className="w-full py-2.5 bg-[#534AB7] hover:bg-[#443da0] text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "변경하기"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 닉네임 설정 모달 */}
      {nicknameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-7 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCircle2 className="w-5 h-5 text-[#534AB7]" />
                <h3 className="text-base font-extrabold text-gray-900">닉네임 설정</h3>
              </div>
              {nickname && (
                <button onClick={() => setNicknameModal(false)} className="text-gray-400 hover:text-gray-700">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {!nickname && (
              <div className="bg-[#534AB7]/5 border border-[#534AB7]/20 rounded-xl px-4 py-3">
                <p className="text-sm font-semibold text-[#534AB7] mb-1">닉네임을 먼저 설정해주세요!</p>
                <p className="text-xs text-gray-500">Q&A 질문 시 닉네임으로 표시됩니다. 나중에 수정할 수 있습니다.</p>
              </div>
            )}

            {nicknameDone ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <CheckCheck className="w-10 h-10 text-emerald-500" />
                <p className="text-sm font-bold text-emerald-600">닉네임이 설정되었습니다!</p>
              </div>
            ) : (
              <form onSubmit={handleNicknameSave} className="flex flex-col gap-4">
                {nicknameError && (
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />{nicknameError}
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-600">닉네임 <span className="font-normal text-gray-400">(2~10자, 한글/영문/숫자/_)</span></label>
                  <input
                    type="text" value={nicknameInput}
                    onChange={e => setNicknameInput(e.target.value)}
                    placeholder="예: 코딩왕123"
                    maxLength={10} required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#534AB7]"
                  />
                  <p className="text-[11px] text-gray-400 text-right">{nicknameInput.length}/10</p>
                </div>
                <button type="submit" disabled={nicknameSaving}
                  className="w-full py-2.5 bg-[#534AB7] hover:bg-[#443da0] text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {nicknameSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "저장하기"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <PageLayout className="pt-20 pb-20 space-y-4">

        {/* ══════════════════════════════════════════════════════
            1. 히어로 배너
        ══════════════════════════════════════════════════════ */}
        <div className="bg-gradient-to-br from-[#534AB7] to-[#185FA5] rounded-3xl px-8 py-5 text-white relative overflow-hidden">
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
              <h1 className="text-2xl font-black tracking-tight leading-tight mb-3">
                {todayRemaining > 0
                  ? <>오늘 문제 <span className="text-yellow-300">{todayRemaining}개</span> 더 풀면<br />목표 달성!</>
                  : <span className="flex items-center gap-2">오늘 학습 목표를 달성했어요! <Sparkles className="w-5 h-5 text-yellow-300" /></span>
                }
              </h1>
              <div className="flex items-center gap-2.5 mb-4">
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
            onClick={() => router.push("/history?tab=all")}
            className="group bg-white rounded-2xl p-5 text-left hover:shadow-md transition-all border border-gray-100 cursor-pointer"
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

            {/* 3-2. 오늘의 학습 재개 */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {/* 헤더 */}
              <div className="px-5 pt-5 pb-0">
                <div className="flex items-center gap-2 mb-4">
                  <Play className="w-4 h-4 text-gray-400" />
                  <h2 className="text-sm font-bold text-gray-900">오늘의 학습 재개</h2>
                </div>
                {/* 탭 */}
                <div className="flex gap-0 border-b border-gray-100">
                  {(["continue", "next", "retry"] as const).map(tab => {
                    const labels = { continue: "이어서 풀기", next: "추천 문제", retry: "오답 복습" }
                    const badge  = tab === "retry" ? wrongReviewProblems.length : 0
                    return (
                      <button
                        key={tab}
                        onClick={() => setResumeTab(tab)}
                        className={`pb-3 mr-5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                          resumeTab === tab
                            ? "text-[#534AB7] border-[#534AB7]"
                            : "text-gray-400 border-transparent hover:text-gray-600"
                        }`}
                      >
                        {labels[tab]}
                        {badge > 0 && (
                          <span className="ml-1.5 text-[10px] bg-[#D85A30] text-white px-1.5 py-0.5 rounded-full">
                            {badge}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="p-5">

                {/* ── Tab 1: 이어서 풀기 ── */}
                {resumeTab === "continue" && (
                  loadingSubmissions ? (
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
                    <div className="space-y-3">
                      {/* 마지막 문제 카드 */}
                      {loadingProblemDetail ? (
                        <div className="h-24 bg-gray-50 rounded-xl animate-pulse" />
                      ) : (
                        <div className={`rounded-xl p-4 border ${lastSub.is_correct ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}`}>
                          <p className="text-[10px] font-semibold text-gray-400 mb-2">마지막으로 푼 문제</p>
                          <p className="text-base font-medium text-gray-900 leading-snug mb-3">
                            {lastProblemDetail?.title ?? lastProblem}
                          </p>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {lastProblemDetail?.category && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-indigo-50 text-indigo-600 border-indigo-100">
                                  {CATEGORY_LABEL[lastProblemDetail.category] ?? lastProblemDetail.category}
                                </span>
                              )}
                              {lastProblemDetail?.topic && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-gray-50 text-gray-600 border-gray-200">
                                  {lastProblemDetail.topic}
                                </span>
                              )}
                              <span className="text-[10px] text-gray-400">{formatRelativeTime(lastSub.created_at)}</span>
                            </div>
                            <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-lg ${lastSub.is_correct ? "bg-green-200 text-green-700" : "bg-red-200 text-red-700"}`}>
                              {lastSub.is_correct ? "정답" : "오답"}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* 다음 문제 CTA */}
                      {nextProblemFromApi === undefined ? (
                        <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                      ) : nextProblemFromApi ? (
                        <button
                          onClick={() => router.push(`/problems/${nextProblemFromApi.id}`)}
                          className="w-full flex items-center justify-between gap-2 bg-[#534AB7] hover:bg-[#443DA0] text-white rounded-lg px-4 py-3 transition-colors group"
                        >
                          <span className="text-sm font-semibold truncate">
                            다음 문제: {nextProblemFromApi.title}
                          </span>
                          <ArrowRight className="w-4 h-4 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      ) : null}
                    </div>
                  )
                )}

                {/* ── Tab 2: 추천 문제 ── */}
                {resumeTab === "next" && (
                  recommendations === undefined ? (
                    /* 로딩 */
                    <div className="space-y-3">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="h-28 bg-gray-50 rounded-xl animate-pulse" />
                      ))}
                    </div>
                  ) : recommendations?.courseComplete ? (
                    /* 과정 100% 완료 */
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center mb-3">
                        <Sparkles className="w-5 h-5 text-amber-400" />
                      </div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">현재 과정 완료!</p>
                      <p className="text-xs text-gray-400 mb-4">다음 과정으로 넘어가볼까요?</p>
                      <button
                        onClick={() => {
                          const idx      = STUDY_COURSES.findIndex(c => c.slug === currentCourse?.slug)
                          const nextCourse = STUDY_COURSES[idx + 1]
                          router.push(nextCourse ? `/course/${nextCourse.slug}` : "/courses")
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#534AB7] text-white rounded-xl text-xs font-bold hover:bg-[#443DA0] transition-all"
                      >
                        다음 과정 시작하기 <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : !recommendations?.problems?.length ? (
                    /* 추천 없음 */
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <BookOpen className="w-8 h-8 text-gray-200 mb-3" />
                      <p className="text-sm font-semibold text-gray-500">추천할 문제를 찾지 못했어요</p>
                      <p className="text-xs text-gray-400 mt-1">과정 탭에서 직접 문제를 골라보세요</p>
                    </div>
                  ) : (
                    /* 추천 카드 3개 */
                    <div className="space-y-[6px]">
                      {recommendations.problems.map(p => (
                        <div key={p.id} className="border border-gray-100 rounded-xl px-3.5 py-2.5 hover:border-gray-200 transition-colors">
                          {/* 배지 + 난이도 + 상태 한 줄 */}
                          <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                            {p.category && (
                              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded border bg-indigo-50 text-indigo-600 border-indigo-100">
                                {CATEGORY_LABEL[p.category] ?? p.category}
                              </span>
                            )}
                            {p.topic && (
                              <span className="text-[11px] font-medium px-1.5 py-0.5 rounded border bg-gray-50 text-gray-600 border-gray-200">
                                {p.topic}
                              </span>
                            )}
                            {p.difficulty && (
                              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded border ${DIFF_CLS[p.difficulty] ?? "bg-gray-50 text-gray-500 border-gray-200"}`}>
                                {p.difficulty}
                              </span>
                            )}
                            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded border ${
                              p.status === "오답"
                                ? "bg-red-50 text-red-600 border-red-200"
                                : "bg-gray-50 text-gray-500 border-gray-200"
                            }`}>
                              {p.status}
                            </span>
                          </div>
                          {/* 제목 */}
                          <p className="text-sm font-medium text-gray-900 leading-snug mb-2">{p.title}</p>
                          {/* 추천 이유 + 버튼 */}
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[11px] text-gray-400 leading-snug">{p.reason}</p>
                            <button
                              onClick={() => router.push(`/problems/${p.id}`)}
                              className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-[#534AB7] hover:bg-[#443DA0] text-white text-[12px] font-bold rounded-lg transition-colors"
                            >
                              바로 풀기 <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* ── Tab 3: 오답 복습 ── */}
                {resumeTab === "retry" && (
                  wrongReviewProblems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mb-3">
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                      </div>
                      <p className="text-sm font-semibold text-gray-600 mb-1">오답 문제가 없어요!</p>
                      <p className="text-xs text-gray-400">최근에 틀린 문제를 모두 해결했어요</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <p className="text-[11px] text-gray-400 mb-2">틀렸지만 아직 맞추지 못한 문제예요</p>
                      {wrongReviewProblems.map((p, i) => {
                        const detail = wrongProblemDetailsMap[p.id]
                        const displayTitle    = detail?.title    ?? p.title
                        const displayCategory = detail?.category ?? p.category
                        const displayTopic    = detail?.topic    ?? null
                        return (
                          <div
                            key={i}
                            className="flex items-center gap-3 py-2.5 px-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-[#534AB7] shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-800 truncate">{displayTitle}</p>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                {displayCategory && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-indigo-50 text-indigo-600 border-indigo-100">
                                    {CATEGORY_LABEL[displayCategory] ?? displayCategory}
                                  </span>
                                )}
                                {displayTopic && (
                                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-gray-50 text-gray-600 border-gray-200">
                                    {displayTopic}
                                  </span>
                                )}
                                <span className="text-[10px] text-gray-400">{formatMonthDay(p.createdAt)}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => router.push(`/problems/${p.id}`)}
                              className="shrink-0 px-2.5 py-1 bg-[#534AB7] hover:bg-[#443DA0] text-white text-[10px] font-bold rounded-lg transition-colors"
                            >
                              다시 풀기
                            </button>
                          </div>
                        )
                      })}
                      {wrongNoteCount > 5 && (
                        <button
                          onClick={() => router.push("/history?filter=wrong")}
                          className="w-full pt-2 text-xs font-semibold text-[#534AB7] hover:text-[#443DA0] text-center transition-colors"
                        >
                          전체 {wrongNoteCount}개 보기 →
                        </button>
                      )}
                    </div>
                  )
                )}

              </div>
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
              ) : hwTotal === 0 ? (
                <div className="flex flex-col items-center text-center py-4">
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                    <ClipboardList className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="text-sm font-bold text-gray-600 mb-1">오늘 배정된 숙제가 없어요</p>
                  <p className="text-[11px] text-gray-400">선생님이 숙제를 배정하면 여기에 표시돼요</p>
                </div>
              ) : hwSubmitted === hwTotal ? (
                <div className="flex flex-col items-center text-center py-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle className="w-6 h-6 text-emerald-500" />
                  </div>
                  <p className="text-sm font-bold text-gray-800 mb-1">오늘 숙제 모두 완료!</p>
                  <p className="text-[11px] text-gray-400 mb-4">추천 문제를 풀거나 복습해보세요</p>
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={() => router.push(nextProblemFromApi?.id ? `/problems/${nextProblemFromApi.id}` : currentCourse ? `/course/${currentCourse.slug}` : "/courses")}
                      className="flex-1 py-2 bg-[#534AB7] text-white text-xs font-bold rounded-xl hover:bg-[#443DA0] transition-colors"
                    >
                      추천 문제 풀기
                    </button>
                    {wrongNoteCount > 0 && (
                      <button
                        onClick={() => router.push("/history?filter=wrong")}
                        className="flex-1 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-200 transition-colors"
                      >
                        복습하러 가기
                      </button>
                    )}
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
