"use client"

import { useState, useMemo } from "react"
import { signOut } from "next-auth/react"
import Link from "next/link"
import CodeOnLogo from "@/components/ui/CodeOnLogo"
import {
  Code, LogOut, Bell, CheckCircle2, XCircle, Clock,
  Target, MessageSquare, ChevronRight, X,
  AlertCircle, Flame, Send, Phone, ChevronDown, ChevronUp,
  BookOpen, Minus, Users, History, FileText, BarChart2, Sparkles,
  GraduationCap, ArrowUpRight, ArrowDownRight,
  ListChecks, PackageCheck, CalendarCheck2, BadgeAlert,
} from "lucide-react"

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
export interface TeacherInput {
  attitude:    string                              // 강사 직접 선택
  summary:     string                              // 강사 총평 (직접 작성)
  tips:        [string, string]                    // 학부모 확인 포인트 2개
  needsConsult: boolean                            // 상담 필요 여부
  notices:     { label: string; date: string }[]  // 공지사항 최대 2개
  bundleNames: Record<string, string>              // topic → 과제 묶음명
  updatedAt:   string | null
}

export interface ParentDashboardProps {
  parentName:   string
  student:      Record<string, any> | null
  teacherInput: TeacherInput | null               // 관리자 입력 (없으면 AI 자동)
  stats: {
    total: number; correct: number; wrong: number; rate: number
    weekTotal: number; weekCorrect: number; weekRate: number
    prevWeekRate: number; rateChange: number
    streak: number; lastStudyDate: string | null
    currentCourse: string
  } | null
  weeklyData:  { day: string; date: string; count: number; correct: number }[]
  monthlyData: { week: string; count: number; correct: number }[]
  courseStats: Record<string, { label: string; total: number; completed: number; rate: number }>
  topicStats:  { topic: string; correct: number; total: number; rate: number }[]
  assignments: { id: string; title: string; difficulty: string; topic: string | null; isCorrect: boolean; isAttempted: boolean }[]
  recentSubs:  { title: string; isCorrect: boolean; createdAt: string; topic: string | null }[]
}

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const ATTITUDE_STYLE: Record<string, { badge: string; bar: string }> = {
  "매우 우수": { badge: "text-emerald-700 bg-emerald-100 border-emerald-200", bar: "bg-emerald-500" },
  "양호":      { badge: "text-blue-700   bg-blue-100   border-blue-200",       bar: "bg-blue-500"   },
  "보통":      { badge: "text-slate-600  bg-slate-100  border-slate-200",       bar: "bg-slate-400"  },
  "보완 필요": { badge: "text-amber-700  bg-amber-100  border-amber-200",       bar: "bg-amber-500"  },
  "주의 필요": { badge: "text-red-700    bg-red-100    border-red-200",         bar: "bg-red-500"    },
}

type AssignmentGroup = {
  topic:    string
  label:    string   // 학부모용 표시 이름
  items:    ParentDashboardProps["assignments"]
  done:     number
  total:    number
  hasRetry: boolean
}

function getBundleStatus(g: AssignmentGroup): { label: string; cls: string } {
  if (g.done === g.total && g.total > 0)
    return { label: "완료",        cls: "text-emerald-700 bg-emerald-50 border-emerald-200" }
  if (g.hasRetry)
    return { label: "재시도 필요", cls: "text-amber-700  bg-amber-50  border-amber-200"   }
  if (g.done > 0)
    return { label: "진행 중",     cls: "text-blue-700   bg-blue-50   border-blue-200"     }
  return   { label: "미완료",      cls: "text-slate-600  bg-slate-100 border-slate-200"   }
}

