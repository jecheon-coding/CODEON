"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { X, Send, Bot, Zap, RotateCcw, CheckCircle } from "lucide-react"

type Message = { role: "user" | "ai"; text: string }

const STORAGE_KEY = "ai_tutor_chat_messages"

interface AiTutorChatProps {
  isOpen: boolean
  onClose: () => void
  userName: string
  currentCourse: { slug: string; label: string } | null
  rate: number
  todaySolved: number
  dailyGoal: number
  wrong: number
  nextProblemTitle: string | null
}

export default function AiTutorChat({
  isOpen,
  onClose,
  userName,
  currentCourse,
  rate,
  todaySolved,
  dailyGoal,
  wrong,
  nextProblemTitle,
}: AiTutorChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState("")
  const [loading, setLoading]   = useState(false)
  const messagesEndRef  = useRef<HTMLDivElement>(null)
  const textareaRef     = useRef<HTMLTextAreaElement>(null)

  // ── localStorage 복원 ─────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setMessages(JSON.parse(stored))
    } catch {}
  }, [])

  // ── localStorage 저장 ─────────────────────────────────────────────────────
  useEffect(() => {
    if (messages.length === 0) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
  }, [messages])

  // ── 스크롤 ────────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  // ── 오픈 시 포커스 + Escape ───────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", handleKey)
    setTimeout(() => textareaRef.current?.focus(), 100)
    return () => document.removeEventListener("keydown", handleKey)
  }, [isOpen, onClose])

  // ── textarea 자동 높이 ────────────────────────────────────────────────────
  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "44px"
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    resizeTextarea()
  }

  // ── 대화 초기화 ───────────────────────────────────────────────────────────
  const clearMessages = () => {
    setMessages([])
    localStorage.removeItem(STORAGE_KEY)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  // ── 전송 ──────────────────────────────────────────────────────────────────
  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: Message = { role: "user", text: trimmed }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput("")
    if (textareaRef.current) textareaRef.current.style.height = "44px"
    setLoading(true)

    const conversationHistory = messages
      .map(m => `${m.role === "user" ? "학생" : "튜터"}: ${m.text}`)
      .join("\n")

    const prompt = `너는 친절한 파이썬 코딩 강사 AI 튜터다.

[학생 컨텍스트]
- 이름: ${userName}
- 현재 과정: ${currentCourse?.label ?? "미정"}
- 정답률: ${rate}%
- 오늘 푼 문제: ${todaySolved}문제 / 목표 ${dailyGoal}문제
- 최근 오답 횟수: ${wrong}회

[대화 이력]
${conversationHistory}

[학생 질문]
${trimmed}

정답 코드를 직접 알려주지 말고, 개념과 방향을 친절하고 간결하게 3~4문장 이내로 답변해줘. 한국어만 사용해.`

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      )
      const data = await res.json()
      const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "AI 응답 없음"
      setMessages([...nextMessages, { role: "ai", text: aiText }])
    } catch {
      setMessages([...nextMessages, { role: "ai", text: "연결에 문제가 생겼어요. 잠시 후 다시 시도해 주세요." }])
    } finally {
      setLoading(false)
    }
  }

  const quickQuestions = [
    nextProblemTitle
      ? `"${nextProblemTitle}" 문제 어떻게 시작할까요?`
      : "처음 문제, 어디서 시작할까요?",
    "파이썬 반복문(for)이 헷갈려요",
    wrong > 0 ? "오늘 틀린 문제 왜 틀렸을까요?" : "학습 팁 알려주세요",
  ]

  const hasSavedChat = messages.length > 0

  return (
    <div
      className="fixed right-0 top-0 h-screen w-[380px] bg-white border-l border-gray-200 shadow-2xl flex flex-col z-[60]"
      style={{ transform: isOpen ? "translateX(0)" : "translateX(100%)", transition: "transform 0.3s ease" }}
    >
      {/* ── 헤더 ──────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-sm font-bold text-gray-900">AI 튜터</span>
          {hasSavedChat && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
              <CheckCircle className="w-2.5 h-2.5" />
              대화 기록 저장됨
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {hasSavedChat && (
            <button
              onClick={clearMessages}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              초기화
            </button>
          )}
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── 컨텍스트 칩 ───────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-1.5 flex-wrap px-4 py-2 border-b border-gray-100 bg-gray-50/60">
        {currentCourse && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#534AB7]/10 text-[#534AB7]">
            {currentCourse.label}
          </span>
        )}
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
          정답률 {rate}%
        </span>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
          오늘 {todaySolved}/{dailyGoal}문제
        </span>
      </div>

      {/* ── 메시지 영역 ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center pt-6 pb-2">
            <div className="w-12 h-12 rounded-2xl bg-[#534AB7]/10 flex items-center justify-center mb-3">
              <Bot className="w-6 h-6 text-[#534AB7]" />
            </div>
            <p className="text-sm font-bold text-gray-800 mb-1">무엇이든 물어보세요!</p>
            <p className="text-xs text-gray-400 mb-5 text-center leading-relaxed">
              코딩 개념, 문제 풀이 방향, 파이썬 문법<br />뭐든 도와드릴게요.
            </p>
            <div className="w-full flex flex-col gap-2">
              {quickQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="flex items-center gap-2 w-full text-left px-3.5 py-2.5 rounded-xl border border-gray-200 hover:border-[#534AB7]/40 hover:bg-[#534AB7]/5 transition-all text-xs font-medium text-gray-700"
                >
                  <Zap className="w-3.5 h-3.5 text-[#534AB7] shrink-0" />
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[88%] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words
                ${msg.role === "user"
                  ? "bg-[#534AB7] text-white rounded-2xl rounded-br-sm"
                  : "bg-gray-100 text-gray-800 rounded-2xl rounded-bl-sm"
                }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── 입력 영역 ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-end gap-2 px-4 py-3 border-t border-gray-100">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              sendMessage(input)
            }
          }}
          placeholder="궁금한 점을 물어보세요..."
          rows={1}
          className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#534AB7] focus:bg-white transition-all placeholder:text-gray-300 resize-none overflow-y-auto leading-relaxed"
          style={{ minHeight: "44px", maxHeight: "120px" }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          className="shrink-0 w-[44px] h-[44px] flex items-center justify-center rounded-xl bg-[#534AB7] text-white hover:bg-[#443DA0] disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
