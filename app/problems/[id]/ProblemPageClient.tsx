"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { supabase } from "@/lib/supabase"
import { useCodeExecution } from "@/hooks/useCodeExecution"
import { useSubmission } from "@/hooks/useSubmission"
import HintPanel from "@/components/problem/HintPanel"
import { Problem, AdjacentProblem, SubmissionStatus } from "@/types/problem"
import {
  ProblemUserState, calcUserStatus, USER_STATUS_BADGE,
  type SubmissionSummaryRow,
} from "@/lib/submissionStatus"

// ── 인라인 SVG 아이콘 ─────────────────────────────────────────────────────────
const SvgCheck = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
const SvgX = ({ size = 16 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
const SvgCopy = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
const SvgPlay = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
const SvgSend = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
const SvgClock = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
const SvgReset = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
const SvgChevronLeft = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
const SvgChevronRight = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
const SvgChevronDown = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
const SvgChevronUp = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
const SvgCode = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
const SvgBulb = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="9" y1="18" x2="15" y2="18" /><line x1="10" y1="22" x2="14" y2="22" /><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" /></svg>
const SvgPalette = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor" /><circle cx="17.5" cy="10.5" r=".5" fill="currentColor" /><circle cx="8.5" cy="7.5" r=".5" fill="currentColor" /><circle cx="6.5" cy="12.5" r=".5" fill="currentColor" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" /></svg>

// ── 배경색 팔레트 ─────────────────────────────────────────────────────────────
type BgKey = "white" | "lightgray" | "lightblue" | "dark" | "black"
const BG_OPTIONS: Record<BgKey, { label: string; editor: string; panel: string; isDark: boolean }> = {
  white:     { label: "흰색",        editor: "#ffffff", panel: "#f8fafc", isDark: false },
  lightgray: { label: "라이트그레이", editor: "#f3f4f6", panel: "#e5e7eb", isDark: false },
  lightblue: { label: "라이트블루",  editor: "#eff6ff", panel: "#dbeafe", isDark: false },
  dark:      { label: "다크",        editor: "#1e1e2e", panel: "#181825", isDark: true  },
  black:     { label: "블랙",        editor: "#0d0d1a", panel: "#000000", isDark: true  },
}

// ── 상수 ──────────────────────────────────────────────────────────────────────
const CATEGORY_SLUG: Record<string, string> = {
  파이썬기초: "basic", 파이썬알고리즘: "algorithm",
  파이썬자격증: "certificate", 파이썬실전: "practical", 파이썬도전: "challenge",
}
const DIFF_BADGE: Record<string, string> = {
  하: "bg-emerald-100 text-emerald-700",
  중: "bg-amber-100 text-amber-700",
  상: "bg-rose-100 text-rose-700",
}

// ── 타입 ──────────────────────────────────────────────────────────────────────
type HistoryEntry = { id: number; time: Date; result: SubmissionStatus; code: string }

// ── 오답 출력 파싱 ────────────────────────────────────────────────────────────
function parseWrongOutput(output: string): { input?: string; expected: string; actual: string } {
  const lines = output.split("\n")
  let input: string | undefined
  let expected = ""
  let actual = ""
  for (const line of lines) {
    if (line.startsWith("입력: "))          input    = line.slice("입력: ".length)
    else if (line.startsWith("기대 출력: ")) expected = line.slice("기대 출력: ".length)
    else if (line.startsWith("실제 출력: ")) actual   = line.slice("실제 출력: ".length)
  }
  return { input, expected, actual }
}

// ── Monaco 코드 뷰어 모달 (드래그 가능) ─────────────────────────────────────
function CodeViewerModal({
  code, time, onClose,
}: {
  code: string
  time?: Date
  onClose: () => void
}) {
  const monacoRef  = useRef<HTMLDivElement>(null)
  const editorRef  = useRef<any>(null)
  const [copied, setCopied] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const monaco = await import("monaco-editor")
      if (cancelled || !monacoRef.current) return
      editorRef.current?.dispose()
      editorRef.current = null
      editorRef.current = monaco.editor.create(monacoRef.current, {
        value:                code,
        language:             "python",
        theme:                "vs-dark",
        readOnly:             true,
        automaticLayout:      true,
        fontSize:             13,
        fontFamily:           "var(--font-fira-code), 'Fira Code', Consolas, monospace",
        minimap:              { enabled: false },
        scrollBeyondLastLine: false,
        lineNumbers:          "on",
        padding:              { top: 12, bottom: 12 },
        renderLineHighlight:  "none",
        overviewRulerLanes:   0,
      })
    })()
    return () => {
      cancelled = true
      editorRef.current?.dispose()
      editorRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  const startDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return
    e.preventDefault()
    const startMouseX = e.clientX, startMouseY = e.clientY
    const startPosX = pos.x,      startPosY = pos.y
    const onMove = (ev: MouseEvent) =>
      setPos({ x: startPosX + ev.clientX - startMouseX, y: startPosY + ev.clientY - startMouseY })
    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp) }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup",   onUp)
  }

  const copy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500) }

  const timeStr = time
    ? time.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null

  return (
    <div className="fixed inset-0 bg-black/60 z-50 pointer-events-none">
      <div
        className="pointer-events-auto bg-[#1e1e2e] rounded-xl shadow-2xl flex flex-col border border-white/10"
        style={{ position: "fixed", left: "50%", top: "50%",
          transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
          width: "700px", height: "500px" }}
      >
        <div
          onMouseDown={startDrag}
          className="px-5 py-3.5 border-b border-white/10 flex justify-between items-center shrink-0 cursor-move select-none"
        >
          <div>
            <h3 className="text-white font-bold text-sm">제출 코드 보기</h3>
            {timeStr && <p className="text-gray-400 text-xs mt-0.5">제출 시간: {timeStr}</p>}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={copy} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white bg-white/5 px-2 py-1 rounded transition-colors">
              <SvgCopy /> {copied ? "복사됨" : "복사"}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors"><SvgX size={16} /></button>
          </div>
        </div>
        {code
          ? <div ref={monacoRef} className="flex-1 min-h-0" />
          : <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">저장된 코드가 없습니다.</div>
        }
      </div>
    </div>
  )
}

