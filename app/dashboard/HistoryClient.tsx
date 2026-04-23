"use client"

import { useEffect, useState, useMemo } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import CodeOnLogo from "@/components/ui/CodeOnLogo"
import {
  CheckCircle, XCircle, ArrowLeft,
  LogOut, Search, BookOpen, Clock, RotateCcw, History
} from "lucide-react"
import { supabase } from "@/lib/supabase"

type Submission = {
  id: string
  problem_id: string
  is_correct: boolean
  created_at: string
  problem: {
    title: string
    category: string
    difficulty: string
  } | null
}

export default function HistoryClient() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // 대시보드에서 넘어온 ?filter=wrong 파라미터 감지
  const initialFilter = searchParams.get("filter") === "wrong" ? "wrong" : "all"
  const [filter, setFilter] = useState<"all" | "correct" | "wrong">(initialFilter)
  const [search, setSearch] = useState("")
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)

  const userId = (session?.user as any)?.id
  const userName = session?.user?.name ?? "학생"

  useEffect(() => {
    if (!userId) return
    const fetchHistory = async () => {
      setLoading(true)
      // 문제 정보(문제 제목, 카테고리 등)와 함께 제출 이력 조회
      const { data, error } = await supabase
        .from("submissions")
        .select(`
          id, problem_id, is_correct, created_at,
          problem:problems(title, category, difficulty)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
      
      if (data) setSubmissions(data as unknown as Submission[])
      setLoading(false)
    }
    fetchHistory()
  }, [userId])

  // 탭 및 검색어에 따른 데이터 필터링
  const filteredData = useMemo(() => {
    let list = submissions
    if (filter === "correct") list = list.filter(s => s.is_correct)
    if (filter === "wrong")   list = list.filter(s => !s.is_correct)
    
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(s => 
        s.problem?.title?.toLowerCase().includes(q) || 
        s.problem?.category?.toLowerCase().includes(q)
      )
    }
    return list
  }, [submissions, filter, search])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      {/* 상단 네비게이션 */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/dashboard")} className="p-2 -ml-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Link href="/dashboard" className="hidden sm:block opacity-90 hover:opacity-100 transition-opacity">
              <CodeOnLogo />
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:block">{userName}님</span>
            <button onClick={() => signOut({ callbackUrl: "/login" })} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
              <LogOut className="w-4 h-4" /><span className="hidden sm:inline">로그아웃</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 pt-24">
        
        {/* 헤더 영역 */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center">
              <History className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">학습 기록 및 오답노트</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">지금까지 제출한 모든 문제의 결과를 확인하고 복습하세요.</p>
            </div>
          </div>
        </div>

        {/* 컨트롤 패널 (탭 및 검색창) */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            {(["all", "wrong", "correct"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 sm:px-6 py-2 text-sm font-bold rounded-lg transition-all ${
                  filter === f
                    ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                {f === "all" ? "전체 기록" : f === "wrong" ? "오답노트" : "정답"}
              </button>
            ))}
          </div>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="문제 제목이나 분류 검색..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all dark:text-white"
            />
          </div>
        </div>

        {/* 리스트 영역 */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">기록을 불러오는 중입니다...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 border-dashed">
              <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                {filter === "wrong" ? (
                  <CheckCircle className="w-8 h-8 text-green-500" />
                ) : (
                  <BookOpen className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                )}
              </div>
              <p className="text-gray-900 dark:text-white font-bold mb-1">
                {filter === "wrong" ? "오답 기록이 없습니다!" : "해당하는 기록이 없습니다."}
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {filter === "wrong" ? "모든 문제를 완벽하게 풀었어요." : "다른 검색어나 탭을 선택해보세요."}
              </p>
            </div>
          ) : (
            filteredData.map((sub) => (
              <div 
                key={sub.id} 
                className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-900/50 transition-all gap-4"
              >
                <div className="flex items-start gap-4">
                  {/* 상태 아이콘 */}
                  <div className={`mt-0.5 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    sub.is_correct 
                      ? "bg-green-50 dark:bg-green-900/20 text-green-500" 
                      : "bg-red-50 dark:bg-red-900/20 text-red-500"
                  }`}>
                    {sub.is_correct ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  </div>
                  
                  {/* 텍스트 정보 */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        sub.is_correct 
                          ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400" 
                          : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400"
                      }`}>
                        {sub.is_correct ? "정답" : "오답"}
                      </span>
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                        {sub.problem?.category || "미분류"}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {sub.problem?.title || sub.problem_id}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(sub.created_at).toLocaleString('ko-KR', { 
                          year: 'numeric', month: 'short', day: 'numeric', 
                          hour: '2-digit', minute: '2-digit' 
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 우측 액션 버튼 */}
                <div className="flex sm:flex-col justify-end gap-2 sm:gap-0 sm:pl-4 sm:border-l border-gray-100 dark:border-gray-800">
                  <button 
                    onClick={() => router.push(`/problems/${sub.problem_id}`)}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 rounded-xl text-sm font-bold transition-all ${
                      !sub.is_correct 
                        ? "bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-none" 
                        : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {!sub.is_correct ? (
                      <><RotateCcw className="w-4 h-4" /> 다시 풀기</>
                    ) : (
                      <><BookOpen className="w-4 h-4" /> 다시 보기</>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}