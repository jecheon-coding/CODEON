"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback, useMemo, Fragment } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  LogOut, Users, BookOpen, ClipboardList, CheckCircle2, XCircle,
  Plus, Search, Pencil, Trash2, Eye, ChevronDown, Save, AlertCircle,
  CheckCheck, X, ArrowLeft, ArrowRight, Loader2, UserCheck, Link2Off,
  FileCheck, Clock,
} from "lucide-react"
import { supabase } from "@/lib/supabase"


// ── 타입 ────────────────────────────────────────────────────────────────────

type Student = {
  id: string; name: string; grade: string | null; class: string | null
  status: string; login_id: string | null; hasParentLink: boolean
}

type Assignment = {
  id: string; title: string; description: string | null
  dueDate: string | null; problemCount: number; studentCount: number
}

type SubmissionRow = {
  studentId: string; studentName: string
  assignmentId: string; assignmentTitle: string; dueDate: string | null
  problemId: string; problemTitle: string
  isSubmitted: boolean; submittedAt: string | null; isCorrect: boolean | null
}

type PendingProblem = {
  id: string; title: string; content: string; difficulty: string
  topic: string | null; problem_type: string; author_name: string | null
  created_at: string; status: string
  input_description?: string | null; output_description?: string | null
  example_input?: string | null; example_output?: string | null; hint?: string | null
}

type LinkRequest = {
  id: string; parent_name: string; student_name: string
  phone: string; relationship: string; created_at: string
}

type Summary = {
  totalStudents: number; pendingStudents: number; unsubmittedCount: number
  pendingProblems: number; pendingLinks: number; unwrittenReviews: number
}

type Problem = { id: string; title: string; category: string; difficulty: string; topic: string | null }

// ── 공통 컴포넌트 ────────────────────────────────────────────────────────────

