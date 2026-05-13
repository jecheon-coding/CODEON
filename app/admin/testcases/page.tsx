"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  ArrowLeft, LogOut, Search, Plus, Pencil, Trash2,
  Eye, EyeOff, Save, X, Loader2, Clock, ChevronDown, ChevronUp,
  Wand2, Play, Code2, Copy,
} from "lucide-react"
import { runPythonCode } from "@/lib/pyodide"

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

type Problem = {
  id: string; title: string; category: string | null
  difficulty: string; topic: string | null; time_limit_ms: number | null
  gen_code: string | null; sol_code: string | null
}

type TestCase = {
  id: string; problem_id: string
  input: string | null; expected_output: string
  is_hidden: boolean; display_order: number
}

const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-gray-400"
const textareaCls = `${inputCls} font-mono text-xs resize-none`

const DIFF_COLOR: Record<string, string> = {
  하: "bg-emerald-50 text-emerald-700 border-emerald-200",
  중: "bg-amber-50 text-amber-700 border-amber-200",
  상: "bg-red-50 text-red-600 border-red-200",
}

function truncate(s: string | null, n = 60) {
  if (!s) return "(없음)"
  return s.length > n ? s.slice(0, n) + "…" : s
}

const GEN_PLACEHOLDER = `# 입력 데이터 생성 코드
import random
n = 10000
print(n)
print(' '.join(str(random.randint(1, 1000000)) for _ in range(n)))`

const SOL_PLACEHOLDER = `# 정답 코드 (입력을 읽어 정답 출력)
n = int(input())
arr = list(map(int, input().split()))
print(sum(arr))`

function TestCasesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialProblemId = searchParams.get("problemId")

  // ── 문제 목록 ──────────────────────────────────────────────────────────────
  const [problems,  setProblems]  = useState<Problem[]>([])
  const [pLoading,  setPLoading]  = useState(true)
  const [pCourse,   setPCourse]   = useState<CourseKey>("basic")
  const [pTopic,    setPTopic]    = useState<string>("전체")
  const [pSearch,   setPSearch]   = useState("")
  const [selected,  setSelected]  = useState<Problem | null>(null)

  // ── 테스트케이스 목록 ──────────────────────────────────────────────────────
  const [cases,     setCases]     = useState<TestCase[]>([])
  const [tcLoading, setTcLoading] = useState(false)

  // ── 시간 제한 편집 ─────────────────────────────────────────────────────────
  const [timeLimit,  setTimeLimit]  = useState("")
  const [timeSaving, setTimeSaving] = useState(false)

  // ── 추가/수정 폼 ───────────────────────────────────────────────────────────
  const [formOpen,  setFormOpen]  = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [fInput,    setFInput]    = useState("")
  const [fOutput,   setFOutput]   = useState("")
  const [fHidden,   setFHidden]   = useState(false)
  const [fOrder,    setFOrder]    = useState(1)
  const [fSaving,   setFSaving]   = useState(false)
  const [fErr,      setFErr]      = useState("")

  // ── 입력 생성기 ────────────────────────────────────────────────────────────
  const [genOpen,    setGenOpen]    = useState(false)
  const [genCode,    setGenCode]    = useState("")
  const [genLoading, setGenLoading] = useState(false)
  const [genErr,     setGenErr]     = useState("")
  const [genSaving,  setGenSaving]  = useState<"idle" | "saving" | "saved">("idle")

  // ── 정답 코드 실행기 ───────────────────────────────────────────────────────
  const [solOpen,    setSolOpen]    = useState(false)
  const [solCode,    setSolCode]    = useState("")
  const [solLoading, setSolLoading] = useState(false)
  const [solErr,     setSolErr]     = useState("")
  const [solSaving,  setSolSaving]  = useState<"idle" | "saving" | "saved">("idle")

  // ── 정답 제출 불러오기 ─────────────────────────────────────────────────────
  type CorrectSub = { id: string; userName: string; code: string; createdAt: string }
  const [correctSubs,     setCorrectSubs]     = useState<CorrectSub[]>([])
  const [correctSubsOpen, setCorrectSubsOpen] = useState(false)
  const [correctSubsLoading, setCorrectSubsLoading] = useState(false)

  // ── 확장된 케이스 (전체 보기) ──────────────────────────────────────────────
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // ── 형식 자동 생성 ─────────────────────────────────────────────────────────
  const [fmtGenLoading, setFmtGenLoading] = useState(false)

  // ── 문제 로드 + URL problemId로 자동 선택 ────────────────────────────────
  useEffect(() => {
    setPLoading(true)
    fetch("/api/admin/problems")
      .then(r => r.json())
      .then((d: Problem[]) => {
        const list = Array.isArray(d) ? d : []
        setProblems(list)
        setPLoading(false)
        if (initialProblemId) {
          const target = list.find(p => p.id === initialProblemId)
          if (target) {
            // 해당 문제의 코스 탭도 자동 전환
            const courseKey = Object.entries(COURSE_CATEGORY).find(([, v]) => v === target.category)?.[0] as CourseKey | undefined
            if (courseKey) setPCourse(courseKey)
            setSelected(target)
          }
        }
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [courseProblems, pTopic, pSearch])

  // ── 문제 선택 ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selected) return
    setTcLoading(true)
    setCases([])
    setFormOpen(false)
    setExpanded(new Set())
    setGenCode(selected.gen_code ?? "")
    setSolCode(selected.sol_code ?? "")
    setGenSaving("idle")
    setSolSaving("idle")
    setCorrectSubs([])
    setCorrectSubsOpen(false)
    fetch(`/api/admin/testcases?problemId=${selected.id}`)
      .then(r => r.json())
      .then(d => { setCases(Array.isArray(d) ? d : []); setTcLoading(false) })
    setTimeLimit(selected.time_limit_ms != null ? String(selected.time_limit_ms / 1000) : "")
  }, [selected])

  // ── 생성기/정답코드 자동저장 (디바운스 1초) ────────────────────────────────
  useEffect(() => {
    if (!selected) return
    if (genCode === (selected.gen_code ?? "")) return
    setGenSaving("saving")
    const t = setTimeout(async () => {
      await fetch(`/api/admin/problems/${selected.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gen_code: genCode }),
      })
      setProblems(prev => prev.map(p => p.id === selected.id ? { ...p, gen_code: genCode || null } : p))
      setGenSaving("saved")
      setTimeout(() => setGenSaving("idle"), 2000)
    }, 1000)
    return () => clearTimeout(t)
  }, [genCode]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selected) return
    if (solCode === (selected.sol_code ?? "")) return
    setSolSaving("saving")
    const t = setTimeout(async () => {
      await fetch(`/api/admin/problems/${selected.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sol_code: solCode }),
      })
      setProblems(prev => prev.map(p => p.id === selected.id ? { ...p, sol_code: solCode || null } : p))
      setSolSaving("saved")
      setTimeout(() => setSolSaving("idle"), 2000)
    }, 1000)
    return () => clearTimeout(t)
  }, [solCode]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 시간 제한 저장 ─────────────────────────────────────────────────────────
  async function saveTimeLimit() {
    if (!selected) return
    setTimeSaving(true)
    const ms = timeLimit.trim() ? Math.round(parseFloat(timeLimit) * 1000) : null
    await fetch(`/api/admin/problems/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ time_limit_ms: ms }),
    })
    setSelected(prev => prev ? { ...prev, time_limit_ms: ms } : prev)
    setProblems(prev => prev.map(p => p.id === selected.id ? { ...p, time_limit_ms: ms } : p))
    setTimeSaving(false)
  }

  // ── 기존 형식으로 자동 생성 ───────────────────────────────────────────────
  function generateSimilarInput(template: string): string {
    const lines = template.trimEnd().split("\n")
    return lines.map(line => {
      const tokens = line.trimEnd().split(/( +)/)
      return tokens.map(tok => {
        if (/^ +$/.test(tok)) return tok
        const n = Number(tok)
        if (!isNaN(n) && tok.trim() !== "" && Number.isInteger(n)) {
          const abs = Math.abs(n)
          const mag = abs === 0 ? 9 : Math.pow(10, Math.floor(Math.log10(abs)) + 1) - 1
          const val = Math.floor(Math.random() * mag) + 1
          return n < 0 ? String(-val) : String(val)
        }
        if (!isNaN(Number(tok)) && tok.trim() !== "") {
          return (Math.random() * Number(tok) * 2 + 0.01).toFixed(2)
        }
        return tok
      }).join("")
    }).join("\n")
  }

  async function autoGenerateFromFormat() {
    const templateCase = cases.find(c => c.input)
    if (!templateCase?.input) return
    setFmtGenLoading(true)
    const newInput = generateSimilarInput(templateCase.input)
    setFInput(newInput)
    if (solCode.trim()) {
      try {
        const result = await runPythonCode(solCode, newInput)
        setFOutput(result)
      } catch {
        // 출력 자동완성 실패 시 무시
      }
    }
    setFmtGenLoading(false)
  }

  // ── 입력 생성기 실행 ───────────────────────────────────────────────────────
  async function runGenerator() {
    if (!genCode.trim()) return
    setGenLoading(true); setGenErr("")
    try {
      const result = await runPythonCode(genCode, "")
      setFInput(result)
      setGenErr("")
    } catch (e: any) {
      setGenErr(e.message ?? "실행 오류")
    }
    setGenLoading(false)
  }

  // ── 정답 제출 불러오기 ─────────────────────────────────────────────────────
  async function loadCorrectSubs() {
    if (!selected) return
    setCorrectSubsLoading(true)
    const res = await fetch(`/api/admin/problems/${selected.id}`)
    const data = await res.json()
    setCorrectSubs(Array.isArray(data) ? data : [])
    setCorrectSubsOpen(true)
    setCorrectSubsLoading(false)
  }

  function applyCorrectSub(sub: CorrectSub) {
    setSolCode(sub.code)
    setCorrectSubsOpen(false)
    if (!solOpen) setSolOpen(true)
  }

  // ── 정답 코드 실행 → 예상 출력 자동완성 ────────────────────────────────────
  async function runSolution() {
    if (!solCode.trim()) return
    setSolLoading(true); setSolErr("")
    try {
      const result = await runPythonCode(solCode, fInput)
      setFOutput(result)
      setSolErr("")
    } catch (e: any) {
      setSolErr(e.message ?? "실행 오류")
    }
    setSolLoading(false)
  }

  // ── 폼 열기 ───────────────────────────────────────────────────────────────
  function openAdd() {
    setEditingId(null)
    setFInput(""); setFOutput(""); setFHidden(false)
    setFOrder(cases.length > 0 ? Math.max(...cases.map(c => c.display_order)) + 1 : 1)
    setFErr(""); setGenErr(""); setSolErr("")
    setFormOpen(true)
  }

  function openEdit(tc: TestCase) {
    setEditingId(tc.id)
    setFInput(tc.input ?? ""); setFOutput(tc.expected_output)
    setFHidden(tc.is_hidden); setFOrder(tc.display_order)
    setFErr(""); setGenErr(""); setSolErr("")
    setFormOpen(true)
  }

  function copyCase(tc: TestCase) {
    setEditingId(null)
    setFInput(tc.input ?? ""); setFOutput(tc.expected_output)
    setFHidden(tc.is_hidden)
    setFOrder(cases.length > 0 ? Math.max(...cases.map(c => c.display_order)) + 1 : 1)
    setFErr(""); setGenErr(""); setSolErr("")
    setFormOpen(true)
  }

  // ── 저장 ──────────────────────────────────────────────────────────────────
  async function saveCase() {
    if (!selected) return
    if (!fOutput.trim()) { setFErr("예상 출력은 필수입니다."); return }
    setFSaving(true); setFErr("")

    const body = {
      problem_id:      selected.id,
      input:           fInput.trim() || null,
      expected_output: fOutput.trim(),
      is_hidden:       fHidden,
      display_order:   fOrder,
    }

    if (editingId) {
      await fetch(`/api/admin/testcases/${editingId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      setCases(prev => prev.map(c => c.id === editingId ? { ...c, ...body } : c))
    } else {
      const res = await fetch("/api/admin/testcases", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const created = await res.json()
      if (res.ok) setCases(prev => [...prev, created].sort((a, b) => a.display_order - b.display_order))
    }

    setFSaving(false)
    setFormOpen(false)
  }

  // ── 삭제 ──────────────────────────────────────────────────────────────────
  async function deleteCase(id: string) {
    if (!confirm("삭제하시겠습니까?")) return
    await fetch(`/api/admin/testcases/${id}`, { method: "DELETE" })
    setCases(prev => prev.filter(c => c.id !== id))
  }

  async function toggleHidden(tc: TestCase) {
    const newHidden = !tc.is_hidden
    setCases(prev => prev.map(c => c.id === tc.id ? { ...c, is_hidden: newHidden } : c))
    await fetch(`/api/admin/testcases/${tc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_hidden: newHidden }),
    })
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── 네비게이션 ── */}
      <div className="bg-white border-b border-gray-200 px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/admin/problems")}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors mr-1">
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </button>
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Clock className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-gray-900 leading-none">테스트케이스 관리</p>
            <p className="text-[11px] text-gray-400 mt-0.5">문제별 채점 기준 · 시간 제한 설정</p>
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
            {/* 코스 탭 — 1줄 */}
            <div className="flex border-b border-gray-100">
              {COURSE_TABS.map(({ key, label }) => (
                <button key={key} onClick={() => { setPCourse(key); setPTopic("전체"); setSelected(null) }}
                  className={`flex-1 py-2 text-[11px] font-semibold transition-all border-b-2
                    ${pCourse === key
                      ? "border-indigo-600 text-indigo-700 bg-indigo-50/60"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}>
                  {label}
                </button>
              ))}
            </div>

            {/* topic 필터 칩 */}
            {topicList.length > 1 && (
              <div className="flex gap-1.5 px-2.5 py-2 flex-wrap border-b border-gray-100">
                {topicList.map(t => (
                  <button key={t} onClick={() => { setPTopic(t); setSelected(null) }}
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

            <div className="p-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input value={pSearch} onChange={e => setPSearch(e.target.value)}
                  placeholder="문제 검색…"
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 bg-white" />
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto bg-white border border-gray-200 rounded-xl">
            {!pLoading && filteredProblems.length > 0 && (
              <div className="px-3 py-1.5 border-b border-gray-100 bg-gray-50/50">
                <span className="text-[10px] text-gray-400 font-medium">{filteredProblems.length}개 문제</span>
              </div>
            )}
            {pLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
              </div>
            ) : filteredProblems.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-12">문제 없음</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredProblems.map(p => (
                  <button key={p.id} onClick={() => setSelected(p)}
                    className={`w-full text-left px-3 py-2.5 transition-colors
                      ${selected?.id === p.id ? "bg-indigo-50" : "hover:bg-gray-50"}`}>
                    <div className="flex items-start gap-2">
                      <span className={`mt-0.5 shrink-0 inline-flex font-semibold rounded-full border px-1.5 py-0.5 text-[10px]
                        ${DIFF_COLOR[p.difficulty] ?? "bg-gray-50 text-gray-500 border-gray-200"}`}>
                        {p.difficulty}
                      </span>
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold truncate ${selected?.id === p.id ? "text-indigo-700" : "text-gray-800"}`}>
                          {p.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {p.topic && <span className="text-[10px] text-gray-400">{p.topic}</span>}
                          {p.time_limit_ms && (
                            <span className="text-[10px] text-amber-600 font-medium">⏱ {p.time_limit_ms / 1000}초</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── 우측: 테스트케이스 패널 ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {!selected ? (
            <div className="flex items-center justify-center bg-white border border-gray-200 rounded-2xl" style={{ height: "calc(100vh - 140px)" }}>
              <p className="text-sm text-gray-400">왼쪽에서 문제를 선택하세요</p>
            </div>
          ) : (
            <>
              {/* ── 문제 헤더 + 시간 제한 ── */}
              <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-extrabold text-gray-900 truncate">{selected.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{selected.category} · {selected.topic ?? "—"}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">시간 제한</span>
                  <input
                    value={timeLimit} onChange={e => setTimeLimit(e.target.value)}
                    placeholder="없음"
                    className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-xs text-center focus:outline-none focus:border-indigo-400"
                  />
                  <span className="text-xs text-gray-400">초</span>
                  <button onClick={saveTimeLimit} disabled={timeSaving}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
                    {timeSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    저장
                  </button>
                </div>
              </div>

              {/* ── 테스트케이스 목록 ── */}
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                  <div>
                    <p className="text-sm font-extrabold text-gray-900">테스트케이스</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      공개 {cases.filter(c => !c.is_hidden).length}개 · 히든 {cases.filter(c => c.is_hidden).length}개
                    </p>
                  </div>
                  <button onClick={openAdd}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors">
                    <Plus className="w-3.5 h-3.5" /> 추가
                  </button>
                </div>

                {tcLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                  </div>
                ) : cases.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <p className="text-sm text-gray-400">등록된 테스트케이스가 없습니다</p>
                    <button onClick={openAdd} className="text-xs text-indigo-600 hover:underline font-medium">
                      + 첫 번째 케이스 추가하기
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {cases.map(tc => {
                      const isExp     = expanded.has(tc.id)
                      const isEditing = formOpen && editingId === tc.id
                      return (
                        <div key={tc.id} className={`px-5 py-3 transition-colors ${isEditing ? "bg-indigo-50/60" : ""}`}>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 shrink-0 w-28">
                              <span className="text-xs font-bold text-gray-500">#{tc.display_order}</span>
                              <button
                                title="클릭하여 공개/히든 전환"
                                onClick={() => toggleHidden(tc)}
                                className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border transition-colors
                                  ${tc.is_hidden
                                    ? "bg-gray-100 text-gray-500 border-gray-200 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200"
                                    : "bg-blue-50 text-blue-600 border-blue-200 hover:bg-gray-100 hover:text-gray-500 hover:border-gray-200"}`}>
                                {tc.is_hidden ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                                {tc.is_hidden ? "히든" : "공개"}
                              </button>
                            </div>
                            <div className="flex-1 min-w-0 grid grid-cols-2 gap-3">
                              <div className="min-w-0">
                                <p className="text-[10px] text-gray-400 font-medium mb-0.5">입력</p>
                                <p className="text-xs text-gray-700 font-mono truncate">{truncate(tc.input)}</p>
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] text-gray-400 font-medium mb-0.5">예상 출력</p>
                                <p className="text-xs text-gray-700 font-mono truncate">{truncate(tc.expected_output)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => toggleExpand(tc.id)} title="전체 보기"
                                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                                {isExp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                              <button onClick={() => copyCase(tc)} title="복사"
                                className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors">
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => openEdit(tc)} title="수정"
                                className={`p-1.5 rounded-lg transition-colors
                                  ${isEditing ? "text-indigo-600 bg-indigo-100" : "text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"}`}>
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => deleteCase(tc.id)} title="삭제"
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {isExp && (
                            <div className="mt-3 grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-[10px] text-gray-400 font-medium mb-1">입력 (전체)</p>
                                <pre className="text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg p-3 whitespace-pre-wrap max-h-48 overflow-y-auto">
                                  {tc.input || "(없음)"}
                                </pre>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400 font-medium mb-1">예상 출력 (전체)</p>
                                <pre className="text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg p-3 whitespace-pre-wrap max-h-48 overflow-y-auto">
                                  {tc.expected_output}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* ── 추가/수정 폼 ── */}
              {formOpen && (
                <div className="bg-white border border-indigo-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-indigo-50/50">
                    <p className="text-sm font-extrabold text-gray-900">
                      {editingId ? "테스트케이스 수정" : "테스트케이스 추가"}
                    </p>
                    <button onClick={() => setFormOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>

                  <div className="p-5 flex flex-col gap-4">
                    {fErr && (
                      <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{fErr}</p>
                    )}

                    {/* ── 기존 형식으로 자동 생성 ── */}
                    {!editingId && cases.some(c => c.input) && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 border border-violet-200 rounded-xl">
                        <Wand2 className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                        <span className="text-xs text-violet-700 font-medium flex-1">
                          기존 케이스 형식으로 새 입력을 랜덤 생성합니다
                          {solCode.trim() ? " (예상 출력도 자동완성)" : ""}
                        </span>
                        <button
                          onClick={autoGenerateFromFormat}
                          disabled={fmtGenLoading}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
                          {fmtGenLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                          자동 생성
                        </button>
                      </div>
                    )}

                    {/* ── 입력 생성기 ── */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setGenOpen(v => !v)}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-2">
                          <Wand2 className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="text-xs font-bold text-gray-700">입력 생성기</span>
                          {genCode.trim()
                            ? <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                            : <span className="text-[11px] text-gray-400">코드를 실행해 입력 데이터를 자동 생성합니다</span>}
                          {genSaving === "saving" && <span className="text-[10px] text-gray-400">저장 중...</span>}
                          {genSaving === "saved"  && <span className="text-[10px] text-indigo-500 font-semibold">저장됨 ✓</span>}
                        </div>
                        {genOpen ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                      </button>
                      {genOpen && (
                        <div className="p-4 flex flex-col gap-3 border-t border-gray-100">
                          <textarea
                            value={genCode}
                            onChange={e => setGenCode(e.target.value)}
                            placeholder={GEN_PLACEHOLDER}
                            rows={6}
                            className={textareaCls}
                          />
                          {genErr && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 font-mono">{genErr}</p>}
                          <button
                            onClick={runGenerator}
                            disabled={genLoading || !genCode.trim()}
                            className="self-start inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
                            {genLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                            실행 → 입력 자동완성
                          </button>
                        </div>
                      )}
                    </div>

                    {/* ── 정답 코드 실행기 ── */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setSolOpen(v => !v)}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-2">
                          <Code2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-xs font-bold text-gray-700">정답 코드 실행</span>
                          {solCode.trim()
                            ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            : <span className="text-[11px] text-gray-400">정답 코드로 예상 출력을 자동 생성합니다</span>}
                          {solSaving === "saving" && <span className="text-[10px] text-gray-400">저장 중...</span>}
                          {solSaving === "saved"  && <span className="text-[10px] text-emerald-600 font-semibold">저장됨 ✓</span>}
                        </div>
                        {solOpen ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                      </button>
                      {solOpen && (
                        <div className="p-4 flex flex-col gap-3 border-t border-gray-100">
                          <div className="flex items-center justify-between">
                            <p className="text-[11px] text-gray-500">
                              아래 입력 textarea의 내용을 stdin으로 사용합니다. 입력 생성기를 먼저 실행하세요.
                            </p>
                            <div className="relative shrink-0">
                              <button
                                onClick={loadCorrectSubs}
                                disabled={correctSubsLoading}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-semibold rounded-lg border border-emerald-200 transition-colors disabled:opacity-50 whitespace-nowrap">
                                {correctSubsLoading
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : <Code2 className="w-3 h-3" />}
                                정답 제출 불러오기
                              </button>
                              {correctSubsOpen && (
                                <div className="absolute right-0 top-full mt-1 z-50 w-64 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                                  <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
                                    <span className="text-[11px] font-bold text-gray-700">정답 제출 목록</span>
                                    <button onClick={() => setCorrectSubsOpen(false)} className="text-gray-400 hover:text-gray-600">
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  {correctSubs.length === 0
                                    ? <p className="px-3 py-4 text-[11px] text-gray-400 text-center">정답 제출이 없습니다</p>
                                    : <ul className="max-h-52 overflow-y-auto divide-y divide-gray-50">
                                        {correctSubs.map(sub => (
                                          <li key={sub.id}>
                                            <button
                                              onClick={() => applyCorrectSub(sub)}
                                              className="w-full text-left px-3 py-2.5 hover:bg-emerald-50 transition-colors">
                                              <p className="text-xs font-semibold text-gray-800">{sub.userName}</p>
                                              <p className="text-[10px] text-gray-400 mt-0.5">
                                                {new Date(sub.createdAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}
                                              </p>
                                            </button>
                                          </li>
                                        ))}
                                      </ul>
                                  }
                                </div>
                              )}
                            </div>
                          </div>
                          <textarea
                            value={solCode}
                            onChange={e => setSolCode(e.target.value)}
                            placeholder={SOL_PLACEHOLDER}
                            rows={6}
                            className={textareaCls}
                          />
                          {solErr && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 font-mono">{solErr}</p>}
                          <button
                            onClick={runSolution}
                            disabled={solLoading || !solCode.trim()}
                            className="self-start inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
                            {solLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                            실행 → 예상 출력 자동완성
                          </button>
                        </div>
                      )}
                    </div>

                    {/* ── 입출력 직접 입력 ── */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-gray-700">
                            입력 <span className="text-gray-400 font-normal">(없으면 빈칸)</span>
                          </label>
                          {fInput && (
                            <span className="text-[10px] text-gray-400">
                              {fInput.split("\n").length}줄 · {fInput.length.toLocaleString()}자
                            </span>
                          )}
                        </div>
                        <textarea
                          value={fInput}
                          onChange={e => setFInput(e.target.value)}
                          placeholder={"5\n1 2 3 4 5"}
                          rows={8}
                          className={textareaCls}
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-gray-700">
                            예상 출력 <span className="text-red-500">*</span>
                          </label>
                          {fOutput && (
                            <span className="text-[10px] text-gray-400">
                              {fOutput.split("\n").length}줄 · {fOutput.length.toLocaleString()}자
                            </span>
                          )}
                        </div>
                        <textarea
                          value={fOutput}
                          onChange={e => setFOutput(e.target.value)}
                          placeholder="15"
                          rows={8}
                          className={textareaCls}
                        />
                      </div>
                    </div>

                    {/* ── 옵션 + 저장 ── */}
                    <div className="flex items-center gap-6 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" checked={fHidden} onChange={e => setFHidden(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                        <span className="text-sm font-semibold text-gray-700">히든 케이스</span>
                        <span className="text-xs text-gray-400">(학생에게 입출력 미표시)</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-semibold text-gray-700">순서</label>
                        <input type="number" min={1} value={fOrder} onChange={e => setFOrder(Number(e.target.value))}
                          className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:border-indigo-400" />
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <button onClick={() => setFormOpen(false)}
                          className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-semibold rounded-xl transition-colors">
                          취소
                        </button>
                        <button onClick={saveCase} disabled={fSaving}
                          className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
                          {fSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          저장
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TestCasesPageWrapper() {
  return (
    <Suspense>
      <TestCasesPage />
    </Suspense>
  )
}
