"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  ArrowLeft, LogOut, Search, Plus, Trash2, Save,
  Loader2, BookOpen, Wand2, Eye, EyeOff, ChevronDown, ChevronUp,
  Copy, ExternalLink, ListChecks, CheckCircle2, ChevronUp as Up,
  History, RotateCcw, GripVertical,
} from "lucide-react"

// ── 상수 ──────────────────────────────────────────────────────────────────────
type CourseKey = "basic" | "algorithm" | "certificate" | "practical" | "challenge" | "competition"

const COURSE_TABS: { key: CourseKey; label: string }[] = [
  { key: "basic",       label: "기초" },
  { key: "algorithm",   label: "알고리즘" },
  { key: "certificate", label: "자격증" },
  { key: "practical",   label: "실전" },
  { key: "challenge",   label: "도전" },
  { key: "competition", label: "대회" },
]

const COURSE_CATEGORY: Record<CourseKey, string> = {
  basic:       "파이썬기초",
  algorithm:   "파이썬알고리즘",
  certificate: "파이썬자격증",
  practical:   "파이썬실전",
  challenge:   "파이썬도전",
  competition: "파이썬대회",
}

const COURSE_ID_PREFIX: Record<string, string> = {
  "파이썬기초":     "basic",
  "파이썬알고리즘": "algo",
  "파이썬자격증":   "cert",
  "파이썬실전":     "P",
  "파이썬도전":     "C",
  "파이썬대회":     "O",
}

const DIFF_COLOR: Record<string, string> = {
  하: "bg-emerald-50 text-emerald-700 border-emerald-200",
  중: "bg-amber-50 text-amber-700 border-amber-200",
  상: "bg-red-50 text-red-600 border-red-200",
}

// ── 타입 ──────────────────────────────────────────────────────────────────────
type ProblemFull = {
  id: string; title: string; category: string | null; difficulty: string
  topic: string | null; status: string; display_order: number | null
  content: string; input_description: string | null; output_description: string | null
  constraints: string | null; initial_code: string
  hint: string | null; example_input: string | null; example_output: string | null
  image_url: string | null; time_limit_ms: number | null; is_community: boolean
  comprehension_enabled: boolean | null
  gen_code: string | null; sol_code: string | null
  test_case_count?: number
}

type DraftSnapshot = {
  createdAt: string
  inputType: string
  content: string
  input_description: string | null
  output_description: string | null
  constraints: string | null
  example_input: string | null
  example_output: string | null
  initial_code: string
  hint: string | null
}

const EMPTY_FORM = (): Partial<ProblemFull> & { id: string; title: string; difficulty: string } => ({
  id: "", title: "", category: "파이썬기초", difficulty: "하", topic: "",
  content: "", input_description: "", output_description: "",
  constraints: "", initial_code: "", hint: "",
  example_input: "", example_output: "", image_url: "",
})

// ── 스타일 ────────────────────────────────────────────────────────────────────
const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-gray-400"
const textareaCls = `${inputCls} font-mono text-xs resize-none`
const labelCls = "block text-xs font-bold text-gray-700 mb-1"

// ── 코스별 기본 주제 목록 ─────────────────────────────────────────────────────
const DEFAULT_TOPICS: Record<string, string[]> = {
  "파이썬기초":     ["변수/자료형", "조건문", "반복문", "함수", "리스트", "딕셔너리", "문자열", "입출력", "클래스", "모듈"],
  "파이썬알고리즘": ["정렬", "탐색", "재귀", "동적프로그래밍", "그래프", "스택/큐", "해시", "이진탐색", "투포인터", "그리디"],
  "파이썬자격증":   ["기초문법", "자료구조", "파일입출력", "예외처리", "OOP", "내장함수"],
  "파이썬실전":     ["데이터처리", "파일처리", "API활용", "정규표현식", "웹크롤링", "자동화"],
  "파이썬도전":     ["수학", "구현", "시뮬레이션", "조합/순열", "비트마스킹"],
  "파이썬대회":     ["브루트포스", "BFS/DFS", "최단경로", "트리", "세그먼트트리", "수학"],
}

// ── 유틸 ─────────────────────────────────────────────────────────────────────
function nextIdForCategory(cat: string, allProblems: ProblemFull[]): string {
  const prefix = COURSE_ID_PREFIX[cat] ?? "prob"
  const catProblems = allProblems.filter(p => p.category === cat)
  let maxNum = 0
  for (const p of catProblems) {
    const match = p.id.match(/(\d+)$/)
    if (match) {
      const n = parseInt(match[1], 10)
      if (n > maxNum) maxNum = n
    }
  }
  return `${prefix}_${(maxNum + 1).toString().padStart(3, "0")}`
}

