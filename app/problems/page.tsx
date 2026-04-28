"use client"

import { useEffect, useState, useMemo } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { LayoutGrid, ChevronRight, ClipboardList, CheckCircle2, Circle, FolderOpen, FileText } from "lucide-react"
import { supabase } from "@/lib/supabase"

// ── 타입 ──────────────────────────────────────────────────────────────────────
type Problem = {
  id: string
  title: string
  category: string
  difficulty: string
}

type SubmissionRow = {
  problem_id: string
  is_correct: boolean
  created_at: string
}

type WrongItem = {
  problem: Problem
  attemptCount: number
  lastAttemptAt: string
  solvedAt?: string
}

type TabValue = "복습 필요" | "복습 완료" | "전체"

// ── 상수 ──────────────────────────────────────────────────────────────────────
const CATEGORY_LABEL: Record<string, string> = {
  "파이썬기초":     "기초 과정",
  "파이썬알고리즘": "알고리즘 과정",
  "파이썬자격증":   "자격증 과정",
  "파이썬실전":     "실전 문제",
  "파이썬도전":     "도전 문제",
}

const CATEGORY_ORDER = ["파이썬기초", "파이썬알고리즘", "파이썬자격증", "파이썬실전", "파이썬도전"]

function formatDate(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
  if (diff === 0) return "오늘"
  if (diff === 1) return "1일 전"
  if (diff <  7) return `${diff}일 전`
  if (diff < 30) return `${Math.floor(diff / 7)}주 전`
  return `${Math.floor(diff / 30)}개월 전`
}