function formatRelativeTime(dateStr: string) {
  const diffMs   = Date.now() - new Date(dateStr).getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 60) return `${Math.max(1, diffMins)}분 전`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs}시간 전`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays === 1) return "어제"
  return `${diffDays}일 전`
}

/* ─────────────────────────────────────────────
   CONSULT MODAL
───────────────────────────────────────────── */
function ConsultModal({ onClose }: { onClose: () => void }) {
  const [sent, setSent] = useState(false)
  const [msg,  setMsg]  = useState("")
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-1">상담 신청</h3>
        <p className="text-sm text-gray-600 mb-4">담당 강사에게 메시지를 남기면 1~2 영업일 내 연락드립니다.</p>
        {sent ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <p className="font-semibold text-gray-900">상담 신청이 완료되었습니다!</p>
            <p className="text-sm text-gray-600">담당 강사가 확인 후 연락드릴게요.</p>
            <button onClick={onClose} className="mt-2 px-6 py-2 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 transition-colors">닫기</button>
          </div>
        ) : (
          <>
            <textarea
              value={msg} onChange={e => setMsg(e.target.value)}
              placeholder="문의하실 내용을 입력해주세요."
              rows={5}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 mb-4"
            />
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">취소</button>
              <button
                onClick={() => msg.trim() && setSent(true)} disabled={!msg.trim()}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 disabled:opacity-40 transition-colors"
              >
                <Send className="w-3.5 h-3.5" /> 신청하기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   SUBMISSION HISTORY MODAL
───────────────────────────────────────────── */
function SubHistoryModal({
  subs, onClose,
}: { subs: ParentDashboardProps["recentSubs"]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[82vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">전체 제출 이력</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">문제명 · 정답 여부 · 제출 시각 · 재도전 여부</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        {/* 목록 */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {subs.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-slate-400 text-sm">제출 기록이 없습니다.</div>
          ) : subs.map((s, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700">
              {s.isCorrect
                ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                : <XCircle      className="w-4 h-4 text-red-400    shrink-0" />
              }
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{s.title}</p>
                {s.topic && (
                  <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full mt-0.5 inline-block">{s.topic}</span>
                )}
              </div>
              <div className="shrink-0 text-right space-y-0.5">
                <p className={`text-xs font-bold ${s.isCorrect ? "text-emerald-600" : "text-red-500"}`}>
                  {s.isCorrect ? "정답" : "오답"}
                </p>
                <p className="text-[10px] text-slate-400">{formatRelativeTime(s.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function ParentDashboardClient({
  parentName, student, teacherInput, stats, weeklyData, monthlyData,
  courseStats, topicStats, assignments, recentSubs,
}: ParentDashboardProps) {

  const [showConsult,   setShowConsult]   = useState(false)
  const [showHistory,   setShowHistory]   = useState(false)
  const [bundleExpanded, setBundleExpanded] = useState<string | null>(null)

  const studentName = student?.name ?? "학생"
  const grade       = student?.grade      ? `${student.grade}학년` : null
  const classNum    = student?.class_name ?? student?.class ?? null

  /* ── 연결된 학생 없음 ── */
  if (!stats || !student) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <nav className="fixed top-0 inset-x-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-8 h-14 flex items-center justify-between">
            <Link href="/" className="opacity-90 hover:opacity-100 transition-opacity">
              <CodeOnLogo />
            </Link>
            <button onClick={() => signOut()} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700">
              <LogOut className="w-4 h-4" /> 로그아웃
            </button>
          </div>
        </nav>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm px-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">자녀 연결이 필요합니다</h2>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              {parentName}님, 아직 자녀 계정이 연결되지 않았어요.<br />담당 강사에게 연결을 요청해주세요.
            </p>
            <button onClick={() => setShowConsult(true)} className="px-6 py-3 bg-indigo-500 text-white rounded-xl text-sm font-bold hover:bg-indigo-600 transition-colors">
              강사에게 연결 요청
            </button>
          </div>
        </div>
        {showConsult && <ConsultModal onClose={() => setShowConsult(false)} />}
      </div>
    )
  }

  /* ── 자동 계산 값 ── */
  const { total, rate, weekTotal, weekCorrect, weekRate, rateChange, streak, currentCourse } = stats
  const weakTopics        = useMemo(() => topicStats.filter(t => t.total >= 2 && t.rate < 60), [topicStats])
  const assignedTotal     = assignments.length
  const assignedDone      = assignments.filter(a => a.isCorrect).length
  const assignedPending   = assignedTotal - assignedDone
  const studyDaysThisWeek = weeklyData.filter(d => d.count > 0).length
  const recent10Subs      = recentSubs.slice(0, 10)
  const recent10Correct   = recent10Subs.filter(s => s.isCorrect).length
  const recent10Wrong     = recent10Subs.length - recent10Correct
  const recent10Rate      = recent10Subs.length > 0 ? Math.round((recent10Correct / recent10Subs.length) * 100) : 0
  const retryNeeded       = assignments.filter(a => a.isAttempted && !a.isCorrect).length
  const submitRate        = assignedTotal > 0 ? Math.round((assignedDone / assignedTotal) * 100) : 0

  /* ── AI 자동 피드백 (teacherInput이 없을 때 사용) ── */
  const autoFeedback = (() => {
    if (total === 0) return {
      attitude: "주의 필요",
      oneLiner: "아직 학습 기록이 없습니다. 첫 문제 풀기를 도와주세요.",
      summary:  "아직 학습 기록이 없습니다.",
      tips: ["첫 문제부터 시작해보도록 격려해주세요.", "매일 조금씩 접속하는 습관이 중요합니다."] as [string, string],
    }
    if (rate >= 85 && weekTotal >= 5) return {
      attitude: "매우 우수",
      oneLiner: `이번 주 ${weekTotal}문제, 정답률 ${weekRate}% — 매우 우수한 학습 흐름입니다.`,
      summary:  `${studentName} 학생은 이번 주 ${weekTotal}문제를 풀며 ${weekRate}%의 높은 정답률을 보이고 있습니다. 꾸준한 학습 태도가 돋보입니다.`,
      tips: [
        weakTopics[0] ? `'${weakTopics[0].topic}' 단원을 조금 더 보완하면 완벽합니다.` : "현재 페이스 그대로 유지하면 충분합니다.",
        "다음 과정 도전을 고려해볼 시점입니다.",
      ] as [string, string],
    }
    if (weekTotal === 0) return {
      attitude: "주의 필요",
      oneLiner: "이번 주 학습 기록이 없습니다. 가정에서 격려가 필요합니다.",
      summary:  "이번 주 학습 기록이 없습니다. 가정에서 학습을 독려해주시면 좋겠습니다.",
      tips: ["매일 1~2문제씩 꾸준히 푸는 습관을 만들어주세요.", "짧은 시간이라도 매일 접속하는 것이 중요합니다."] as [string, string],
    }
    if (rate < 50) return {
      attitude: "보완 필요",
      oneLiner: `전체 정답률 ${rate}% — 기초 개념 복습이 필요한 시점입니다.`,
      summary:  `${studentName} 학생은 현재 기초 개념 이해에 어려움을 겪고 있습니다. 개념 복습이 필요합니다.`,
      tips: [
        weakTopics[0] ? `특히 '${weakTopics[0].topic}' 단원 복습이 필요합니다.` : "틀린 문제를 다시 풀어보는 습관이 중요합니다.",
        "수업 시간 외에 추가 연습 문제를 드릴 예정입니다.",
      ] as [string, string],
    }
    return {
      attitude: "양호",
      oneLiner: `이번 주 ${weekTotal}문제 풀이, 정답률 ${weekRate}% — 안정적으로 학습 중입니다.`,
      summary:  `${studentName} 학생은 꾸준히 학습하고 있으며 이번 주 ${weekTotal}문제를 풀었습니다. 정답률 ${weekRate}%로 성장 중입니다.`,
      tips: [
        weakTopics[0] ? `'${weakTopics[0].topic}' 관련 문제를 조금 더 연습해보세요.` : "다양한 문제 유형에 도전해보세요.",
        "현재 페이스를 유지하면 좋겠습니다.",
      ] as [string, string],
    }
  })()

  /* ── 강사 입력 우선, 없으면 AI 자동 ── */
  const attitude   = teacherInput?.attitude  || autoFeedback.attitude
  const summary    = teacherInput?.summary   || autoFeedback.summary
  const tips       = (teacherInput?.tips?.filter(Boolean).length === 2 ? teacherInput.tips : autoFeedback.tips) as [string, string]
  const isTeacherWritten = !!(teacherInput?.summary || teacherInput?.tips?.some(Boolean))
  const oneLiner   = autoFeedback.oneLiner  // 한 줄 요약은 항상 자동
  const needsConsult = teacherInput?.needsConsult ?? false
  const notices    = teacherInput?.notices?.filter(n => n.label).length
    ? teacherInput.notices.filter(n => n.label)
    : [
        { label: "4월 학습 리포트가 준비되었습니다.", date: "4. 15" },
        { label: "5월 시험 대비 특별반이 운영됩니다.", date: "4. 10" },
      ]

  const attitudeStyle = ATTITUDE_STYLE[attitude] ?? ATTITUDE_STYLE["보통"]

  /* ── 과제 묶음 그룹핑 ── */
  const assignmentGroups = useMemo<AssignmentGroup[]>(() => {
    const map = new Map<string, AssignmentGroup>()
    for (const a of assignments) {
      const key = a.topic ?? "기타"
      if (!map.has(key)) {
        // 관리자가 입력한 묶음명 우선, 없으면 "단원명 단원 과제" 형식으로 통일
        const label = teacherInput?.bundleNames?.[key] ?? `${key} 단원 과제`
        map.set(key, { topic: key, label, items: [], done: 0, total: 0, hasRetry: false })
      }
      const g = map.get(key)!
      g.items.push(a)
      g.total++
      if (a.isCorrect) g.done++
      if (a.isAttempted && !a.isCorrect) g.hasRetry = true
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.done === a.total && b.done !== b.total) return 1
      if (b.done === b.total && a.done !== b.total) return -1
      return (b.total - b.done) - (a.total - a.done)
    })
  }, [assignments, teacherInput?.bundleNames])

  /* ── 과정 진도 ── */
  const COURSE_ORDER  = ["basic", "intermediate", "advanced"]
  const COURSE_LABELS: Record<string, string> = { basic: "기초 과정", intermediate: "중급 과정", advanced: "심화 과정" }
  const currentSlug   = COURSE_ORDER.find(s => courseStats[s]?.total > 0 && courseStats[s]?.rate < 100) ?? COURSE_ORDER[0]
  const currentCourseRate = courseStats[currentSlug]?.rate ?? 0
  const nextSlug      = COURSE_ORDER[COURSE_ORDER.indexOf(currentSlug) + 1]
  const nextCourseLabel   = nextSlug ? COURSE_LABELS[nextSlug] : null
  const isEligibleForNext = currentCourseRate >= 80 && !!nextSlug

  /* ── 마지막 업데이트 표시 ── */
  const feedbackUpdatedAt = teacherInput?.updatedAt
    ? `강사 업데이트: ${formatRelativeTime(teacherInput.updatedAt)}`
    : "AI 자동 생성"

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950">

      {/* ═══ NAVBAR ═══ */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-slate-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-8 h-14 flex items-center justify-between">
          <Link href="/" className="opacity-90 hover:opacity-100 transition-opacity">
            <CodeOnLogo />
          </Link>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-gray-800 px-3 py-1.5 rounded-full">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>학부모 대시보드</span>
            </div>
            <span className="text-sm text-gray-700 hidden sm:block">{parentName}님</span>
            <button onClick={() => signOut({ callbackUrl: "/login" })} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 font-medium transition-colors">
              <LogOut className="w-4 h-4" /><span className="hidden sm:inline">로그아웃</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-8 pt-20 pb-16 space-y-5">

        {/* ── 상담 필요 알림 배너 (강사가 ON으로 설정했을 때만) ── */}
        {needsConsult && (
          <div className="flex items-center gap-3 px-5 py-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <BadgeAlert className="w-5 h-5 text-red-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">담당 강사가 상담을 권장합니다</p>
              <p className="text-xs text-red-500 mt-0.5">아래 상담 신청 버튼을 통해 빠르게 연락해주세요.</p>
            </div>
            <button onClick={() => setShowConsult(true)} className="shrink-0 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition-colors">
              상담 신청
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════
            ROW 1 — 학생 요약 카드 (전체 폭)
            자동 계산: 전체 정답률 / 학습일 / 최근 정답률 / 과제 완료율
        ══════════════════════════════════════════ */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="px-8 pt-7 pb-5 border-b border-slate-100 dark:border-gray-800">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">자녀 학습 현황</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">{studentName} 학생</h1>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {grade    && <span className="text-xs text-slate-500 bg-slate-100 dark:bg-gray-800 dark:text-slate-400 px-2.5 py-1 rounded-full font-medium">{grade}</span>}
                    {classNum && <span className="text-xs text-slate-500 bg-slate-100 dark:bg-gray-800 dark:text-slate-400 px-2.5 py-1 rounded-full font-medium">{classNum}반</span>}
                    <span className="text-xs text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400 px-2.5 py-1 rounded-full font-semibold border border-indigo-100 dark:border-indigo-800">{currentCourse}</span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${attitudeStyle.badge}`}>{attitude}</span>
                  </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed max-w-2xl">{oneLiner}</p>
              </div>
              {streak > 0 && (
                <div className="shrink-0 flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 px-4 py-3 rounded-xl">
                  <Flame className="w-5 h-5 text-orange-400" />
                  <div className="text-right">
                    <p className="text-xl font-extrabold text-orange-600 dark:text-orange-400 leading-none tabular-nums">{streak}</p>
                    <p className="text-[10px] text-orange-400 font-medium mt-0.5">일 연속</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* KPI — 4개 모두 자동 계산 */}
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-100 dark:divide-gray-800">
            <div className="px-7 py-5">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">전체 정답률</p>
              <div className="flex items-end gap-1.5 mb-2">
                <p className="text-3xl font-extrabold text-gray-900 dark:text-white tabular-nums leading-none">{rate}</p>
                <span className="text-sm font-medium text-slate-400 mb-0.5">%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                <div className={`h-full rounded-full ${attitudeStyle.bar}`} style={{ width: `${rate}%` }} />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">누적 {total}회 기준</p>
            </div>
            <div className="px-7 py-5">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">최근 7일 학습일</p>
              <div className="flex items-end gap-1.5 mb-2">
                <p className="text-3xl font-extrabold text-gray-900 dark:text-white tabular-nums leading-none">{studyDaysThisWeek}</p>
                <span className="text-sm font-medium text-slate-400 mb-0.5">일</span>
              </div>
              <div className="flex gap-1 mb-1.5">
                {weeklyData.map((d, i) => <div key={i} className={`flex-1 rounded-sm h-1.5 ${d.count > 0 ? "bg-indigo-400" : "bg-slate-100 dark:bg-gray-800"}`} />)}
              </div>
              <p className="text-[11px] text-slate-400">이번 주 {weekTotal}문제 제출</p>
            </div>
            <div className="px-7 py-5">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">최근 10문제 정답률</p>
              {recent10Subs.length > 0 ? (
                <>
                  <div className="flex items-end gap-1.5 mb-2">
                    <p className={`text-3xl font-extrabold tabular-nums leading-none ${recent10Rate >= 80 ? "text-emerald-600" : recent10Rate >= 60 ? "text-amber-600" : "text-red-500"}`}>{recent10Rate}</p>
                    <span className="text-sm font-medium text-slate-400 mb-0.5">%</span>
                  </div>
                  <div className="flex gap-0.5 mb-1.5">
                    {recent10Subs.map((s, i) => <div key={i} className={`flex-1 rounded-sm h-1.5 ${s.isCorrect ? "bg-emerald-400" : "bg-red-300"}`} />)}
                  </div>
                  <p className="text-[11px] text-slate-400">{recent10Subs.length}문제 기준</p>
                </>
              ) : <p className="text-sm text-slate-400 mt-2">기록 없음</p>}
            </div>
            <div className={`px-7 py-5 ${assignedPending > 0 ? "bg-amber-50/50 dark:bg-amber-900/10" : ""}`}>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">과제 완료율</p>
              <div className="flex items-end gap-1.5 mb-2">
                <p className={`text-3xl font-extrabold tabular-nums leading-none ${submitRate >= 80 ? "text-emerald-600" : submitRate >= 50 ? "text-amber-600" : "text-red-500"}`}>{submitRate}</p>
                <span className="text-sm font-medium text-slate-400 mb-0.5">%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden mb-1.5">
                <div className={`h-full rounded-full ${submitRate >= 80 ? "bg-emerald-500" : "bg-amber-400"}`} style={{ width: `${submitRate}%` }} />
              </div>
              <p className="text-[11px] text-slate-400">{assignedDone}/{assignedTotal}개 완료</p>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            ROW 2 — 강사 피드백 (2/3) + 이번 주 학습 흐름 (1/3)
            강사 총평·확인 포인트: 강사 입력 우선 / 없으면 AI 자동
            학습 흐름: 전체 자동 계산
        ══════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* 강사 피드백 & AI 분석 */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-sm p-7">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center shrink-0">
                <Sparkles className="w-[18px] h-[18px] text-indigo-500" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">강사 피드백 &amp; AI 분석</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">{feedbackUpdatedAt}</p>
              </div>
              <span className={`ml-auto text-xs font-semibold px-3 py-1 rounded-full border ${attitudeStyle.badge}`}>
                학습 태도: {attitude}
              </span>
            </div>

            {/* 강사 총평 */}
            <div className="bg-slate-50 dark:bg-gray-800 rounded-xl px-5 py-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">강사 총평</p>
                {isTeacherWritten && (
                  <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-full">강사 작성</span>
                )}
              </div>
              <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">{summary}</p>
            </div>

            {/* 학부모 확인 포인트 */}
            <div className="space-y-2.5">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">학부모 확인 포인트</p>
              {tips.map((tip, i) => tip ? (
                <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
                  <span className="w-5 h-5 bg-indigo-100 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-300 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                  <p className="text-sm text-indigo-950 dark:text-indigo-100 leading-relaxed">{tip}</p>
                </div>
              ) : null)}
            </div>

            {/* 집중 보완 단원 (자동) */}
            {weakTopics.length > 0 && (
              <div className="mt-5 pt-5 border-t border-slate-100 dark:border-gray-800">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2.5">집중 보완 단원 <span className="normal-case font-normal">(자동 계산)</span></p>
                <div className="flex flex-wrap gap-2">
                  {weakTopics.slice(0, 4).map((t, i) => (
                    <span key={i} className="text-xs font-semibold px-3 py-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 border border-red-100 dark:border-red-800 rounded-full">
                      {t.topic} <span className="opacity-70">({t.rate}%)</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 이번 주 학습 흐름 (자동) */}
          <div className="lg:col-span-1 bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-sm p-7 flex flex-col">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 bg-slate-50 dark:bg-gray-800 rounded-xl flex items-center justify-center shrink-0">
                <BarChart2 className="w-[18px] h-[18px] text-slate-500" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">이번 주 학습 흐름</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">최근 7일 · 자동 집계</p>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <div className="bg-slate-50 dark:bg-gray-800 rounded-xl px-4 py-3.5">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-slate-600 font-medium">이번 주 문제</p>
                  <p className="text-lg font-extrabold text-gray-900 dark:text-white tabular-nums">{weekTotal}<span className="text-xs font-medium text-slate-400 ml-0.5">문제</span></p>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />정답 {weekCorrect}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-300 inline-block" />오답 {weekTotal - weekCorrect}</span>
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-gray-800 rounded-xl px-4 py-3.5">
                <p className="text-xs text-slate-600 font-medium mb-1">전주 대비 정답률</p>
                <div className="flex items-center gap-2">
                  {rateChange > 0 ? <ArrowUpRight className="w-5 h-5 text-emerald-500 shrink-0" />
                    : rateChange < 0 ? <ArrowDownRight className="w-5 h-5 text-red-400 shrink-0" />
                    : <Minus className="w-5 h-5 text-slate-400 shrink-0" />}
                  <p className={`text-lg font-extrabold tabular-nums ${rateChange > 0 ? "text-emerald-600" : rateChange < 0 ? "text-red-500" : "text-slate-500"}`}>
                    {rateChange > 0 ? `+${rateChange}` : rateChange}<span className="text-xs font-medium text-slate-400 ml-0.5">%</span>
                  </p>
                  <p className="text-xs text-slate-400 ml-auto">이번 주 {weekRate}%</p>
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-gray-800 rounded-xl px-4 py-3.5">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-slate-600 font-medium">연속 학습</p>
                  <p className="text-lg font-extrabold text-orange-500 tabular-nums">{streak}<span className="text-xs font-medium text-slate-400 ml-0.5">일</span></p>
                </div>
                <p className="text-xs text-orange-400 font-medium">
                  {streak >= 7 ? "대단한 꾸준함이에요!" : streak >= 3 ? "잘 유지하고 있어요" : streak > 0 ? "계속 이어가요" : "오늘부터 시작해요"}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-gray-800 rounded-xl px-4 py-3.5">
                <p className="text-xs text-slate-500 font-medium mb-2">요일별 학습</p>
                <div className="flex items-end gap-1 h-8">
                  {weeklyData.map((d, i) => (
                    <div key={i} className="flex-1">
                      <div className={`w-full rounded-sm ${d.count > 0 ? "bg-indigo-400" : "bg-slate-200 dark:bg-gray-700"}`}
                        style={{ height: d.count > 0 ? `${Math.max(20, Math.min(100, d.count * 20))}%` : "20%" }} />
                    </div>
                  ))}
                </div>
                <div className="flex gap-1 mt-1">
                  {weeklyData.map((d, i) => <p key={i} className="flex-1 text-center text-[9px] text-slate-400">{d.day}</p>)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            ROW 3 — 과제 현황 묶음형 (2/3) + 이번 주 과제 제출 현황 (1/3)
            과제 묶음명: 강사 입력 우선 / 없으면 "단원 과제" 자동 포맷
            수치: 전체 자동 계산
        ══════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* 과제 현황 — 묶음형 */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-sm p-7">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center shrink-0">
                <ListChecks className="w-[18px] h-[18px] text-amber-500" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">과제 현황</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">{currentCourse} · 단원별 묶음</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 font-medium">{assignedDone}개 완료</span>
                {assignedPending > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100 font-medium">{assignedPending}개 미완료</span>}
              </div>
            </div>

            {assignmentGroups.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-slate-400 text-sm">과제가 없습니다.</div>
            ) : (
              <div className="space-y-2.5">
                {assignmentGroups.map(g => {
                  const status     = getBundleStatus(g)
                  const pct        = g.total > 0 ? Math.round((g.done / g.total) * 100) : 0
                  const isExpanded = bundleExpanded === g.topic
                  return (
                    <div key={g.topic} className="border border-slate-100 dark:border-gray-700 rounded-xl overflow-hidden">
                      <button
                        className="w-full flex items-center gap-4 px-5 py-4 bg-white dark:bg-gray-900 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors text-left"
                        onClick={() => setBundleExpanded(isExpanded ? null : g.topic)}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${g.done === g.total ? "bg-emerald-50" : g.done > 0 ? "bg-blue-50" : "bg-slate-100 dark:bg-gray-700"}`}>
                          {g.done === g.total
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            : <Clock className={`w-4 h-4 ${g.done > 0 ? "text-blue-500" : "text-slate-400"}`} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            {/* 과제 묶음명: 강사 입력 or 자동 포맷 */}
                            <span className="text-sm font-semibold text-gray-800 dark:text-white">{g.label}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.cls}`}>{status.label}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-slate-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${g.done === g.total ? "bg-emerald-500" : g.done > 0 ? "bg-blue-500" : "bg-slate-300"}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs tabular-nums text-slate-500 shrink-0 font-medium">{g.done}/{g.total}문제</span>
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                      </button>
                      {isExpanded && (
                        <div className="border-t border-slate-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 px-5 py-3 space-y-1.5">
                          {g.items.map((a, i) => (
                            <div key={i} className="flex items-center gap-3 py-1.5">
                              {a.isCorrect
                                ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                : a.isAttempted
                                  ? <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  : <Clock       className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                              }
                              <span className={`text-xs flex-1 truncate ${a.isCorrect ? "text-slate-400 dark:text-slate-500 line-through" : "text-gray-700 dark:text-gray-200 font-medium"}`}>
                                {a.title}
                              </span>
                              {a.isAttempted && !a.isCorrect && (
                                <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-md font-semibold shrink-0">재시도</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 이번 주 과제 제출 현황 */}
          <div className="lg:col-span-1 bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-sm p-7 flex flex-col">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center shrink-0">
                <PackageCheck className="w-[18px] h-[18px] text-indigo-500" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">이번 주 과제 제출 현황</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">과제 완료율 기준 · 자동 집계</p>
              </div>
            </div>

            {/* 원형 차트 — 과제 완료율 */}
            <div className="flex flex-col items-center justify-center py-4">
              <div className="relative w-28 h-28">
                <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90">
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                  <circle cx="50" cy="50" r="38" fill="none"
                    stroke={submitRate >= 80 ? "#10b981" : submitRate >= 50 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="12"
                    strokeDasharray={`${2 * Math.PI * 38}`}
                    strokeDashoffset={`${2 * Math.PI * 38 * (1 - submitRate / 100)}`}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className={`text-2xl font-extrabold tabular-nums leading-none ${submitRate >= 80 ? "text-emerald-600" : submitRate >= 50 ? "text-amber-600" : "text-red-500"}`}>{submitRate}%</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">과제 완료율</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2 text-center">
                전체 {assignedTotal}개 과제 중 <span className="font-bold text-gray-800 dark:text-white">{assignedDone}개 완료</span>
              </p>
            </div>

            {/* 수치 목록 — 명확한 라벨 */}
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-gray-800">
                <div className="flex items-center gap-2">
                  <CalendarCheck2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="text-xs text-slate-600 dark:text-slate-300">이번 주 제출 건수</span>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{weekTotal}건</span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="text-xs text-slate-600 dark:text-slate-300">완료된 과제 수</span>
                </div>
                <span className="text-sm font-bold text-emerald-600 tabular-nums">{assignedDone}개</span>
              </div>
              {assignedPending > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="text-xs text-slate-600 dark:text-slate-300">아직 미완료 과제</span>
                  </div>
                  <span className="text-sm font-bold text-amber-600 tabular-nums">{assignedPending}개</span>
                </div>
              )}
              {retryNeeded > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-orange-50 dark:bg-orange-900/20">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span className="text-xs text-slate-600 dark:text-slate-300">재도전 필요 문제</span>
                  </div>
                  <span className="text-sm font-bold text-orange-500 tabular-nums">{retryNeeded}개</span>
                </div>
              )}

              {/* 4주 추이 */}
              <div className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-gray-800">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">최근 4주 제출 추이</p>
                <div className="flex items-end gap-1.5 h-10">
                  {monthlyData.map((w, i) => {
                    const maxCount = Math.max(...monthlyData.map(m => m.count), 1)
                    const h = Math.max(15, Math.round((w.count / maxCount) * 100))
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className={`w-full rounded-sm ${i === monthlyData.length - 1 ? "bg-indigo-500" : "bg-slate-300 dark:bg-gray-600"}`} style={{ height: `${h}%` }} />
                        <p className="text-[9px] text-slate-400 leading-none">{w.week}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {recentSubs[0] && (
                <p className="text-[11px] text-slate-400 text-center">
                  마지막 제출: <span className="font-semibold text-slate-600 dark:text-slate-300">{formatRelativeTime(recentSubs[0].createdAt)}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            ROW 4 — 최근 제출 요약(축소형) + 과정별 진도 + 공지/상담
            최근 제출: 자동 집계 / 공지: 강사 입력 우선
        ══════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* 최근 제출 요약 — 요약형 유지, 상세는 모달 */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-sm p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-slate-50 dark:bg-gray-800 rounded-xl flex items-center justify-center shrink-0">
                <History className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">최근 제출 요약</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">최근 10회 기준 · 자동 집계</p>
              </div>
            </div>

            {recent10Subs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6">
                <FileText className="w-8 h-8 text-slate-200 mb-2" />
                <p className="text-sm text-slate-400">제출 기록이 없습니다.</p>
              </div>
            ) : (
              <>
                {/* 요약 수치 */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center bg-emerald-50 dark:bg-emerald-900/20 rounded-xl py-3">
                    <p className="text-xl font-extrabold text-emerald-600 tabular-nums">{recent10Correct}</p>
                    <p className="text-[10px] text-emerald-600/70 font-medium mt-0.5">정답</p>
                  </div>
                  <div className="text-center bg-red-50 dark:bg-red-900/20 rounded-xl py-3">
                    <p className="text-xl font-extrabold text-red-500 tabular-nums">{recent10Wrong}</p>
                    <p className="text-[10px] text-red-500/70 font-medium mt-0.5">오답</p>
                  </div>
                  <div className="text-center bg-orange-50 dark:bg-orange-900/20 rounded-xl py-3">
                    <p className="text-xl font-extrabold text-orange-500 tabular-nums">{retryNeeded}</p>
                    <p className="text-[10px] text-orange-500/70 font-medium mt-0.5">재도전</p>
                  </div>
                </div>

                {/* 정답률 바 */}
                <div className="mb-4">
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>최근 10문제 정답률</span>
                    <span className={`font-bold ${recent10Rate >= 80 ? "text-emerald-600" : recent10Rate >= 60 ? "text-amber-600" : "text-red-500"}`}>{recent10Rate}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${recent10Rate >= 80 ? "bg-emerald-500" : recent10Rate >= 60 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${recent10Rate}%` }} />
                  </div>
                </div>

                {/* 대표 최근 2건 */}
                <div className="space-y-1.5 mb-4">
                  {recentSubs.slice(0, 2).map((s, i) => (
                    <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-50 dark:bg-gray-800">
                      {s.isCorrect
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        : <XCircle      className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      }
                      <span className="text-xs text-gray-700 dark:text-gray-200 truncate flex-1">{s.title}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">{formatRelativeTime(s.createdAt)}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setShowHistory(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 border border-slate-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-slate-500 hover:border-indigo-200 hover:text-indigo-600 transition-colors"
                >
                  전체 제출 이력 보기 <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>

          {/* 과정별 진도 (자동) */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-sm p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4 text-indigo-500" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">과정별 진도</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">다음 단계 진입 현황 · 자동</p>
              </div>
            </div>
            <div className="space-y-4">
              {Object.entries(courseStats).filter(([, s]) => s.total > 0).map(([slug, s]) => (
                <div key={slug}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{s.label}</span>
                      {slug === currentSlug && (
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-800">진행 중</span>
                      )}
                    </div>
                    <span className={`text-xs tabular-nums font-bold ${s.rate >= 80 ? "text-emerald-600" : "text-slate-500"}`}>{s.rate}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${s.rate >= 80 ? "bg-emerald-500" : "bg-indigo-500"}`} style={{ width: `${s.rate}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">{s.completed}/{s.total}문제</p>
                </div>
              ))}
              {Object.values(courseStats).every(s => s.total === 0) && (
                <p className="text-sm text-slate-400 py-4 text-center">아직 학습 기록이 없습니다.</p>
              )}
            </div>
            {isEligibleForNext && nextCourseLabel ? (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-gray-800">
                <div className="flex items-start gap-2.5 px-3.5 py-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                  <Target className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-200">{nextCourseLabel} 진입 가능!</p>
                    <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5">현재 {currentCourseRate}% 달성 — 강사에게 문의하세요.</p>
                  </div>
                </div>
              </div>
            ) : !isEligibleForNext && currentCourseRate < 80 && Object.values(courseStats).some(s => s.total > 0) ? (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-gray-800">
                <p className="text-[11px] text-slate-400 text-center">80% 달성 시 다음 단계 진급 가능 (현재 {currentCourseRate}%)</p>
              </div>
            ) : null}
          </div>

          {/* 공지 및 상담 — 공지는 강사 입력 우선 */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 shadow-sm p-6 flex flex-col">
            <div className="mb-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white">공지사항</h2>
                    <p className="text-[11px] text-slate-400">강사 입력</p>
                  </div>
                </div>
                <button className="text-[11px] text-indigo-500 hover:text-indigo-700 font-semibold flex items-center gap-0.5">
                  전체 <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-2">
                {notices.map((n, i) => (
                  <div key={i} className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 hover:border-slate-200 transition-colors cursor-pointer">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold leading-relaxed text-gray-800 dark:text-white">{n.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{n.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-slate-100 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center shrink-0">
                  <Phone className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">강사 상담</h3>
                  <p className="text-[11px] text-slate-400">1~2 영업일 내 답변</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setShowConsult(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> 상담 신청
                </button>
                <button className="px-3 py-2.5 border border-slate-200 dark:border-gray-700 text-slate-500 hover:border-slate-300 rounded-xl text-xs font-semibold transition-colors">
                  이력 보기
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {showConsult && <ConsultModal onClose={() => setShowConsult(false)} />}
      {showHistory  && <SubHistoryModal subs={recentSubs} onClose={() => setShowHistory(false)} />}
    </div>
  )
}
