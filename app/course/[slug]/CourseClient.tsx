"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import Link from "next/link"
import CodeOnLogo from "@/components/ui/CodeOnLogo"
import type { LucideIcon } from "lucide-react"
import {
  LogOut, Search, Calendar, MapPin, Lock, ArrowRight,
  CheckCircle2, Circle, Play, Code2, BarChart2,
  Award, Trophy, Star, Zap, ChevronLeft, ChevronRight, BookOpen,
  Layers,
} from "lucide-react"
import { USER_STATUS_BADGE } from "@/lib/submissionStatus"
import type { ProblemUserState } from "@/lib/submissionStatus"
import type { Difficulty } from "@/types/problem"
import { ProblemListItem } from "@/components/problem/ProblemListItem"
import { PageLayout } from "@/components/ui/PageLayout"

// ── 타입 ─────────────────────────────────────────────────────────────────────
type CourseProblem = {
  id: string
  title: string | null
  category: string
  topic: string | null
  difficulty: Difficulty | null
  status: string | null
  content: string | null
}


// ── 상수 ─────────────────────────────────────────────────────────────────────
const COURSE_META: Record<string, { label: string; description: string; color: string; Icon: LucideIcon }> = {
  basic:       { label: "기초 과정",      description: "파이썬의 기본 문법과 코딩의 기초를 다집니다.", color: "#534AB7", Icon: Code2    },
  algorithm:   { label: "알고리즘 과정",  description: "핵심 알고리즘으로 실력 향상",                color: "#534AB7", Icon: BarChart2 },
  certificate: { label: "자격증 과정",   description: "코딩 자격증 취득 대비",                       color: "#534AB7", Icon: Award    },
  practical:   { label: "실전 문제",     description: "학원 전용 기출 · 실력 검증",                   color: "#185FA5", Icon: Trophy   },
  challenge:   { label: "도전 문제",     description: "학생들이 직접 만든 문제",                       color: "#D85A30", Icon: Zap      },
  competition: { label: "대회 준비 과정", description: "KOI · 정보올림피아드 대비",                   color: "#BA7517", Icon: Star     },
}

const MINIMAP_COURSES = [
  { slug: "basic",       label: "기초 과정" },
  { slug: "algorithm",   label: "알고리즘 과정" },
  { slug: "certificate", label: "자격증 과정" },
  { slug: "practical",   label: "실전 문제" },
  { slug: "competition", label: "대회 준비" },
]

const DIFF_STYLE: Record<string, { bg: string; text: string }> = {
  "하": { bg: "#EAF3DE", text: "#639922" },
  "중": { bg: "#FEF3C7", text: "#BA7517" },
  "상": { bg: "#FAECE7", text: "#D85A30" },
}

// ── 자격증 과정 메타 파서 ──────────────────────────────────────────────────────
function parseCertMeta(p: CourseProblem) {
  const src    = `${p.topic ?? ""} ${p.title ?? ""}`
  const gradeM = src.match(/([123])급/)
  const roundM = src.match(/(\d+)차/)
  return {
    grade: gradeM ? (parseInt(gradeM[1]) as 1 | 2 | 3) : null,
    type:  /기출/.test(src) ? "exam" : /모의/.test(src) ? "mock" : null,
    round: roundM ? parseInt(roundM[1]) : null,
  }
}

