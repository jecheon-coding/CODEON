"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { supabase } from "@/lib/supabase"
import { useCodeExecution } from "@/hooks/useCodeExecution"
import { useSubmission } from "@/hooks/useSubmission"
import { preloadWorker } from "@/lib/pyodideWorker"
import HintPanel from "@/components/problem/HintPanel"
import { Problem, AdjacentProblem, SubmissionStatus, CaseResult } from "@/types/problem"
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
  파이썬대회: "competition",
}
const DIFF_BADGE: Record<string, string> = {
  하: "bg-emerald-100 text-emerald-700",
  중: "bg-amber-100 text-amber-700",
  상: "bg-rose-100 text-rose-700",
}

// ── 타입 ──────────────────────────────────────────────────────────────────────
type HistoryEntry = { id: number; time: Date; result: SubmissionStatus; code: string }

// ── 이미지 파싱 유틸 ─────────────────────────────────────────────────────────
// 한 줄 = 하나의 행. 행 안에서 , 로 구분하면 가로 배치.
// 각 항목 형식: url  /  url|400  /  url|center  /  url|400|center
const IMAGE_URL_RE = /^https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp|svg)(\?[^\s]*)?/i
const ALIGN_VALS = ["left", "center", "right"] as const
type ImgAlign = typeof ALIGN_VALS[number]

function parseImageEntry(raw: string): { url: string; width?: number; align: ImgAlign } {
  const parts = raw.trim().split("|")
  const url = parts[0].trim()
  let width: number | undefined
  let align: ImgAlign = "left"
  for (let i = 1; i < parts.length; i++) {
    const p = parts[i].trim()
    if (ALIGN_VALS.includes(p as ImgAlign)) align = p as ImgAlign
    else { const n = Number(p); if (n > 0) width = n }
  }
  return { url, width, align }
}

// 행(줄) 하나를 렌더링 — 항목이 여러 개면 가로 배치
function ProblemImageRow({ line, altPrefix }: { line: string; altPrefix?: string }) {
  const entries = line.split(",").map(s => s.trim()).filter(Boolean)
  const isRow = entries.length > 1

  if (isRow) {
    return (
      <div className="flex flex-wrap gap-3 items-end my-1">
        {entries.map((raw, i) => {
          const { url, width } = parseImageEntry(raw)
          return (
            <img key={i} src={url} alt={`${altPrefix ?? "그림"} ${i + 1}`}
              className="rounded-lg"
              style={{ maxWidth: width ? `${width}px` : "45%", maxHeight: "320px", width: "auto", height: "auto" }} />
          )
        })}
      </div>
    )
  }

  const { url, width, align } = parseImageEntry(entries[0])
  const alignCls = align === "center" ? "mx-auto" : align === "right" ? "ml-auto" : "mr-auto"
  return (
    <div className="flex my-1">
      <img src={url} alt={altPrefix ?? "문제 그림"}
        className={`rounded-lg ${alignCls}`}
        style={{ maxWidth: width ? `${width}px` : "100%", maxHeight: "320px", width: "auto", height: "auto" }} />
    </div>
  )
}

// content 인라인용: 한 줄이 이미지 URL(들)인지 확인
function isImageRowLine(line: string): boolean {
  const entries = line.split(",").map(s => s.trim()).filter(Boolean)
  return entries.length > 0 && entries.every(e => IMAGE_URL_RE.test(e.split("|")[0].trim()))
}

// ── 문제 내용 렌더러 ──────────────────────────────────────────────────────────
function ProblemContent({ text }: { text: string }) {
  const isDataLine = (line: string) => {
    const t = line.trim()
    return t.length > 0 && /^[\d\s\+\-\.,\/\[\]\(\)]+$/.test(t)
  }

  type SegType = "text" | "code" | "image"
  type Seg = { type: SegType; lines: string[] }
  const segs: Seg[] = []

  for (const line of text.split("\n")) {
    const type: SegType = isImageRowLine(line) ? "image" : isDataLine(line) ? "code" : "text"
    if (type === "image") {
      segs.push({ type: "image", lines: [line.trim()] })
    } else if (segs.length === 0 || segs[segs.length - 1].type !== type) {
      segs.push({ type, lines: [line] })
    } else {
      segs[segs.length - 1].lines.push(line)
    }
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      {segs.map((seg, i) => {
        const content = seg.lines.join("\n").trim()
        if (!content) return null
        if (seg.type === "image") {
          return <ProblemImageRow key={i} line={seg.lines[0]} />
        }
        if (seg.type === "code") {
          return (
            <pre key={i} className="font-mono text-[13px] leading-relaxed whitespace-pre-wrap"
              style={{ background: "#1a1a2a", color: "#5cba6a", borderRadius: "6px", padding: "8px 12px" }}>
              {content}
            </pre>
          )
        }
        return <p key={i} className="text-gray-700 leading-relaxed whitespace-pre-wrap">{seg.lines.join("\n")}</p>
      })}
    </div>
  )
}

