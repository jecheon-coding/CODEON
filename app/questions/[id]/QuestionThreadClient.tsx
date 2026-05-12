"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { ArrowLeft, Trash2, Loader2, MessageSquare, Send } from "lucide-react"

type Answer = {
  id: string
  nickname: string
  content: string
  is_admin: boolean
  user_id: string
  created_at: string
}

type ThreadData = {
  question: {
    id: string
    problem_id: string
    nickname: string
    title: string | null
    question: string
    user_id: string
    created_at: string
    problemNumber: number | null
    problemTitle: string | null
  }
  answers: Answer[]
}

function fmtKST(str: string) {
  const d = new Date(str.endsWith("Z") || str.includes("+") ? str : str + "Z")
  return d.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  })
}

export default function QuestionThreadClient({ questionId }: { questionId: string }) {
  const router = useRouter()
  const { data: session } = useSession()
  const userId  = (session?.user as any)?.id as string | undefined
  const isAdmin = (session?.user as any)?.role === "admin"

  const [data,       setData]       = useState<ThreadData | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [reply,      setReply]      = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState("")
  const [deleting,   setDeleting]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/questions/${questionId}`)
      if (res.ok) setData(await res.json())
    } finally { setLoading(false) }
  }, [questionId])

  useEffect(() => { load() }, [load])

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reply.trim()) return
    setSubmitting(true); setError("")
    try {
      const res = await fetch(`/api/questions/${questionId}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: reply }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error ?? "오류가 발생했습니다."); return }
      setData(prev => prev ? { ...prev, answers: [...prev.answers, d] } : prev)
      setReply("")
    } catch { setError("네트워크 오류가 발생했습니다.") }
    finally  { setSubmitting(false) }
  }

  const handleDeleteAnswer = async (answerId: string) => {
    if (!confirm("댓글을 삭제하시겠습니까?")) return
    setDeleting(answerId)
    try {
      await fetch(`/api/questions/answers/${answerId}`, { method: "DELETE" })
      setData(prev => prev ? { ...prev, answers: prev.answers.filter(a => a.id !== answerId) } : prev)
    } finally { setDeleting(null) }
  }

  const handleDeleteQuestion = async () => {
    if (!confirm("질문을 삭제하시겠습니까?")) return
    await fetch(`/api/questions/${questionId}`, { method: "DELETE" })
    router.back()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-3">
        <p className="text-gray-500 text-sm">질문을 찾을 수 없습니다.</p>
        <button onClick={() => router.back()}
          className="text-sm text-indigo-600 hover:underline">돌아가기</button>
      </div>
    )
  }

  const { question, answers } = data
  const displayTitle = question.title || question.question

  return (
    <div className="min-h-screen bg-gray-50">

      {/* 상단 네비바 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center gap-2 text-sm text-gray-500">
          <button
            onClick={() => router.push(`/problems/${question.problem_id}`)}
            className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            {question.problemNumber != null
              ? <span className="font-bold text-indigo-600">문제 #{question.problemNumber}</span>
              : "문제로 돌아가기"}
          </button>
          {question.problemTitle && (
            <>
              <span className="text-gray-300">/</span>
              <span className="text-gray-500 truncate max-w-[200px]">{question.problemTitle}</span>
            </>
          )}
          <span className="text-gray-300">/</span>
          <span className="text-gray-700 font-medium truncate max-w-[160px]">{displayTitle}</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">

        {/* 원본 질문 카드 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* 질문 헤더 */}
          <div className="px-6 py-4 border-b border-gray-100">
            <h1 className="text-base font-bold text-gray-900 leading-snug mb-3">
              {displayTitle}
            </h1>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold shrink-0">
                  {question.nickname[0].toUpperCase()}
                </span>
                <div>
                  <span className="text-sm font-bold text-violet-600">{question.nickname}</span>
                  <span className="text-xs text-gray-400 ml-2">{fmtKST(question.created_at)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" />{answers.length}
                </span>
                {(isAdmin || userId === question.user_id) && (
                  <button onClick={handleDeleteQuestion}
                    className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                    title="질문 삭제">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
          {/* 질문 본문 (제목과 다를 때만) */}
          {question.title && (
            <div className="px-6 py-4">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{question.question}</p>
            </div>
          )}
        </div>

        {/* 답변 목록 */}
        {answers.length > 0 && (
          <div className="flex flex-col gap-3">
            {answers.map((a, i) => (
              <div key={a.id}
                className={`rounded-xl border shadow-sm overflow-hidden
                  ${a.is_admin ? "border-indigo-200 bg-indigo-50" : "border-gray-200 bg-white"}`}>
                <div className={`flex items-center justify-between px-5 py-3
                  ${a.is_admin ? "border-b border-indigo-100" : "border-b border-gray-100"}`}>
                  <div className="flex items-center gap-2.5">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                      ${a.is_admin ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                      {a.is_admin ? "T" : a.nickname[0].toUpperCase()}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {a.is_admin && (
                        <span className="text-[11px] font-bold px-1.5 py-0.5 bg-indigo-600 text-white rounded-full">
                          선생님
                        </span>
                      )}
                      <span className={`text-sm font-bold ${a.is_admin ? "text-indigo-700" : "text-gray-700"}`}>
                        {a.nickname}
                      </span>
                      <span className="text-xs text-gray-400">{fmtKST(a.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-medium">{i + 1}#</span>
                    {(isAdmin || userId === a.user_id) && (
                      <button
                        onClick={() => handleDeleteAnswer(a.id)}
                        disabled={deleting === a.id}
                        className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                        title="삭제">
                        {deleting === a.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
                <div className="px-5 py-4">
                  <p className={`text-sm leading-relaxed whitespace-pre-wrap
                    ${a.is_admin ? "text-indigo-900" : "text-gray-700"}`}>
                    {a.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 새 댓글 폼 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            새 댓글
          </p>
          <form onSubmit={handleReply} className="flex flex-col gap-3">
            <textarea
              value={reply}
              onChange={e => setReply(e.target.value)}
              placeholder="답변을 입력하세요..."
              rows={4}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800
                bg-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100
                resize-none placeholder:text-gray-400 transition-colors"
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || !reply.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700
                  disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold
                  rounded-lg transition-colors"
              >
                {submitting
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-3.5 h-3.5" />}
                댓글 쓰기
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  )
}
