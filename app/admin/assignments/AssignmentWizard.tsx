"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Search, CheckCircle2, Loader2, ArrowLeft, ArrowRight, Save,
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

  // Step 1 filters
  const [pCourse, setPCourse] = useState<CourseKey>("basic")
  const [pTopic,  setPTopic]  = useState("전체")
  const [pSearch, setPSearch] = useState("")
  const [pDiff,   setPDiff]   = useState<string[]>([])
  const [pSort,   setPSort]   = useState<"title" | "difficulty">("title")
  const [pView,   setPView]   = useState<"all" | "selected">("all")

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

  // Derive topics dynamically from fetched problems for the active course
  const courseTopics = useMemo(() => {
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

  const filteredProblems = useMemo(() => {
    let list = problems.filter(p => p.category === COURSE_CATEGORY[pCourse])

    if (pTopic !== "전체") list = list.filter(p => p.topic === pTopic)
    if (pView === "selected") list = list.filter(p => selProblems.has(p.id))
    if (pSearch.trim()) list = list.filter(p => p.title.toLowerCase().includes(pSearch.toLowerCase()))
    if (pDiff.length > 0) list = list.filter(p => pDiff.includes(p.difficulty))

    if (pSort === "difficulty") {
      const order: Record<string, number> = { 하: 0, 중: 1, 상: 2 }
      list = [...list].sort((a, b) => (order[a.difficulty] ?? 1) - (order[b.difficulty] ?? 1))
    }

    return list
  }, [problems, pCourse, pTopic, pSearch, pDiff, pSort, pView, selProblems])

  const filteredStudents = useMemo(() => {
    let list = students.filter(s => s.status === "active")
    if (sSearch.trim()) list = list.filter(s => s.name.includes(sSearch.trim()))
    return list
  }, [students, sSearch])

  const diffCounts = useMemo(() => {
    const sel = problems.filter(p => selProblems.has(p.id))
    return {
      하: sel.filter(p => p.difficulty === "하").length,
      중: sel.filter(p => p.difficulty === "중").length,
      상: sel.filter(p => p.difficulty === "상").length,
    }
  }, [problems, selProblems])

  // All visible problems selected?
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

  function toggleAllFiltered() {
    setSelProblems(prev => {
      const next = new Set(prev)
      if (allFilteredSelected) filteredProblems.forEach(p => next.delete(p.id))
      else filteredProblems.forEach(p => next.add(p.id))
      return next
    })
  }

  async function handleSubmit() {
    if (!title.trim()) { setErr("과제명을 입력해주세요."); return }
    setSaving(true); setErr("")

    const body = {
      title: title.trim(),
      dueDate: dueDate || null,
      problemIds: [...selProblems],
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

  // Topic column visibility: only show when viewing all topics
  const showTopicCol = pTopic === "전체"

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
          {step === 1 && (
            <span>총 {filteredProblems.length}개 · 선택 {selProblems.size}개</span>
          )}
          {step === 2 && selStudents.size > 0 && (
            <span>학생 {selStudents.size}명</span>
          )}
        </div>
      </div>

      {/* Main content card */}
      <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col shadow-sm">

        {/* ── Step 1: 문제 선택 ── */}
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

            {/* Topic subtabs */}
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
              {/* 전체 선택/해제 */}
              <button
                onClick={toggleAllFiltered}
                disabled={filteredProblems.length === 0}
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

            {/* Selection status bar — always visible, next button integrated */}
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
              <button
                onClick={() => setStep(2)}
                disabled={selProblems.size === 0}
                className="shrink-0 inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                다음 <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}

        {/* ── Step 2: 학생 선택 ── */}
        {step === 2 && (
          <>
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
                  <tbody className="divide-y divide-gray-100">
                    {filteredStudents.map(s => (
                      <tr key={s.id} onClick={() => toggleStudent(s.id)}
                        className={`cursor-pointer transition-colors ${selStudents.has(s.id) ? "bg-indigo-50 hover:bg-indigo-100/60" : "hover:bg-gray-50"}`}>
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

        {/* ── Step 3: 과제 설정 ── */}
        {step === 3 && (
          <div className="flex-1 overflow-y-auto px-8 py-8">
            <div className="max-w-lg flex flex-col gap-5">
              {err && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                  {err}
                </div>
              )}
              <div>
                <label className={labelCls}>과제명 <span className="text-red-500">*</span></label>
                <input value={title} onChange={e => setTitle(e.target.value)} className={inputCls}
                  placeholder="예: 4월 4주차 파이썬 기초 과제" />
              </div>
              <div>
                <label className={labelCls}>마감일 및 시간</label>
                <input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputCls} />
                <p className="text-[11px] text-gray-400 mt-1.5">기본값: 다음 주 일요일 23:59</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-3">
                <p className="text-xs font-extrabold text-gray-700">배정 요약</p>
                {[
                  { label: "문제",  value: `${selProblems.size}개` },
                  { label: "학생",  value: `${selStudents.size}명` },
                  { label: "마감",  value: dueDate ? new Date(dueDate).toLocaleString("ko-KR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "없음" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-8">{label}</span>
                    <span className="text-sm font-bold text-gray-900">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom nav — step 1 only has back/cancel; steps 2-3 have full nav */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={() => step === 1 ? router.push("/admin") : setStep(s => s - 1)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-semibold rounded-xl transition-colors">
          <ArrowLeft className="w-4 h-4" />
          {step === 1 ? "취소" : "이전"}
        </button>

        {step === 2 && (
          <button onClick={() => setStep(3)}
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