// ── 오답 출력 파싱 ────────────────────────────────────────────────────────────
function truncateForDisplay(s: string | null | undefined, maxChars = 300): string {
  if (!s) return "(없음)"
  if (s.length <= maxChars) return s
  return s.slice(0, maxChars) + `\n…(총 ${s.length.toLocaleString()}자, 일부 생략)`
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
    ? time.toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", second: "2-digit" })
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

// ── ErrorOutput — 에러 메시지 파싱 표시 ──────────────────────────────────────
function ErrorOutput({ error, isDark }: { error: string; isDark: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const lines    = error.split("\n").filter(Boolean)
  const lastLine = lines[lines.length - 1] ?? error
  const colonIdx = lastLine.indexOf(": ")
  const errType  = colonIdx > -1 ? lastLine.slice(0, colonIdx) : null
  const errMsg   = colonIdx > -1 ? lastLine.slice(colonIdx + 2) : lastLine

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg"
        style={{ background: isDark ? "rgba(239,68,68,0.12)" : "#fef2f2", border: `1px solid ${isDark ? "rgba(239,68,68,0.25)" : "#fecaca"}` }}>
        <span className="shrink-0 mt-px" style={{ color: "#ef4444", fontSize: "13px" }}>⚠</span>
        <p className="font-mono text-xs leading-relaxed break-all">
          {errType && <span className="font-bold" style={{ color: "#ef4444" }}>{errType}: </span>}
          <span style={{ color: isDark ? "#fca5a5" : "#b91c1c" }}>{errMsg}</span>
        </p>
      </div>
      {lines.length > 1 && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="self-start text-xs px-2 py-1 rounded transition-colors"
          style={{ color: isDark ? "#9ca3af" : "#6b7280", background: isDark ? "rgba(255,255,255,0.05)" : "#f3f4f6" }}
        >{expanded ? "접기" : `자세히 보기 (${lines.length}줄)`}</button>
      )}
      {expanded && (
        <pre className="font-mono text-xs whitespace-pre-wrap rounded-lg p-3 overflow-auto"
          style={{ background: isDark ? "rgba(0,0,0,0.3)" : "#f9fafb", color: isDark ? "#9ca3af" : "#6b7280", maxHeight: "200px" }}>
          {error}
        </pre>
      )}
    </div>
  )
}

