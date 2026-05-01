"use client"

import { useState, useMemo, useEffect, Fragment } from "react"
import { useRouter } from "next/navigation"
import {
  Search, CheckCircle2, Loader2, ArrowLeft, ArrowRight, Save,
  GripVertical, Wand2, AlertTriangle, Users,
} from "lucide-react"

type Problem = {
  id: string; title: string; category: string | null
  difficulty: string; topic: string | null; is_community: boolean
}

type Student = {
  id: string; name: string; grade: string | null; class: string | null; status: string
}

type CourseKey = "basic" | "algorithm" | "certificate" | "practical" | "challenge" | "competition"

const COURSE_TABS: { key: CourseKey; label: string }[] = [
  { key: "basic",       label: "기초 과정" },
  { key: "algorithm",   label: "알고리즘 과정" },
  { key: "certificate", label: "자격증 과정" },
  { key: "practical",   label: "실전 문제" },
  { key: "challenge",   label: "도전 문제" },
  { key: "competition", label: "대회 준비" },
]

const COURSE_CATEGORY: Record<CourseKey, string> = {
  basic:       "파이썬기초",
  algorithm:   "파이썬알고리즘",
  certificate: "파이썬자격증",
  practical:   "파이썬실전",
  challenge:   "파이썬도전",
  competition: "파이썬대회",
}

const COURSE_LABEL: Record<CourseKey, string> = {
  basic: "기초", algorithm: "알고리즘",
  certificate: "자격증", practical: "실전",
  challenge: "도전", competition: "대회",
}

const DIVISION_ORDER = ["초등부", "중등부", "고등부"]

function parseCertMeta(p: Problem) {
  const src    = `${p.topic ?? ""} ${p.title}`
  const gradeM = src.match(/([123])급/)
  const roundM = src.match(/(\d+)차/)
  return {
    grade: gradeM ? (parseInt(gradeM[1]) as 1 | 2 | 3) : null,
    type:  /기출/.test(src) ? "exam" : /모의/.test(src) ? "mock" : null,
    round: roundM ? parseInt(roundM[1]) : null,
  }
}

function parseCompMeta(p: Problem) {
  const parts    = (p.topic ?? "").split("_")
  const year     = parts[0] ? parseInt(parts[0]) : null
  const division = parts[1] ?? null
  return { year: year && !isNaN(year) ? year : null, division }
}

