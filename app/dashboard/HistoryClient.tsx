"use client"

import { useEffect, useState, useMemo } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import CodeOnLogo from "@/components/ui/CodeOnLogo"
import {
  CheckCircle, XCircle, ArrowLeft,
  LogOut, Search, BookOpen, Clock, RotateCcw, History
} from "lucide-react"
import { ProblemListContainer, ProblemListItem } from "@/components/problem/ProblemListItem"
import { PageLayout } from "@/components/ui/PageLayout"
import type { HistorySubmission } from "@/app/api/history/route"

type WrongEntry = {
  problem_id:    string
  problem_title: string
  category:      string | null
  topic:         string | null
  latest_at:     string
  wrong_count:   number
}

const CATEGORY_BADGE: Record<string, string> = {
  "기초 파이썬":  "기초",
  "알고리즘":     "알고리즘",
  "자료구조":     "자료구조",
  "문자열":       "문자열",
  "수학":         "수학",
}

export default function HistoryClient() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialFilter = searchParams.get("filter") === "wrong" ? "wrong" : "all"
  const [filter, setFilter] = useState<"all" | "correct" | "wrong">(initialFilter)
  const [search, setSearch] = useState("")
  const [submissions, setSubmissions] = useState<HistorySubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  const LIMIT = 20

  const userName = session?.user?.name ?? "학생"

  // 필터/검색 변경 시 페이지 초기화
  useEffect(() => { setPage(1) }, [filter, search])

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true)
      try {
        const res = await fetch("/api/history")
        if (res.ok) setSubmissions(await res.json())
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [])

  // 오답노트: 미해결 문제만 (정답 처리된 문제 제외), 문제 단위 중복 제거 + 틀린 횟수 집계
  const wrongEntries = useMemo<WrongEntry[]>(() => {
    const solvedProblemIds = new Set(
      submissions.filter(s => s.is_correct).map(s => s.problem_id)
    )
    const grouped: Record<string, WrongEntry> = {}
    for (const s of submissions) {
      if (s.is_correct) continue
      if (solvedProblemIds.has(s.problem_id)) continue
      if (!grouped[s.problem_id]) {
        grouped[s.problem_id] = {
          problem_id:    s.problem_id,
          problem_title: s.problem_title,
          category:      s.category,
          topic:         s.topic,
          latest_at:     s.created_at,
          wrong_count:   1,
        }
      } else {
        grouped[s.problem_id].wrong_count++
        if (s.created_at > grouped[s.problem_id].latest_at) {
          grouped[s.problem_id].latest_at = s.created_at
        }
      }
    }
    let entries = Object.values(grouped).sort((a, b) => b.latest_at.localeCompare(a.latest_at))
    if (search.trim()) {
      const q = search.toLowerCase()
      entries = entries.filter(e =>
        e.problem_title.toLowerCase().includes(q) ||
        (e.category ?? "").toLowerCase().includes(q) ||
        (e.topic ?? "").toLowerCase().includes(q)
      )
    }
    return entries
  }, [submissions, search])

  // 전체/정답 탭: 개별 제출 필터링 (정답 탭은 problemId 기준 최신 1개만)
  const filteredSubmissions = useMemo<HistorySubmission[]>(() => {
    let list = submissions
    if (filter === "correct") {
      const seen = new Set<string>()
      list = list.filter(s => {
        if (!s.is_correct) return false
        if (seen.has(s.problem_id)) return false
        seen.add(s.problem_id)
        return true
      })
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(s =>
        s.problem_title.toLowerCase().includes(q) ||
        (s.category ?? "").toLowerCase().includes(q) ||
        (s.topic ?? "").toLowerCase().includes(q)
      )
    }
    return list
  }, [submissions, filter, search])

  const isEmpty = filter === "wrong" ? wrongEntries.length === 0 : filteredSubmissions.length === 0

  // 페이지네이션
  const totalItems = filter === "wrong" ? wrongEntries.length : filteredSubmissions.length
  const totalPages = Math.ceil(totalItems / LIMIT)
  const pagedWrong = wrongEntries.slice((page - 1) * LIMIT, page * LIMIT)
  const pagedSubmissions = filteredSubmissions.slice((page - 1) * LIMIT, page * LIMIT)

  const formatDate = (dateStr: string) => {
    const utcStr = /Z|[+-]\d{2}:?\d{2}$/.test(dateStr) ? dateStr : dateStr + "Z"
    return new Date(utcStr).toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    })
  }

  return (
    <div className="min-h-screen bg-[#F4F5F8] pb-20">

      {/* ── 네비게이션 ─────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-gray-100 bg-white">
        <PageLayout className="h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="p-2 -ml-2 text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="hidden sm:block">
              <CodeOnLogo />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden sm:block">{userName}님</span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
            >
              <LogOut className="w-4 h-4" /><span className="hidden sm:inline">로그아웃</span>
            </button>
          </div>
        </PageLayout>
      </nav>

      <PageLayout className="pt-24">

        {/* ── 페이지 헤더 ───────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-[#534AB7]/10 rounded-xl flex items-center justify-center">
              <History className="w-5 h-5 text-[#534AB7]" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">학습 기록 및 오답노트</h1>
              <p className="text-sm text-gray-500 mt-0.5">지금까지 제출한 모든 문제의 결과를 확인하고 복습하세요.</p>
            </div>
          </div>
        </div>

        {/* ── 탭(좌) + 검색(우) — 구분선만 ─────────────────── */}
        <div className="flex items-center justify-between gap-4 border-b border-gray-200 mb-6">
          <div className="flex">
            {(["all", "wrong", "correct"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-5 py-3 text-sm font-bold border-b-2 transition-all -mb-px ${
                  filter === f
                    ? "border-[#534AB7] text-[#534AB7]"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                {f === "all" ? "전체 기록" : f === "wrong" ? "오답노트" : "정답"}
              </button>
            ))}
          </div>
          <div className="relative w-64 pb-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="문제 제목이나 분류 검색..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#534AB7]/20 focus:border-[#534AB7] transition-all"
            />
          </div>
        </div>

        {/* ── 리스트 ────────────────────────────────────────── */}
        <div>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#534AB7] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-500 text-sm font-medium">기록을 불러오는 중입니다...</p>
            </div>

          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                {filter === "wrong"
                  ? <CheckCircle className="w-8 h-8 text-green-500" />
                  : <BookOpen className="w-8 h-8 text-gray-300" />}
              </div>
              <p className="text-gray-900 font-bold mb-1">
                {filter === "wrong" ? "오답 기록이 없습니다!" : "해당하는 기록이 없습니다."}
              </p>
              <p className="text-gray-500 text-sm">
                {filter === "wrong" ? "모든 문제를 완벽하게 풀었어요." : "다른 검색어나 탭을 선택해보세요."}
              </p>
            </div>

          ) : filter === "wrong" ? (
            <ProblemListContainer>
              {pagedWrong.map(entry => (
                <ProblemListItem
                  key={entry.problem_id}
                  onClick={() => router.push(`/problems/${entry.problem_id}`)}
                >
                  <div className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                    <XCircle className="w-3.5 h-3.5 text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600 shrink-0">오답</span>
                      {entry.category && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-100 text-purple-600 shrink-0">
                          {CATEGORY_BADGE[entry.category] ?? entry.category}
                        </span>
                      )}
                      {entry.topic && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-500 shrink-0">
                          {entry.topic}
                        </span>
                      )}
                      {!entry.category && !entry.topic && (
                        <span className="text-[10px] text-gray-400 shrink-0">미분류</span>
                      )}
                      <span className="text-sm font-bold text-gray-800 truncate">{entry.problem_title}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>{formatDate(entry.latest_at)}</span>
                      <span className="text-gray-300">·</span>
                      <span>틀린 횟수 {entry.wrong_count}회</span>
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); router.push(`/problems/${entry.problem_id}`) }}
                    className="shrink-0 flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold rounded-lg border border-[#534AB7] text-[#534AB7] hover:bg-[#534AB7] hover:text-white transition-all"
                  >
                    <RotateCcw className="w-3 h-3" /> 다시 풀기
                  </button>
                </ProblemListItem>
              ))}
            </ProblemListContainer>

          ) : (
            <ProblemListContainer>
              {pagedSubmissions.map(sub => (
                <ProblemListItem
                  key={sub.id}
                  onClick={() => router.push(`/problems/${sub.problem_id}`)}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    sub.is_correct ? "bg-green-50" : "bg-red-50"
                  }`}>
                    {sub.is_correct
                      ? <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                      : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                        sub.is_correct ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>
                        {sub.is_correct ? "정답" : "오답"}
                      </span>
                      {sub.category && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-100 text-purple-600 shrink-0">
                          {CATEGORY_BADGE[sub.category] ?? sub.category}
                        </span>
                      )}
                      {sub.topic && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-500 shrink-0">
                          {sub.topic}
                        </span>
                      )}
                      {!sub.category && !sub.topic && (
                        <span className="text-[10px] text-gray-400 shrink-0">미분류</span>
                      )}
                      <span className="text-sm font-bold text-gray-800 truncate">{sub.problem_title}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>{formatDate(sub.created_at)}</span>
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); router.push(`/problems/${sub.problem_id}`) }}
                    className={`shrink-0 flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                      !sub.is_correct
                        ? "border border-[#534AB7] text-[#534AB7] hover:bg-[#534AB7] hover:text-white"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                    }`}
                  >
                    {!sub.is_correct
                      ? <><RotateCcw className="w-3 h-3" /> 다시 풀기</>
                      : <><BookOpen className="w-3 h-3" /> 다시 보기</>}
                  </button>
                </ProblemListItem>
              ))}
            </ProblemListContainer>
          )}
        </div>

        {/* ── 페이지네이션 ──────────────────────────────────── */}
        {totalPages > 1 && (() => {
          const maxVisible = 5
          const half = Math.floor(maxVisible / 2)
          let start = Math.max(1, page - half)
          let end   = Math.min(totalPages, start + maxVisible - 1)
          if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1)
          const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i)
          return (
            <div className="flex items-center justify-center gap-1 mt-6 pb-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm"
              >
                &lt;
              </button>
              {pages.map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                    p === page
                      ? "bg-[#534AB7] text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-900 hover:bg-white"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm"
              >
                &gt;
              </button>
            </div>
          )
        })()}

      </PageLayout>
    </div>
  )
}