// ── 문제 행 컴포넌트 ──────────────────────────────────────────────────────────
function WrongItemRow({
  item, idx, isCompleted, onClick,
}: {
  item: WrongItem
  idx: number
  isCompleted: boolean
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`group bg-white border border-gray-100 rounded-xl px-4 py-2.5
        flex items-center gap-3 cursor-pointer select-none shadow-sm
        transition-all duration-150
        ${isCompleted
          ? "hover:border-green-300 hover:shadow-md"
          : "hover:border-red-300 hover:shadow-md"
        }`}
    >
      {/* 왼쪽: 상태 아이콘 */}
      {isCompleted
        ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500 transition-colors duration-150" strokeWidth={2} />
        : <Circle       className="w-5 h-5 shrink-0 text-red-300 group-hover:text-red-400 transition-colors duration-150" strokeWidth={1.75} />
      }

      {/* 가운데: 제목 + 메타 */}
      <div className="flex-1 min-w-0">
        <p className={`text-base font-bold truncate transition-colors duration-150
          ${isCompleted ? "text-slate-700 group-hover:text-green-700" : "text-slate-800 group-hover:text-red-600"}`}>
          {item.problem.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-slate-600">시도 {item.attemptCount}회</span>
          {isCompleted && item.solvedAt ? (
            <>
              <span className="text-slate-300">·</span>
              <span className="text-[11px] text-emerald-500 font-medium">{formatDate(item.solvedAt)} 정답</span>
            </>
          ) : item.lastAttemptAt ? (
            <>
              <span className="text-slate-300">·</span>
              <span className="text-[11px] text-slate-400/70">{formatDate(item.lastAttemptAt)}</span>
            </>
          ) : null}
        </div>
      </div>

      {/* 오른쪽: 상태 배지 + CTA */}
      <div className="flex flex-col items-end gap-1 shrink-0 min-w-[72px]">
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md whitespace-nowrap leading-snug
          ${isCompleted
            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
            : "bg-red-50 text-red-500 border border-red-100"
          }`}>
          {isCompleted ? "복습 완료" : "복습 필요"}
        </span>
        <span className={`text-[11px] font-semibold flex items-center gap-0.5 transition-all
          ${isCompleted ? "text-emerald-400 group-hover:text-emerald-500" : "text-red-400 group-hover:text-red-500"}`}>
          {isCompleted ? "다시 풀기" : "복습하기"}
          <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────
export default function WrongNotePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [needReviewItems, setNeedReviewItems] = useState<WrongItem[]>([])
  const [completedItems,  setCompletedItems]  = useState<WrongItem[]>([])
  const [loading,    setLoading]    = useState(true)
  const [activeTab, setActiveTab]   = useState<TabValue>("복습 필요")

  useEffect(() => {
    if (status === "loading") return
    if (status === "unauthenticated") { router.push("/login"); return }
  }, [status, router])

  useEffect(() => {
    const userId = (session?.user as { id?: string })?.id
    if (!userId) return

    ;(async () => {
      setLoading(true)

      const { data: subs } = await supabase
        .from("submissions")
        .select("problem_id, is_correct, created_at")
        .eq("user_id", userId)

      if (!subs || subs.length === 0) {
        setNeedReviewItems([])
        setCompletedItems([])
        setLoading(false)
        return
      }

      const correctIds = new Set<string>()
      const wrongIds   = new Set<string>()
      const subsByProblem: Record<string, SubmissionRow[]> = {}

      for (const sub of subs as SubmissionRow[]) {
        if (sub.is_correct) correctIds.add(sub.problem_id)
        else                wrongIds.add(sub.problem_id)
        ;(subsByProblem[sub.problem_id] ??= []).push(sub)
      }

      const needReviewIds = [...wrongIds].filter(id => !correctIds.has(id))
      const completedIds  = [...wrongIds].filter(id =>  correctIds.has(id))
      const allIds        = [...new Set([...needReviewIds, ...completedIds])]

      if (allIds.length === 0) {
        setNeedReviewItems([])
        setCompletedItems([])
        setLoading(false)
        return
      }

      const { data: problems } = await supabase
        .from("problems")
        .select("id, title, category, difficulty")
        .in("id", allIds)

      const problemMap: Record<string, Problem> = {}
      for (const p of (problems ?? [])) problemMap[p.id] = p

      const toItem = (id: string): WrongItem | null => {
        const p = problemMap[id]
        if (!p) return null
        const ps = subsByProblem[id] ?? []
        const lastAttemptAt = [...ps].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]?.created_at ?? ""
        const solvedAt      = ps.filter(s => s.is_correct).sort((a, b) => a.created_at.localeCompare(b.created_at))[0]?.created_at
        return { problem: p, attemptCount: ps.length, lastAttemptAt, solvedAt }
      }

      setNeedReviewItems(needReviewIds.map(toItem).filter((x): x is WrongItem => x !== null))
      setCompletedItems(completedIds.map(toItem).filter((x): x is WrongItem => x !== null))
      setLoading(false)
    })()
  }, [session])

  const displayItems = useMemo(() => {
    if (activeTab === "복습 필요") return needReviewItems
    if (activeTab === "복습 완료") return completedItems
    return [...needReviewItems, ...completedItems]
  }, [activeTab, needReviewItems, completedItems])

  const grouped = useMemo(() => {
    const map: Record<string, WrongItem[]> = {}
    for (const item of displayItems) {
      ;(map[item.problem.category] ??= []).push(item)
    }
    return CATEGORY_ORDER
      .filter(cat => (map[cat]?.length ?? 0) > 0)
      .map(cat => ({ category: cat, items: map[cat] }))
  }, [displayItems])

  const needReviewCount = needReviewItems.length
  const isCompleteView  = activeTab === "복습 완료"
  const isEmpty         = displayItems.length === 0

  if (status === "loading" || (status === "authenticated" && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">오답 노트 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">

        {/* 브레드크럼 */}
        <nav className="flex items-center gap-1.5 mb-6 mt-2">
          <LayoutGrid className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-indigo-500 transition-colors">
            학습 홈
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
          <span className="text-sm text-gray-600 font-medium">오답 노트</span>
        </nav>

        {/* 헤더 */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
              <ClipboardList className="w-5 h-5 text-red-500" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900">오답 노트</h1>
              <p className="text-xs text-gray-500 mt-0.5">틀렸던 문제를 다시 풀며 약한 부분을 복습하세요</p>
            </div>
          </div>
          <div className={`shrink-0 mt-1 px-3 py-1.5 rounded-full text-xs font-bold border
            ${needReviewCount > 0
              ? "bg-red-50 text-red-600 border-red-200"
              : "bg-gray-100 text-gray-500 border-gray-200"}`}>
            {needReviewCount > 0 ? `복습 필요 ${needReviewCount}개` : "복습 필요 없음"}
          </div>
        </div>

        {/* 탭 */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-5 gap-1">
          {(["복습 필요", "복습 완료", "전체"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200
                flex items-center justify-center gap-1.5
                ${activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              {tab}
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full
                ${activeTab === tab ? "bg-gray-100 text-gray-500" : "text-gray-400"}`}>
                {tab === "복습 필요" ? needReviewItems.length
                  : tab === "복습 완료" ? completedItems.length
                  : needReviewItems.length + completedItems.length}
              </span>
            </button>
          ))}
        </div>

        {/* Empty state */}
        {isEmpty && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-6 py-7 text-center max-w-sm mx-auto">
            <div className="flex justify-center mb-3">
              {activeTab === "복습 필요"
                ? <Image src="/error_note.png" alt="오답 없음" width={52} height={52} />
                : activeTab === "복습 완료"
                  ? <FolderOpen className="w-10 h-10 text-gray-300" />
                  : <FileText className="w-10 h-10 text-gray-300" />
              }
            </div>
            <p className="text-sm font-bold text-gray-800 mb-1.5">
              {activeTab === "복습 필요"
                ? "복습할 오답이 없어요"
                : activeTab === "복습 완료"
                  ? "아직 복습 완료한 문제가 없어요"
                  : "오답 기록이 없어요"}
            </p>
            <p className="text-xs text-gray-400 mb-5 leading-[1.8]">
              {activeTab === "복습 필요" ? (
                <>최근 틀린 문제를 모두 다시 풀었어요.<br />새로 틀린 문제가 생기면 여기에 자동으로 정리됩니다.</>
              ) : activeTab === "복습 완료" ? (
                "틀린 문제를 다시 맞추면 여기에 기록됩니다."
              ) : (
                "아직 틀린 문제 기록이 없어요. 문제를 풀어보세요!"
              )}
            </p>
            {activeTab === "복습 필요" && (
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors"
                >
                  대시보드로 돌아가기
                </button>
                <button
                  onClick={() => router.push("/course/basic")}
                  className="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded-xl transition-colors"
                >
                  새 문제 풀러 가기
                </button>
              </div>
            )}
          </div>
        )}

        {/* 카테고리별 목록 */}
        {!isEmpty && (
          <div className="flex flex-col gap-6">
            {grouped.map(({ category, items }) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-bold text-gray-700">
                    {CATEGORY_LABEL[category] ?? category}
                  </h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
                    ${isCompleteView ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
                    {items.length}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {items.map((item, idx) => {
                    const itemIsCompleted = activeTab === "복습 완료" || (activeTab === "전체" && !!item.solvedAt)
                    return (
                      <WrongItemRow
                        key={item.problem.id}
                        item={item}
                        idx={idx}
                        isCompleted={itemIsCompleted}
                        onClick={() => router.push(`/problems/${item.problem.id}`)}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