// ── 탭 스크롤 컨테이너 ────────────────────────────────────────────────────────
function TabScrollContainer({ children }: { children: React.ReactNode }) {
  const ref   = useRef<HTMLDivElement>(null)
  const [left,  setLeft]  = useState(false)
  const [right, setRight] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      setLeft(el.scrollLeft > 4)
      setRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
    }
    update()
    el.addEventListener("scroll", update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => { el.removeEventListener("scroll", update); ro.disconnect() }
  }, [])

  const scrollBy = (dir: "left" | "right") =>
    ref.current?.scrollBy({ left: dir === "left" ? -180 : 180, behavior: "smooth" })

  return (
    <div className="relative border-b border-gray-100">
      {/* 좌우 페이드 오버레이 */}
      <div className={`absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-white to-transparent pointer-events-none z-10 transition-opacity duration-200 ${left ? "opacity-100" : "opacity-0"}`} />
      <div className={`absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white to-transparent pointer-events-none z-10 transition-opacity duration-200 ${right ? "opacity-100" : "opacity-0"}`} />

      {/* 화살표 버튼 */}
      {left && (
        <button
          onClick={() => scrollBy("left")}
          className="absolute left-1.5 top-1/2 -translate-y-1/2 z-20 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all"
        >
          <ChevronLeft className="w-3 h-3 text-gray-500" />
        </button>
      )}
      {right && (
        <button
          onClick={() => scrollBy("right")}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all"
        >
          <ChevronRight className="w-3 h-3 text-gray-500" />
        </button>
      )}

      {/* 스크롤 영역 — 스크롤바 숨김 */}
      <div ref={ref} className="overflow-x-auto scrollbar-none" style={{ scrollbarWidth: "none" }}>
        {children}
      </div>
    </div>
  )
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────
export default function CourseClient({
  slug, problems, statusMap, globalStats, userName,
}: {
  slug: string
  problems: CourseProblem[]
  statusMap: Record<string, ProblemUserState>
  globalStats: Record<string, { solvers: number; submissions: number; successRate: number | null }>
  userName: string
}) {
  const router = useRouter()
  const meta   = COURSE_META[slug] ?? { label: slug, description: "", color: "#534AB7", Icon: Layers }
  const { Icon: CourseIcon } = meta

  const [activeTab,        setActiveTab]        = useState(() =>
    problems.find(p => statusMap[p.id]?.status !== "정답")?.topic ?? "전체"
  )
  const [searchQuery,      setSearchQuery]      = useState("")
  const [difficultyFilter, setDifficultyFilter] = useState<"전체" | "하" | "중" | "상">("전체")
  const [page,             setPage]             = useState(1)

  const LIMIT = 20

  // ── 자격증 과정 전용 필터 상태 ───────────────────────────────────────────────
  const [certGrade,   setCertGrade]   = useState<1 | 2 | 3>(3)
  const [certTypeMap, setCertTypeMap] = useState<Record<number, "exam" | "mock">>({ 1: "exam", 2: "exam", 3: "exam" })
  const [certRound,   setCertRound]   = useState<number | null>(null)
  const certType = certTypeMap[certGrade]

  // ── 집계 ──────────────────────────────────────────────────────────────────
  const completedCount  = useMemo(() => problems.filter(p => statusMap[p.id]?.status === "정답").length,   [problems, statusMap])
  const inProgressCount = useMemo(() => problems.filter(p => statusMap[p.id]?.status === "시도중").length, [problems, statusMap])
  const notStartedCount = problems.length - completedCount - inProgressCount
  const progress        = problems.length > 0 ? Math.round((completedCount / problems.length) * 100) : 0

  const nextProblem = useMemo(
    () => problems.find(p => statusMap[p.id]?.status !== "정답") ?? null,
    [problems, statusMap],
  )

  const remainingDays    = Math.ceil((problems.length - completedCount) / 3)
  const estimatedWeeks   =
    remainingDays <= 7  ? "약 1주 후"   :
    remainingDays <= 14 ? "약 2주 후"   :
    remainingDays <= 21 ? "약 3주 후"   :
    remainingDays <= 35 ? "약 3~4주 후" :
    `약 ${Math.ceil(remainingDays / 7)}주 후`

  // ── 탭/필터 ───────────────────────────────────────────────────────────────
  const topics = useMemo(() => {
    const seen = new Set<string>()
    const ordered: string[] = []
    for (const p of problems) {
      if (p.topic && !seen.has(p.topic)) { seen.add(p.topic); ordered.push(p.topic) }
    }
    return ordered
  }, [problems])

  const tabStats = useMemo(() => {
    const stats: Record<string, { total: number; completed: number }> = { "전체": { total: 0, completed: 0 } }
    for (const p of problems) {
      stats["전체"].total++
      if (statusMap[p.id]?.status === "정답") stats["전체"].completed++
      const t = p.topic ?? "기타"
      if (!stats[t]) stats[t] = { total: 0, completed: 0 }
      stats[t].total++
      if (statusMap[p.id]?.status === "정답") stats[t].completed++
    }
    return stats
  }, [problems, statusMap])

  const filteredProblems = useMemo(() =>
    problems.filter(p => {
      const tabMatch  = activeTab === "전체" || p.topic === activeTab
      const textMatch = !searchQuery || (p.title ?? "").includes(searchQuery)
      const diffMatch = difficultyFilter === "전체" || p.difficulty === difficultyFilter
      return tabMatch && textMatch && diffMatch
    }),
    [problems, activeTab, searchQuery, difficultyFilter],
  )

  const allTabs = ["전체", ...topics]

  // ── 자격증 전용: 회차 목록 & 필터링 ─────────────────────────────────────────
  const availableRounds = useMemo(() => {
    if (slug !== "certificate") return []
    const s = new Set<number>()
    for (const p of problems) {
      const m = parseCertMeta(p)
      if (m.grade === certGrade && m.type === certType && m.round !== null) s.add(m.round)
    }
    return [...s].sort((a, b) => a - b)
  }, [problems, certGrade, certType, slug])

  // 급수·유형 변경 시 certRound가 null이면 첫 번째 회차 자동 선택
  useEffect(() => {
    if (availableRounds.length > 0 && (certRound === null || !availableRounds.includes(certRound))) {
      setCertRound(availableRounds[0])
    }
  }, [availableRounds])

  // 탭/필터 변경 시 페이지 초기화
  useEffect(() => { setPage(1) }, [activeTab, searchQuery, difficultyFilter, certGrade, certType, certRound])

  const certFilteredProblems = useMemo(() =>
    slug !== "certificate" ? [] :
    problems.filter(p => {
      const m = parseCertMeta(p)
      return m.grade === certGrade
        && m.type  === certType
        && (certRound === null || m.round === certRound)
        && (!searchQuery || (p.title ?? "").includes(searchQuery))
        && (difficultyFilter === "전체" || p.difficulty === difficultyFilter)
    }),
    [problems, certGrade, certType, certRound, searchQuery, difficultyFilter, slug],
  )

  const displayProblems = slug === "certificate" ? certFilteredProblems : filteredProblems
  const totalPages      = Math.ceil(displayProblems.length / LIMIT)
  const pagedProblems   = displayProblems.slice((page - 1) * LIMIT, page * LIMIT)

  return (
    <div
      className="min-h-screen bg-[#F4F5F8]"
      style={{ fontFamily: "var(--font-noto-sans-kr), var(--font-geist-sans), sans-serif" }}
    >

      {/* ══ 네비게이션 ══════════════════════════════════════════════════════════ */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white border-b border-gray-100 h-14">
        <PageLayout className="h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CodeOnLogo />
            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-400">
              <Link href="/dashboard" className="hover:text-gray-600 transition-colors">학습 홈</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="font-semibold text-gray-700">{meta.label}</span>
            </div>
          </div>
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

      <PageLayout className="pt-20 pb-20">
        <div className="flex gap-5 items-start">

          {/* ══ 좌측 사이드패널 (260px) ═════════════════════════════════════════ */}
          <div className="w-[260px] shrink-0 space-y-4 sticky top-20">

            {/* 1. 과정 정보 카드 */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">

              {/* 헤더 */}
              <div className="px-5 pt-5 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5 mb-2">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${meta.color}18` }}
                  >
                    <CourseIcon className="w-4 h-4" style={{ color: meta.color }} strokeWidth={1.75} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-gray-900 leading-tight">{meta.label}</h2>
                    <p className="text-[11px] text-gray-400">전체 {problems.length}문제</p>
                  </div>
                </div>
                <p className="text-[12px] text-gray-500 leading-relaxed">{meta.description}</p>
              </div>

              {/* 진행률 */}
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-semibold text-gray-600">진행률</span>
                  <span className="text-[12px] font-bold text-gray-900 tabular-nums">{completedCount} / {problems.length} 완료</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${progress}%`, background: meta.color }}
                  />
                </div>
                <p className="text-[11px] text-right tabular-nums font-semibold" style={{ color: meta.color }}>{progress}%</p>

                {/* 학습 현황 3칸 */}
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="rounded-xl py-3 text-center" style={{ background: `${meta.color}12` }}>
                    <p className="text-[17px] font-black tabular-nums" style={{ color: meta.color }}>{completedCount}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: `${meta.color}99` }}>완료</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl py-3 text-center">
                    <p className="text-[17px] font-black text-amber-500 tabular-nums">{inProgressCount}</p>
                    <p className="text-[10px] text-amber-400 mt-0.5">진행중</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl py-3 text-center">
                    <p className="text-[17px] font-black text-gray-500 tabular-nums">{notStartedCount}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">미완료</p>
                  </div>
                </div>
              </div>

              {/* 다음 문제 미리보기 */}
              {nextProblem && (
                <div className="px-5 py-4 border-b border-gray-100">
                  <div className="rounded-xl p-3.5" style={{ background: `${meta.color}10` }}>
                    <p className="text-[10px] font-bold mb-1.5 flex items-center gap-1" style={{ color: meta.color }}>
                      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: meta.color }} />
                      다음: {nextProblem.topic ?? "다음 문제"}
                    </p>
                    <p className="text-[13px] font-bold text-gray-900 leading-snug mb-2 line-clamp-2">
                      {nextProblem.title}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {nextProblem.topic && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/80 text-gray-500 font-medium">{nextProblem.topic}</span>
                      )}
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/80 text-gray-500 font-medium">예상 2분</span>
                      {nextProblem.difficulty && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-md font-bold"
                          style={{ background: DIFF_STYLE[nextProblem.difficulty]?.bg, color: DIFF_STYLE[nextProblem.difficulty]?.text }}
                        >{nextProblem.difficulty}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 예상 완료 */}
              {problems.length > completedCount && (
                <div className="px-5 py-3.5 border-b border-gray-100">
                  <div className="flex items-center gap-2 text-[12px] text-gray-500">
                    <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" strokeWidth={1.75} />
                    <span>예상 완료: <span className="font-semibold text-gray-700">{estimatedWeeks}</span></span>
                  </div>
                </div>
              )}

              {/* 이어하기 버튼 */}
              <div className="px-5 py-4">
                <button
                  onClick={() => nextProblem && router.push(`/problems/${nextProblem.id}`)}
                  disabled={!nextProblem}
                  className="w-full flex items-center justify-center gap-2 py-3 text-white text-sm font-bold rounded-xl transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: meta.color }}
                >
                  이어하기
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 2. 전체 커리큘럼 미니맵 */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-4 h-4 text-gray-400" strokeWidth={1.75} />
                <h3 className="text-sm font-bold text-gray-900">전체 커리큘럼</h3>
              </div>
              <div className="relative">
                <div className="absolute left-[9px] top-4 bottom-4 w-px border-l-2 border-dashed border-gray-200 pointer-events-none" />
                <div className="space-y-4">
                  {MINIMAP_COURSES.map(c => {
                    const isCurrent     = c.slug === slug
                    const isCompetition = c.slug === "competition"
                    return (
                      <div key={c.slug} className="flex items-center gap-3 relative">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 z-10 border-2 transition-all
                          ${isCurrent     ? "border-[#534AB7] bg-[#534AB7]"
                          : isCompetition ? "border-[#BA7517] bg-[#BA7517]"
                          :                 "border-gray-200 bg-white"}`}
                        >
                          {(isCurrent || isCompetition)
                            ? <div className="w-1.5 h-1.5 bg-white rounded-full" />
                            : <Lock className="w-2.5 h-2.5 text-gray-300" strokeWidth={2} />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[12px] font-semibold truncate
                              ${isCurrent ? "text-[#534AB7]" : isCompetition ? "text-[#BA7517]" : "text-gray-400"}`}>
                              {c.label}
                            </span>
                            {isCompetition && !isCurrent && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded-full shrink-0">NEW</span>
                            )}
                          </div>
                          {isCurrent && (
                            <p className="text-[10px] tabular-nums" style={{ color: `${meta.color}99` }}>진행률 {progress}%</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

          </div>{/* end sidebar */}

          {/* ══ 우측 메인 콘텐츠 ═════════════════════════════════════════════════ */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">

              {/* 카테고리 탭바 */}
              {slug === "certificate" ? (
                <div className="border-b border-gray-100">
                  {/* 1단계: 급수 탭 (16px, 600) */}
                  <div className="flex items-center border-b border-gray-100 px-4 mb-1">
                    {([3, 2, 1] as const).map(g => (
                      <button
                        key={g}
                        onClick={() => { setCertGrade(g); setCertRound(null) }}
                        className={`px-5 py-3.5 border-b-2 transition-all font-semibold`}
                        style={{
                          fontSize: "16px",
                          color:       certGrade === g ? "#534AB7" : "#9ca3af",
                          borderColor: certGrade === g ? "#534AB7" : "transparent",
                        }}
                      >CosPro {g}급</button>
                    ))}
                  </div>
                  {/* 2단계: 유형 서브탭 (14px) + 3단계: 회차 pill (오른쪽) */}
                  <div className="flex items-center justify-between px-4 pr-4">
                    <div className="flex">
                      {(["exam", "mock"] as const).map(t => (
                        <button
                          key={t}
                          onClick={() => { setCertTypeMap(prev => ({ ...prev, [certGrade]: t })); setCertRound(null) }}
                          className={`px-4 py-2.5 text-sm border-b-2 transition-all font-medium`}
                          style={{
                            color:       certType === t ? "#534AB7" : "#9ca3af",
                            borderColor: certType === t ? "#534AB7" : "transparent",
                          }}
                        >{t === "exam" ? "기출문제" : "모의고사"}</button>
                      ))}
                    </div>
                    {availableRounds.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-gray-400 mr-0.5">회차</span>
                        {availableRounds.map(r => (
                          <button
                            key={r}
                            onClick={() => setCertRound(r)}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all
                              ${certRound === r ? "bg-[#534AB7] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                          >{r}차</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <TabScrollContainer>
                  <div className="flex items-center min-w-max px-2">
                    {allTabs.map(tab => {
                      const stat     = tabStats[tab] ?? { total: 0, completed: 0 }
                      const isActive = activeTab === tab
                      return (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`flex items-center gap-1.5 px-4 py-4 text-[13px] font-semibold border-b-2 transition-all whitespace-nowrap
                            ${isActive
                              ? "border-[#534AB7] text-[#534AB7]"
                              : "border-transparent text-gray-400 hover:text-gray-600"}`}
                        >
                          {tab}
                          <span className={`text-[11px] tabular-nums ${isActive ? "text-[#534AB7]/70" : "text-gray-300"}`}>
                            {stat.total}
                          </span>
                          {stat.completed > 0 && (
                            <span className="text-[10px] font-bold text-[#639922] tabular-nums">/{stat.completed}완료</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </TabScrollContainer>
              )}

              {/* 필터바 */}
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-1 min-w-[160px] bg-gray-50 rounded-xl px-3 py-2">
                  <Search className="w-4 h-4 text-gray-400 shrink-0" strokeWidth={1.75} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="문제 제목 검색..."
                    className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-300 outline-none min-w-0"
                  />
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[12px] text-gray-400 mr-0.5">난이도</span>
                  {(["전체", "하", "중", "상"] as const).map(d => (
                    <button
                      key={d}
                      onClick={() => setDifficultyFilter(d)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all
                        ${difficultyFilter === d
                          ? "bg-[#534AB7] text-white"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                    >{d}</button>
                  ))}
                </div>
                <span className="text-[12px] text-gray-400 shrink-0 tabular-nums">
                  총 {displayProblems.length}개의 문제
                </span>
              </div>

              {/* 문제 리스트 */}
              {displayProblems.length === 0 ? (
                <div className="flex flex-col items-center py-20 text-center">
                  <BookOpen className="w-8 h-8 text-gray-200 mb-3" strokeWidth={1.5} />
                  <p className="text-sm text-gray-400">검색 결과가 없어요</p>
                </div>
              ) : (
                <div>
                  {pagedProblems.map(problem => {
                    const state     = statusMap[problem.id]
                    const status    = state?.status ?? "미제출"
                    const isCorrect = status === "정답"
                    const isNext    = !isCorrect && problem.id === nextProblem?.id
                    const diff      = problem.difficulty
                    const diffStyle = diff ? DIFF_STYLE[diff] : null
                    const titleCl   = isCorrect ? "text-[#639922]" : isNext ? "text-[#534AB7]" : "text-gray-800"

                    const baseBg  = isCorrect ? "#F6FFFD" : isNext ? "#FAFAFE" : undefined
                    const hoverBg = isCorrect ? "#EDFCF8" : isNext ? "#F3F2FD" : "#F9F9FB"

                    const excerpt = problem.content
                      ? problem.content.replace(/[*#`]/g, "").split("\n").find(l => l.trim().length > 10)?.trim() ?? ""
                      : ""

                    return (
                      <ProblemListItem
                        key={problem.id}
                        onClick={() => router.push(`/problems/${problem.id}`)}
                        baseBackground={baseBg}
                        hoverBackground={hoverBg}
                        borderLeft={isNext ? "3px solid #534AB7" : "3px solid transparent"}
                      >
                        {/* 상태 아이콘 */}
                        <div className="shrink-0">
                          {isCorrect ? (
                            <CheckCircle2 className="w-4 h-4" style={{ color: "#639922" }} fill="#D1EDBB" stroke="#639922" />
                          ) : isNext ? (
                            <Play className="w-4 h-4" style={{ color: "#534AB7" }} fill="#DDD9F8" stroke="#534AB7" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-300" />
                          )}
                        </div>

                        {/* 문제 정보 */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold truncate ${titleCl}`}>
                            {problem.title ?? problem.id}
                          </p>
                          {excerpt && (
                            <p className="text-[11px] text-gray-400 leading-relaxed overflow-hidden whitespace-nowrap text-ellipsis max-w-[600px]">
                              {excerpt}
                            </p>
                          )}
                          {(() => {
                            const gs = globalStats[problem.id]
                            if (!gs || gs.submissions === 0) return null
                            const rateStr = gs.successRate !== null ? `${gs.successRate.toFixed(1)}%` : "-%"
                            return (
                              <p className="text-[11px] text-gray-400">
                                정답자 {gs.solvers}명
                                <span className="mx-1 text-gray-300">·</span>
                                제출 {gs.submissions}회
                                <span className="mx-1 text-gray-300">·</span>
                                성공률 {rateStr}
                              </p>
                            )
                          })()}
                        </div>

                        {/* 우측: 난이도 + 상태 배지 */}
                        <div className="shrink-0 flex items-center gap-1.5">
                          {diffStyle && diff && (
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ background: diffStyle.bg, color: diffStyle.text }}
                            >{diff}</span>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${USER_STATUS_BADGE[status].cls}`}>
                            {USER_STATUS_BADGE[status].label}
                          </span>
                          {(state?.count ?? 0) > 0 && (
                            <span className="text-[10px] text-gray-400 tabular-nums">{state!.count}회</span>
                          )}
                        </div>
                      </ProblemListItem>
                    )
                  })}
                  {/* 페이지네이션 */}
                  {totalPages > 1 && (() => {
                    const maxVisible = 5
                    const half = Math.floor(maxVisible / 2)
                    let start = Math.max(1, page - half)
                    let end   = Math.min(totalPages, start + maxVisible - 1)
                    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1)
                    const pageNums = Array.from({ length: end - start + 1 }, (_, i) => start + i)
                    return (
                      <div className="flex items-center justify-center gap-1 py-4 border-t border-gray-100">
                        <button
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm"
                        >&lt;</button>
                        {pageNums.map(p => (
                          <button
                            key={p}
                            onClick={() => setPage(p)}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                              p === page
                                ? "bg-[#534AB7] text-white shadow-sm"
                                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                            }`}
                          >{p}</button>
                        ))}
                        <button
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm"
                        >&gt;</button>
                      </div>
                    )
                  })()}
                </div>
              )}

            </div>
          </div>{/* end main */}

        </div>
      </PageLayout>
    </div>
  )
}
