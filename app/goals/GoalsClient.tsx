"use client"

import { useState, useEffect, useMemo, useRef, Fragment, useCallback } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import CodeOnLogo from "@/components/ui/CodeOnLogo"
import { PageLayout } from "@/components/ui/PageLayout"
import { ArrowLeft, LogOut, Flame, Trophy, CheckCircle, Sparkles } from "lucide-react"
import { useGoal } from "@/lib/goalContext"

// ── 헬퍼 ──────────────────────────────────────────────────────────────────────
const toLocalDate = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

const CONFETTI_COLORS = [
  "#534AB7", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#3b82f6", "#f43f5e", "#a3e635",
]

function cellBg(count: number) {
  if (count === 0) return "bg-gray-100"
  if (count === 1) return "bg-[#c4b5fd]"
  if (count === 2) return "bg-[#7c3aed]"
  return "bg-[#4c1d95]"
}

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"]

export default function GoalsClient() {
  const { data: session } = useSession()
  const router = useRouter()
  const { dailyGoal, setDailyGoal } = useGoal()

  const [correctSubs,  setCorrectSubs]  = useState<{ problem_id: string; created_at: string }[]>([])
  const [loading,      setLoading]      = useState(true)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showAllWeeks, setShowAllWeeks] = useState(false)
  const [cellSize,     setCellSize]     = useState(12)
  const prevAchievedRef = useRef(false)
  const gridRef         = useRef<HTMLDivElement>(null)

  const userId   = (session?.user as any)?.id
  const userName = session?.user?.name ?? "학생"

  // 정답 제출 기록 전체 조회
  const fetchSubs = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from("submissions")
      .select("problem_id, created_at")
      .eq("user_id", userId)
      .eq("is_correct", true)
      .order("created_at", { ascending: false })
    setCorrectSubs(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchSubs() }, [fetchSubs])

  // 창 포커스 복귀 시 재fetch (문제 풀고 돌아올 때)
  useEffect(() => {
    window.addEventListener("focus", fetchSubs)
    return () => window.removeEventListener("focus", fetchSubs)
  }, [fetchSubs])

  // Supabase 실시간 구독 (같은 탭 내 즉시 반영)
  useEffect(() => {
    if (!userId) return
    const ch = supabase
      .channel(`goals-subs:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "submissions", filter: `user_id=eq.${userId}` },
        payload => {
          const s = payload.new as { problem_id: string; created_at: string; is_correct: boolean }
          if (s.is_correct) setCorrectSubs(prev => [{ problem_id: s.problem_id, created_at: s.created_at }, ...prev])
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [userId])

  // 날짜별 정답 수 집계 (UTC → 로컬 날짜 변환)
  const dayCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of correctSubs) {
      const utcStr = /Z|[+-]\d{2}:?\d{2}$/.test(s.created_at) ? s.created_at : s.created_at + "Z"
      const d = toLocalDate(new Date(utcStr))
      map[d] = (map[d] ?? 0) + 1
    }
    return map
  }, [correctSubs])

  const todaySolved = useMemo(() => dayCounts[toLocalDate(new Date())] ?? 0, [dayCounts])
  const achieved    = todaySolved >= dailyGoal

  // 목표 달성 시 confetti 트리거
  useEffect(() => {
    if (!loading && achieved && !prevAchievedRef.current) {
      setShowConfetti(true)
      const t = setTimeout(() => setShowConfetti(false), 4000)
      prevAchievedRef.current = true
      return () => clearTimeout(t)
    }
    if (!achieved) prevAchievedRef.current = false
  }, [achieved, loading])

  const confettiPieces = useMemo(
    () => Array.from({ length: 60 }, (_, i) => ({
      id:       i,
      x:        Math.random() * 100,
      color:    CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      delay:    Math.random() * 1.5,
      duration: 1.8 + Math.random() * 1.5,
      size:     4 + Math.floor(Math.random() * 6),
    })),
    []
  )

  // 스트릭 계산
  const { streak, longestStreak } = useMemo(() => {
    const days = new Set(Object.keys(dayCounts))
    let cur = 0
    const d = new Date(); d.setHours(0, 0, 0, 0)
    if (!days.has(toLocalDate(d))) d.setDate(d.getDate() - 1)
    while (days.has(toLocalDate(d))) { cur++; d.setDate(d.getDate() - 1) }

    const sorted = [...days].sort()
    let longest = 0, run = 0
    for (let i = 0; i < sorted.length; i++) {
      if (i === 0) { run = 1 }
      else {
        const diff = Math.round(
          (new Date(sorted[i] + "T12:00:00").getTime() - new Date(sorted[i - 1] + "T12:00:00").getTime())
          / 86400000
        )
        run = diff === 1 ? run + 1 : 1
      }
      longest = Math.max(longest, run)
    }
    return { streak: cur, longestStreak: Math.max(cur, longest) }
  }, [dayCounts])

  // 잔디 캘린더 (최근 52주)
  const { weeks } = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const todayStr = toLocalDate(today)
    const start = new Date(today)
    start.setDate(today.getDate() - today.getDay() - 51 * 7)

    type Cell = { date: string; count: number; isToday: boolean; isFuture: boolean }
    const cells: Cell[] = []
    const cur = new Date(start)
    while (cur <= today) {
      const str = toLocalDate(cur)
      cells.push({ date: str, count: dayCounts[str] ?? 0, isToday: str === todayStr, isFuture: false })
      cur.setDate(cur.getDate() + 1)
    }

    const weeksArr: Cell[][] = []
    for (let i = 0; i < cells.length; i += 7) {
      const week = cells.slice(i, i + 7)
      while (week.length < 7) week.push({ date: "", count: 0, isToday: false, isFuture: true })
      weeksArr.push(week)
    }
    return { weeks: weeksArr }
  }, [dayCounts])

  // 표시할 weeks: 기본 3개월(13주), 전체 보기 시 52주
  const displayWeeks = showAllWeeks ? weeks : weeks.slice(-13)

  // 현재 보이는 weeks 기준으로 월 라벨 재계산
  const displayMonthLabels = (() => {
    const labels: { weekIdx: number; label: string }[] = []
    let lastMonth = -1
    displayWeeks.forEach((week, wi) => {
      const firstReal = week.find(c => !c.isFuture && c.date)
      if (!firstReal) return
      const m = new Date(firstReal.date + "T12:00:00").getMonth()
      if (m !== lastMonth) {
        labels.push({
          weekIdx: wi,
          label: new Date(firstReal.date + "T12:00:00").toLocaleDateString("ko-KR", { month: "short" }),
        })
        lastMonth = m
      }
    })
    return labels
  })()

  // 컨테이너 너비에 맞춰 셀 크기 동적 계산 (전체 보기는 고정 12px)
  useEffect(() => {
    const el = gridRef.current
    if (!el) return
    if (showAllWeeks) {
      setCellSize(12)
      return
    }
    const numWeeks = Math.min(weeks.length, 13)
    const compute = () => {
      const w = el.clientWidth
      const available = w - 20 - 4 * numWeeks
      setCellSize(Math.max(10, Math.floor(available / numWeeks)))
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [showAllWeeks, weeks.length])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F5F8]">
      <div className="w-8 h-8 border-2 border-[#534AB7] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F4F5F8] pb-20">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes confetti-fall {
          0%   { transform: translateY(-10px) rotate(0deg) scale(1); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(400px) rotate(680deg) scale(0.7); opacity: 0; }
        }
      ` }} />

      {/* ── 네비게이션 ─────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-gray-100 bg-white">
        <PageLayout className="h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/dashboard")} className="p-2 -ml-2 text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="hidden sm:block">
              <CodeOnLogo />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden sm:block">{userName}님</span>
            <button onClick={() => signOut({ callbackUrl: "/login" })} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </PageLayout>
      </nav>

      <PageLayout className="pt-24 space-y-4">

        {/* ══ 1. 오늘 목표 ═════════════════════════════════════ */}
        <div className="relative overflow-hidden rounded-2xl p-6 bg-white">
          {/* confetti — 카드 내부에만 표시 */}
          {showConfetti && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {confettiPieces.map(p => (
                <div
                  key={p.id}
                  className="absolute top-0 rounded-sm"
                  style={{
                    left:            `${p.x}%`,
                    width:           `${p.size}px`,
                    height:          `${p.size}px`,
                    backgroundColor: p.color,
                    animation:       `confetti-fall ${p.duration}s ${p.delay}s ease-in forwards`,
                  }}
                />
              ))}
            </div>
          )}

          {/* 헤더: 제목 + +/- 버튼 */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-gray-900">오늘 목표</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDailyGoal(dailyGoal - 1)}
                disabled={dailyGoal <= 1}
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg leading-none transition-colors disabled:opacity-30 bg-gray-100 text-gray-600 hover:bg-gray-200"
              >−</button>
              <span className="text-lg font-black w-8 text-center tabular-nums text-gray-900">
                {dailyGoal}
              </span>
              <button
                onClick={() => setDailyGoal(dailyGoal + 1)}
                disabled={dailyGoal >= 20}
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg leading-none transition-colors disabled:opacity-30 bg-gray-100 text-gray-600 hover:bg-gray-200"
              >+</button>
            </div>
          </div>

          {/* 달성 여부 메시지 */}
          {achieved ? (
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-full bg-[#534AB7]/10 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-[#534AB7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <p className="text-xl font-black text-gray-900 flex items-center gap-2">목표 달성! <Sparkles className="w-5 h-5 text-[#534AB7]" /></p>
                <p className="text-sm text-gray-500">오늘 <span className="font-bold text-[#534AB7]">{todaySolved}</span>문제 완료 · 정말 대단해요!</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 mb-5">
              오늘{" "}
              <span>{todaySolved}</span>
              {" "}/ {dailyGoal}문제 완료 — {dailyGoal - todaySolved}문제 더 풀면 달성!
            </p>
          )}

          {/* 진행 바: 미달성 #AFA9EC, 달성 #534AB7 */}
          <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: "#E5E7EB" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, dailyGoal > 0 ? (todaySolved / dailyGoal) * 100 : 0)}%`,
                backgroundColor: achieved ? "#534AB7" : "#AFA9EC",
              }}
            />
          </div>
          <div className="flex justify-between text-xs mt-2 text-gray-400">
            <span>{todaySolved}문제 풀음</span>
            <div className="flex items-center gap-1">
              {achieved && <CheckCircle className="w-3.5 h-3.5 text-[#534AB7]" />}
              <span>목표 {dailyGoal}문제</span>
            </div>
          </div>
        </div>

        {/* ══ 2. 스트릭 ════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">연속 학습 기록</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center justify-center py-3.5 rounded-xl bg-gray-50">
              <div className="flex items-center gap-1 mb-2">
                <Flame className="w-4 h-4 text-[#534AB7]" />
                <span className="text-xs font-semibold text-[#534AB7]">현재 스트릭</span>
              </div>
              <p className="text-5xl font-black text-gray-900 tabular-nums leading-none">{streak}</p>
              <p className="text-sm text-gray-400 mt-1.5">일 연속</p>
            </div>
            <div className="flex flex-col items-center justify-center py-3.5 rounded-xl bg-gray-50">
              <div className="flex items-center gap-1 mb-2">
                <Trophy className="w-4 h-4 text-[#534AB7]" />
                <span className="text-xs font-semibold text-[#534AB7]">최장 기록</span>
              </div>
              <p className="text-5xl font-black text-gray-900 tabular-nums leading-none">{longestStreak}</p>
              <p className="text-sm text-gray-400 mt-1.5">일 연속</p>
            </div>
          </div>
        </div>

        {/* ══ 3. 잔디 캘린더 ═══════════════════════════════════ */}
        <div className="bg-white rounded-2xl p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">학습 캘린더</h2>

          <div ref={gridRef} className={showAllWeeks ? "overflow-x-auto" : "overflow-hidden"}>
            {/* CSS Grid: 20px 요일라벨 + N×cellSize 셀 컬럼 */}
            <div style={{
              display: "grid",
              gridTemplateColumns: `20px repeat(${displayWeeks.length}, ${cellSize}px)`,
              gap: showAllWeeks ? "3px" : "4px",
            }}>

              {/* Row 0: 빈 코너 + 월 라벨 */}
              <div style={{ height: 14 }} />
              {displayWeeks.map((_, wi) => {
                const label = displayMonthLabels.find(m => m.weekIdx === wi)?.label
                return (
                  <div key={`ml-${wi}`} style={{ height: 14, overflow: "visible" }}>
                    {label && (
                      <span style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1, whiteSpace: "nowrap", display: "block" }}>{label}</span>
                    )}
                  </div>
                )
              })}

              {/* Rows 1–7: 요일 라벨 + 잔디 셀 */}
              {DAY_NAMES.map((dayName, dayIdx) => (
                <Fragment key={`row-${dayIdx}`}>
                  <div style={{ width: 20, height: cellSize, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                    {[1, 3, 5].includes(dayIdx) && (
                      <span className="text-[9px] text-gray-300 leading-none">{dayName}</span>
                    )}
                  </div>
                  {displayWeeks.map((week, wi) => {
                    const cell = week[dayIdx]
                    return (
                      <div
                        key={`c-${wi}-${dayIdx}`}
                        title={cell.isFuture || !cell.date ? "" : `${cell.date}: ${cell.count}문제`}
                        style={{
                          width:        cellSize,
                          height:       cellSize,
                          borderRadius: 3,
                          flexShrink:   0,
                          ...(cell.isToday && !cell.isFuture
                            ? { border: "2px solid #534AB7" }
                            : {}),
                        }}
                        className={cell.isFuture ? "" : cellBg(cell.count)}
                      />
                    )
                  })}
                </Fragment>
              ))}
            </div>
          </div>

          {/* 범례 — 하단 중앙 */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 mt-3">
            <span>적음</span>
            <span className="w-3 h-3 rounded-sm bg-gray-100 inline-block" />
            <span className="w-3 h-3 rounded-sm bg-[#c4b5fd] inline-block" />
            <span className="w-3 h-3 rounded-sm bg-[#7c3aed] inline-block" />
            <span className="w-3 h-3 rounded-sm bg-[#4c1d95] inline-block" />
            <span>많음</span>
          </div>

          {/* 전체 기록 토글 */}
          <div className="flex justify-center mt-3">
            <button
              onClick={() => setShowAllWeeks(v => !v)}
              className="text-xs text-[#534AB7] font-semibold hover:underline"
            >
              {showAllWeeks ? "접기" : "전체 기록 보기"}
            </button>
          </div>
        </div>

      </PageLayout>
    </div>
  )
}