// ── 섹션 컴포넌트 ─────────────────────────────────────────────────────────────
function Section({ title, children, defaultOpen = true, badge }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean; badge?: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-700">{title}</span>
          {badge}
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
      </button>
      {open && <div className="p-4 flex flex-col gap-3 border-t border-gray-100">{children}</div>}
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function ProblemsPage() {
  const router = useRouter()

  // ── 문제 목록 ─────────────────────────────────────────────────────────────
  const [problems,   setProblems]   = useState<ProblemFull[]>([])
  const [pLoading,   setPLoading]   = useState(true)
  const [pError,     setPError]     = useState("")
  const [pCourse,    setPCourse]    = useState<CourseKey>("basic")
  const [pTopic,     setPTopic]     = useState("전체")
  const [pSearch,    setPSearch]    = useState("")
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  // ── 편집 폼 ───────────────────────────────────────────────────────────────
  const [isNew,       setIsNew]       = useState(false)
  const [selected,    setSelected]    = useState<ProblemFull | null>(null)
  const [form,        setForm]        = useState(EMPTY_FORM())
  const [saving,      setSaving]      = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [formErr,     setFormErr]     = useState("")
  const [saveOk,      setSaveOk]      = useState(false)
  const [showTcPrompt, setShowTcPrompt] = useState(false)

  // ── AI 초안 ───────────────────────────────────────────────────────────────
  const [aiDesc,      setAiDesc]      = useState("")
  const [aiInputType, setAiInputType] = useState<"none" | "simple" | "complex">("simple")
  const [aiLoading,   setAiLoading]   = useState(false)
  const [aiErr,       setAiErr]       = useState("")
  const [draftHistory, setDraftHistory] = useState<DraftSnapshot[]>([])
  const [historyOpen,  setHistoryOpen]  = useState(false)

  // ── 미리보기 ──────────────────────────────────────────────────────────────
  const [preview, setPreview] = useState(false)

  // ── 문제 로드 ─────────────────────────────────────────────────────────────
  useEffect(() => {
    setPLoading(true); setPError("")
    fetch("/api/admin/problems?full=true")
      .then(r => r.json())
      .then(d => {
        if (d?.error) { setPError(d.error); setPLoading(false); return }
        setProblems(Array.isArray(d) ? d : [])
        setPLoading(false)
      })
  }, [])

  const courseProblems = useMemo(() => {
    const cat = COURSE_CATEGORY[pCourse]
    return problems.filter(p => p.category === cat)
  }, [problems, pCourse])

  const topicList = useMemo(() => {
    const topics = [...new Set(courseProblems.map(p => p.topic).filter(Boolean) as string[])]
    return ["전체", ...topics]
  }, [courseProblems])

  const filteredProblems = useMemo(() => {
    return courseProblems
      .filter(p => pTopic === "전체" || p.topic === pTopic)
      .filter(p => !pSearch.trim() || p.title.toLowerCase().includes(pSearch.toLowerCase()))
      .sort((a, b) => {
        if (a.display_order == null && b.display_order == null) return 0
        if (a.display_order == null) return 1
        if (b.display_order == null) return -1
        return a.display_order - b.display_order
      })
  }, [courseProblems, pTopic, pSearch])

  // ── 폼의 코스에 속한 기존 topic 목록 (DB + 기본값 병합) ──────────────────
  const formTopics = useMemo(() => {
    const cat = form.category ?? ""
    const fromDb = problems.filter(p => p.category === cat).map(p => p.topic).filter(Boolean) as string[]
    const defaults = DEFAULT_TOPICS[cat] ?? []
    return [...new Set([...fromDb, ...defaults])]
  }, [problems, form.category])

  // ── 코스 변경 또는 문제 로드 완료 시 ID 자동 갱신 (새 문제 모드) ──────────
  useEffect(() => {
    if (!isNew) return
    setForm(prev => ({ ...prev, id: nextIdForCategory(prev.category ?? "파이썬기초", problems) }))
  }, [form.category, isNew, problems]) // problems 포함: 로딩 완료 후 재계산

  // ── ID 중복 체크 ──────────────────────────────────────────────────────────
  const idConflict = useMemo(() => {
    if (!isNew || !form.id?.trim()) return false
    return problems.some(p => p.id === form.id?.trim())
  }, [isNew, form.id, problems])

  // ── 폼 필드 업데이트 ──────────────────────────────────────────────────────
  function setField(key: keyof typeof form, val: string) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  // ── 문제 선택 ─────────────────────────────────────────────────────────────
  function selectProblem(p: ProblemFull) {
    setSelected(p); setIsNew(false)
    setForm({
      id: p.id, title: p.title,
      category: p.category ?? "파이썬기초",
      difficulty: p.difficulty, topic: p.topic ?? "",
      content: p.content ?? "",
      input_description: p.input_description ?? "",
      output_description: p.output_description ?? "",
      constraints: p.constraints ?? "",
      initial_code: p.initial_code ?? "",
      hint: p.hint ?? "",
      example_input: p.example_input ?? "",
      example_output: p.example_output ?? "",
      image_url: p.image_url ?? "",
    })
    setFormErr(""); setAiErr(""); setPreview(false)
    setDraftHistory([]); setHistoryOpen(false); setShowTcPrompt(false)
  }

  // ── 새 문제 ───────────────────────────────────────────────────────────────
  function openNew() {
    const cat = COURSE_CATEGORY[pCourse]
    setSelected(null); setIsNew(true)
    setForm({ ...EMPTY_FORM(), category: cat, id: nextIdForCategory(cat, problems) })
    setFormErr(""); setAiErr(""); setPreview(false)
    setDraftHistory([]); setHistoryOpen(false); setShowTcPrompt(false)
  }

  // ── 문제 복사 ─────────────────────────────────────────────────────────────
  function copyProblem() {
    if (!selected) return
    const cat = selected.category ?? "파이썬기초"
    setSelected(null); setIsNew(true)
    setForm({
      id: nextIdForCategory(cat, problems),
      title: selected.title + " (복사)",
      category: cat, difficulty: selected.difficulty,
      topic: selected.topic ?? "",
      content: selected.content ?? "",
      input_description: selected.input_description ?? "",
      output_description: selected.output_description ?? "",
      constraints: selected.constraints ?? "",
      initial_code: selected.initial_code ?? "",
      hint: selected.hint ?? "",
      example_input: selected.example_input ?? "",
      example_output: selected.example_output ?? "",
    })
    setFormErr(""); setAiErr(""); setPreview(false)
    setDraftHistory([]); setHistoryOpen(false); setShowTcPrompt(false)
  }

  // ── AI 초안 생성 ─────────────────────────────────────────────────────────
  async function generateDraft() {
    if (!form.title?.trim()) { setAiErr("제목을 먼저 입력하세요."); return }
    setAiLoading(true); setAiErr("")
    try {
      const res = await fetch("/api/admin/problems/ai-draft", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title, difficulty: form.difficulty,
          category: form.category, topic: form.topic,
          description: aiDesc, inputType: aiInputType,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "AI 생성 실패")

      // 이전 내용을 이력에 저장 (현재 content가 있을 때만)
      if (form.content?.trim()) {
        setDraftHistory(prev => [{
          createdAt: new Date().toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul" }),
          inputType: aiInputType,
          content:            form.content ?? "",
          input_description:  form.input_description ?? null,
          output_description: form.output_description ?? null,
          constraints:        form.constraints ?? null,
          example_input:      form.example_input ?? null,
          example_output:     form.example_output ?? null,
          initial_code:       form.initial_code ?? "",
          hint:               form.hint ?? null,
        }, ...prev])
      }

      setForm(prev => ({
        ...prev,
        content:            data.content            ?? prev.content,
        input_description:  data.input_description  ?? prev.input_description,
        output_description: data.output_description ?? prev.output_description,
        constraints:        data.constraints        ?? prev.constraints,
        example_input:      data.example_input      ?? prev.example_input,
        example_output:     data.example_output     ?? prev.example_output,
        initial_code:       data.initial_code       ?? prev.initial_code,
        hint:               data.hint               ?? prev.hint,
      }))
    } catch (e: any) {
      setAiErr(e.message ?? "AI 생성 실패")
    }
    setAiLoading(false)
  }

  // ── 이전 초안 복원 ────────────────────────────────────────────────────────
  function restoreDraft(d: DraftSnapshot) {
    setForm(prev => ({
      ...prev,
      content:            d.content,
      input_description:  d.input_description ?? "",
      output_description: d.output_description ?? "",
      constraints:        d.constraints ?? "",
      example_input:      d.example_input ?? "",
      example_output:     d.example_output ?? "",
      initial_code:       d.initial_code,
      hint:               d.hint ?? "",
    }))
    setHistoryOpen(false)
  }

  // ── 문제 순서 변경 (드래그 앤 드롭) ─────────────────────────────────────
  async function handleDrop(dragId: string, targetId: string) {
    if (!dragId || dragId === targetId) return
    const ordered = [...filteredProblems]
    const fromIdx = ordered.findIndex(p => p.id === dragId)
    const toIdx   = ordered.findIndex(p => p.id === targetId)
    if (fromIdx < 0 || toIdx < 0) return

    const orders = ordered.map((p, i) => p.display_order ?? i + 1)
    const [moved] = ordered.splice(fromIdx, 1)
    ordered.splice(toIdx, 0, moved)

    const orderMap = new Map(ordered.map((p, i) => [p.id, orders[i]]))
    setProblems(prev => prev.map(p =>
      orderMap.has(p.id) ? { ...p, display_order: orderMap.get(p.id)! } : p
    ))

    const updates = ordered
      .map((p, i) => ({ id: p.id, newOrder: orders[i], oldOrder: p.display_order }))
      .filter(u => u.oldOrder !== u.newOrder)

    await Promise.all(updates.map(u =>
      fetch(`/api/admin/problems/${u.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_order: u.newOrder }),
      })
    ))
  }

  // ── 저장 ─────────────────────────────────────────────────────────────────
  async function save() {
    if (!form.id?.trim())    { setFormErr("ID는 필수입니다."); return }
    if (idConflict)           { setFormErr("이미 존재하는 ID입니다."); return }
    if (!form.title?.trim()) { setFormErr("제목은 필수입니다."); return }
    if (!form.category)      { setFormErr("코스를 선택하세요."); return }
    setSaving(true); setFormErr("")

    const body = {
      id:                form.id?.trim(),
      title:             form.title?.trim(),
      category:          form.category,
      difficulty:        form.difficulty,
      topic:             form.topic?.trim() || null,
      content:           form.content?.trim() || "",
      input_description: form.input_description?.trim() || null,
      output_description: form.output_description?.trim() || null,
      constraints:       form.constraints?.trim() || null,
      initial_code:      form.initial_code?.trim() || "",
      hint:              form.hint?.trim() || null,
      example_input:     form.example_input?.trim() || null,
      example_output:    form.example_output?.trim() || null,
      image_url:         form.image_url?.trim() || null,
      comprehension_enabled: form.difficulty === "중" ? (form.comprehension_enabled ?? false) : null,
    }

    if (isNew) {
      const res = await fetch("/api/admin/problems", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setFormErr(data.error ?? "저장 실패"); setSaving(false); return }
      const newProblem: ProblemFull = {
        ...body, status: "published", time_limit_ms: null,
        display_order: data.display_order ?? null,
        is_community: false, gen_code: null, sol_code: null,
        test_case_count: 0,
      }
      setProblems(prev => [...prev, newProblem])
      setSelected(newProblem); setIsNew(false)
      setShowTcPrompt(true)
    } else if (selected) {
      const { id: _id, ...patch } = body
      const res = await fetch(`/api/admin/problems/${selected.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      const data = await res.json()
      if (!res.ok) { setFormErr(data.error ?? "저장 실패"); setSaving(false); return }
      const updated = { ...selected, ...patch }
      setProblems(prev => prev.map(p => p.id === selected.id ? updated : p))
      setSelected(updated)
    }

    setSaving(false)
    setSaveOk(true)
    setTimeout(() => setSaveOk(false), 3000)
  }

  // ── 삭제 ─────────────────────────────────────────────────────────────────
  async function deleteProblem() {
    if (!selected) return
    if (!confirm(`"${selected.title}" 문제를 삭제하시겠습니까?\n테스트케이스도 모두 삭제됩니다.`)) return
    setDeleting(true)
    await fetch(`/api/admin/problems/${selected.id}`, { method: "DELETE" })
    setProblems(prev => prev.filter(p => p.id !== selected.id))
    setSelected(null); setIsNew(false); setDeleting(false)
  }

  const showForm = isNew || !!selected

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── 저장 완료 토스트 ── */}
      {saveOk && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2 className="w-4 h-4" /> 저장되었습니다
        </div>
      )}

      {/* ── 네비게이션 ── */}
      <div className="bg-white border-b border-gray-200 px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/admin")}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors mr-1">
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </button>
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-gray-900 leading-none">문제 관리</p>
            <p className="text-[11px] text-gray-400 mt-0.5">문제 추가 · 수정 · AI 초안 생성</p>
          </div>
        </div>
        <button onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors font-medium">
          <LogOut className="w-4 h-4" /> 로그아웃
        </button>
      </div>

      <div className="max-w-[1400px] mx-auto px-8 py-6 flex gap-6" style={{ minHeight: "calc(100vh - 61px)" }}>

        {/* ── 좌측: 문제 목록 ── */}
        <div className="w-[360px] shrink-0 flex flex-col gap-3" style={{ height: "calc(100vh - 97px)", position: "sticky", top: "61px" }}>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex border-b border-gray-100">
              {COURSE_TABS.map(({ key, label }) => (
                <button key={key} onClick={() => { setPCourse(key); setPTopic("전체") }}
                  className={`flex-1 py-2 text-[11px] font-semibold transition-all border-b-2
                    ${pCourse === key
                      ? "border-indigo-600 text-indigo-700 bg-indigo-50/60"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}>
                  {label}
                </button>
              ))}
            </div>

            {topicList.length > 1 && (
              <div className="flex gap-1.5 px-2.5 py-2 flex-wrap border-b border-gray-100">
                {topicList.map(t => (
                  <button key={t} onClick={() => setPTopic(t)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all border
                      ${pTopic === t
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-gray-50 text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-600"}`}>
                    {t}
                    {t !== "전체" && (
                      <span className="ml-1 opacity-60">
                        {courseProblems.filter(p => p.topic === t).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="p-2 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input value={pSearch} onChange={e => setPSearch(e.target.value)}
                  placeholder="문제 검색…"
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 bg-white" />
              </div>
              <button onClick={openNew} disabled={pLoading}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
                <Plus className="w-3.5 h-3.5" /> 새 문제
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto bg-white border border-gray-200 rounded-xl">
            {!pLoading && filteredProblems.length > 0 && (
              <div className="px-3 py-1.5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <span className="text-[10px] text-gray-400 font-medium">{filteredProblems.length}개 문제</span>
                <span className="text-[10px] text-gray-300">드래그로 순서 변경</span>
              </div>
            )}
            {pLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
              </div>
            ) : pError ? (
              <div className="px-3 py-4">
                <p className="text-[11px] text-red-500 font-semibold mb-1">API 오류</p>
                <p className="text-[10px] text-red-400 break-all">{pError}</p>
              </div>
            ) : filteredProblems.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-12">문제 없음</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredProblems.map(p => (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={e => {
                      e.dataTransfer.effectAllowed = "move"
                      e.dataTransfer.setData("text/plain", p.id)
                      setDraggingId(p.id)
                    }}
                    onDragOver={e => {
                      e.preventDefault()
                      e.dataTransfer.dropEffect = "move"
                      if (dragOverId !== p.id) setDragOverId(p.id)
                    }}
                    onDragLeave={e => {
                      if ((e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) return
                      setDragOverId(null)
                    }}
                    onDrop={e => {
                      e.preventDefault()
                      const dragId = e.dataTransfer.getData("text/plain")
                      handleDrop(dragId, p.id)
                      setDragOverId(null)
                      setDraggingId(null)
                    }}
                    onDragEnd={() => { setDraggingId(null); setDragOverId(null) }}
                    className={`group flex items-center gap-1 pr-1 transition-colors
                      ${draggingId === p.id ? "opacity-40" : ""}
                      ${dragOverId === p.id && draggingId !== p.id
                        ? "bg-indigo-50 border-t-2 border-t-indigo-400"
                        : selected?.id === p.id && !isNew ? "bg-indigo-50" : "hover:bg-gray-50"}`}>
                    {/* 드래그 핸들 */}
                    <div className="pl-1.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                      <GripVertical className="w-3.5 h-3.5 text-gray-300" />
                    </div>

                    <button onClick={() => selectProblem(p)} className="flex-1 text-left px-2 py-2.5">
                      <div className="flex items-start gap-2">
                        <span className={`mt-0.5 shrink-0 inline-flex font-semibold rounded-full border px-1.5 py-0.5 text-[10px]
                          ${DIFF_COLOR[p.difficulty] ?? "bg-gray-50 text-gray-500 border-gray-200"}`}>
                          {p.difficulty}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-semibold truncate ${selected?.id === p.id && !isNew ? "text-indigo-700" : "text-gray-800"}`}>
                            {p.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-gray-400">{p.topic ?? "—"}</span>
                            {p.test_case_count !== undefined && (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full
                                ${p.test_case_count === 0
                                  ? "bg-red-50 text-red-500 border border-red-200"
                                  : "bg-gray-100 text-gray-500"}`}>
                                케이스 {p.test_case_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── 우측: 편집 폼 ── */}
        <div className="flex-1 min-w-0 overflow-y-auto" style={{ height: "calc(100vh - 97px)" }}>
          {!showForm ? (
            <div className="flex flex-col items-center justify-center bg-white border border-gray-200 rounded-2xl h-full gap-3">
              <BookOpen className="w-10 h-10 text-gray-200" />
              <p className="text-sm text-gray-400">왼쪽에서 문제를 선택하거나 새 문제를 추가하세요</p>
              <button onClick={openNew} disabled={pLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <Plus className="w-4 h-4" /> 새 문제 추가
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">

              {/* ── 헤더 ── */}
              <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-extrabold text-gray-900">
                    {isNew ? "새 문제 추가" : `수정: ${selected?.title}`}
                  </p>
                  {!isNew && selected && (
                    <p className="text-[11px] text-gray-400 mt-0.5">ID: {selected.id}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {!isNew && selected && (
                    <>
                      <button onClick={() => window.open(`/problems/${selected.id}`, "_blank")}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-gray-500 hover:bg-gray-100 border border-gray-200 text-xs font-semibold rounded-lg transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" /> 학생 화면
                      </button>
                      <button onClick={() => router.push(`/admin/testcases?problemId=${selected.id}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-gray-500 hover:bg-gray-100 border border-gray-200 text-xs font-semibold rounded-lg transition-colors">
                        <ListChecks className="w-3.5 h-3.5" /> 테스트케이스
                      </button>
                      <button onClick={copyProblem}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-gray-500 hover:bg-gray-100 border border-gray-200 text-xs font-semibold rounded-lg transition-colors">
                        <Copy className="w-3.5 h-3.5" /> 복사
                      </button>
                      <button onClick={deleteProblem} disabled={deleting}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-red-500 hover:bg-red-50 border border-red-200 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
                        {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        삭제
                      </button>
                    </>
                  )}
                  <button onClick={save} disabled={saving || idConflict}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    저장
                  </button>
                </div>
              </div>

              {formErr && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{formErr}</div>
              )}

              {/* ── 저장 후 테스트케이스 안내 ── */}
              {showTcPrompt && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-emerald-800">문제가 생성되었습니다!</p>
                    <p className="text-xs text-emerald-600 mt-0.5">테스트케이스를 추가해야 학생이 채점받을 수 있습니다.</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => setShowTcPrompt(false)}
                      className="px-3 py-1.5 text-xs text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors font-semibold">
                      나중에
                    </button>
                    <button onClick={() => router.push(`/admin/testcases?problemId=${selected?.id ?? ""}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors">
                      <ListChecks className="w-3.5 h-3.5" /> 테스트케이스 추가
                    </button>
                  </div>
                </div>
              )}

              {/* ── AI 초안 생성 ── */}
              <Section title="✨ AI 초안 생성" defaultOpen={isNew}
                badge={draftHistory.length > 0 && (
                  <span className="text-[10px] bg-violet-100 text-violet-600 font-bold px-2 py-0.5 rounded-full">
                    이력 {draftHistory.length}개
                  </span>
                )}>
                <p className="text-[11px] text-gray-500">
                  제목·난이도·코스를 먼저 설정하면 AI가 문제 내용, 입출력 설명, 예제, 초기 코드, 힌트를 자동 생성합니다.
                </p>

                {/* 입력 유형 선택 */}
                <div>
                  <label className={labelCls}>입력 유형</label>
                  <div className="flex gap-2">
                    {(["none", "simple", "complex"] as const).map(t => (
                      <button key={t} onClick={() => setAiInputType(t)}
                        className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all
                          ${aiInputType === t
                            ? "bg-violet-600 text-white border-violet-600"
                            : "bg-white text-gray-600 border-gray-200 hover:border-violet-300"}`}>
                        {t === "none" ? "입력 없음" : t === "simple" ? "단순 입출력" : "복합 입력"}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {aiInputType === "none" && "고정 출력 문제 (구구단, 패턴 출력 등)"}
                    {aiInputType === "simple" && "숫자 1~2개, 짧은 문자열 입력"}
                    {aiInputType === "complex" && "배열, 여러 줄, 반복 구조 입력"}
                  </p>
                </div>

                <div>
                  <label className={labelCls}>추가 설명 (선택)</label>
                  <input value={aiDesc} onChange={e => setAiDesc(e.target.value)}
                    placeholder="예: 전화번호에서 마지막 4자리를 추출하는 문제"
                    className={inputCls} />
                </div>

                {aiErr && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{aiErr}</p>}

                <div className="flex items-center gap-2">
                  <button onClick={generateDraft} disabled={aiLoading}
                    className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
                    {aiLoading
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 생성 중…</>
                      : <><Wand2 className="w-3.5 h-3.5" /> AI 초안 생성</>}
                  </button>
                  {draftHistory.length > 0 && (
                    <button onClick={() => setHistoryOpen(v => !v)}
                      className="flex items-center gap-1.5 px-3 py-2 text-violet-600 hover:bg-violet-50 border border-violet-200 text-xs font-semibold rounded-lg transition-colors">
                      <History className="w-3.5 h-3.5" />
                      이전 초안 {historyOpen ? "닫기" : "보기"}
                    </button>
                  )}
                </div>

                {/* 초안 이력 */}
                {historyOpen && draftHistory.length > 0 && (
                  <div className="flex flex-col gap-2 border border-violet-100 rounded-xl p-3 bg-violet-50/40">
                    <p className="text-[11px] font-bold text-violet-700">이전 초안 — 클릭하면 폼에 복원됩니다</p>
                    {draftHistory.map((d, i) => (
                      <div key={i} className="bg-white border border-violet-100 rounded-lg p-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-violet-500">
                              {d.inputType === "none" ? "입력없음" : d.inputType === "simple" ? "단순" : "복합"}
                            </span>
                            <span className="text-[10px] text-gray-400">{d.createdAt}</span>
                          </div>
                          <p className="text-xs text-gray-700 line-clamp-2">{d.content}</p>
                        </div>
                        <button onClick={() => restoreDraft(d)}
                          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-violet-100 hover:bg-violet-200 text-violet-700 text-[10px] font-bold rounded-lg transition-colors">
                          <RotateCcw className="w-3 h-3" /> 복원
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              {/* ── 기본 정보 ── */}
              <Section title="기본 정보">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>문제 ID <span className="text-red-400">*</span></label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <input
                          value={form.id}
                          onChange={e => setField("id", e.target.value)}
                          disabled={!isNew}
                          placeholder="예: basic-001"
                          className={`${inputCls} ${!isNew ? "opacity-50 cursor-not-allowed" : ""} ${idConflict ? "border-red-400 ring-2 ring-red-100" : ""}`}
                        />
                        {idConflict && <p className="text-[10px] text-red-500 mt-0.5">이미 존재하는 ID입니다</p>}
                      </div>
                      {isNew && (
                        <button onClick={() => setField("id", nextIdForCategory(form.category ?? "파이썬기초", problems))}
                          className="shrink-0 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-600 rounded-lg transition-colors whitespace-nowrap">
                          재생성
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>제목 <span className="text-red-400">*</span></label>
                    <input value={form.title} onChange={e => setField("title", e.target.value)}
                      placeholder="두 정수의 합 출력하기" className={inputCls} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>코스 <span className="text-red-400">*</span></label>
                    <select value={form.category ?? ""} onChange={e => setField("category", e.target.value)} className={inputCls}>
                      {COURSE_TABS.map(({ key, label }) => (
                        <option key={key} value={COURSE_CATEGORY[key]}>{label} ({COURSE_CATEGORY[key]})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>난이도 <span className="text-red-400">*</span></label>
                    <select value={form.difficulty ?? "하"} onChange={e => setField("difficulty", e.target.value)} className={inputCls}>
                      <option value="하">하 (쉬움)</option>
                      <option value="중">중 (보통)</option>
                      <option value="상">상 (어려움)</option>
                    </select>
                  </div>
                  {form.difficulty === "중" && (
                    <div>
                      <label className={labelCls}>이해 확인 활성화</label>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => setField("comprehension_enabled", !form.comprehension_enabled)}
                          className={`relative w-10 h-5 rounded-full transition-colors ${form.comprehension_enabled ? "bg-indigo-500" : "bg-gray-300"}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.comprehension_enabled ? "translate-x-5" : ""}`} />
                        </button>
                        <span className="text-xs text-gray-500">{form.comprehension_enabled ? "정답 후 이해 확인 질문 표시" : "이해 확인 비활성화"}</span>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className={labelCls}>주제 (topic)</label>
                    <input
                      list="topic-datalist"
                      value={form.topic ?? ""}
                      onChange={e => setField("topic", e.target.value)}
                      placeholder="선택 또는 직접 입력"
                      className={inputCls}
                    />
                    <datalist id="topic-datalist">
                      {formTopics.map(t => <option key={t} value={t} />)}
                    </datalist>
                  </div>
                </div>
              </Section>

              {/* ── 문제 내용 ── */}
              <Section title="문제 내용">
                <div>
                  <label className={labelCls}>이미지 URL (선택 · 여러 장은 줄바꿈으로 구분)</label>
                  <textarea
                    value={form.image_url ?? ""}
                    onChange={e => setField("image_url", e.target.value)}
                    placeholder={"https://example.com/image1.png\nhttps://example.com/image2.png"}
                    rows={2}
                    className={textareaCls}
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    형식: URL｜너비｜정렬 &nbsp;예) <code className="bg-gray-100 px-1 rounded">https://.../img.png|400|center</code> &nbsp;정렬: left · center · right
                  </p>
                  {form.image_url?.trim() && (
                    <div className="flex flex-col gap-2 mt-2">
                      {form.image_url.trim().split(/\r?\n/).filter(Boolean).map((raw, i) => {
                        const parts = raw.trim().split("|")
                        const url = parts[0].trim()
                        let width: number | undefined
                        let align: "left"|"center"|"right" = "left"
                        for (let j = 1; j < parts.length; j++) {
                          const p = parts[j].trim()
                          if (["left","center","right"].includes(p)) align = p as any
                          else { const n = Number(p); if (n > 0) width = n }
                        }
                        const alignCls = align === "center" ? "mx-auto" : align === "right" ? "ml-auto" : "mr-auto"
                        return (
                          <div key={i} className="flex">
                            <img src={url} alt={`미리보기 ${i + 1}`}
                              className={`rounded-lg border border-gray-200 object-contain ${alignCls}`}
                              style={{ maxWidth: width ? `${width}px` : "100%", maxHeight: "160px" }} />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <label className={labelCls}>문제 설명 (content)</label>
                  <button onClick={() => setPreview(v => !v)}
                    className="flex items-center gap-1 text-[11px] text-indigo-500 hover:text-indigo-700 font-semibold">
                    {preview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {preview ? "편집" : "미리보기"}
                  </button>
                </div>
                {preview ? (
                  <div className="min-h-[120px] p-3 bg-gray-50 rounded-lg text-sm text-gray-800 whitespace-pre-wrap border border-gray-200">
                    {form.content || <span className="text-gray-400">내용 없음</span>}
                  </div>
                ) : (
                  <textarea value={form.content ?? ""} onChange={e => setField("content", e.target.value)}
                    placeholder="문제 설명을 입력하세요…" rows={6} className={textareaCls} />
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>입력 형식</label>
                    <textarea value={form.input_description ?? ""} onChange={e => setField("input_description", e.target.value)}
                      placeholder="입력 형식 설명" rows={3} className={textareaCls} />
                  </div>
                  <div>
                    <label className={labelCls}>출력 형식</label>
                    <textarea value={form.output_description ?? ""} onChange={e => setField("output_description", e.target.value)}
                      placeholder="출력 형식 설명" rows={3} className={textareaCls} />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>제한 조건</label>
                  <textarea value={form.constraints ?? ""} onChange={e => setField("constraints", e.target.value)}
                    placeholder="예: 1 ≤ N ≤ 1,000,000" rows={2} className={textareaCls} />
                </div>
              </Section>

              {/* ── 예제 ── */}
              <Section title="예제 입출력">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>예제 입력</label>
                    <textarea value={form.example_input ?? ""} onChange={e => setField("example_input", e.target.value)}
                      placeholder="예제 입력값" rows={4} className={textareaCls} />
                  </div>
                  <div>
                    <label className={labelCls}>예제 출력</label>
                    <textarea value={form.example_output ?? ""} onChange={e => setField("example_output", e.target.value)}
                      placeholder="예제 출력값" rows={4} className={textareaCls} />
                  </div>
                </div>
              </Section>

              {/* ── 코드 & 힌트 ── */}
              <Section title="초기 코드 & 힌트" defaultOpen={false}>
                <div>
                  <label className={labelCls}>에디터 초기 코드</label>
                  <textarea value={form.initial_code ?? ""} onChange={e => setField("initial_code", e.target.value)}
                    placeholder="# 코드를 작성하세요" rows={6} className={textareaCls} />
                </div>
                <div>
                  <label className={labelCls}>힌트 (선생님 전용)</label>
                  <textarea value={form.hint ?? ""} onChange={e => setField("hint", e.target.value)}
                    placeholder="풀이 접근 힌트" rows={3} className={textareaCls} />
                </div>
              </Section>

              {/* 하단 저장 버튼 */}
              <div className="flex justify-end gap-3 pb-6">
                {formErr && <p className="text-sm text-red-600 self-center">{formErr}</p>}
                <button onClick={save} disabled={saving || idConflict}
                  className="flex items-center gap-1.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  저장
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