// ── ResultTab ─────────────────────────────────────────────────────────────────
function ResultTab({
  status, output, isDark, onNextProblem,
}: {
  status: SubmissionStatus
  output: string
  isDark: boolean
  onNextProblem?: () => void
}) {
  if (!status) {
    return (
      <div className={`h-full flex items-center justify-center text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>
        코드를 작성하고 제출해보세요.
      </div>
    )
  }
  if (status === "no_criteria") {
    return <div className={`text-sm p-4 rounded-lg ${isDark ? "bg-slate-800 text-gray-400" : "bg-gray-50 text-gray-500"}`}>이 문제에는 채점 기준이 등록되어 있지 않습니다.</div>
  }
  if (status === "correct") {
    return (
      <div className="flex items-center justify-between px-4 py-3 rounded-lg text-white bg-emerald-500">
        <div className="flex items-center gap-2 font-bold text-sm"><SvgCheck />정답입니다! 훌륭해요</div>
        {onNextProblem && (
          <button onClick={onNextProblem} className="flex items-center gap-1 text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors">
            다음 문제 <SvgChevronRight />
          </button>
        )}
      </div>
    )
  }
  const bannerConfig = { wrong: { bg: "bg-rose-500", text: "틀렸습니다. 다시 시도해보세요" }, error: { bg: "bg-amber-500", text: "오류가 발생했습니다. 코드를 점검해보세요" } }[status]
  if (!bannerConfig) return null
  const parsed = status === "wrong" ? parseWrongOutput(output) : null
  return (
    <div className="flex flex-col gap-3">
      <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-white font-bold text-sm ${bannerConfig.bg}`}>
        <SvgX size={16} />{bannerConfig.text}
      </div>
      {status === "wrong" && parsed && (
        <div className="flex flex-col gap-2">
          {parsed.input !== undefined && (
            <div>
              <p className={`text-xs font-bold mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>입력</p>
              <div className="bg-[#0d1117] text-gray-300 font-mono text-xs p-3 rounded-lg whitespace-pre-wrap">{parsed.input || "(없음)"}</div>
            </div>
          )}
          <div>
            <p className="text-xs font-bold mb-1 text-emerald-500">기대 출력 (정답)</p>
            <div className="bg-[#0d1117] text-emerald-300 font-mono text-xs p-3 rounded-lg whitespace-pre-wrap">{parsed.expected || "(없음)"}</div>
          </div>
          <div>
            <p className="text-xs font-bold mb-1 text-red-400">내 출력</p>
            <div className="bg-[#0d1117] text-red-300 font-mono text-xs p-3 rounded-lg whitespace-pre-wrap">{parsed.actual || "(없음)"}</div>
          </div>
        </div>
      )}
      {status === "error" && output && (
        <div className={`text-xs font-mono whitespace-pre-wrap p-3 rounded-lg ${isDark ? "bg-white/5 text-amber-300" : "bg-amber-50 text-amber-700"}`}>{output}</div>
      )}
    </div>
  )
}

// ── HistoryTab ────────────────────────────────────────────────────────────────
function HistoryTab({
  history, isDark, onViewCode,
}: {
  history: HistoryEntry[]
  isDark: boolean
  onViewCode: (code: string, time: Date) => void
}) {
  const STATUS_STYLE: Record<string, string> = {
    correct: "text-emerald-400 bg-emerald-900/30", wrong: "text-rose-400 bg-rose-900/30",
    error: "text-amber-400 bg-amber-900/30", no_criteria: "text-gray-400 bg-gray-800",
  }
  const STATUS_LABEL: Record<string, string> = { correct: "정답", wrong: "오답", error: "오류", no_criteria: "미채점" }
  if (history.length === 0) {
    return <div className={`h-full flex items-center justify-center text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>제출 기록이 없습니다.</div>
  }
  return (
    <div className={`rounded-xl overflow-hidden border ${isDark ? "border-white/10" : "border-gray-200"}`}>
      <table className="w-full text-xs text-left whitespace-nowrap">
        <thead className={`${isDark ? "bg-[#181825] text-gray-500 border-b border-white/10" : "bg-gray-50 text-gray-500 border-b border-gray-200"}`}>
          <tr>
            <th className="px-4 py-3 font-semibold">번호</th>
            <th className="px-4 py-3 font-semibold">제출 시간</th>
            <th className="px-4 py-3 font-semibold">결과</th>
            <th className="px-4 py-3 font-semibold text-center">소스 코드</th>
          </tr>
        </thead>
        <tbody className={`divide-y ${isDark ? "divide-white/5" : "divide-gray-100"}`}>
          {history.map((entry, idx) => (
            <tr key={entry.id} className={`transition-colors ${isDark ? "hover:bg-white/5 text-gray-300" : "hover:bg-gray-50 text-gray-700"}`}>
              <td className="px-4 py-3 font-mono text-gray-400">#{history.length - idx}</td>
              <td className="px-4 py-3 text-gray-400 font-mono">
                {entry.time.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded font-bold ${STATUS_STYLE[entry.result] ?? "text-gray-400 bg-gray-800"}`}>
                  {STATUS_LABEL[entry.result] ?? entry.result}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <button
                  onClick={() => onViewCode(entry.code, entry.time)}
                  className={`inline-flex items-center gap-1 font-bold transition-colors ${isDark ? "text-[#8b83e8] hover:text-[#a59ff0]" : "text-[#534AB7] hover:text-[#443da0]"}`}
                >
                  <SvgCode /> 코드 보기
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

interface Props {
  problem: Problem
  prev:    AdjacentProblem
  next:    AdjacentProblem
}

export default function ProblemPageClient({ problem, prev, next }: Props) {
  const router            = useRouter()
  const { data: session } = useSession()

  // ── Monaco 에디터 ──────────────────────────────────────────────────────────
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const monacoInstanceRef  = useRef<any>(null)
  const monacoModuleRef    = useRef<any>(null)
  const blankDecoRef       = useRef<any>(null)
  const [cursorPos, setCursorPos] = useState({ ln: 1, col: 1 })

  // ── 실행 / 채점 훅 ──────────────────────────────────────────────────────────
  const { output: runOutput, error: runError, running, pyodideStatus, run, reset: resetRun } = useCodeExecution()
  const { output: subOutput, status: subStatus, submitting, submit } = useSubmission(problem)

  // ── 타이머 ──────────────────────────────────────────────────────────────────
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setElapsed(n => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // ── 배경색 ──────────────────────────────────────────────────────────────────
  const [bgKey, setBgKey]               = useState<BgKey>("dark")
  const [bgPickerOpen, setBgPickerOpen] = useState(false)

  // ── 글자 크기 (localStorage "editorFontSize") ────────────────────────────────
  const [fontSize, setFontSize] = useState(13)
  useEffect(() => {
    const saved = parseInt(localStorage.getItem("editorFontSize") ?? "13")
    if (!isNaN(saved) && saved >= 11 && saved <= 20) setFontSize(saved)
  }, [])
  const handleFontSizeChange = (val: number) => {
    setFontSize(val)
    localStorage.setItem("editorFontSize", String(val))
    monacoInstanceRef.current?.updateOptions({ fontSize: val })
  }

  // ── 드래그 패널 (좌우) ──────────────────────────────────────────────────────
  const [panelWidth, setPanelWidth] = useState(40)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef  = useRef<HTMLDivElement>(null)
  const panelWidthRef = useRef(40)
  panelWidthRef.current = panelWidth

  useEffect(() => {
    const saved = parseFloat(localStorage.getItem("problemPanelWidth") ?? "40")
    if (!isNaN(saved) && saved >= 25 && saved <= 65) setPanelWidth(saved)
  }, [])

  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    const onMouseMove = (ev: MouseEvent) => {
      if (!containerRef.current) return
      const rect    = containerRef.current.getBoundingClientRect()
      const clamped = Math.min(65, Math.max(25, ((ev.clientX - rect.left) / rect.width) * 100))
      setPanelWidth(clamped)
      panelWidthRef.current = clamped
    }
    const onMouseUp = () => {
      setIsDragging(false)
      localStorage.setItem("problemPanelWidth", String(panelWidthRef.current))
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup",   onMouseUp)
    }
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup",   onMouseUp)
  }, [])

  // ── 결과 패널 수직 드래그 ─────────────────────────────────────────────────
  const [resultPanelHeight, setResultPanelHeight] = useState(260)
  const [resultCollapsed,   setResultCollapsed]   = useState(false)
  const [isVDragging,       setIsVDragging]       = useState(false)
  const resultPanelHeightRef = useRef(260)
  const rightPanelRef        = useRef<HTMLDivElement>(null)
  resultPanelHeightRef.current = resultPanelHeight

  useEffect(() => {
    const saved = parseInt(localStorage.getItem("resultPanelHeight") ?? "260")
    if (!isNaN(saved) && saved >= 80 && saved <= 600) setResultPanelHeight(saved)
  }, [])

  const startVDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsVDragging(true)
    const startY      = e.clientY
    const startHeight = resultPanelHeightRef.current
    const onMouseMove = (ev: MouseEvent) => {
      if (!rightPanelRef.current) return
      const maxH   = rightPanelRef.current.clientHeight * 0.72
      const newH   = Math.min(maxH, Math.max(80, startHeight - (ev.clientY - startY)))
      setResultPanelHeight(newH)
      resultPanelHeightRef.current = newH
    }
    const onMouseUp = () => {
      setIsVDragging(false)
      localStorage.setItem("resultPanelHeight", String(Math.round(resultPanelHeightRef.current)))
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup",   onMouseUp)
    }
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup",   onMouseUp)
  }, [])

  // ── 테스트 입력 ──────────────────────────────────────────────────────────────
  const [testInput, setTestInput] = useState("")
  const [inputOpen, setInputOpen] = useState(false)

  // ── 결과 탭 ─────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"output" | "example" | "result" | "history">("result")

  // ── 제출 기록 ───────────────────────────────────────────────────────────────
  const [history, setHistory]         = useState<HistoryEntry[]>([])
  const [historyModal, setHistoryModal] = useState<{ open: boolean; code: string; time: Date } | null>(null)

  // ── 제출 상태 (HintPanel용) ─────────────────────────────────────────────────
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>("")

  // ── 유저 상태 ───────────────────────────────────────────────────────────────
  const [userState, setUserState] = useState<ProblemUserState>({ status: "미제출", count: 0 })

  // ── 좌측 패널 토글 ──────────────────────────────────────────────────────────
  const [constraintsOpen, setConstraintsOpen] = useState(true)
  const [hintOpen, setHintOpen]               = useState(false)

  // ── AI 코치 패널 ────────────────────────────────────────────────────────────
  const [coachOpen, setCoachOpen] = useState(false)

  // ── 초기 유저 상태 조회 ───────────────────────────────────────────────────
  useEffect(() => {
    const userId = (session?.user as any)?.id as string | undefined
    if (!userId) return
    ;(async () => {
      const { data } = await supabase
        .from("submissions")
        .select("problem_id, is_correct")
        .eq("user_id", userId)
        .eq("problem_id", problem.id)
      setUserState(calcUserStatus((data ?? []) as SubmissionSummaryRow[]))
    })()
  }, [session, problem.id])

  // ── 제출 기록 DB 조회 (재진입 시 복원) ─────────────────────────────────────
  useEffect(() => {
    const userId = (session?.user as any)?.id as string | undefined
    if (!userId) return
    ;(async () => {
      const { data } = await supabase
        .from("submissions")
        .select("id, created_at, result, is_correct, code")
        .eq("user_id", userId)
        .eq("problem_id", problem.id)
        .order("created_at", { ascending: false })
        .limit(20)
      if (data && data.length > 0) {
        setHistory(data.map(r => ({
          id:     r.id,
          time:   new Date(/Z|[+-]\d{2}:?\d{2}$/.test(r.created_at) ? r.created_at : r.created_at + "Z"),
          result: (r.is_correct ? "correct" : r.result === "오류" ? "error" : "wrong") as SubmissionStatus,
          code:   r.code ?? "",
        })))
      }
    })()
  }, [session, problem.id])

  // ── Monaco 초기화 (문제 변경 시 재생성) ────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const monaco = await import("monaco-editor")
      if (cancelled || !editorContainerRef.current) return

      monacoModuleRef.current = monaco

      // 기존 인스턴스 정리
      monacoInstanceRef.current?.dispose()
      monacoInstanceRef.current = null

      const editor = monaco.editor.create(editorContainerRef.current, {
        value:                   problem.initial_code ?? "",
        language:                "python",
        theme:                   bgKey === "dark" || bgKey === "black" ? "vs-dark" : "vs",
        automaticLayout:         true,
        fontSize:                fontSize,
        fontFamily:              "var(--font-fira-code), 'Fira Code', Consolas, monospace",
        fontLigatures:           true,
        minimap:                 { enabled: false },
        scrollBeyondLastLine:    false,
        renderLineHighlight:     "line",
        tabSize:                 4,
        insertSpaces:            true,
        padding:                 { top: 14, bottom: 14 },
        lineNumbers:             "on",
        quickSuggestions:        true,
        acceptSuggestionOnEnter: "on",
        suggestOnTriggerCharacters: true,
        wordBasedSuggestions:    "currentDocument",
        overviewRulerLanes:      0,
      })

      monacoInstanceRef.current = editor

      // 커서 위치 추적
      editor.onDidChangeCursorPosition((e: any) =>
        setCursorPos({ ln: e.position.lineNumber, col: e.position.column })
      )

      // Ctrl+Enter → 현재 줄 아래에 새 줄 삽입 후 커서 이동
      editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
        () => editor.trigger("keyboard", "editor.action.insertLineAfter", null)
      )

      // ── 빈칸 채우기 (@ 마커) ───────────────────────────────────────────────

      // CSS: @ 를 그대로 흰 글자 녹색 배지로 표시 (CSS 트릭 없음)
      if (!document.getElementById("blank-marker-style")) {
        const s = document.createElement("style")
        s.id    = "blank-marker-style"
        s.textContent = `
          .blank-marker {
            background   : #00c471 !important;
            color        : #ffffff !important;
            border-radius: 4px !important;
            padding      : 1px 6px !important;
            font-size    : 12px !important;
            cursor       : pointer !important;
          }`
        document.head.appendChild(s)
      }

      // @ 위치 스캔 → decoration 업데이트 (deltaDecorations: 모든 Monaco 버전 호환)
      const blankDecoIds: string[] = []
      const updateBlanks = () => {
        const model = editor.getModel()
        if (!model) return
        const newDecos: any[] = []
        model.getValue().split("\n").forEach((line: string, li: number) => {
          let ci = 0
          while (true) {
            const idx = line.indexOf("@", ci)
            if (idx === -1) break
            newDecos.push({
              range  : new monaco.Range(li + 1, idx + 1, li + 1, idx + 2),
              options: { inlineClassName: "blank-marker" },
            })
            ci = idx + 1
          }
        })
        const next = editor.deltaDecorations(blankDecoIds.slice(), newDecos)
        blankDecoIds.length = 0
        blankDecoIds.push(...next)
      }

      updateBlanks()
      editor.onDidChangeModelContent(updateBlanks)

      // 클릭 → blank-marker decoration 위 클릭이면 전체 @ 제거 후 커서 이동
      editor.onMouseDown((e: any) => {
        const pos = e.target.position
        if (!pos) return

        // 클릭 컬럼 주변 ±1 범위에서 blank-marker decoration 탐색
        const hit = (editor.getDecorationsInRange(
          new monaco.Range(pos.lineNumber, Math.max(1, pos.column - 1),
                           pos.lineNumber, pos.column + 1)
        ) ?? []).find((d: any) => d.options?.inlineClassName === "blank-marker")
        if (!hit) return

        const model = editor.getModel()
        if (!model) return

        // 클릭된 @ 의 위치 (라인 내에서 몇 번째 @ 인지 계산 → 제거 후 커서 위치 보정)
        const clickLine = hit.range.startLineNumber
        const clickCol  = hit.range.startColumn          // 1-indexed
        const lineText  = model.getLineContent(clickLine)
        const atsBefore = (lineText.slice(0, clickCol - 1).match(/@/g) ?? []).length

        // 전체 코드에서 @ 를 모두 제거
        const cleaned = model.getValue().replace(/@/g, "")
        editor.executeEdits("blank-clear-all", [{
          range: model.getFullModelRange(),
          text : cleaned,
        }])

        // 같은 줄 앞쪽 @ 개수만큼 컬럼 보정
        editor.setPosition({ lineNumber: clickLine, column: clickCol - atsBefore })
        editor.focus()
      })
    })()

    return () => {
      cancelled = true
      blankDecoRef.current = null
      monacoInstanceRef.current?.dispose()
      monacoInstanceRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem.id])

  // ── isDark 변경 시 Monaco 테마 업데이트 ────────────────────────────────────
  const bg     = BG_OPTIONS[bgKey]
  const isDark = bg.isDark
  useEffect(() => {
    monacoModuleRef.current?.editor.setTheme(isDark ? "vs-dark" : "vs")
  }, [isDark])

  // ── 계산값 ──────────────────────────────────────────────────────────────────
  const slug   = CATEGORY_SLUG[problem.category] ?? "basic"
  const mm     = String(Math.floor(elapsed / 60)).padStart(2, "0")
  const ss     = String(elapsed % 60).padStart(2, "0")

  const exampleInput  = problem.test_cases?.[0]?.input ?? problem.example_input ?? null
  const exampleOutput = problem.test_cases?.[0]?.expected_output ?? problem.example_output ?? null

  const editorBorderColor = isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb"

  // ── 헬퍼 ────────────────────────────────────────────────────────────────────
  const getCode = useCallback(() => monacoInstanceRef.current?.getValue() ?? "", [])

  const handleRun = async () => {
    setActiveTab("output")
    resetRun()
    await run(getCode(), testInput)
  }

  const handleSubmit = async () => {
    const code   = getCode()
    const result = await submit(code)
    setActiveTab("result")
    setSubmissionStatus(result)
    setHistory(prev => [{ id: Date.now(), time: new Date(), result, code }, ...prev])
    setUserState(prev => {
      const newCount = prev.count + 1
      if (result === "correct") return { status: "정답", count: newCount }
      if (prev.status === "정답") return { ...prev, count: newCount }
      return { status: "시도중", count: newCount }
    })
    if (result === "correct") router.refresh()
  }

  const handleReset = () => {
    monacoInstanceRef.current?.setValue(problem.initial_code ?? "")
  }

  const handleSendToInput = (text: string) => {
    setTestInput(text)
    setInputOpen(true)
  }

  // ── 렌더 ────────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">

      {/* ══ HEADER ══════════════════════════════════════════════════════════════ */}
      <header className="h-14 shrink-0 border-b border-gray-200 bg-white flex items-center justify-between px-4 gap-3 z-20">
        <div className="flex items-center gap-3 min-w-0 overflow-hidden">
          <button
            onClick={() => router.push(`/course/${slug}`)}
            className="flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors shrink-0"
          >
            <SvgChevronLeft /> 목록으로
          </button>
          <div className="w-px h-4 bg-gray-200 shrink-0" />
          <h1 className="text-sm font-semibold text-gray-800 truncate">{problem.title}</h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button onClick={handleReset} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 transition-colors px-3 py-1.5 rounded-lg">
            <SvgReset /> 초기화
          </button>
          <button
            onClick={() => prev && router.push(`/problems/${prev.id}`)} disabled={!prev} title={prev?.title}
            className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${prev ? "text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200" : "text-gray-300 bg-gray-50 cursor-not-allowed opacity-40"}`}
          ><SvgChevronLeft /> 이전</button>
          <button
            onClick={() => next && router.push(`/problems/${next.id}`)} disabled={!next} title={next?.title}
            className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${next ? "text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200" : "text-gray-300 bg-gray-50 cursor-not-allowed opacity-40"}`}
          >다음 <SvgChevronRight /></button>
          <div className="flex items-center gap-1.5 text-sm font-mono font-bold text-[#534AB7] bg-[#534AB7]/10 px-4 py-1.5 rounded-lg">
            <SvgClock /> {mm}:{ss}
          </div>
          <div className="relative">
            <button
              onClick={() => setBgPickerOpen(v => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 transition-colors px-3 py-1.5 rounded-lg"
            >
              <SvgPalette />
              <span className="w-3 h-3 rounded-full border border-gray-400" style={{ background: bg.editor }} />
            </button>
            {bgPickerOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-2 flex flex-col gap-0.5 z-50 min-w-[140px]">
                {(Object.entries(BG_OPTIONS) as [BgKey, (typeof BG_OPTIONS)[BgKey]][]).map(([key, opt]) => (
                  <button key={key} onClick={() => { setBgKey(key); setBgPickerOpen(false) }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left hover:bg-gray-50 transition-colors ${bgKey === key ? "bg-[#534AB7]/10 text-[#534AB7]" : "text-gray-700"}`}
                  >
                    <span className="w-4 h-4 rounded-full border border-gray-300 shrink-0" style={{ background: opt.editor }} />
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ══ MAIN ════════════════════════════════════════════════════════════════ */}
      <div ref={containerRef} className="flex-1 flex min-h-0 overflow-hidden" style={{ userSelect: isDragging || isVDragging ? "none" : undefined }}>

        {/* ── 왼쪽: 문제 패널 ───────────────────────────────────────────────── */}
        <div className="shrink-0 bg-white border-r border-gray-200 overflow-y-auto" style={{ width: `${panelWidth}%` }}>
          <div className="px-6 pt-6 pb-2 flex flex-col gap-4">

            {/* 태그 행 */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2 flex-wrap items-center">
                {problem.topic && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded">{problem.topic}</span>
                )}
                <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded">{problem.category}</span>
              </div>
              <span className={`px-2 py-1 text-xs font-bold rounded shrink-0 ${DIFF_BADGE[problem.difficulty] ?? "bg-gray-100 text-gray-600"}`}>
                {problem.difficulty}
              </span>
            </div>

            {/* 제목 + 배지 (같은 행) */}
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-bold text-gray-900">{problem.title}</h2>
              <div className="flex items-center gap-1.5 shrink-0">
                {userState.status === "미제출" && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                )}
                <span className={`text-[12px] font-bold rounded px-2 py-0.5 ${USER_STATUS_BADGE[userState.status].cls}`}>
                  {USER_STATUS_BADGE[userState.status].label}
                </span>
              </div>
            </div>

            {/* 문제 내용 */}
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{problem.content}</p>

            {/* 제한사항 */}
            {problem.constraints && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button onClick={() => setConstraintsOpen(v => !v)} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                  <span className="text-sm font-bold text-gray-800">제한 사항</span>
                  {constraintsOpen ? <SvgChevronUp /> : <SvgChevronDown />}
                </button>
                {constraintsOpen && <div className="p-4 bg-white text-sm text-gray-600 border-t border-gray-200 whitespace-pre-wrap leading-relaxed">{problem.constraints}</div>}
              </div>
            )}

            {/* 힌트 */}
            {problem.hint && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button onClick={() => setHintOpen(v => !v)} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                  <span className="text-sm font-bold text-gray-800">힌트</span>
                  {hintOpen ? <SvgChevronUp /> : <SvgChevronDown />}
                </button>
                {hintOpen && <div className="p-4 bg-white text-sm text-gray-600 border-t border-gray-200 whitespace-pre-wrap leading-relaxed">{problem.hint}</div>}
              </div>
            )}

            {/* 입출력 형식 (2열) */}
            {(problem.input_description || problem.output_description) && (
              <div className="grid grid-cols-2 gap-4 mb-5">
                {problem.input_description && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-800 mb-2 pb-2 border-b border-gray-100">입력 형식</h3>
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{problem.input_description}</p>
                  </div>
                )}
                {problem.output_description && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-800 mb-2 pb-2 border-b border-gray-100">출력 형식</h3>
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{problem.output_description}</p>
                  </div>
                )}
              </div>
            )}

            {/* 입출력 예시 (2열) */}
            {(exampleInput || exampleOutput) && (
              <div className="grid grid-cols-2 gap-4 max-[768px]:grid-cols-1">
                {exampleInput && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-gray-800">입력 예시</h3>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => handleSendToInput(exampleInput)} className="flex items-center gap-1 text-xs font-semibold text-[#534AB7] hover:text-[#443da0] bg-[#534AB7]/10 px-2.5 py-1 rounded transition-colors">입력창으로</button>
                        <button onClick={() => navigator.clipboard.writeText(exampleInput)} className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-gray-700 bg-gray-100 px-2.5 py-1 rounded transition-colors"><SvgCopy /> 복사</button>
                      </div>
                    </div>
                    <div className="bg-[#1a1a2e] text-[#4ADE80] p-4 rounded-lg font-mono text-sm whitespace-pre">{exampleInput}</div>
                  </div>
                )}
                {exampleOutput && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-gray-800">출력 예시</h3>
                      <button onClick={() => navigator.clipboard.writeText(exampleOutput)} className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-gray-700 bg-gray-100 px-2.5 py-1 rounded transition-colors"><SvgCopy /> 복사</button>
                    </div>
                    <div className="bg-[#1a1a2e] text-[#4ADE80] p-4 rounded-lg font-mono text-sm whitespace-pre">{exampleOutput}</div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* ── 드래그 구분선 ────────────────────────────────────────────────── */}
        <div
          onMouseDown={startDrag}
          className={`w-1.5 shrink-0 cursor-col-resize transition-colors duration-150 hover:bg-blue-400 ${isDragging ? "bg-blue-500" : "bg-gray-200"}`}
        />

        {/* ── 오른쪽: 에디터 패널 ──────────────────────────────────────────── */}
        <div ref={rightPanelRef} className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden" style={{ background: bg.editor }}>

          {/* 에디터 상단바 (신호등 + 글자 크기 슬라이더) */}
          <div className="h-10 flex items-center justify-between px-4 shrink-0" style={{ background: bg.panel, borderBottom: `1px solid ${editorBorderColor}` }}>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="w-3 h-3 rounded-full bg-yellow-400" />
                <span className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <span className="text-xs font-mono tracking-wide" style={{ color: isDark ? "#9ca3af" : "#6b7280" }}>main.py</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono" style={{ color: isDark ? "#9ca3af" : "#6b7280" }}>{fontSize}px</span>
              <input
                type="range" min={11} max={20} step={1} value={fontSize}
                onChange={e => handleFontSizeChange(Number(e.target.value))}
                className="w-20 h-1.5 accent-[#534AB7] cursor-pointer"
                title="에디터 글자 크기"
              />
              <span className="px-2 py-1 rounded text-[11px] font-bold tracking-wide" style={{ background: isDark ? "rgba(255,255,255,0.1)" : "#f3f4f6", color: isDark ? "#d1d5db" : "#6b7280" }}>
                Python 3
              </span>
            </div>
          </div>

          {/* Monaco 코드 에디터 */}
          <div ref={editorContainerRef} className="flex-1 min-h-0 overflow-hidden" />

          {/* 상태바 */}
          <div className="h-7 flex items-center justify-between px-4 text-[11px] font-mono shrink-0"
            style={{ background: bg.panel, borderTop: `1px solid ${editorBorderColor}`, color: isDark ? "rgba(255,255,255,0.3)" : "#9ca3af" }}
          >
            <span style={{ color: running ? "#f59e0b" : submitting ? "#a78bfa" : pyodideStatus === "loading" ? "#60a5fa" : "#4ade80" }}>
              {running ? "실행 중..." : submitting ? "채점 중..." : pyodideStatus === "loading" ? "로딩 중..." : "Ready"}
            </span>
            <div className="flex items-center gap-4">
              <span>Ln {cursorPos.ln}, Col {cursorPos.col}</span>
              <span>0ms</span>
              <span>0MB</span>
            </div>
          </div>

          {/* 테스트 입력 */}
          {inputOpen && (
            <div className="shrink-0 border-t p-3" style={{ background: "#f0fdf4", borderColor: "#86efac" }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-gray-700">테스트 입력</span>
                <button onClick={() => setInputOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><SvgX size={14} /></button>
              </div>
              <textarea
                value={testInput} onChange={e => setTestInput(e.target.value)} rows={3}
                placeholder="입력값을 입력하세요..."
                className="w-full text-sm font-mono bg-white border border-[#86efac] rounded-lg px-3 py-2 resize-none outline-none focus:border-[#22c55e] text-gray-700"
              />
            </div>
          )}

          {/* 컨트롤 바 */}
          <div className="h-14 flex items-center justify-between px-4 shrink-0"
            style={{ background: isDark ? "#1e1e2e" : "#ffffff", borderTop: `1px solid ${editorBorderColor}`, borderBottom: `1px solid ${editorBorderColor}` }}
          >
            <button onClick={() => setInputOpen(v => !v)} className={`flex items-center gap-1 text-xs font-semibold transition-colors ${isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-800"}`}>
              테스트 입력 {inputOpen ? <SvgChevronUp /> : <SvgChevronDown />}
            </button>
            <div className="flex items-center gap-2">
              <button onClick={handleRun} disabled={running || submitting}
                className="flex items-center gap-1.5 px-5 py-2 bg-[#639922] text-white text-sm font-bold rounded-lg hover:bg-[#52821a] transition-colors disabled:opacity-50"
              ><SvgPlay /> {running ? "실행 중..." : "실행"}</button>
              <button onClick={handleSubmit} disabled={running || submitting}
                className="flex items-center gap-1.5 px-5 py-2 bg-[#534AB7] text-white text-sm font-bold rounded-lg hover:bg-[#443da0] transition-colors disabled:opacity-50"
              ><SvgSend /> {submitting ? "채점 중..." : "제출"}</button>
            </div>
          </div>

          {/* 수직 드래그 핸들 */}
          <div
            onMouseDown={startVDrag}
            className={`h-1.5 shrink-0 cursor-row-resize transition-colors duration-150 hover:bg-blue-400 ${isVDragging ? "bg-blue-500" : ""}`}
            style={{ background: isVDragging ? undefined : editorBorderColor }}
          />

          {/* 결과 탭 패널 */}
          <div className="flex flex-col shrink-0 overflow-hidden" style={{ height: resultCollapsed ? "36px" : `${resultPanelHeight}px`, background: bg.panel }}>
            <div className="flex items-center gap-1 px-3 shrink-0 overflow-x-auto"
              style={{ background: isDark ? "#181825" : "#f3f4f6", borderBottom: resultCollapsed ? "none" : `1px solid ${editorBorderColor}` }}
            >
              {(["output", "example", "result", "history"] as const).map(tab => {
                const labels = { output: "출력", example: "예제", result: "제출 결과", history: "제출 기록" }
                return (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2.5 text-xs font-bold transition-colors whitespace-nowrap border-t-2 ${
                      activeTab === tab
                        ? isDark ? "text-white border-[#534AB7] bg-[#1e1e2e]" : "text-[#534AB7] border-[#534AB7] bg-white"
                        : isDark ? "text-gray-500 hover:text-gray-300 border-transparent" : "text-gray-500 hover:text-gray-700 border-transparent"
                    }`}
                  >{labels[tab]}</button>
                )
              })}
              <button
                onClick={() => setResultCollapsed(v => !v)}
                className={`ml-auto shrink-0 p-1.5 rounded transition-colors ${isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}`}
                title={resultCollapsed ? "결과 패널 열기" : "결과 패널 닫기"}
              >
                {resultCollapsed ? <SvgChevronUp /> : <SvgChevronDown />}
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {activeTab === "output" && (
                <div className="text-sm font-mono whitespace-pre-wrap" style={{ color: runError ? "#f87171" : isDark ? "#d1d5db" : "#374151" }}>
                  {running ? "실행 중..." : runError || runOutput || "코드를 실행하면 결과가 여기에 표시됩니다."}
                </div>
              )}
              {activeTab === "example" && (
                <div className="grid grid-cols-2 gap-4 max-[600px]:grid-cols-1">
                  {exampleInput && (
                    <div>
                      <p className={`text-xs font-bold mb-1.5 ${isDark ? "text-gray-400" : "text-gray-600"}`}>입력 예시</p>
                      <div className="bg-[#1a1a2e] text-[#4ADE80] p-3 rounded-lg font-mono text-sm whitespace-pre">{exampleInput}</div>
                    </div>
                  )}
                  {exampleOutput && (
                    <div>
                      <p className={`text-xs font-bold mb-1.5 ${isDark ? "text-gray-400" : "text-gray-600"}`}>출력 예시</p>
                      <div className="bg-[#1a1a2e] text-[#4ADE80] p-3 rounded-lg font-mono text-sm whitespace-pre">{exampleOutput}</div>
                    </div>
                  )}
                  {!exampleInput && !exampleOutput && <p className={`text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>예제 입출력이 없습니다.</p>}
                </div>
              )}
              {activeTab === "result" && (
                <ResultTab status={subStatus} output={subOutput} isDark={isDark}
                  onNextProblem={next ? () => router.push(`/problems/${next.id}`) : undefined}
                />
              )}
              {activeTab === "history" && (
                <HistoryTab history={history} isDark={isDark}
                  onViewCode={(code, time) => setHistoryModal({ open: true, code, time })}
                />
              )}
            </div>
          </div>

          {/* AI 코치 패널 */}
          <div className="shrink-0" style={{ borderTop: `1px solid ${editorBorderColor}` }}>
            <button onClick={() => setCoachOpen(v => !v)} className="w-full flex items-center justify-between px-4 py-3 transition-colors"
              style={{ background: isDark ? "#181825" : "#f9fafb", color: isDark ? "#9ca3af" : "#6b7280" }}
            >
              <div className="flex items-center gap-2">
                <span className="text-[#534AB7]"><SvgBulb /></span>
                <span className="text-sm font-bold text-[#534AB7]">AI 코치</span>
                {!submissionStatus && <span className={`text-[11px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>막히면 언제든 물어보세요</span>}
                {submissionStatus === "correct" && <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 font-semibold flex items-center gap-0.5"><SvgCheck />정답</span>}
                {(submissionStatus === "wrong" || submissionStatus === "error") && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 font-semibold">힌트 확인</span>}
              </div>
              {coachOpen ? <SvgChevronUp /> : <SvgChevronDown />}
            </button>
            {coachOpen && (
              <HintPanel problem={problem} code={getCode()} submissionStatus={submissionStatus} isDark={isDark} />
            )}
          </div>
        </div>
      </div>

      {/* ══ 코드 뷰어 모달 ══════════════════════════════════════════════════════ */}
      {historyModal?.open && (
        <CodeViewerModal code={historyModal.code} time={historyModal.time} onClose={() => setHistoryModal(null)} />
      )}
    </div>
  )
}