// ── ResultTab ─────────────────────────────────────────────────────────────────
function ResultTab({
  status, caseResults, isDark, submitting, progress, onNextProblem,
}: {
  status: SubmissionStatus
  caseResults: CaseResult[] | null
  isDark: boolean
  submitting: boolean
  progress: { current: number; total: number } | null
  onNextProblem?: () => void
}) {
  if (submitting) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10">
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <span key={i} className="w-2 h-2 rounded-full bg-violet-400 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
        {progress ? (
          <>
            <p className={`text-sm font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              채점 중... {progress.current}/{progress.total}
            </p>
            <div className={`w-40 h-1.5 rounded-full overflow-hidden ${isDark ? "bg-white/10" : "bg-gray-200"}`}>
              <div
                className="h-full bg-violet-500 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </>
        ) : (
          <p className={`text-sm font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
            채점 중...
          </p>
        )}
      </div>
    )
  }

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

  const total       = caseResults?.length ?? 0
  const passedCount = caseResults?.filter(r => r.status === "passed").length ?? 0
  const firstFail   = caseResults?.find(r => r.status !== "passed" && !r.isHidden)

  const BANNER: Record<string, { bg: string; text: string }> = {
    correct: { bg: "bg-emerald-500", text: "정답입니다! 훌륭해요" },
    wrong:   { bg: "bg-rose-500",    text: "오답" },
    timeout: { bg: "bg-amber-500",   text: "시간 초과" },
    error:   { bg: "bg-amber-500",   text: "런타임 오류" },
  }
  const banner = BANNER[status] ?? { bg: "bg-gray-500", text: status }

  return (
    <div className="flex flex-col gap-3">
      {/* 결과 배너 */}
      <div className={`flex items-center justify-between px-4 py-3 rounded-lg text-white font-bold text-sm ${banner.bg}`}>
        <div className="flex items-center gap-2">
          {status === "correct" ? <SvgCheck /> : <SvgX size={16} />}
          <span>{banner.text}</span>
          {total > 0 && (
            <span className="font-normal text-white/70 text-xs">· {passedCount}/{total} 맞음</span>
          )}
        </div>
        {status === "correct" && onNextProblem && (
          <button onClick={onNextProblem} className="flex items-center gap-1 text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors">
            다음 문제 <SvgChevronRight />
          </button>
        )}
      </div>

      {/* 공개 케이스는 통과했지만 히든 케이스 실패 시 안내 */}
      {!firstFail && status !== "correct" && caseResults && caseResults.some(r => r.status !== "passed") && (
        <p className={`text-xs px-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
          공개 케이스는 모두 통과했습니다. 예외 입력이나 경계값을 다시 점검해 보세요.
        </p>
      )}

      {/* 첫 번째 실패한 공개 케이스 상세 */}
      {firstFail && (
        <div className="flex flex-col gap-2">
          {firstFail.status === "wrong" && (
            <>
              {firstFail.input !== undefined && (
                <div>
                  <p className={`text-xs font-bold mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>입력</p>
                  <pre className={`font-mono text-xs p-3 rounded-lg whitespace-pre-wrap break-all max-h-28 overflow-y-auto
                    ${isDark ? "bg-white/5 text-gray-300" : "bg-gray-100 text-gray-700"}`}>
                    {truncateForDisplay(firstFail.input)}
                  </pre>
                </div>
              )}
              <div>
                <p className="text-xs font-bold mb-1 text-emerald-500">기대 출력 (정답)</p>
                <pre className={`font-mono text-xs p-3 rounded-lg whitespace-pre-wrap
                  ${isDark ? "bg-white/5 text-emerald-300" : "bg-emerald-50 text-emerald-700"}`}>
                  {truncateForDisplay(firstFail.expected)}
                </pre>
              </div>
              <div>
                <p className="text-xs font-bold mb-1 text-rose-400">내 출력</p>
                <pre className={`font-mono text-xs p-3 rounded-lg whitespace-pre-wrap
                  ${isDark ? "bg-white/5 text-rose-300" : "bg-rose-50 text-rose-700"}`}>
                  {truncateForDisplay(firstFail.actual)}
                </pre>
              </div>
            </>
          )}
          {firstFail.status === "error" && firstFail.errorMsg && (
            <div>
              <p className={`text-xs font-bold mb-1 ${isDark ? "text-amber-400" : "text-amber-600"}`}>오류 메시지</p>
              <pre className={`font-mono text-xs p-3 rounded-lg whitespace-pre-wrap
                ${isDark ? "bg-amber-900/20 text-amber-300" : "bg-amber-50 text-amber-700"}`}>
                {firstFail.errorMsg}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── 날짜 포맷 (M월 D일 오전/오후 H:MM) ───────────────────────────────────────
function formatSubmitTime(date: Date): string {
  const month  = date.getMonth() + 1
  const day    = date.getDate()
  const hours  = date.getHours()
  const minutes = date.getMinutes()
  const ampm   = hours >= 12 ? "오후" : "오전"
  const h      = hours % 12 || 12
  const m      = String(minutes).padStart(2, "0")
  return `${month}월 ${day}일 ${ampm} ${h}:${m}`
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
    return (
      <div className={`h-full flex flex-col items-center justify-center gap-2 py-10 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
        <SvgCode />
        <p style={{ fontSize: "13px" }}>제출 기록이 없습니다.</p>
        <p style={{ fontSize: "13px", color: isDark ? "#6b7280" : "#9ca3af" }}>코드를 작성하고 제출해보세요</p>
      </div>
    )
  }
  return (
    <div className={`rounded-xl overflow-hidden border ${isDark ? "border-white/10" : "border-gray-200"}`}>
      <table className="w-full text-xs text-left whitespace-nowrap">
        <thead className={`${isDark ? "bg-[#181825] text-gray-500 border-b border-white/10" : "bg-gray-50 text-gray-500 border-b border-gray-200"}`}>
          <tr>
            <th className="px-4 py-3 font-semibold" style={{ width: "60px" }}>번호</th>
            <th className="px-4 py-3 font-semibold" style={{ width: "180px" }}>제출 시간</th>
            <th className="px-4 py-3 font-semibold" style={{ width: "100px" }}>결과</th>
            <th className="px-4 py-3 font-semibold text-center">소스 코드</th>
          </tr>
        </thead>
        <tbody className={`divide-y ${isDark ? "divide-white/5" : "divide-gray-100"}`}>
          {history.map((entry, idx) => (
            <tr key={entry.id} className={`transition-colors ${isDark ? "hover:bg-white/5 text-gray-300" : "hover:bg-gray-50 text-gray-700"}`}>
              <td className="px-4 py-3 font-mono text-gray-400">#{history.length - idx}</td>
              <td className="px-4 py-3 text-gray-400 font-mono">
                {formatSubmitTime(entry.time)}
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
  const { output: runOutput, error: runError, running, pyodideStatus, run, stop: stopRun, reset: resetRun } = useCodeExecution()
  const { caseResults, status: subStatus, submitting, progress: subProgress, submit, submissionOutput } = useSubmission(problem)

  // ── Worker 사전 로드 (제출 시 첫 TLE 지연 방지) ─────────────────────────────
  useEffect(() => { preloadWorker() }, [])

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
  const [activeTab, setActiveTab] = useState<"output" | "example" | "result" | "history">("output")

  // ── 제출 기록 ───────────────────────────────────────────────────────────────
  const [history, setHistory]         = useState<HistoryEntry[]>([])
  const [historyModal, setHistoryModal] = useState<{ open: boolean; code: string; time: Date } | null>(null)

  // ── 제출 상태 (HintPanel용) ─────────────────────────────────────────────────
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>("")

  // ── 유저 상태 ───────────────────────────────────────────────────────────────
  const [userState, setUserState] = useState<ProblemUserState>({ status: "미제출", count: 0 })

  // ── 좌측 패널 토글 ──────────────────────────────────────────────────────────
  const [constraintsOpen, setConstraintsOpen] = useState(false)
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

      const savedFs = parseInt(localStorage.getItem("editorFontSize") ?? "")
      const initFontSize = (!isNaN(savedFs) && savedFs >= 11 && savedFs <= 20) ? savedFs : 13
      if (initFontSize !== fontSize) setFontSize(initFontSize)

      // ── Python 자동완성 provider (전역 1회 등록) ────────────────────────────
      if (!(window as any).__pythonCompletionRegistered) {
        ;(window as any).__pythonCompletionRegistered = true

        const PY_KEYWORDS = [
          'False','None','True','and','as','assert','async','await',
          'break','class','continue','def','del','elif','else','except',
          'finally','for','from','global','if','import','in','is','lambda',
          'nonlocal','not','or','pass','raise','return','try','while','with','yield',
        ]
        const PY_BUILTINS = [
          'abs','all','any','bin','bool','bytearray','bytes','callable','chr',
          'dict','dir','divmod','enumerate','eval','exec','filter','float',
          'format','frozenset','getattr','globals','hasattr','hash','hex',
          'id','input','int','isinstance','issubclass','iter','len','list',
          'locals','map','max','min','next','object','oct','open','ord',
          'pow','print','range','repr','reversed','round','set','setattr',
          'slice','sorted','str','sum','super','tuple','type','vars','zip',
        ]
        const PY_SNIPPETS: { label: string; insert: string; detail: string }[] = [
          { label: 'if',       insert: 'if ${1:condition}:\n\t${2:pass}',                                    detail: 'if 문' },
          { label: 'if/else',  insert: 'if ${1:condition}:\n\t${2:pass}\nelse:\n\t${3:pass}',                detail: 'if/else 문' },
          { label: 'elif',     insert: 'elif ${1:condition}:\n\t${2:pass}',                                  detail: 'elif 절' },
          { label: 'for',      insert: 'for ${1:i} in ${2:range(10)}:\n\t${3:pass}',                        detail: 'for 반복문' },
          { label: 'while',    insert: 'while ${1:condition}:\n\t${2:pass}',                                 detail: 'while 반복문' },
          { label: 'def',      insert: 'def ${1:func_name}(${2:}):\n\t${3:pass}',                           detail: '함수 정의' },
          { label: 'class',    insert: 'class ${1:ClassName}:\n\tdef __init__(self):\n\t\t${2:pass}',        detail: '클래스 정의' },
          { label: 'try',      insert: 'try:\n\t${1:pass}\nexcept ${2:Exception} as ${3:e}:\n\t${4:pass}',  detail: 'try/except' },
          { label: 'with',     insert: 'with ${1:expr} as ${2:f}:\n\t${3:pass}',                            detail: 'with 문' },
          { label: 'print',    insert: 'print(${1})',                                                        detail: '출력' },
          { label: 'input',    insert: 'input(${1:""})',                                                     detail: '입력' },
          { label: 'range',    insert: 'range(${1:n})',                                                      detail: 'range(n)' },
          { label: 'len',      insert: 'len(${1:obj})',                                                      detail: '길이 반환' },
          { label: 'int',      insert: 'int(${1})',                                                          detail: '정수 변환' },
          { label: 'str',      insert: 'str(${1})',                                                          detail: '문자열 변환' },
          { label: 'float',    insert: 'float(${1})',                                                        detail: '실수 변환' },
          { label: 'list',     insert: 'list(${1})',                                                         detail: '리스트 변환' },
          { label: 'enumerate',insert: 'enumerate(${1:iterable})',                                           detail: 'enumerate' },
          { label: 'zip',      insert: 'zip(${1:a}, ${2:b})',                                                detail: 'zip' },
          { label: 'map',      insert: 'map(${1:func}, ${2:iterable})',                                      detail: 'map' },
          { label: 'sorted',   insert: 'sorted(${1:iterable})',                                              detail: '정렬된 리스트 반환' },
          { label: 'split',    insert: 'split(${1:" "})',                                                    detail: '문자열 분할' },
          { label: 'join',     insert: '"${1: }".join(${2:iterable})',                                       detail: '문자열 결합' },
        ]

        monaco.languages.registerCompletionItemProvider("python", {
          triggerCharacters: ["."],
          provideCompletionItems(model: any, position: any) {
            const word = model.getWordUntilPosition(position)
            const range = {
              startLineNumber: position.lineNumber, endLineNumber: position.lineNumber,
              startColumn: word.startColumn,         endColumn: word.endColumn,
            }
            const KW   = monaco.languages.CompletionItemKind.Keyword
            const FN   = monaco.languages.CompletionItemKind.Function
            const SNIP = monaco.languages.CompletionItemKind.Snippet
            const RULE = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet

            return {
              suggestions: [
                ...PY_KEYWORDS.map((k: string) => ({ label: k, kind: KW, insertText: k, range })),
                ...PY_BUILTINS.map((b: string) => ({ label: b, kind: FN,   insertText: b, range })),
                ...PY_SNIPPETS.map(s => ({
                  label: s.label, kind: SNIP, detail: s.detail,
                  insertText: s.insert, insertTextRules: RULE, range,
                })),
              ],
            }
          },
        })
      }

      const editor = monaco.editor.create(editorContainerRef.current, {
        value:                   problem.initial_code ?? "",
        language:                "python",
        theme:                   bgKey === "dark" || bgKey === "black" ? "vs-dark" : "vs",
        automaticLayout:         true,
        fontSize:                initFontSize,
        fontFamily:              "var(--font-fira-code), 'Fira Code', Consolas, monospace",
        fontLigatures:           true,
        minimap:                 { enabled: false },
        scrollBeyondLastLine:    false,
        renderLineHighlight:     "line",
        tabSize:                 4,
        insertSpaces:            true,
        padding:                 { top: 14, bottom: 14 },
        lineNumbers:             "on",
        autoClosingQuotes:       "always",
        quickSuggestions:        { other: true, comments: false, strings: false },
        acceptSuggestionOnEnter: "on",
        tabCompletion:           "on",
        suggestOnTriggerCharacters: true,
        wordBasedSuggestions:    "currentDocument",
        overviewRulerLanes:      0,
      })

      monacoInstanceRef.current = editor

      // 커서 위치 추적
      editor.onDidChangeCursorPosition((e: any) =>
        setCursorPos({ ln: e.position.lineNumber, col: e.position.column })
      )

      // Shift+Enter → 현재 줄 아래에 새 줄 삽입 후 커서 이동
      editor.addCommand(
        monaco.KeyMod.Shift | monaco.KeyCode.Enter,
        () => editor.trigger("keyboard", "editor.action.insertLineAfter", null)
      )

      // ── Tab → 함수명 뒤에서 () 자동 삽입 ────────────────────────────────────────
      const PY_CALLABLES = new Set([
        'abs','all','any','bin','bool','bytearray','bytes','callable','chr',
        'dict','dir','divmod','enumerate','eval','exec','filter','float',
        'format','frozenset','getattr','globals','hasattr','hash','hex',
        'id','input','int','isinstance','issubclass','iter','len','list',
        'locals','map','max','min','next','object','oct','open','ord',
        'pow','print','range','repr','reversed','round','set','setattr',
        'slice','sorted','split','str','sum','super','tuple','type','vars','zip',
      ])
      editor.onKeyDown((e: any) => {
        if (e.keyCode !== monaco.KeyCode.Tab) return
        if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return
        const model = editor.getModel()
        const pos   = editor.getPosition()
        if (!model || !pos) return
        const word = model.getWordUntilPosition(pos)
        if (!word.word || pos.column !== word.endColumn) return
        // 이미 ( 가 바로 뒤에 있으면 무시
        const lineText = model.getLineContent(pos.lineNumber)
        if (lineText[pos.column - 1] === "(") return

        // 정확히 일치하는 함수명: () 삽입, 커서를 괄호 안으로
        if (PY_CALLABLES.has(word.word)) {
          e.preventDefault()
          e.stopPropagation()
          editor.executeEdits("tab-fn", [{
            range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column),
            text: "()",
          }])
          editor.setPosition({ lineNumber: pos.lineNumber, column: pos.column + 1 })
          return
        }
        // 접두사가 단 하나의 함수에만 매칭: 함수명 완성 후 () 삽입
        const matches = [...PY_CALLABLES].filter(fn => fn.startsWith(word.word) && fn !== word.word)
        if (matches.length === 1) {
          e.preventDefault()
          e.stopPropagation()
          const fn = matches[0]
          editor.executeEdits("tab-fn", [{
            range: new monaco.Range(pos.lineNumber, word.startColumn, pos.lineNumber, word.endColumn),
            text: fn + "()",
          }])
          editor.setPosition({ lineNumber: pos.lineNumber, column: word.startColumn + fn.length + 1 })
        }
      })

      // ── else / elif / except / finally 자동 들여쓰기 정렬 ─────────────────────
      editor.onDidChangeModelContent((e: any) => {
        if (e.changes.length !== 1 || e.changes[0].text !== ":") return
        const model = editor.getModel()
        const pos   = editor.getPosition()
        if (!model || !pos) return

        const lineContent = model.getLineContent(pos.lineNumber)
        const trimmed     = lineContent.trim()
        if (!/^(else\s*:|elif\b.*:|except(\s.*)?:|finally\s*:)\s*$/.test(trimmed)) return

        const currentIndentLen = (lineContent.match(/^(\s*)/) as any)[1].length

        // 위로 스캔하며 현재보다 들여쓰기가 짧은 첫 번째 비어있지 않은 줄 찾기
        for (let ln = pos.lineNumber - 1; ln >= 1; ln--) {
          const prev       = model.getLineContent(ln)
          if (!prev.trim()) continue
          const prevIndent = (prev.match(/^(\s*)/) as any)[1]
          if (prevIndent.length < currentIndentLen) {
            editor.executeEdits("align-else", [{
              range: new monaco.Range(pos.lineNumber, 1, pos.lineNumber, currentIndentLen + 1),
              text:  prevIndent,
            }])
            editor.setPosition({ lineNumber: pos.lineNumber, column: prevIndent.length + trimmed.length + 1 })
            return
          }
        }
      })

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
          }
          .numbered-blank {
            background      : #f59e0b !important;
            color           : #1a1a1a !important;
            border-radius   : 4px !important;
            padding         : 1px 5px !important;
            font-weight     : bold !important;
            cursor          : pointer !important;
            text-decoration : none !important;
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

      // ── 번호 빈칸 (①___ 형식) ─────────────────────────────────────────────
      const nbDecoIds: string[] = []

      const updateNumberedBlanks = () => {
        const model = editor.getModel()
        if (!model) return
        const newDecos: any[] = []
        model.getValue().split("\n").forEach((line: string, li: number) => {
          const re = /(?:[①②③④⑤⑥⑦⑧⑨⑩]_{1,}|_{4,})/g
          let match: RegExpExecArray | null
          while ((match = re.exec(line)) !== null) {
            newDecos.push({
              range  : new monaco.Range(li + 1, match.index + 1, li + 1, match.index + 1 + match[0].length),
              options: { inlineClassName: "numbered-blank" },
            })
          }
        })
        const next = editor.deltaDecorations(nbDecoIds.slice(), newDecos)
        nbDecoIds.length = 0
        nbDecoIds.push(...next)
      }

      updateNumberedBlanks()
      editor.onDidChangeModelContent(updateNumberedBlanks)

      // 클릭 → 빈칸 마커 클릭 처리
      editor.onMouseDown((e: any) => {
        const pos = e.target.position
        if (!pos) return
        const model = editor.getModel()
        if (!model) return

        const clickRange = new monaco.Range(
          pos.lineNumber, Math.max(1, pos.column - 1),
          pos.lineNumber, pos.column + 1,
        )

        // ── 번호 빈칸 클릭 (①___ 형식) 또는 순수 밑줄 (____) 클릭 ──
        const lineText = model.getLineContent(pos.lineNumber)
        const nbRe = /(?:[①②③④⑤⑥⑦⑧⑨⑩]_{1,}|_{4,})/g
        let nbMatch: RegExpExecArray | null
        let hitNbRange: any = null
        while ((nbMatch = nbRe.exec(lineText)) !== null) {
          const startCol = nbMatch.index + 1        // 1-indexed
          const endCol   = startCol + nbMatch[0].length
          if (pos.column >= startCol && pos.column <= endCol) {
            hitNbRange = new monaco.Range(pos.lineNumber, startCol, pos.lineNumber, endCol)
            break
          }
        }
        if (hitNbRange) {
          editor.executeEdits("nb-clear", [{ range: hitNbRange, text: "" }])
          editor.setPosition({ lineNumber: pos.lineNumber, column: hitNbRange.startColumn })
          editor.focus()
          return
        }

        // ── @ 마커 클릭: 전체 @ 제거 ─────────────────────────────────────
        const hit = (editor.getDecorationsInRange(clickRange) ?? [])
          .find((d: any) => d.options?.inlineClassName === "blank-marker")
        if (!hit) return

        const clickLine    = hit.range.startLineNumber
        const clickCol     = hit.range.startColumn
        const clickLineText = model.getLineContent(clickLine)
        const atsBefore    = (clickLineText.slice(0, clickCol - 1).match(/@/g) ?? []).length

        const cleaned = model.getValue().replace(/@/g, "")
        editor.executeEdits("blank-clear-all", [{
          range: model.getFullModelRange(),
          text : cleaned,
        }])

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
    setActiveTab("result")
    resetRun()
    const result = await submit(code)
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
            onClick={() => router.back()}
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
        <div className="shrink-0 bg-white border-r border-gray-200 overflow-y-auto" style={{ width: `${panelWidth}%`, paddingTop: "16px", paddingBottom: "16px", paddingLeft: "24px", paddingRight: "24px" }}>
          <div className="flex flex-col gap-4">

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
            <ProblemContent text={problem.content} />

            {/* image_url 필드 이미지 — 줄바꿈=세로, 쉼표=가로 */}
            {problem.image_url && problem.image_url.trim().split(/\r?\n/).filter(Boolean).map((line, i) => (
              <ProblemImageRow key={i} line={line} altPrefix={`그림 ${i + 1}`} />
            ))}

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

            {/* 입출력 예시 (2열) — 입력이 없어도 타이틀은 항상 표시 */}
            {exampleOutput && (
              <div className="grid grid-cols-2 gap-4 max-[768px]:grid-cols-1 items-stretch">
                {/* 입력 예시 */}
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-gray-800">입력 예시</h3>
                    {exampleInput && (
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => handleSendToInput(exampleInput)} className="flex items-center gap-1 text-xs font-semibold text-[#534AB7] hover:text-[#443da0] bg-[#534AB7]/10 px-2.5 py-1 rounded transition-colors">입력창으로</button>
                        <button onClick={() => navigator.clipboard.writeText(exampleInput)} className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-gray-700 bg-gray-100 px-2.5 py-1 rounded transition-colors"><SvgCopy /> 복사</button>
                      </div>
                    )}
                  </div>
                  <div className="bg-[#1a1a2e] rounded-lg font-mono text-sm whitespace-pre p-4 flex-1 min-h-[56px]">
                    {exampleInput
                      ? <span className="text-[#4ADE80]">{exampleInput}</span>
                      : <span className="text-gray-500 text-xs">입력 없음</span>
                    }
                  </div>
                </div>
                {/* 출력 예시 */}
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-gray-800">출력 예시</h3>
                    <button onClick={() => navigator.clipboard.writeText(exampleOutput)} className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-gray-700 bg-gray-100 px-2.5 py-1 rounded transition-colors"><SvgCopy /> 복사</button>
                  </div>
                  <div className="bg-[#1a1a2e] text-[#4ADE80] p-4 rounded-lg font-mono text-sm whitespace-pre flex-1 min-h-[56px]">{exampleOutput}</div>
                </div>
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
            <span style={{ color: running ? "#f59e0b" : submitting ? "#a78bfa" : "#4ade80" }}>
              {running ? "실행 중..." :
               submitting ? (subProgress ? `채점 중... ${subProgress.current}/${subProgress.total}` : "채점 중...") :
               "Ready"}
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
                <button
                  onClick={() => setInputOpen(false)}
                  className="flex items-center justify-center transition-colors"
                  style={{ width: "24px", height: "24px", background: "rgba(0,0,0,0.06)", borderRadius: "4px" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.14)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(0,0,0,0.06)")}
                ><SvgX size={14} /></button>
              </div>
              <textarea
                value={testInput} onChange={e => setTestInput(e.target.value)} rows={3}
                placeholder="입력값을 입력하세요..."
                className="w-full text-sm font-mono bg-white border border-[#86efac] rounded-lg px-3 py-2 resize-none outline-none focus:border-[#22c55e] text-gray-700"
                style={{ maxHeight: "120px", overflowY: "auto" }}
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
              {running ? (
                <button onClick={stopRun}
                  className="flex items-center gap-1.5 px-5 py-2 bg-[#dc2626] text-white text-sm font-bold rounded-lg hover:bg-[#b91c1c] transition-colors animate-pulse"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="3" width="10" height="10" rx="1"/></svg>
                  정지
                </button>
              ) : (
                <button onClick={handleRun} disabled={submitting}
                  className="flex items-center gap-1.5 px-5 py-2 bg-[#639922] text-white text-sm font-bold rounded-lg hover:bg-[#52821a] transition-colors disabled:opacity-50"
                ><SvgPlay /> 실행</button>
              )}
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
                running ? (
                  <p className="text-sm font-mono" style={{ color: isDark ? "#d1d5db" : "#374151" }}>실행 중...</p>
                ) : runError ? (
                  <ErrorOutput error={runError} isDark={isDark} />
                ) : runOutput ? (
                  <pre className="text-sm font-mono whitespace-pre-wrap" style={{ color: isDark ? "#d1d5db" : "#374151" }}>{runOutput}</pre>
                ) : submissionOutput ? (
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: isDark ? "#6b7280" : "#9ca3af" }}>제출 케이스 1 출력:</p>
                    <pre className="text-sm font-mono whitespace-pre-wrap" style={{ color: isDark ? "#d1d5db" : "#374151" }}>{submissionOutput}</pre>
                  </div>
                ) : (
                  <p className="text-sm font-mono" style={{ color: isDark ? "#6b7280" : "#9ca3af" }}>코드를 실행하면 결과가 여기에 표시됩니다.</p>
                )
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
                <ResultTab status={subStatus} caseResults={caseResults} isDark={isDark}
                  submitting={submitting} progress={subProgress}
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