function SectionCard({
  title, desc, action, children,
}: { title: string; desc?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-gray-100 bg-white">
        <div>
          <h2 className="text-sm font-extrabold text-gray-900 tracking-tight">{title}</h2>
          {desc && <p className="text-xs text-gray-500 mt-0.5 font-medium">{desc}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// 빈 상태 공통 컴포넌트
function EmptyState({ icon: Icon, title, desc }: {
  icon: React.ElementType; title: string; desc?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2">
      <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
        <Icon className="w-5 h-5 text-gray-400" />
      </div>
      <p className="text-sm font-semibold text-gray-600">{title}</p>
      {desc && <p className="text-xs text-gray-400 text-center max-w-[200px] leading-relaxed">{desc}</p>}
    </div>
  )
}

const Btn = {
  primary: "inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50",
  ghost:   "inline-flex items-center gap-1.5 px-2.5 py-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 text-xs font-semibold rounded-lg transition-colors",
  danger:  "inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 text-xs font-semibold rounded-lg transition-colors",
  green:   "inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors",
  outline: "inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold rounded-lg transition-colors",
}

const TH = "px-3 py-2.5 text-left text-[11px] font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap bg-gray-50"
const TD = "px-3 py-3 text-sm text-gray-700 whitespace-nowrap"

function Badge({ variant, size = "sm", children }: {
  variant: "green" | "red" | "blue" | "amber" | "gray" | "indigo" | "sky" | "rose"
  size?: "sm" | "md"
  children: React.ReactNode
}) {
  const cls = {
    green:  "bg-emerald-50 text-emerald-700 border-emerald-200",
    red:    "bg-red-50 text-red-600 border-red-200",
    blue:   "bg-blue-50 text-blue-700 border-blue-200",
    amber:  "bg-amber-50 text-amber-700 border-amber-200",
    gray:   "bg-gray-100 text-gray-600 border-gray-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    sky:    "bg-sky-50 text-sky-700 border-sky-200",
    rose:   "bg-rose-50 text-rose-700 border-rose-200",
  }[variant]
  const sz = size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]"
  return (
    <span className={`inline-flex items-center font-semibold rounded-full border ${cls} ${sz}`}>
      {children}
    </span>
  )
}

function Drawer({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode
}) {
  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />}
      <div className={`fixed right-0 top-0 h-full z-50 w-[480px] max-w-full bg-white shadow-2xl
        transform transition-transform duration-300 flex flex-col
        ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-extrabold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </>
  )
}

const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-gray-400"
const labelCls = "block text-xs font-bold text-gray-700 mb-1.5"

// ── 요약 카드 ────────────────────────────────────────────────────────────────

function SummaryCards({ summary }: { summary: Summary | null }) {
  const cards = [
    {
      label: "전체 학생", value: summary?.totalStudents ?? "…",
      color: "text-indigo-700", bg: "bg-indigo-50", border: "border-l-indigo-500",
      icon: Users, sub: summary ? `대기 ${summary.pendingStudents}명` : "",
    },
    {
      label: "미제출 학생", value: summary?.unsubmittedCount ?? "…",
      color: "text-red-600", bg: "bg-red-50", border: "border-l-red-500",
      icon: ClipboardList, sub: "과제 미완료",
    },
    {
      label: "승인 대기", value: summary?.pendingProblems ?? "…",
      color: "text-amber-700", bg: "bg-amber-50", border: "border-l-amber-500",
      icon: BookOpen, sub: "도전 문제",
    },
    {
      label: "학부모 요청", value: summary?.pendingLinks ?? "…",
      color: "text-sky-700", bg: "bg-sky-50", border: "border-l-sky-500",
      icon: Link2Off, sub: "연결 대기",
    },
    {
      label: "총평 미작성", value: summary?.unwrittenReviews ?? "…",
      color: "text-rose-600", bg: "bg-rose-50", border: "border-l-rose-500",
      icon: FileCheck, sub: "이번 달",
    },
  ]
  return (
    <div className="grid grid-cols-5 gap-4 mb-7">
      {cards.map(({ label, value, color, bg, border, icon: Icon, sub }) => (
        <div key={label}
          className={`bg-white border border-gray-200 border-l-4 ${border} rounded-xl px-4 py-4 shadow-sm hover:shadow-md transition-shadow`}>
          <div className="flex items-center justify-between mb-3">
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <span className="text-[11px] font-semibold text-gray-400">{sub}</span>
          </div>
          <p className={`text-3xl font-extrabold ${color} leading-none mb-1`}>{value}</p>
          <p className="text-xs font-semibold text-gray-600">{label}</p>
        </div>
      ))}
    </div>
  )
}

// ── 학생 관리 ────────────────────────────────────────────────────────────────

function StudentSection({ onRefreshSummary }: { onRefreshSummary: () => void }) {
  const [students, setStudents] = useState<Student[]>([])
  const [search,   setSearch]   = useState("")
  const [drawer,   setDrawer]   = useState<"add" | "edit" | null>(null)
  const [editing,  setEditing]  = useState<Student | null>(null)
  const [form,     setForm]     = useState({ name: "", grade: "", cls: "", loginId: "", password: "" })
  const [saving,   setSaving]   = useState(false)
  const [err,      setErr]      = useState("")

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/students")
    if (res.ok) setStudents(await res.json())
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() =>
    students.filter(s =>
      !search.trim() ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.grade ?? "").includes(search)
    ), [students, search])

  async function handleSave() {
    setSaving(true); setErr("")
    if (drawer === "add") {
      const res = await fetch("/api/admin/students", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, grade: form.grade, cls: form.cls, loginId: form.loginId, password: form.password }),
      })
      if (!res.ok) { const d = await res.json(); setErr(d.error); setSaving(false); return }
    } else if (editing) {
      const res = await fetch(`/api/admin/students/${editing.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, grade: form.grade, cls: form.cls }),
      })
      if (!res.ok) { const d = await res.json(); setErr(d.error); setSaving(false); return }
    }
    setSaving(false); setDrawer(null); setForm({ name: "", grade: "", cls: "", loginId: "", password: "" })
    load(); onRefreshSummary()
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" 학생을 비활성화 처리하시겠습니까?`)) return
    await fetch(`/api/admin/students/${id}`, { method: "DELETE" })
    load(); onRefreshSummary()
  }

  const activeCount = students.filter(s => s.status === "active").length

  return (
    <>
      <SectionCard
        title="학생 관리"
        desc={`활성 ${activeCount}명 · 전체 ${students.length}명`}
        action={
          <button className={Btn.primary} onClick={() => {
            setForm({ name: "", grade: "", cls: "", loginId: "", password: "" })
            setErr("")
            setDrawer("add")
          }}>
            <Plus className="w-3.5 h-3.5" /> 학생 등록
          </button>
        }
      >
        {/* 검색창 */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="이름 또는 학년 검색…"
            className="w-full pl-8 pr-3 py-2 h-9 text-sm border border-gray-200 rounded-lg
              focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={Users}
            title={search ? "검색 결과가 없습니다" : "등록된 학생이 없습니다"}
            desc={search ? undefined : "학생 등록 버튼으로 첫 학생을 추가하세요"} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={TH}>이름</th>
                  <th className={TH}>학년·반</th>
                  <th className={TH}>상태</th>
                  <th className={TH}>학부모</th>
                  <th className={`${TH} text-right`}>관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className={TD}>
                      <span className="font-bold text-gray-900">{s.name}</span>
                      {s.login_id && <span className="ml-1.5 text-[11px] text-gray-400">{s.login_id}</span>}
                    </td>
                    <td className={TD}>
                      <span className="text-gray-700">{[s.grade, s.class].filter(Boolean).join(" ") || <span className="text-gray-300">—</span>}</span>
                    </td>
                    <td className="px-3 py-3">
                      {s.status === "active"  ? <Badge variant="green">활성</Badge>
                     : s.status === "pending" ? <Badge variant="amber">대기</Badge>
                     : <Badge variant="gray">비활성</Badge>}
                    </td>
                    <td className="px-3 py-3">
                      {s.hasParentLink
                        ? <Badge variant="sky">연결됨</Badge>
                        : <span className="text-[11px] text-gray-400 font-medium">미연결</span>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          title="수정"
                          className={Btn.ghost}
                          onClick={() => {
                            setEditing(s)
                            setErr("")
                            setForm({ name: s.name, grade: s.grade ?? "", cls: s.class ?? "", loginId: s.login_id ?? "", password: "" })
                            setDrawer("edit")
                          }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="비활성화"
                          className={Btn.danger}
                          onClick={() => handleDelete(s.id, s.name)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <Drawer open={!!drawer} onClose={() => setDrawer(null)}
        title={drawer === "add" ? "학생 등록" : "학생 정보 수정"}>
        <div className="flex flex-col gap-4">
          {err && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />{err}
            </div>
          )}
          <div>
            <label className={labelCls}>이름 <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className={inputCls} placeholder="홍길동" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>학년</label>
              <input value={form.grade} onChange={e => setForm(p => ({ ...p, grade: e.target.value }))}
                className={inputCls} placeholder="초5" />
            </div>
            <div>
              <label className={labelCls}>반/과정</label>
              <input value={form.cls} onChange={e => setForm(p => ({ ...p, cls: e.target.value }))}
                className={inputCls} placeholder="파이썬기초A" />
            </div>
          </div>
          {drawer === "add" && (
            <>
              <div>
                <label className={labelCls}>로그인 ID <span className="text-red-500">*</span></label>
                <input value={form.loginId} onChange={e => setForm(p => ({ ...p, loginId: e.target.value }))}
                  className={inputCls} placeholder="student01" />
              </div>
              <div>
                <label className={labelCls}>초기 비밀번호 <span className="text-red-500">*</span></label>
                <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className={inputCls} placeholder="••••••••" />
              </div>
            </>
          )}
          <button onClick={handleSave} disabled={saving}
            className={`${Btn.primary} w-full justify-center py-2.5 mt-1`}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {drawer === "add" ? "등록하기" : "저장하기"}
          </button>
        </div>
      </Drawer>
    </>
  )
}

// ── 공통 유틸 ────────────────────────────────────────────────────────────────

const TOPICS = ["전체", "출력", "입력", "입출력", "조건문", "반복문", "중첩반복문", "문자열", "리스트", "함수", "알고리즘기초"]

function assignmentStatus(dueDate: string | null): { label: string; variant: "blue" | "gray" | "green" } {
  if (!dueDate) return { label: "진행중", variant: "blue" }
  const due = new Date(dueDate)
  if (due > new Date()) return { label: "진행중", variant: "blue" }
  return { label: "마감", variant: "gray" }
}

function ProgressBar({ submitted, total }: { submitted: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((submitted / total) * 100)
  const color = pct === 100 ? "bg-emerald-500" : pct >= 60 ? "bg-indigo-500" : pct > 0 ? "bg-amber-500" : "bg-red-400"
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold w-7 text-right shrink-0 ${pct === 0 ? "text-red-500" : "text-gray-700"}`}>{pct}%</span>
    </div>
  )
}

// ── 과제 관리 ────────────────────────────────────────────────────────────────

function AssignmentSection() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [showModal,   setShowModal]   = useState(false)
  const [step,        setStep]        = useState(1)
  const [problems,    setProblems]    = useState<Problem[]>([])
  const [students,    setStudents]    = useState<Student[]>([])
  const [selProblems, setSelProblems] = useState<Set<string>>(new Set())
  const [selStudents, setSelStudents] = useState<Set<string>>(new Set())
  const [title,       setTitle]       = useState("")
  const [dueDate,     setDueDate]     = useState("")
  const [saving,      setSaving]      = useState(false)

  // step 1 필터
  const [pSearch, setPSearch] = useState("")
  const [pTopic,  setPTopic]  = useState("전체")
  const [pDiff,   setPDiff]   = useState<string[]>([])
  const [pSort,   setPSort]   = useState<"title" | "difficulty">("title")
  const [pView,   setPView]   = useState<"all" | "selected">("all")

  // step 2 필터
  const [sSearch, setSSearch] = useState("")

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/assignments")
    if (res.ok) setAssignments(await res.json())
  }, [])

  useEffect(() => { load() }, [load])

  async function openCreate() {
    const [pr, sr] = await Promise.all([
      supabase.from("problems").select("id, title, category, difficulty, topic").eq("status", "published").order("title"),
      fetch("/api/admin/students").then(r => r.json()),
    ])
    setProblems(pr.data ?? [])
    setStudents(sr)
    setSelProblems(new Set()); setSelStudents(new Set())
    setTitle(""); setDueDate(""); setStep(1); setShowModal(true)
    setPSearch(""); setPTopic("전체"); setPDiff([]); setPSort("title"); setPView("all")
    setSSearch("")
  }

  async function handleCreate() {
    if (!title.trim()) return
    setSaving(true)
    await fetch("/api/admin/assignments", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title, dueDate: dueDate || null,
        problemIds: [...selProblems], studentIds: [...selStudents],
      }),
    })
    setSaving(false); setShowModal(false); load()
  }

  async function handleDelete(id: string, t: string) {
    if (!confirm(`"${t}" 과제를 삭제하시겠습니까?`)) return
    await fetch(`/api/admin/assignments/${id}`, { method: "DELETE" })
    load()
  }

  const filteredProblems = useMemo(() => {
    let list = problems
    if (pView === "selected") list = list.filter(p => selProblems.has(p.id))
    if (pSearch.trim()) list = list.filter(p => p.title.includes(pSearch.trim()))
    if (pTopic !== "전체") list = list.filter(p => p.topic === pTopic || p.category === pTopic)
    if (pDiff.length > 0) list = list.filter(p => pDiff.includes(p.difficulty))
    if (pSort === "difficulty") {
      const order = { "하": 0, "중": 1, "상": 2 }
      list = [...list].sort((a, b) => (order[a.difficulty as keyof typeof order] ?? 1) - (order[b.difficulty as keyof typeof order] ?? 1))
    }
    return list
  }, [problems, pSearch, pTopic, pDiff, pSort, pView, selProblems])

  const filteredStudents = useMemo(() => {
    let list = students.filter(s => s.status === "active")
    if (sSearch.trim()) list = list.filter(s => s.name.includes(sSearch.trim()))
    return list
  }, [students, sSearch])

  function toggleDiff(d: string) {
    setPDiff(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  const diffCounts = useMemo(() => {
    const sel = problems.filter(p => selProblems.has(p.id))
    return { 하: sel.filter(p => p.difficulty === "하").length, 중: sel.filter(p => p.difficulty === "중").length, 상: sel.filter(p => p.difficulty === "상").length }
  }, [problems, selProblems])

  return (
    <>
      <SectionCard
        title="과제 관리"
        desc={`총 ${assignments.length}개 과제`}
        action={<button className={Btn.primary} onClick={openCreate}><Plus className="w-3.5 h-3.5" /> 과제 생성</button>}
      >
        {assignments.length === 0 ? (
          <EmptyState icon={ClipboardList} title="등록된 과제가 없습니다" desc="과제 생성 버튼으로 첫 과제를 배정하세요" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={TH}>과제명</th>
                  <th className={TH}>문제</th>
                  <th className={TH}>학생</th>
                  <th className={TH}>마감일</th>
                  <th className={TH}>상태</th>
                  <th className={`${TH} text-right`}>관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {assignments.map(a => {
                  const st = assignmentStatus(a.dueDate)
                  return (
                    <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className={TD}><span className="font-bold text-gray-900">{a.title}</span></td>
                      <td className={TD}><span className="text-gray-600">{a.problemCount}문제</span></td>
                      <td className={TD}><span className="text-gray-600">{a.studentCount}명</span></td>
                      <td className={TD}>
                        {a.dueDate
                          ? <span className="text-gray-700">{new Date(a.dueDate).toLocaleDateString("ko-KR")}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-3"><Badge variant={st.variant}>{st.label}</Badge></td>
                      <td className="px-3 py-3 text-right">
                        <button title="삭제" className={Btn.danger} onClick={() => handleDelete(a.id, a.title)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">

            {/* 스텝 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                {([1,2,3] as const).map(n => (
                  <div key={n} className="flex items-center gap-2">
                    {n > 1 && <div className="w-8 h-px bg-gray-200" />}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                      ${step === n ? "bg-indigo-600 text-white" : step > n ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-400"}`}>
                      {step > n ? <CheckCircle2 className="w-3.5 h-3.5" /> : n}
                    </div>
                    <span className={`text-xs font-semibold ${step === n ? "text-gray-900" : "text-gray-400"}`}>
                      {n === 1 ? "문제 선택" : n === 2 ? "학생 선택" : "마감일 설정"}
                    </span>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Step 1: 문제 선택 */}
            {step === 1 && (
              <>
                {/* sticky 필터바 */}
                <div className="shrink-0 px-4 pt-3 pb-2.5 border-b border-gray-100 bg-white space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input value={pSearch} onChange={e => setPSearch(e.target.value)} placeholder="문제 검색…"
                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 bg-white" />
                    </div>
                    <select value={pTopic} onChange={e => setPTopic(e.target.value)}
                      className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-indigo-400 text-gray-700 shrink-0">
                      {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select value={pSort} onChange={e => setPSort(e.target.value as "title" | "difficulty")}
                      className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-indigo-400 text-gray-700 shrink-0">
                      <option value="title">가나다순</option>
                      <option value="difficulty">난이도순</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {(["하","중","상"] as const).map(d => (
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
                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                      {(["all","selected"] as const).map(v => (
                        <button key={v} onClick={() => setPView(v)}
                          className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-md transition-all
                            ${pView === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                          {v === "all" ? `전체 ${problems.length}` : `선택됨 ${selProblems.size}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 문제 목록 */}
                <div className="flex-1 overflow-y-auto">
                  {filteredProblems.length === 0 ? (
                    <div className="flex items-center justify-center py-10 text-sm text-gray-400">검색 결과 없음</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10">
                        <tr>
                          <th className={TH + " w-10"}></th>
                          <th className={TH}>문제명</th>
                          <th className={TH}>토픽</th>
                          <th className={TH}>난이도</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredProblems.map(p => (
                          <tr key={p.id}
                            onClick={() => setSelProblems(prev => { const next = new Set(prev); next.has(p.id) ? next.delete(p.id) : next.add(p.id); return next })}
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
                            <td className="px-3 py-2.5">
                              <span className="text-[11px] text-gray-500">{p.topic ?? p.category ?? "—"}</span>
                            </td>
                            <td className="px-3 py-2.5">
                              <Badge variant={p.difficulty === "하" ? "green" : p.difficulty === "중" ? "amber" : "red"} size="sm">{p.difficulty}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* 선택 요약 바 */}
                {selProblems.size > 0 && (
                  <div className="shrink-0 px-4 py-2 bg-indigo-50 border-t border-indigo-100 flex items-center gap-2 text-xs font-semibold text-indigo-700">
                    <span>{selProblems.size}개 선택됨</span>
                    <span className="text-indigo-300">|</span>
                    <span className="font-normal text-indigo-500">
                      {[diffCounts["하"] > 0 && `하 ${diffCounts["하"]}`, diffCounts["중"] > 0 && `중 ${diffCounts["중"]}`, diffCounts["상"] > 0 && `상 ${diffCounts["상"]}`].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Step 2: 학생 선택 */}
            {step === 2 && (
              <>
                <div className="shrink-0 px-4 pt-3 pb-2.5 border-b border-gray-100 bg-white">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input value={sSearch} onChange={e => setSSearch(e.target.value)} placeholder="학생 검색…"
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
                    }} className={Btn.outline}>전체 선택</button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {filteredStudents.length === 0 ? (
                    <div className="flex items-center justify-center py-10 text-sm text-gray-400">검색 결과 없음</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10">
                        <tr>
                          <th className={TH + " w-10"}></th>
                          <th className={TH}>이름</th>
                          <th className={TH}>학년·반</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredStudents.map(s => (
                          <tr key={s.id}
                            onClick={() => setSelStudents(prev => { const next = new Set(prev); next.has(s.id) ? next.delete(s.id) : next.add(s.id); return next })}
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
                  <div className="shrink-0 px-4 py-2 bg-indigo-50 border-t border-indigo-100 text-xs font-semibold text-indigo-700">
                    {selStudents.size}명 선택됨
                  </div>
                )}
              </>
            )}

            {/* Step 3: 마감일 설정 */}
            {step === 3 && (
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="flex flex-col gap-4">
                  <div>
                    <label className={labelCls}>과제명 <span className="text-red-500">*</span></label>
                    <input value={title} onChange={e => setTitle(e.target.value)} className={inputCls}
                      placeholder="예: 1주차 파이썬 기초 과제" />
                  </div>
                  <div>
                    <label className={labelCls}>마감일</label>
                    <input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputCls} />
                  </div>
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm space-y-1.5">
                    <p className="text-xs font-bold text-indigo-700 mb-2">배정 요약</p>
                    <p className="text-gray-700"><span className="font-semibold">문제:</span> {selProblems.size}개</p>
                    <p className="text-gray-700"><span className="font-semibold">학생:</span> {selStudents.size}명</p>
                  </div>
                </div>
              </div>
            )}

            {/* 하단 네비게이션 */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 shrink-0">
              <button onClick={() => setStep(s => s - 1)} disabled={step === 1}
                className={`${Btn.outline} ${step === 1 ? "invisible" : ""}`}>
                <ArrowLeft className="w-3.5 h-3.5" /> 이전
              </button>
              {step < 3
                ? <button onClick={() => setStep(s => s + 1)}
                    disabled={step === 1 && selProblems.size === 0}
                    className={Btn.primary}>
                    다음 <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                : <button onClick={handleCreate} disabled={saving || !title.trim()} className={Btn.green}>
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    과제 생성
                  </button>
              }
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── 과제 제출 현황 ────────────────────────────────────────────────────────────

type SubViewMode = "student" | "assignment" | "detail"

function SubmissionSection() {
  const [rows,         setRows]         = useState<SubmissionRow[]>([])
  const [loading,      setLoading]      = useState(true)
  const [viewMode,     setViewMode]     = useState<SubViewMode>("student")
  const [expanded,     setExpanded]     = useState<Set<string>>(new Set())
  const [detailSearch, setDetailSearch] = useState("")
  const [detailFilter, setDetailFilter] = useState<"all" | "unsubmitted" | "correct" | "wrong">("all")

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/admin/submissions?filter=all")
    if (res.ok) setRows(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function toggleExpand(key: string) {
    setExpanded(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next })
  }

  const studentSummaries = useMemo(() => {
    const map = new Map<string, { studentId: string; studentName: string; problems: SubmissionRow[] }>()
    for (const r of rows) {
      if (!map.has(r.studentId)) map.set(r.studentId, { studentId: r.studentId, studentName: r.studentName, problems: [] })
      map.get(r.studentId)!.problems.push(r)
    }
    return [...map.values()].sort((a, b) => {
      const ra = a.problems.filter(p => p.isSubmitted).length / (a.problems.length || 1)
      const rb = b.problems.filter(p => p.isSubmitted).length / (b.problems.length || 1)
      return ra - rb
    })
  }, [rows])

  const assignmentSummaries = useMemo(() => {
    const map = new Map<string, { assignmentId: string; assignmentTitle: string; dueDate: string | null; problems: SubmissionRow[] }>()
    for (const r of rows) {
      if (!map.has(r.assignmentId)) map.set(r.assignmentId, { assignmentId: r.assignmentId, assignmentTitle: r.assignmentTitle, dueDate: r.dueDate, problems: [] })
      map.get(r.assignmentId)!.problems.push(r)
    }
    return [...map.values()].sort((a, b) => (b.dueDate ?? "").localeCompare(a.dueDate ?? ""))
  }, [rows])

  const detailRows = useMemo(() => {
    let list = rows
    if (detailSearch.trim()) list = list.filter(r => r.studentName.includes(detailSearch.trim()) || r.problemTitle.includes(detailSearch.trim()))
    if (detailFilter === "unsubmitted") list = list.filter(r => !r.isSubmitted)
    else if (detailFilter === "correct") list = list.filter(r => r.isCorrect === true)
    else if (detailFilter === "wrong")   list = list.filter(r => r.isCorrect === false)
    return list
  }, [rows, detailSearch, detailFilter])

  function submissionBadge(row: SubmissionRow) {
    if (!row.isSubmitted)        return <Badge variant="red"   size="sm">미제출</Badge>
    if (row.isCorrect === true)  return <Badge variant="blue"  size="sm">채점완료</Badge>
    if (row.isCorrect === false) return <Badge variant="amber" size="sm">재제출 필요</Badge>
    return                              <Badge variant="green" size="sm">제출완료</Badge>
  }

  const unsubCount = rows.filter(r => !r.isSubmitted).length

  return (
    <SectionCard
      title="과제 제출 현황"
      desc={`${unsubCount}건 미제출 · 전체 ${rows.length}건`}
      action={
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {(["student","assignment","detail"] as const).map(v => (
            <button key={v} onClick={() => setViewMode(v)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all
                ${viewMode === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {v === "student" ? "학생별" : v === "assignment" ? "과제별" : "상세"}
            </button>
          ))}
        </div>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={ClipboardList} title="배정된 과제가 없습니다" />
      ) : (
        <>
          {/* ─ 학생별 뷰 ─ */}
          {viewMode === "student" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className={TH}>학생</th>
                    <th className={TH}>전체</th>
                    <th className={TH}>제출</th>
                    <th className={TH}>미제출</th>
                    <th className={TH + " min-w-[120px]"}>제출률</th>
                    <th className={TH}>최근 제출</th>
                    <th className={`${TH} w-8`}></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {studentSummaries.map(({ studentId, studentName, problems }) => {
                    const submitted = problems.filter(p => p.isSubmitted).length
                    const total = problems.length
                    const unsub = total - submitted
                    const lastSub = problems.filter(p => p.submittedAt).sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""))[0]
                    const isExp = expanded.has(studentId)
                    const isZero = submitted === 0
                    return (
                      <Fragment key={studentId}>
                        <tr onClick={() => toggleExpand(studentId)}
                          className={`cursor-pointer transition-colors ${isZero ? "bg-red-50/50 hover:bg-red-50/80" : "hover:bg-slate-50/60"}`}>
                          <td className={TD}><span className={`font-bold ${isZero ? "text-red-700" : "text-gray-900"}`}>{studentName}</span></td>
                          <td className={TD}><span className="text-gray-600">{total}</span></td>
                          <td className={TD}><span className="text-emerald-600 font-semibold">{submitted}</span></td>
                          <td className={TD}>
                            {unsub > 0 ? <span className="text-red-500 font-semibold">{unsub}</span> : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-3 py-3"><ProgressBar submitted={submitted} total={total} /></td>
                          <td className={TD}>
                            {lastSub?.submittedAt
                              ? <span className="text-gray-600 text-xs">{new Date(lastSub.submittedAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                              : <span className="text-gray-300 text-xs">없음</span>}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExp ? "rotate-180" : ""}`} />
                          </td>
                        </tr>
                        {isExp && problems.map((p, i) => (
                          <tr key={`${studentId}-${p.problemId}-${i}`} className="bg-gray-50/80 border-l-2 border-indigo-200">
                            <td className="px-3 py-2 pl-8"><span className="text-xs text-gray-500">{p.assignmentTitle}</span></td>
                            <td className="px-3 py-2" colSpan={3}>
                              <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">{p.problemTitle}</span>
                            </td>
                            <td className="px-3 py-2">{submissionBadge(p)}</td>
                            <td className="px-3 py-2" colSpan={2}>
                              <span className="text-xs text-gray-500">
                                {p.submittedAt ? new Date(p.submittedAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ─ 과제별 뷰 ─ */}
          {viewMode === "assignment" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className={TH}>과제명</th>
                    <th className={TH}>학생</th>
                    <th className={TH}>완료</th>
                    <th className={TH}>미완료</th>
                    <th className={TH + " min-w-[120px]"}>제출률</th>
                    <th className={TH}>마감일</th>
                    <th className={`${TH} w-8`}></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {assignmentSummaries.map(({ assignmentId, assignmentTitle, dueDate, problems }) => {
                    const studentIds = [...new Set(problems.map(p => p.studentId))]
                    const doneStudents = studentIds.filter(sid => {
                      const sprobs = problems.filter(p => p.studentId === sid)
                      return sprobs.every(p => p.isSubmitted)
                    }).length
                    const submitted = problems.filter(p => p.isSubmitted).length
                    const total = problems.length
                    const isExp = expanded.has(assignmentId)
                    return (
                      <Fragment key={assignmentId}>
                        <tr onClick={() => toggleExpand(assignmentId)}
                          className="cursor-pointer hover:bg-slate-50/60 transition-colors">
                          <td className={TD}><span className="font-bold text-gray-900">{assignmentTitle}</span></td>
                          <td className={TD}><span className="text-gray-600">{studentIds.length}명</span></td>
                          <td className={TD}><span className="text-emerald-600 font-semibold">{doneStudents}명</span></td>
                          <td className={TD}>
                            {studentIds.length - doneStudents > 0
                              ? <span className="text-red-500 font-semibold">{studentIds.length - doneStudents}명</span>
                              : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-3 py-3"><ProgressBar submitted={submitted} total={total} /></td>
                          <td className={TD}>
                            {dueDate
                              ? <span className="text-xs text-gray-600">{new Date(dueDate).toLocaleDateString("ko-KR")}</span>
                              : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExp ? "rotate-180" : ""}`} />
                          </td>
                        </tr>
                        {isExp && studentIds.map(sid => {
                          const sprobs = problems.filter(p => p.studentId === sid)
                          const sname = sprobs[0]?.studentName ?? sid
                          const subCount = sprobs.filter(p => p.isSubmitted).length
                          return (
                            <tr key={`${assignmentId}-${sid}`} className="bg-gray-50/80 border-l-2 border-indigo-200">
                              <td className="px-3 py-2 pl-8">
                                <span className={`text-xs font-semibold ${subCount === 0 ? "text-red-600" : "text-gray-700"}`}>{sname}</span>
                              </td>
                              <td className="px-3 py-2" colSpan={3}>
                                <span className="text-xs text-gray-500">{subCount}/{sprobs.length} 제출</span>
                              </td>
                              <td className="px-3 py-2" colSpan={3}>
                                <div className="flex flex-wrap gap-1">
                                  {sprobs.map((p, pi) => (
                                    <span key={pi} className={`text-[10px] px-1.5 py-0.5 rounded font-medium border
                                      ${!p.isSubmitted ? "bg-red-50 text-red-600 border-red-100"
                                        : p.isCorrect === true ? "bg-blue-50 text-blue-700 border-blue-100"
                                        : p.isCorrect === false ? "bg-amber-50 text-amber-700 border-amber-100"
                                        : "bg-emerald-50 text-emerald-700 border-emerald-100"}`}>
                                      {p.problemTitle}
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ─ 상세 뷰 ─ */}
          {viewMode === "detail" && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input value={detailSearch} onChange={e => setDetailSearch(e.target.value)}
                    placeholder="학생명 또는 문제명 검색…"
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 bg-white" />
                </div>
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                  {([
                    { key: "all",         label: "전체" },
                    { key: "unsubmitted", label: "미제출" },
                    { key: "correct",     label: "채점완료" },
                    { key: "wrong",       label: "재제출" },
                  ] as const).map(({ key, label }) => (
                    <button key={key} onClick={() => setDetailFilter(key)}
                      className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-md transition-all
                        ${detailFilter === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className={TH}>학생</th>
                      <th className={TH}>과제명</th>
                      <th className={TH}>문제</th>
                      <th className={TH}>상태</th>
                      <th className={TH}>제출 시간</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {detailRows.length === 0 ? (
                      <tr><td colSpan={5} className="py-10 text-center text-sm text-gray-400">검색 결과 없음</td></tr>
                    ) : detailRows.map((r, i) => (
                      <tr key={i} className={`transition-colors ${!r.isSubmitted ? "bg-red-50/40 hover:bg-red-50/60" : "hover:bg-slate-50/60"}`}>
                        <td className={TD}><span className="font-bold text-gray-900">{r.studentName}</span></td>
                        <td className="px-3 py-3"><span className="text-gray-600 text-sm">{r.assignmentTitle}</span></td>
                        <td className="px-3 py-3">
                          <span className="text-sm font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">{r.problemTitle}</span>
                        </td>
                        <td className="px-3 py-3">{submissionBadge(r)}</td>
                        <td className={TD}>
                          {r.submittedAt
                            ? <span className="text-gray-700">{new Date(r.submittedAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                            : <span className="text-gray-300 font-medium">미제출</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </SectionCard>
  )
}

// ── 문제 승인 관리 ────────────────────────────────────────────────────────────

function ProblemApprovalSection({ onRefreshSummary }: { onRefreshSummary: () => void }) {
  const [problems,     setProblems]     = useState<PendingProblem[]>([])
  const [pendingOnly,  setPendingOnly]  = useState(true)
  const [selected,     setSelected]     = useState<PendingProblem | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [acting,       setActing]       = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("problems")
      .select("id, title, content, difficulty, topic, problem_type, author_user_id, created_at, status, input_description, output_description, hint")
      .eq("is_community", true)
      .order("created_at", { ascending: true })

    const probs = data ?? []
    const authorIds = [...new Set(probs.map(p => p.author_user_id).filter(Boolean))]
    const authorMap: Record<string, string> = {}
    if (authorIds.length > 0) {
      const { data: authors } = await supabase
        .from("users").select("id, name").in("id", authorIds as string[])
      for (const a of authors ?? []) authorMap[a.id] = a.name
    }
    setProblems(probs.map(p => ({
      ...p,
      problem_type: p.problem_type ?? "output",
      author_name: p.author_user_id ? (authorMap[p.author_user_id] ?? "알 수 없음") : null,
    })))
  }, [])

  useEffect(() => { load() }, [load])

  async function act(action: "approve" | "reject") {
    if (!selected) return
    setActing(true)
    await fetch("/api/admin/challenge-review", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problemId: selected.id, action, rejectReason }),
    })
    setActing(false); setSelected(null); setRejectReason(""); load(); onRefreshSummary()
  }

  const displayed = pendingOnly ? problems.filter(p => p.status === "pending") : problems

  return (
    <>
      <SectionCard
        title="문제 승인 관리"
        desc="학생 제작 도전 문제 검토"
        action={
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={pendingOnly} onChange={e => setPendingOnly(e.target.checked)}
              className="w-4 h-4 accent-indigo-600 rounded" />
            <span className="text-xs font-semibold text-gray-700">대기만 보기</span>
          </label>
        }
      >
        {displayed.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="현재 승인 대기 문제가 없습니다"
            desc="학생이 도전 문제를 제출하면 이곳에서 검토할 수 있습니다"
          />
        ) : (
          <div className="flex flex-col gap-1.5">
            {displayed.map(p => (
              <div key={p.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100
                  hover:border-indigo-200 hover:bg-indigo-50/20 cursor-pointer transition-all"
                onClick={() => { setSelected(p); setRejectReason("") }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <Badge variant={p.difficulty === "하" ? "green" : p.difficulty === "중" ? "amber" : "red"}>{p.difficulty}</Badge>
                    <Badge variant="indigo">{p.problem_type === "io" ? "입력/출력" : "출력"}</Badge>
                    {p.status === "pending"   && <Badge variant="amber">검토 대기</Badge>}
                    {p.status === "published" && <Badge variant="green">공개됨</Badge>}
                    {p.status === "hidden"    && <Badge variant="gray">반려됨</Badge>}
                  </div>
                  <p className="text-sm font-bold text-gray-900 truncate">{p.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {p.author_name ?? "학생"} · {new Date(p.created_at).toLocaleDateString("ko-KR")}
                  </p>
                </div>
                <Eye className="w-4 h-4 text-gray-400 shrink-0" />
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title="문제 검토">
        {selected && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={selected.difficulty === "하" ? "green" : selected.difficulty === "중" ? "amber" : "red"} size="md">{selected.difficulty}</Badge>
              <Badge variant="indigo" size="md">{selected.problem_type === "io" ? "입력/출력" : "출력"}</Badge>
              {selected.topic && <Badge variant="gray" size="md"># {selected.topic}</Badge>}
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">문제 제목</p>
              <p className="text-base font-extrabold text-gray-900">{selected.title}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">문제 설명</p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-xl p-4 border border-gray-100">
                {selected.content}
              </p>
            </div>
            {selected.input_description && (
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">입력 형식</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4 border border-gray-100">{selected.input_description}</p>
              </div>
            )}
            {selected.output_description && (
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">출력 형식</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4 border border-gray-100">{selected.output_description}</p>
              </div>
            )}
            {selected.hint && (
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">힌트</p>
                <p className="text-sm text-amber-800 bg-amber-50 rounded-xl p-4 border border-amber-100">{selected.hint}</p>
              </div>
            )}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-600 mb-2">반려 사유 <span className="font-normal text-gray-400">(선택)</span></p>
              <input value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                className={`${inputCls} mb-3`}
                placeholder="예: 문제 설명이 불명확합니다" />
              <div className="flex gap-2">
                <button className={`${Btn.green} flex-1 justify-center py-2.5`}
                  onClick={() => act("approve")} disabled={acting}>
                  {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  공개 승인
                </button>
                <button className={`${Btn.danger} flex-1 justify-center py-2.5`}
                  onClick={() => act("reject")} disabled={acting}>
                  <XCircle className="w-4 h-4" /> 반려
                </button>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </>
  )
}

// ── 학부모 연결 요청 ──────────────────────────────────────────────────────────

function ParentLinkSection({ onRefreshSummary }: { onRefreshSummary: () => void }) {
  const [requests, setRequests] = useState<LinkRequest[]>([])
  const [acting,   setActing]   = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/parent-requests")
    if (res.ok) { const d = await res.json(); setRequests(d.requests ?? []) }
  }, [])

  useEffect(() => { load() }, [load])

  async function act(reqId: string, action: "approve" | "reject") {
    setActing(p => ({ ...p, [reqId]: true }))
    await fetch(`/api/admin/parent-requests/${reqId}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    })
    setActing(p => ({ ...p, [reqId]: false }))
    load(); onRefreshSummary()
  }

  return (
    <SectionCard title="학부모 연결 요청" desc="대기 중인 학부모 연결 요청">
      {requests.length === 0 ? (
        <EmptyState icon={UserCheck} title="대기 중인 요청이 없습니다" desc="학부모가 연결을 요청하면 이곳에서 처리할 수 있습니다" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={TH}>학생명</th>
                <th className={TH}>학부모</th>
                <th className={TH}>요청일</th>
                <th className={`${TH} text-right`}>처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map(r => (
                <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className={TD}><span className="font-bold text-gray-900">{r.student_name}</span></td>
                  <td className={TD}>
                    <span className="text-gray-700">{r.parent_name}</span>
                    <span className="ml-1.5 text-xs text-gray-400">({r.relationship})</span>
                  </td>
                  <td className={TD}>{new Date(r.created_at).toLocaleDateString("ko-KR")}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button className={Btn.green} onClick={() => act(r.id, "approve")} disabled={acting[r.id]}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> 승인
                      </button>
                      <button className={Btn.danger} onClick={() => act(r.id, "reject")} disabled={acting[r.id]}>
                        <XCircle className="w-3.5 h-3.5" /> 거절
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  )
}

// ── 학부모 월 총평 ────────────────────────────────────────────────────────────

function MonthlyReviewSection() {
  const [activeStudents, setActiveStudents] = useState<Student[]>([])
  const [studentId, setStudentId] = useState("")
  const [month,     setMonth]     = useState(() => new Date().toISOString().slice(0, 7))
  const [form,      setForm]      = useState({ summary: "", tip1: "", tip2: "", nextPlan: "" })
  const [loaded,    setLoaded]    = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [savedAt,   setSavedAt]   = useState<"save" | "draft" | null>(null)
  const [err,       setErr]       = useState("")

  useEffect(() => {
    fetch("/api/admin/students").then(r => r.json()).then(d =>
      setActiveStudents(d.filter((s: Student) => s.status === "active"))
    )
  }, [])

  useEffect(() => {
    if (!studentId) { setForm({ summary: "", tip1: "", tip2: "", nextPlan: "" }); setLoaded(false); return }
    setLoaded(false); setSavedAt(null); setErr("")
    fetch(`/api/admin/feedback?studentId=${studentId}&month=${month}`)
      .then(r => r.json())
      .then(d => {
        setForm({
          summary:  d?.summary   ?? "",
          tip1:     d?.tip1      ?? "",
          tip2:     d?.tip2      ?? "",
          nextPlan: d?.next_plan ?? "",
        })
        setLoaded(true)
      })
  }, [studentId, month])

  async function loadPrevMonth() {
    const [y, m] = month.split("-").map(Number)
    const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`
    const res = await fetch(`/api/admin/feedback?studentId=${studentId}&month=${prev}`)
    const d = await res.json()
    if (d) setForm({ summary: d.summary ?? "", tip1: d.tip1 ?? "", tip2: d.tip2 ?? "", nextPlan: d.next_plan ?? "" })
  }

  async function handleSave(type: "save" | "draft") {
    setSaving(true); setSavedAt(null); setErr("")
    const res = await fetch("/api/admin/feedback", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, month, ...form }),
    })
    setSaving(false)
    if (res.ok) setSavedAt(type)
    else { const d = await res.json(); setErr(d.error) }
  }

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i)
    return d.toISOString().slice(0, 7)
  })

  const fields = [
    { key: "summary",  label: "이번 달 학습 내용",  rows: 3, placeholder: "이번 달에 학습한 주요 내용을 입력하세요\n예: 반복문(for/while), 리스트 기초, 간단한 알고리즘 문제" },
    { key: "tip1",     label: "잘한 점",            rows: 2, placeholder: "학생이 특히 잘한 부분이나 성장한 점을 입력하세요" },
    { key: "tip2",     label: "보완할 점",           rows: 2, placeholder: "보완이 필요한 부분을 입력하세요" },
    { key: "nextPlan", label: "다음 달 학습 방향",   rows: 2, placeholder: "다음 달 지도 방향과 목표를 입력하세요" },
  ]

  return (
    <SectionCard title="학부모 월 총평 작성" desc="학생별 월간 학습 총평">
      {/* 선택 영역 */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <select value={studentId} onChange={e => setStudentId(e.target.value)}
            className={`${inputCls} appearance-none pr-8 h-9`}>
            <option value="">— 학생 선택 —</option>
            {activeStudents.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}{s.grade ? ` (${s.grade}${s.class ? " " + s.class : ""})` : ""}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select value={month} onChange={e => setMonth(e.target.value)}
            className={`${inputCls} appearance-none pr-8 w-32 h-9`}>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* 미선택 안내 */}
      {!studentId && (
        <div className="flex flex-col items-center justify-center py-6 gap-1.5">
          <Clock className="w-8 h-8 text-gray-200" />
          <p className="text-sm font-semibold text-gray-500">학생을 선택하면 총평 작성 폼이 표시됩니다</p>
        </div>
      )}

      {/* 로딩 */}
      {studentId && !loaded && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      )}

      {/* 폼 */}
      {studentId && loaded && (
        <div className="flex flex-col gap-3.5">
          {fields.map(({ key, label, rows, placeholder }) => (
            <div key={key}>
              <label className={labelCls}>{label}</label>
              <textarea
                value={form[key as keyof typeof form]}
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                rows={rows}
                placeholder={placeholder}
                className={`${inputCls} resize-none leading-relaxed`}
              />
            </div>
          ))}

          {/* 에러 */}
          {err && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />{err}
            </div>
          )}

          {/* 버튼 영역 */}
          <div className="flex items-center gap-2 pt-1">
            <button onClick={() => handleSave("save")} disabled={saving}
              className={`${Btn.primary} px-5 py-2`}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              저장
            </button>
            <button onClick={() => handleSave("draft")} disabled={saving}
              className={Btn.outline}>
              <Save className="w-3.5 h-3.5" /> 임시저장
            </button>
            <button onClick={loadPrevMonth} disabled={!studentId} className={Btn.ghost}>
              <ArrowLeft className="w-3.5 h-3.5" /> 이전 월 불러오기
            </button>
            {savedAt === "save" && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> 저장됨
              </span>
            )}
            {savedAt === "draft" && (
              <span className="flex items-center gap-1 text-xs text-gray-500 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> 임시저장됨
              </span>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  )
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [summary, setSummary] = useState<Summary | null>(null)

  useEffect(() => {
    if (!session) return
    if ((session.user as any)?.role !== "admin") router.push("/")
  }, [session, router])

  const loadSummary = useCallback(async () => {
    const res = await fetch("/api/admin/summary")
    if (res.ok) setSummary(await res.json())
  }, [])

  useEffect(() => { loadSummary() }, [loadSummary])

  return (
    <div className="min-h-screen bg-slate-100">
      {/* NavBar */}
      <div className="bg-white border-b border-gray-200 px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-gray-900 leading-none">관리자 대시보드</p>
            <p className="text-[11px] text-gray-400 mt-0.5">원장 전용 운영 관리</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors font-medium"
        >
          <LogOut className="w-4 h-4" /> 로그아웃
        </button>
      </div>

      <div className="max-w-[1400px] mx-auto px-8 py-8">
        <SummaryCards summary={summary} />

        <div className="grid grid-cols-2 gap-6 items-start">
          {/* 좌측 */}
          <div className="flex flex-col gap-6">
            <StudentSection onRefreshSummary={loadSummary} />
            <AssignmentSection />
            <ParentLinkSection onRefreshSummary={loadSummary} />
          </div>

          {/* 우측 */}
          <div className="flex flex-col gap-6">
            <SubmissionSection />
            <ProblemApprovalSection onRefreshSummary={loadSummary} />
            <MonthlyReviewSection />
          </div>
        </div>
      </div>
    </div>
  )
}
