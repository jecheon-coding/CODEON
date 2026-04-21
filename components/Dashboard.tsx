"use client"

import { useEffect, useState } from "react"
import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import CodeOnLogo from "@/components/ui/CodeOnLogo"

type Submission = {
  id: string
  problem_id: string
  result: string
  created_at?: string
}

type Props = {
  userName: string
  userEmail: string
  userGrade: string
  userClass: string
}

const PROBLEM_TITLES: Record<string, string> = {
  "max-number": "리스트에서 최대값 찾기",
}

const RECOMMENDED = [
  { id: "max-number", title: "리스트에서 최대값 찾기", level: "기초", tag: "리스트", locked: false },
  { id: "sum-list",   title: "리스트 합계 구하기",     level: "기초", tag: "리스트", locked: true  },
  { id: "find-even",  title: "짝수만 골라내기",         level: "기초", tag: "조건문", locked: true  },
]

function formatDate(dateStr?: string) {
  if (!dateStr) return ""
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  })
}

export default function Dashboard({ userName, userEmail, userGrade, userClass }: Props) {
  const router = useRouter()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("submissions")
        .select("*")
        .eq("email", userEmail)
        .order("created_at", { ascending: false })
        .limit(20)
      setSubmissions(data || [])
      setLoadingSubmissions(false)
    }
    fetch()
  }, [userEmail])

  // ── Stats ──────────────────────────────────────────────────────
  const total   = submissions.length
  const correct = submissions.filter(s => s.result === "정답").length
  const rate    = total > 0 ? Math.round((correct / total) * 100) : 0

  const today      = new Date().toDateString()
  const todaySolved = submissions.filter(s =>
    s.result === "정답" && s.created_at && new Date(s.created_at).toDateString() === today
  ).length

  const stats = [
    { label: "오늘 푼 문제", value: todaySolved, unit: "개" },
    { label: "총 해결 문제", value: correct,      unit: "개" },
    { label: "성공률",       value: rate,         unit: "%" },
  ]

  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      {/* ── Navbar ─────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <CodeOnLogo />
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{userGrade} {userClass}</span>
            <button
              onClick={() => signOut()}
              className="text-sm text-gray-500 hover:text-gray-800 font-medium transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 pt-24 pb-20 space-y-6">

        {/* ── Hero Card ──────────────────────────────────────────── */}
        <div className="bg-indigo-500 rounded-3xl px-8 py-9 text-white relative overflow-hidden">
          {/* 배경 장식 */}
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/5 rounded-full pointer-events-none" />
          <div className="absolute right-8 -bottom-10 w-32 h-32 bg-white/5 rounded-full pointer-events-none" />

          <div className="relative">
            <p className="text-indigo-200 text-sm mb-1">반갑습니다</p>
            <h1 className="text-3xl font-extrabold tracking-tight mb-2">{userName}님,</h1>
            <p className="text-indigo-100 text-base mb-7">오늘도 한 문제 풀어볼까요?</p>
            <button
              onClick={() => router.push("/problems/max-number")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 rounded-xl font-semibold text-sm hover:bg-indigo-50 active:scale-95 transition-all shadow-lg shadow-indigo-700/20"
            >
              추천 문제 풀기
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Stats ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          {stats.map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 text-center shadow-sm border border-gray-100">
              <p className="text-3xl font-extrabold text-gray-900 tabular-nums">
                {s.value}
                <span className="text-sm font-medium text-gray-400 ml-0.5">{s.unit}</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── 하단 2열 ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* 추천 문제 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4">추천 문제</h2>
            <div className="space-y-2.5">
              {RECOMMENDED.map((p, i) => (
                <button
                  key={p.id}
                  disabled={p.locked}
                  onClick={() => router.push(`/problems/${p.id}`)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all
                    ${p.locked
                      ? "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                      : "border-indigo-100 bg-indigo-50/40 hover:bg-indigo-50 cursor-pointer"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-300 w-5 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{p.title}</p>
                      <div className="flex gap-1 mt-1">
                        <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-600 rounded-md">{p.level}</span>
                        <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-md">{p.tag}</span>
                      </div>
                    </div>
                  </div>
                  {p.locked ? (
                    <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 최근 제출 기록 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4">최근 제출 기록</h2>

            {loadingSubmissions ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : submissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-sm text-gray-400">아직 제출 기록이 없어요.</p>
                <button
                  onClick={() => router.push("/problem")}
                  className="mt-2 text-xs text-indigo-500 hover:text-indigo-600 font-medium transition-colors"
                >
                  첫 문제 풀러 가기 →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {submissions.slice(0, 6).map((sub, i) => (
                  <div key={i} className="flex items-center justify-between px-3.5 py-3 rounded-xl bg-gray-50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {PROBLEM_TITLES[sub.problem_id] ?? sub.problem_id}
                      </p>
                      {sub.created_at && (
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(sub.created_at)}</p>
                      )}
                    </div>
                    <span className={`ml-3 shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg ${
                      sub.result === "정답"
                        ? "bg-green-100 text-green-600"
                        : "bg-red-100 text-red-500"
                    }`}>
                      {sub.result}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