function getDefaultDueDate(): string {
  const now = new Date()
  const day = now.getDay()
  const daysToSun = day === 0 ? 7 : 7 - day
  const d = new Date(now)
  d.setDate(now.getDate() + daysToSun)
  d.setHours(23, 59, 0, 0)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T23:59`
}

const TH = "px-3 py-2.5 text-left text-[11px] font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap bg-gray-50"
const inputCls = "w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-800 bg-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-gray-400"
const labelCls = "block text-xs font-bold text-gray-700 mb-1.5"

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-[12px] font-semibold rounded-full border transition-all whitespace-nowrap
        ${active
          ? "bg-indigo-600 text-white border-indigo-600"
          : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}
    >
      {children}
    </button>
  )
}

interface AssignmentWizardProps {
  assignmentId?: string
  initialTitle?: string
  initialDueDate?: string
  initialProblemIds?: string[]
  initialStudentIds?: string[]
}

export default function AssignmentWizard({
  assignmentId,
  initialTitle = "",
  initialDueDate,
  initialProblemIds = [],
  initialStudentIds = [],
}: AssignmentWizardProps) {
  const router = useRouter()

  const [step,        setStep]        = useState(1)
  const [problems,    setProblems]    = useState<Problem[]>([])
  const [students,    setStudents]    = useState<Student[]>([])
  const [loading,     setLoading]     = useState(true)
  const [selProblems, setSelProblems] = useState<Set<string>>(new Set(initialProblemIds))
  const [selStudents, setSelStudents] = useState<Set<string>>(new Set(initialStudentIds))
  const [title,       setTitle]       = useState(initialTitle)
  const [dueDate,     setDueDate]     = useState(initialDueDate ?? getDefaultDueDate())
  const [saving,      setSaving]      = useState(false)
  const [err,         setErr]         = useState("")

  // Step 3: ordered problem list (for drag reorder)
  const [orderedProblemIds, setOrderedProblemIds] = useState<string[]>([])
  const [dragIdx,     setDragIdx]     = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  // Step 2: no-student warning
  const [noStudentWarn, setNoStudentWarn] = useState(false)

  // Step 1 — common filters
  const [pCourse, setPCourse] = useState<CourseKey>("basic")
  const [pTopic,  setPTopic]  = useState("전체")
  const [pSearch, setPSearch] = useState("")
  const [pDiff,   setPDiff]   = useState<string[]>([])
  const [pSort,   setPSort]   = useState<"title" | "difficulty">("title")
  const [pView,   setPView]   = useState<"all" | "selected">("all")

  // Step 1 — certificate filters
  const [certGrade,   setCertGrade]   = useState<1 | 2 | 3>(3)
  const [certTypeMap, setCertTypeMap] = useState<Record<number, "exam" | "mock">>({ 1: "exam", 2: "exam", 3: "exam" })
  const [certRound,   setCertRound]   = useState<number | null>(null)
  const certType = certTypeMap[certGrade]

  // Step 1 — competition filters
  const [compYear,     setCompYear]     = useState<number | null>(null)
  const [compDivision, setCompDivision] = useState<string | null>(null)

  // Step 2 filter
  const [sSearch, setSSearch] = useState("")

  useEffect(() => { setPTopic("전체") }, [pCourse])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [pr, sr] = await Promise.all([
        fetch("/api/admin/problems").then(r => r.json()),
        fetch("/api/admin/students").then(r => r.json()),
      ])
      setProblems(Array.isArray(pr) ? pr : [])
      setStudents(Array.isArray(sr) ? sr : [])
      setLoading(false)
    }
    load()
  }, [])

  // ── 자격증: 회차 목록 ──────────────────────────────────────────────────────
  const availableRounds = useMemo(() => {
    if (pCourse !== "certificate") return []
    const s = new Set<number>()
    for (const p of problems) {
      if (p.category !== COURSE_CATEGORY.certificate) continue
      const m = parseCertMeta(p)
      if (m.grade === certGrade && m.type === certType && m.round !== null) s.add(m.round)
    }
    return [...s].sort((a, b) => a - b)
  }, [problems, pCourse, certGrade, certType])

  useEffect(() => {
    if (availableRounds.length > 0 && (certRound === null || !availableRounds.includes(certRound))) {
      setCertRound(availableRounds[0])
    }
  }, [availableRounds])

  // ── 대회: 연도 & 부문 목록 ────────────────────────────────────────────────
  const availableYears = useMemo(() => {
    if (pCourse !== "competition") return []
    const s = new Set<number>()
    for (const p of problems) {
      if (p.category !== COURSE_CATEGORY.competition) continue
      const { year } = parseCompMeta(p)
      if (year !== null) s.add(year)
    }
    return [...s].sort((a, b) => a - b)
  }, [problems, pCourse])

  const availableDivisions = useMemo(() => {
    if (pCourse !== "competition" || compYear === null) return []
    const s = new Set<string>()
    for (const p of problems) {
      if (p.category !== COURSE_CATEGORY.competition) continue
      const { year, division } = parseCompMeta(p)
      if (year === compYear && division) s.add(division)
    }
    return DIVISION_ORDER.filter(d => s.has(d))
  }, [problems, pCourse, compYear])

  useEffect(() => {
    if (pCourse === "competition" && availableYears.length > 0 &&
      (compYear === null || !availableYears.includes(compYear))) {
      setCompYear(availableYears[0])
    }
  }, [availableYears, pCourse])

  useEffect(() => {
    if (availableDivisions.length > 0 &&
      (compDivision === null || !availableDivisions.includes(compDivision))) {
      setCompDivision(availableDivisions[0])
    }
  }, [availableDivisions])

  // ── 일반 과정 토픽 목록 ────────────────────────────────────────────────────
  const courseTopics = useMemo(() => {
    if (pCourse === "certificate" || pCourse === "competition") return []
    const cat = COURSE_CATEGORY[pCourse]
    const seen = new Set<string>()
    const ordered: string[] = []
    for (const p of problems) {
      if (p.category === cat && p.topic && !seen.has(p.topic)) {
        seen.add(p.topic)
        ordered.push(p.topic)
      }
    }
    return ["전체", ...ordered]
  }, [problems, pCourse])

  // ── 필터링된 문제 ─────────────────────────────────────────────────────────
  const filteredProblems = useMemo(() => {
    let list: Problem[]

    if (pCourse === "certificate") {
      list = problems.filter(p => {
        if (p.category !== COURSE_CATEGORY.certificate) return false
        const m = parseCertMeta(p)
        return m.grade === certGrade
          && m.type  === certType
          && (certRound === null || m.round === certRound)
      })
    } else if (pCourse === "competition") {
      list = problems.filter(p => {
        if (p.category !== COURSE_CATEGORY.competition) return false
        const { year, division } = parseCompMeta(p)
        return year === compYear && division === compDivision
      })
    } else {
      list = problems.filter(p => p.category === COURSE_CATEGORY[pCourse])
      if (pTopic !== "전체") list = list.filter(p => p.topic === pTopic)
    }

    if (pView === "selected") list = list.filter(p => selProblems.has(p.id))
    if (pSearch.trim())       list = list.filter(p => p.title.toLowerCase().includes(pSearch.toLowerCase()))
    if (pDiff.length > 0)     list = list.filter(p => pDiff.includes(p.difficulty))

    if (pSort === "difficulty") {
      const order: Record<string, number> = { 하: 0, 중: 1, 상: 2 }
      list = [...list].sort((a, b) => (order[a.difficulty] ?? 1) - (order[b.difficulty] ?? 1))
    }

    return list
  }, [problems, pCourse, pTopic, pSearch, pDiff, pSort, pView, selProblems,
      certGrade, certType, certRound, compYear, compDivision])

  // ── 학생 그룹핑 (학년·반) ────────────────────────────────────────────────
  const filteredStudents = useMemo(() => {
    let list = students.filter(s => s.status === "active")
    if (sSearch.trim()) list = list.filter(s => s.name.includes(sSearch.trim()))
    return list
  }, [students, sSearch])

  const studentGroups = useMemo(() => {
    const groups = new Map<string, Student[]>()
    for (const s of filteredStudents) {
      const key = [s.grade, s.class].filter(Boolean).join(" ") || "미배정"
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(s)
    }
    // Sort: 미배정 last, others alphabetically
    return [...groups.entries()].sort(([a], [b]) => {
      if (a === "미배정") return 1
      if (b === "미배정") return -1
      return a.localeCompare(b, "ko")
    })
  }, [filteredStudents])

  // ── 과제명 자동 제안 ─────────────────────────────────────────────────────
  function suggestTitle() {
    const now      = new Date()
    const month    = now.getMonth() + 1
    const weekNum  = Math.ceil(now.getDate() / 7)

    let name = ""
    if (pCourse === "certificate") {
      const typeLabel = certType === "exam" ? "기출" : "모의고사"
      const roundStr  = certRound ? ` ${certRound}차` : ""
      name = `COSPRO ${certGrade}급 ${typeLabel}${roundStr} 과제`
    } else if (pCourse === "competition") {
      const yearStr = compYear ?? ""
      const divStr  = compDivision ? ` ${compDivision}` : ""
      name = `${yearStr}${divStr} 대회 준비 과제`
    } else {
      name = `${month}월 ${weekNum}주차 파이썬 ${COURSE_LABEL[pCourse]} 과제`
    }
    setTitle(name.trim())
  }

  // ── 난이도 집계 ───────────────────────────────────────────────────────────
  const diffCounts = useMemo(() => {
    const sel = problems.filter(p => selProblems.has(p.id))
    return {
      하: sel.filter(p => p.difficulty === "하").length,
      중: sel.filter(p => p.difficulty === "중").length,
      상: sel.filter(p => p.difficulty === "상").length,
    }
  }, [problems, selProblems])

  const allFilteredSelected = filteredProblems.length > 0 && filteredProblems.every(p => selProblems.has(p.id))

  function toggleDiff(d: string) {
    setPDiff(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  function toggleProblem(id: string) {
    setSelProblems(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function toggleStudent(id: string) {
    setSelStudents(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function toggleGroupStudents(groupStudents: Student[]) {
    const ids = groupStudents.map(s => s.id)
    setSelStudents(prev => {
      const allSel = ids.every(id => prev.has(id))
      const next = new Set(prev)
      if (allSel) ids.forEach(id => next.delete(id))
      else ids.forEach(id => next.add(id))
      return next
    })
  }

  function toggleAllFiltered() {
    setSelProblems(prev => {
      const next = new Set(prev)
      if (allFilteredSelected) filteredProblems.forEach(p => next.delete(p.id))
      else filteredProblems.forEach(p => next.add(p.id))
      return next
    })
  }

  // ── Step 전환 ─────────────────────────────────────────────────────────────
  function goToStep2() {
    setNoStudentWarn(false)
    setStep(2)
  }

  function goToStep3() {
    if (selStudents.size === 0) { setNoStudentWarn(true); return }
    setNoStudentWarn(false)
    // Initialize ordered list from selection (Set preserves insertion order)
    setOrderedProblemIds(prev => {
      const selected = [...selProblems]
      // Keep existing order for already-ordered items, append new ones
      const existing = prev.filter(id => selProblems.has(id))
      const added    = selected.filter(id => !prev.includes(id))
      return [...existing, ...added]
    })
    setStep(3)
  }

  // ── 드래그 재정렬 ─────────────────────────────────────────────────────────
  function handleDragStart(idx: number) { setDragIdx(idx) }
  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    setDragOverIdx(idx)
  }
  function handleDrop(idx: number) {
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return }
    const next = [...orderedProblemIds]
    const [removed] = next.splice(dragIdx, 1)
    next.splice(idx, 0, removed)
    setOrderedProblemIds(next)
    setDragIdx(null)
    setDragOverIdx(null)
  }
  function handleDragEnd() { setDragIdx(null); setDragOverIdx(null) }

  // ── 저장 ──────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!title.trim()) { setErr("과제명을 입력해주세요."); return }
    setSaving(true); setErr("")

    const body = {
      title: title.trim(),
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      problemIds: orderedProblemIds,
      studentIds: [...selStudents],
    }

    const res = assignmentId
      ? await fetch(`/api/admin/assignments/${assignmentId}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      : await fetch("/api/admin/assignments", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })

    setSaving(false)
    if (!res.ok) { const d = await res.json(); setErr(d.error ?? "오류가 발생했습니다."); return }
    router.push("/admin")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
      </div>
    )
  }

  const showTopicCol = pCourse !== "certificate" && pCourse !== "competition" && pTopic === "전체"
  const problemMap   = new Map(problems.map(p => [p.id, p]))

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 130px)" }}>
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-5">
        {([1, 2, 3] as const).map(n => (
          <div key={n} className="flex items-center gap-2">
            {n > 1 && <div className="w-10 h-px bg-gray-200" />}
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                ${step === n ? "bg-indigo-600 text-white" : step > n ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-400"}`}>
                {step > n ? <CheckCircle2 className="w-4 h-4" /> : n}
              </div>
              <span className={`text-sm font-semibold ${step === n ? "text-gray-900" : "text-gray-400"}`}>
                {n === 1 ? "문제 선택" : n === 2 ? "학생 선택" : "과제 설정"}
              </span>
            </div>
          </div>
        ))}
        <div className="ml-auto text-xs text-gray-400 font-medium">
          {step === 1 && <span>총 {filteredProblems.length}개 · 선택 {selProblems.size}개</span>}
          {step === 2 && selStudents.size > 0 && <span>학생 {selStudents.size}명</span>}
        </div>
      </div>

      {/* Main content card */}
      <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col shadow-sm">

        {/* ══ Step 1: 문제 선택 ══ */}
        {step === 1 && (
          <>
            {/* Course tabs */}
            <div className="shrink-0 flex border-b border-gray-100 bg-white overflow-x-auto scrollbar-none">
              {COURSE_TABS.map(({ key, label }) => (
                <button key={key} onClick={() => setPCourse(key)}
                  className={`px-5 py-3.5 text-xs font-semibold transition-all border-b-2 whitespace-nowrap
                    ${pCourse === key
                      ? "border-indigo-600 text-indigo-700 bg-indigo-50/60"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}>
                  {label}
                </button>
              ))}
            </div>

            {/* 자격증 과정 필터 */}
            {pCourse === "certificate" && (
              <div className="shrink-0 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-3 px-4 pt-3 pb-2">
                  <span className="text-[11px] font-bold text-gray-400 w-8 shrink-0">급수</span>
                  <div className="flex gap-1.5">
                    {([3, 2, 1] as const).map(g => (
                      <FilterPill key={g} active={certGrade === g} onClick={() => setCertGrade(g)}>{g}급</FilterPill>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 pb-2">
                  <span className="text-[11px] font-bold text-gray-400 w-8 shrink-0">유형</span>
                  <div className="flex gap-1.5">
                    {(["exam", "mock"] as const).map(t => (
                      <FilterPill key={t} active={certType === t}
                        onClick={() => setCertTypeMap(prev => ({ ...prev, [certGrade]: t }))}>
                        {t === "exam" ? "기출문제" : "모의고사"}
                      </FilterPill>
                    ))}
                  </div>
                </div>
                {availableRounds.length > 0 && (
                  <div className="flex items-center gap-3 px-4 pb-3">
                    <span className="text-[11px] font-bold text-gray-400 w-8 shrink-0">회차</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {availableRounds.map(r => (
                        <FilterPill key={r} active={certRound === r} onClick={() => setCertRound(r)}>{r}차</FilterPill>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 대회 준비 필터 */}
            {pCourse === "competition" && (
              <div className="shrink-0 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-3 px-4 pt-3 pb-2">
                  <span className="text-[11px] font-bold text-gray-400 w-8 shrink-0">연도</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {availableYears.map(y => (
                      <FilterPill key={y} active={compYear === y} onClick={() => setCompYear(y)}>{y}</FilterPill>
                    ))}
                  </div>
                </div>
                {availableDivisions.length > 0 && (
                  <div className="flex items-center gap-3 px-4 pb-3">
                    <span className="text-[11px] font-bold text-gray-400 w-8 shrink-0">부문</span>
                    <div className="flex gap-1.5">
                      {availableDivisions.map(d => (
                        <FilterPill key={d} active={compDivision === d} onClick={() => setCompDivision(d)}>{d}</FilterPill>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 일반 과정 토픽 서브탭 */}
            {pCourse !== "certificate" && pCourse !== "competition" && (
              <div className="shrink-0 flex flex-wrap gap-1.5 px-4 py-2.5 border-b border-gray-100 bg-white">
                {courseTopics.map(t => (
                  <button key={t} onClick={() => setPTopic(t)}
                    className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full border transition-all
                      ${pTopic === t
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}>
                    {t}
                  </button>
                ))}
              </div>
            )}

            {/* Search + filters */}
            <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-white">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input value={pSearch} onChange={e => setPSearch(e.target.value)} placeholder="문제 검색…"
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 bg-white" />
              </div>
              <div className="flex items-center gap-1">
                {(["하", "중", "상"] as const).map(d => (
                  <button key={d} onClick={() => toggleDiff(d)}
                    className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full border transition-all
                      ${pDiff.includes(d)
                        ? d === "하" ? "bg-emerald-500 text-white border-emerald-500"
                          : d === "중" ? "bg-amber-500 text-white border-amber-500"
                          : "bg-red-500 text-white border-red-500"
                        : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}>
                    {d}
                  </button>
                ))}
              </div>
              <select value={pSort} onChange={e => setPSort(e.target.value as "title" | "difficulty")}
                className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-indigo-400 text-gray-700">
                <option value="title">가나다순</option>
                <option value="difficulty">난이도순</option>
              </select>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                {(["all", "selected"] as const).map(v => (
                  <button key={v} onClick={() => setPView(v)}
                    className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-md transition-all
                      ${pView === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                    {v === "all" ? "전체" : `선택 ${selProblems.size}`}
                  </button>
                ))}
              </div>
              <button onClick={toggleAllFiltered} disabled={filteredProblems.length === 0}
                className="px-2.5 py-1.5 text-[11px] font-semibold border border-gray-200 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-all whitespace-nowrap disabled:opacity-40">
                {allFilteredSelected ? "전체 해제" : "전체 선택"}
              </button>
            </div>

            {/* Problem list */}
            <div className="flex-1 overflow-y-auto">
              {filteredProblems.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-sm text-gray-400">
                  {pView === "selected" ? "선택된 문제가 없습니다" : "해당 조건의 문제가 없습니다"}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <th className={`${TH} w-10`}></th>
                      <th className={TH}>문제명</th>
                      {showTopicCol && <th className={TH}>토픽</th>}
                      <th className={TH}>난이도</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredProblems.map(p => (
                      <tr key={p.id} onClick={() => toggleProblem(p.id)}
                        className={`cursor-pointer transition-colors ${selProblems.has(p.id) ? "bg-indigo-50 hover:bg-indigo-100/60" : "hover:bg-gray-50"}`}>
                        <td className="px-3 py-2.5 text-center">
                          <div className={`w-4 h-4 rounded border-2 inline-flex items-center justify-center transition-all
                            ${selProblems.has(p.id) ? "bg-indigo-600 border-indigo-600" : "border-gray-300"}`}>
                            {selProblems.has(p.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`text-sm font-semibold ${selProblems.has(p.id) ? "text-indigo-700" : "text-gray-800"}`}>{p.title}</span>
                        </td>
                        {showTopicCol && (
                          <td className="px-3 py-2.5">
                            <span className="text-[11px] text-gray-500">{p.topic ?? "—"}</span>
                          </td>
                        )}
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex font-semibold rounded-full border px-2 py-0.5 text-[11px]
                            ${p.difficulty === "하" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : p.difficulty === "중" ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-red-50 text-red-600 border-red-200"}`}>
                            {p.difficulty}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Selection status bar */}
            <div className="shrink-0 px-4 py-2.5 border-t border-gray-100 bg-indigo-50 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 min-w-0">
                {selProblems.size > 0 ? (
                  <>
                    <span>{selProblems.size}개 선택됨</span>
                    <span className="text-indigo-300">|</span>
                    <span className="font-normal text-indigo-500 truncate">
                      {[
                        diffCounts["하"] > 0 && `하 ${diffCounts["하"]}`,
                        diffCounts["중"] > 0 && `중 ${diffCounts["중"]}`,
                        diffCounts["상"] > 0 && `상 ${diffCounts["상"]}`,
                      ].filter(Boolean).join(" · ")}
                    </span>
                  </>
                ) : (
                  <span className="text-gray-400 font-normal">문제를 선택하면 다음 단계로 이동할 수 있습니다</span>
                )}
              </div>
              <button onClick={goToStep2} disabled={selProblems.size === 0}
                className="shrink-0 inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                다음 <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}

        {/* ══ Step 2: 학생 선택 ══ */}
        {step === 2 && (
          <>
            {/* 경고 배너 */}
            {noStudentWarn && (
              <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-xs font-semibold text-amber-700">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                학생을 1명 이상 선택해야 다음 단계로 이동할 수 있습니다.
              </div>
            )}

            {/* 검색 + 전체 선택 */}
            <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-white">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input value={sSearch} onChange={e => setSSearch(e.target.value)} placeholder="학생 이름 검색…"
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 bg-white" />
              </div>
              <button onClick={() => {
                const ids = filteredStudents.map(s => s.id)
                setSelStudents(prev => {
                  const allSel = ids.every(id => prev.has(id))
                  const next = new Set(prev)
                  if (allSel) ids.forEach(id => next.delete(id))
                  else ids.forEach(id => next.add(id))
                  return next
                })
              }} className="px-3 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap">
                전체 선택
              </button>
            </div>

            {/* 학생 목록 (학년·반 그룹핑) */}
            <div className="flex-1 overflow-y-auto">
              {filteredStudents.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-sm text-gray-400">검색 결과 없음</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <th className={`${TH} w-10`}></th>
                      <th className={TH}>이름</th>
                      <th className={TH}>학년·반</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentGroups.map(([groupKey, groupStudents]) => {
                      const groupAllSel = groupStudents.every(s => selStudents.has(s.id))
                      const groupSomeSel = groupStudents.some(s => selStudents.has(s.id))
                      return (
                        <Fragment key={groupKey}>
                          {/* 그룹 헤더 */}
                          <tr className="bg-gray-50 border-y border-gray-100">
                            <td colSpan={3} className="px-3 py-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Users className="w-3.5 h-3.5 text-gray-400" />
                                  <span className="text-[11px] font-bold text-gray-600">{groupKey}</span>
                                  <span className="text-[11px] text-gray-400">{groupStudents.length}명</span>
                                  {groupSomeSel && !groupAllSel && (
                                    <span className="text-[11px] text-indigo-500 font-semibold">
                                      ({groupStudents.filter(s => selStudents.has(s.id)).length}명 선택)
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => toggleGroupStudents(groupStudents)}
                                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition-all
                                    ${groupAllSel
                                      ? "bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200"
                                      : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600"}`}
                                >
                                  {groupAllSel ? "전체 해제" : "전체 선택"}
                                </button>
                              </div>
                            </td>
                          </tr>
                          {/* 그룹 학생들 */}
                          {groupStudents.map(s => (
                            <tr key={s.id} onClick={() => toggleStudent(s.id)}
                              className={`cursor-pointer transition-colors divide-y divide-gray-50 border-b border-gray-50
                                ${selStudents.has(s.id) ? "bg-indigo-50 hover:bg-indigo-100/60" : "hover:bg-gray-50"}`}>
                              <td className="px-3 py-2.5 text-center">
                                <div className={`w-4 h-4 rounded border-2 inline-flex items-center justify-center transition-all
                                  ${selStudents.has(s.id) ? "bg-indigo-600 border-indigo-600" : "border-gray-300"}`}>
                                  {selStudents.has(s.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                                </div>
                              </td>
                              <td className="px-3 py-2.5">
                                <span className={`text-sm font-bold ${selStudents.has(s.id) ? "text-indigo-700" : "text-gray-800"}`}>{s.name}</span>
                              </td>
                              <td className="px-3 py-2.5">
                                <span className="text-xs text-gray-500">{[s.grade, s.class].filter(Boolean).join(" ") || "—"}</span>
                              </td>
                            </tr>
                          ))}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {selStudents.size > 0 && (
              <div className="shrink-0 px-4 py-2.5 bg-indigo-50 border-t border-indigo-100 text-xs font-semibold text-indigo-700">
                {selStudents.size}명 선택됨
              </div>
            )}
          </>
        )}

        {/* ══ Step 3: 과제 설정 ══ */}
        {step === 3 && (
          <div className="flex-1 overflow-y-auto">
            <div className="flex gap-6 px-8 py-8 min-h-full">

              {/* 왼쪽: 과제 설정 폼 */}
              <div className="flex-1 max-w-sm flex flex-col gap-5">
                {err && (
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                    {err}
                  </div>
                )}
                <div>
                  <label className={labelCls}>과제명 <span className="text-red-500">*</span></label>
                  <div className="flex gap-2">
                    <input value={title} onChange={e => setTitle(e.target.value)} className={inputCls}
                      placeholder="예: 4월 4주차 파이썬 기초 과제" />
                    <button onClick={suggestTitle} title="과제명 자동 생성"
                      className="shrink-0 flex items-center gap-1 px-3 py-2.5 border border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap">
                      <Wand2 className="w-3.5 h-3.5" />
                      자동
                    </button>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>마감일 및 시간</label>
                  <input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputCls} />
                  <p className="text-[11px] text-gray-400 mt-1.5">기본값: 다음 주 일요일 23:59</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-3">
                  <p className="text-xs font-extrabold text-gray-700">배정 요약</p>
                  {[
                    { label: "문제",  value: `${orderedProblemIds.length}개` },
                    { label: "학생",  value: `${selStudents.size}명` },
                    { label: "마감",  value: dueDate ? new Date(dueDate).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "없음" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-8">{label}</span>
                      <span className="text-sm font-bold text-gray-900">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 오른쪽: 문제 순서 조정 */}
              <div className="flex-1 max-w-sm flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-extrabold text-gray-700">문제 순서 조정</p>
                  <p className="text-[11px] text-gray-400">드래그로 순서를 바꿀 수 있습니다</p>
                </div>
                <div className="flex flex-col gap-1 overflow-y-auto" style={{ maxHeight: "380px" }}>
                  {orderedProblemIds.map((id, idx) => {
                    const p = problemMap.get(id)
                    if (!p) return null
                    const isDragging  = dragIdx === idx
                    const isDragOver  = dragOverIdx === idx
                    return (
                      <div
                        key={id}
                        draggable
                        onDragStart={() => handleDragStart(idx)}
                        onDragOver={e => handleDragOver(e, idx)}
                        onDrop={() => handleDrop(idx)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition-all select-none cursor-grab active:cursor-grabbing
                          ${isDragging  ? "opacity-40" : "opacity-100"}
                          ${isDragOver  ? "border-indigo-400 bg-indigo-50" : "border-gray-200 bg-white hover:border-gray-300"}`}
                      >
                        <GripVertical className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                        <span className="text-[11px] font-bold text-gray-400 w-5 shrink-0">{idx + 1}</span>
                        <span className="flex-1 font-semibold text-gray-800 truncate">{p.title}</span>
                        <span className={`shrink-0 px-1.5 py-0.5 rounded-full border text-[10px] font-bold
                          ${p.difficulty === "하" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : p.difficulty === "중" ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-red-50 text-red-600 border-red-200"}`}>
                          {p.difficulty}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={() => step === 1 ? router.push("/admin") : setStep(s => s - 1)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-semibold rounded-xl transition-colors">
          <ArrowLeft className="w-4 h-4" />
          {step === 1 ? "취소" : "이전"}
        </button>

        {step === 2 && (
          <button onClick={goToStep3}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors">
            다음 <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {step === 3 && (
          <button onClick={handleSubmit} disabled={saving || !title.trim()}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {assignmentId ? "수정 저장" : "과제 생성"}
          </button>
        )}
      </div>
    </div>
  )
}
