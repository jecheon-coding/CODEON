"use client"

import { useEffect, useState, useCallback, useMemo, Fragment } from "react"
import { supabase } from "@/lib/supabase"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  LogOut, Users, BookOpen, ClipboardList, CheckCircle2, XCircle,
  Plus, Search, Pencil, Trash2, Eye, EyeOff, ChevronDown, Save, AlertCircle,
  CheckCheck, X, ArrowLeft, ArrowRight, Loader2, UserCheck, Link2Off,
  FileCheck, Clock, Upload,
} from "lucide-react"

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
  const [students,     setStudents]     = useState<Student[]>([])
  const [search,       setSearch]       = useState("")
  const [gradeFilter,  setGradeFilter]  = useState("전체")
  const [clsFilter,    setClsFilter]    = useState("전체")
  const [statusFilter, setStatusFilter] = useState("전체")
  const [drawer,       setDrawer]       = useState<"add" | "edit" | null>(null)
  const [editing,      setEditing]      = useState<Student | null>(null)
  const [form,         setForm]         = useState({ name: "", grade: "", cls: "", loginId: "", password: "" })
  const [saving,       setSaving]       = useState(false)
  const [err,          setErr]          = useState("")
  const [savedOk,      setSavedOk]      = useState(false)
  const [showPw,       setShowPw]       = useState(false)
  const [csvModal,     setCsvModal]     = useState(false)
  const [csvRows,      setCsvRows]      = useState<{ name: string; grade: string; cls: string; loginId: string }[]>([])
  const [csvError,     setCsvError]     = useState("")
  const [csvSaving,    setCsvSaving]    = useState(false)
  const [csvDone,      setCsvDone]      = useState(false)

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/students")
    if (res.ok) setStudents(await res.json())
  }, [])

  useEffect(() => { load() }, [load])

  const gradeOptions = useMemo(() => {
    const set = new Set(students.map(s => s.grade).filter(Boolean) as string[])
    return ["전체", ...Array.from(set).sort()]
  }, [students])

  const clsOptions = useMemo(() => {
    const set = new Set(students.map(s => s.class).filter(Boolean) as string[])
    return ["전체", ...Array.from(set).sort()]
  }, [students])

  const filtered = useMemo(() => students.filter(s => {
    const matchSearch  = !search.trim() ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.grade ?? "").includes(search) ||
      (s.login_id ?? "").includes(search)
    const matchGrade   = gradeFilter  === "전체" || s.grade  === gradeFilter
    const matchCls     = clsFilter    === "전체" || s.class  === clsFilter
    const matchStatus  = statusFilter === "전체" ||
      (statusFilter === "활성"   && s.status === "active") ||
      (statusFilter === "미연결" && !s.hasParentLink)
    return matchSearch && matchGrade && matchCls && matchStatus
  }), [students, search, gradeFilter, clsFilter, statusFilter])

  const filterSummary = useMemo(() => {
    const parts = [
      gradeFilter  !== "전체" ? gradeFilter  : null,
      clsFilter    !== "전체" ? clsFilter    : null,
      statusFilter !== "전체" ? statusFilter : null,
    ].filter(Boolean)
    return parts.length > 0 ? `${parts.join(" · ")} (${filtered.length}명)` : null
  }, [gradeFilter, clsFilter, statusFilter, filtered.length])

  const hasFilter = search || gradeFilter !== "전체" || clsFilter !== "전체" || statusFilter !== "전체"

  function generatePassword() {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
    const pw = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
    setForm(p => ({ ...p, password: pw }))
    setShowPw(true)
  }

  function resetDrawer() {
    setSavedOk(false); setShowPw(false); setErr("")
    setForm({ name: "", grade: "", cls: "", loginId: "", password: "" })
  }

  async function handleSave() {
    setSaving(true); setErr("")
    if (drawer === "add") {
      const res = await fetch("/api/admin/students", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, grade: form.grade, cls: form.cls, loginId: form.loginId, password: form.password }),
      })
      if (!res.ok) { const d = await res.json(); setErr(d.error); setSaving(false); return }
      setSavedOk(true)
    } else if (editing) {
      const res = await fetch(`/api/admin/students/${editing.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, grade: form.grade, cls: form.cls }),
      })
      if (!res.ok) { const d = await res.json(); setErr(d.error); setSaving(false); return }
      setDrawer(null)
    }
    setSaving(false)
    load(); onRefreshSummary()
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" 학생을 비활성화 처리하시겠습니까?`)) return
    await fetch(`/api/admin/students/${id}`, { method: "DELETE" })
    load(); onRefreshSummary()
  }

  function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    setCsvError(""); setCsvRows([]); setCsvDone(false)
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
      if (lines.length < 2) { setCsvError("데이터 행이 없습니다."); return }
      const rows = lines.slice(1).map(line => {
        const [name, grade, cls, loginId] = line.split(",").map(c => c.trim())
        return { name: name ?? "", grade: grade ?? "", cls: cls ?? "", loginId: loginId ?? "" }
      }).filter(r => r.name && r.loginId)
      if (rows.length === 0) { setCsvError("유효한 데이터 행이 없습니다."); return }
      setCsvRows(rows)
    }
    reader.readAsText(file, "UTF-8")
  }

  async function handleCsvSubmit() {
    if (csvRows.length === 0) return
    setCsvSaving(true); setCsvError("")
    const res = await fetch("/api/admin/students/bulk", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ students: csvRows }),
    })
    const d = await res.json()
    if (!res.ok) { setCsvError(d.error ?? "오류가 발생했습니다."); setCsvSaving(false); return }
    setCsvSaving(false); setCsvDone(true)
    load(); onRefreshSummary()
  }

  const activeCount = students.filter(s => s.status === "active").length

  return (
    <>
      <SectionCard
        title="학생 관리"
        desc={`활성 ${activeCount}명 · 전체 ${students.length}명`}
        action={
          <div className="flex items-center gap-2">
            <button className={Btn.outline} onClick={() => { setCsvModal(true); setCsvRows([]); setCsvError(""); setCsvDone(false) }}>
              <Upload className="w-3.5 h-3.5" /> 일괄 등록 (CSV)
            </button>
            <button className={Btn.primary} onClick={() => {
              resetDrawer(); setDrawer("add")
            }}>
              <Plus className="w-3.5 h-3.5" /> 학생 등록
            </button>
          </div>
        }
      >
        {/* 검색창 */}
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="이름, 학년, 아이디 검색…"
            className="w-full pl-8 pr-3 py-2 h-9 text-sm border border-gray-200 rounded-lg
              focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
        </div>

        {/* 필터 드롭다운 */}
        <div className="flex flex-wrap gap-2 mb-3">
          {[
            { value: gradeFilter, setter: setGradeFilter, options: gradeOptions, allLabel: "전체 학년" },
            { value: clsFilter,   setter: setClsFilter,   options: clsOptions,   allLabel: "전체 과정" },
          ].map(({ value, setter, options, allLabel }) => (
            <div key={allLabel} className="relative">
              <select value={value} onChange={e => setter(e.target.value)}
                className="appearance-none pl-3 pr-7 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-700 font-medium focus:outline-none focus:border-indigo-400 cursor-pointer">
                {options.map(o => <option key={o} value={o}>{o === "전체" ? allLabel : o}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
            </div>
          ))}
          <div className="relative">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="appearance-none pl-3 pr-7 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-700 font-medium focus:outline-none focus:border-indigo-400 cursor-pointer">
              {["전체", "활성", "미연결"].map(v => <option key={v} value={v}>{v === "전체" ? "전체 상태" : v}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
          </div>
          {(gradeFilter !== "전체" || clsFilter !== "전체" || statusFilter !== "전체") && (
            <button onClick={() => { setGradeFilter("전체"); setClsFilter("전체"); setStatusFilter("전체") }}
              className="text-xs text-gray-400 hover:text-gray-600 font-medium px-2 transition-colors">
              초기화
            </button>
          )}
        </div>

        {filterSummary && (
          <p className="text-xs text-indigo-600 font-semibold mb-3">{filterSummary}</p>
        )}

        {filtered.length === 0 ? (
          <EmptyState icon={Users}
            title={hasFilter ? "검색 결과가 없습니다" : "등록된 학생이 없습니다"}
            desc={hasFilter ? undefined : "학생 등록 버튼으로 첫 학생을 추가하세요"} />
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
                        <button title="수정" className={Btn.ghost}
                          onClick={() => {
                            setEditing(s); resetDrawer()
                            setForm({ name: s.name, grade: s.grade ?? "", cls: s.class ?? "", loginId: s.login_id ?? "", password: "" })
                            setDrawer("edit")
                          }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button title="비활성화" className={Btn.danger}
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

      {/* 학생 등록/수정 Drawer */}
      <Drawer open={!!drawer} onClose={() => { resetDrawer(); setDrawer(null) }}
        title={drawer === "add" ? "학생 등록" : "학생 정보 수정"}>
        {savedOk ? (
          <div className="flex flex-col items-center gap-5 py-8">
            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-extrabold text-gray-900 mb-1">등록 완료!</p>
              <p className="text-xs text-gray-500">"{form.name}" 학생이 성공적으로 등록되었습니다.</p>
            </div>
            <div className="flex gap-2 w-full">
              <button onClick={() => { setSavedOk(false); setForm({ name: "", grade: "", cls: "", loginId: "", password: "" }); setShowPw(false); setErr("") }}
                className={`${Btn.outline} flex-1 justify-center py-2.5`}>
                계속 등록하기
              </button>
              <button onClick={() => { resetDrawer(); setDrawer(null) }}
                className={`${Btn.primary} flex-1 justify-center py-2.5`}>
                닫기
              </button>
            </div>
          </div>
        ) : (
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
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input type={showPw ? "text" : "password"} value={form.password}
                        onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                        className={`${inputCls} pr-10`} placeholder="••••••••" />
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <button type="button" onClick={generatePassword} className={`${Btn.outline} whitespace-nowrap`}>
                      자동 생성
                    </button>
                  </div>
                </div>
              </>
            )}
            <button onClick={handleSave} disabled={saving}
              className={`${Btn.primary} w-full justify-center py-2.5 mt-1`}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {drawer === "add" ? "등록하기" : "저장하기"}
            </button>
          </div>
        )}
      </Drawer>

      {/* CSV 일괄 등록 모달 */}
      {csvModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setCsvModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="text-sm font-extrabold text-gray-900">CSV 일괄 등록</h3>
                <button onClick={() => setCsvModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5">
                {csvDone ? (
                  <div className="flex flex-col items-center gap-4 py-6">
                    <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                    </div>
                    <p className="text-sm font-bold text-gray-900">{csvRows.length}명 등록 완료!</p>
                    <button onClick={() => setCsvModal(false)} className={`${Btn.primary} px-6 py-2.5`}>닫기</button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <p className="text-xs font-bold text-gray-700 mb-2">CSV 형식 (헤더 포함)</p>
                      <code className="text-xs text-gray-600 font-mono">이름,학년,반/과정,로그인ID</code>
                      <br />
                      <code className="text-xs text-gray-500 font-mono">홍길동,초5,파이썬기초A,hong01</code>
                      <p className="text-[11px] text-gray-400 mt-2">※ 비밀번호는 자동으로 8자리 랜덤 생성됩니다.</p>
                    </div>

                    <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-6 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors">
                      <Upload className="w-6 h-6 text-gray-400" />
                      <span className="text-xs font-semibold text-gray-600">CSV 파일 업로드</span>
                      <span className="text-[11px] text-gray-400">.csv 파일을 선택하세요</span>
                      <input type="file" accept=".csv" className="hidden" onChange={handleCsvFile} />
                    </label>

                    {csvError && (
                      <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                        <AlertCircle className="w-4 h-4 shrink-0" />{csvError}
                      </div>
                    )}

                    {csvRows.length > 0 && (
                      <>
                        <p className="text-xs font-bold text-gray-700">미리보기 ({csvRows.length}명)</p>
                        <div className="overflow-auto max-h-48 border border-gray-200 rounded-xl">
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left font-bold text-gray-600">이름</th>
                                <th className="px-3 py-2 text-left font-bold text-gray-600">학년</th>
                                <th className="px-3 py-2 text-left font-bold text-gray-600">반/과정</th>
                                <th className="px-3 py-2 text-left font-bold text-gray-600">로그인ID</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {csvRows.map((row, i) => (
                                <tr key={i} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 text-gray-800 font-medium">{row.name}</td>
                                  <td className="px-3 py-2 text-gray-600">{row.grade || "—"}</td>
                                  <td className="px-3 py-2 text-gray-600">{row.cls || "—"}</td>
                                  <td className="px-3 py-2 text-gray-500 font-mono">{row.loginId}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <button onClick={handleCsvSubmit} disabled={csvSaving}
                          className={`${Btn.primary} w-full justify-center py-2.5`}>
                          {csvSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                          {csvRows.length}명 등록하기
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

// ── 공통 유틸 ────────────────────────────────────────────────────────────────

function assignmentStatus(dueDate: string | null): { label: string; variant: "blue" | "gray" | "amber" } {
  if (!dueDate) return { label: "진행중", variant: "blue" }
  const now = new Date()
  const due = new Date(dueDate)
  if (due <= now) return { label: "마감", variant: "gray" }
  const weekAhead = new Date(now); weekAhead.setDate(now.getDate() + 7)
  if (due <= weekAhead) return { label: "예정", variant: "amber" }
  return { label: "진행중", variant: "blue" }
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

const ASSIGNMENT_LIMIT = 10

function AssignmentSection() {
  const router = useRouter()
  const [assignments,  setAssignments]  = useState<Assignment[]>([])
  const [statusFilter, setStatusFilter] = useState<"전체" | "진행중" | "마감" | "예정">("전체")
  const [dateRange,    setDateRange]    = useState<"week" | "month" | "all">("all")
  const [page,         setPage]         = useState(1)

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/assignments")
    if (res.ok) setAssignments(await res.json())
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [statusFilter, dateRange])

  async function handleDelete(id: string, t: string) {
    if (!confirm(`"${t}" 과제를 삭제하시겠습니까?`)) return
    await fetch(`/api/admin/assignments/${id}`, { method: "DELETE" })
    load()
  }

  const filtered = useMemo(() => {
    const now = new Date()
    const weekAhead = new Date(now); weekAhead.setDate(now.getDate() + 7)

    let list = assignments

    if (statusFilter === "진행중") {
      list = list.filter(a => !a.dueDate || new Date(a.dueDate) > weekAhead)
    } else if (statusFilter === "마감") {
      list = list.filter(a => a.dueDate && new Date(a.dueDate) <= now)
    } else if (statusFilter === "예정") {
      list = list.filter(a => a.dueDate && new Date(a.dueDate) > now && new Date(a.dueDate) <= weekAhead)
    }

    if (dateRange !== "all") {
      let start: Date, end: Date
      if (dateRange === "week") {
        const day = now.getDay()
        start = new Date(now); start.setDate(now.getDate() - (day === 0 ? 6 : day - 1)); start.setHours(0, 0, 0, 0)
        end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999)
      } else {
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      }
      list = list.filter(a => {
        if (!a.dueDate) return false
        const d = new Date(a.dueDate)
        return d >= start && d <= end
      })
    }

    return list
  }, [assignments, statusFilter, dateRange])

  const pageCount = Math.ceil(filtered.length / ASSIGNMENT_LIMIT)
  const paged     = filtered.slice((page - 1) * ASSIGNMENT_LIMIT, page * ASSIGNMENT_LIMIT)

  return (
    <SectionCard
      title="과제 관리"
      desc={`총 ${assignments.length}개 과제`}
      action={
        <button className={Btn.primary} onClick={() => router.push("/admin/assignments/new")}>
          <Plus className="w-3.5 h-3.5" /> 과제 생성
        </button>
      }
    >
      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {(["전체", "진행중", "마감", "예정"] as const).map(v => (
            <button key={v} onClick={() => setStatusFilter(v)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all
                ${statusFilter === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {v}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {([
            { key: "week",  label: "이번 주" },
            { key: "month", label: "이번 달" },
            { key: "all",   label: "전체" },
          ] as const).map(({ key, label }) => (
            <button key={key} onClick={() => setDateRange(key)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all
                ${dateRange === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ClipboardList}
          title={statusFilter !== "전체" || dateRange !== "all" ? "조건에 맞는 과제가 없습니다" : "등록된 과제가 없습니다"}
          desc={statusFilter !== "전체" || dateRange !== "all" ? undefined : "과제 생성 버튼으로 첫 과제를 배정하세요"} />
      ) : (
        <>
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
                {paged.map(a => {
                  const st = assignmentStatus(a.dueDate)
                  return (
                    <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className={TD}><span className="font-bold text-gray-900">{a.title}</span></td>
                      <td className={TD}><span className="text-gray-600">{a.problemCount}문제</span></td>
                      <td className={TD}><span className="text-gray-600">{a.studentCount}명</span></td>
                      <td className={TD}>
                        {a.dueDate
                          ? <span className="text-gray-700">{new Date(a.dueDate).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-3"><Badge variant={st.variant}>{st.label}</Badge></td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <button title="수정" className={Btn.ghost}
                            onClick={() => router.push(`/admin/assignments/${a.id}/edit`)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button title="삭제" className={Btn.danger} onClick={() => handleDelete(a.id, a.title)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-400">
                {filtered.length}개 중 {(page - 1) * ASSIGNMENT_LIMIT + 1}–{Math.min(page * ASSIGNMENT_LIMIT, filtered.length)}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, pageCount - 4))
                  const p = start + i
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-7 h-7 text-xs font-semibold rounded-lg transition-colors
                        ${page === p ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                      {p}
                    </button>
                  )
                })}
                <button onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={page === pageCount}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors">
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </SectionCard>
  )
}

// ── 과제 제출 현황 ────────────────────────────────────────────────────────────

type SubViewMode = "student" | "assignment" | "detail"

const DETAIL_LIMIT = 10

function getDDayBadge(dueDate: string | null) {
  if (!dueDate) return null
  const due = new Date(dueDate); due.setHours(23, 59, 59, 999)
  const diffDays = Math.ceil((due.getTime() - Date.now()) / 86400000)
  if (diffDays < 0)   return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border bg-gray-100 text-gray-500 border-gray-200">마감됨</span>
  if (diffDays === 0) return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border bg-amber-100 text-amber-700 border-amber-200">D-day</span>
  if (diffDays === 1) return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border bg-amber-50 text-amber-600 border-amber-200">D-1</span>
  return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border bg-blue-50 text-blue-600 border-blue-200">D-{diffDays}</span>
}

function SubmissionSection() {
  const [rows,         setRows]         = useState<SubmissionRow[]>([])
  const [loading,      setLoading]      = useState(true)
  const [viewMode,     setViewMode]     = useState<SubViewMode>("student")
  const [expanded,     setExpanded]     = useState<Set<string>>(new Set())
  const [detailSearch, setDetailSearch] = useState("")
  const [detailFilter, setDetailFilter] = useState<"all" | "unsubmitted" | "correct" | "wrong">("all")
  const [detailPage,   setDetailPage]   = useState(1)
  const [detailAssign, setDetailAssign] = useState("전체")
  const [dateRange,    setDateRange]    = useState<"week" | "month" | "all" | "custom">("week")
  const [customStart,  setCustomStart]  = useState("")
  const [customEnd,    setCustomEnd]    = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/admin/submissions?filter=all")
    if (res.ok) setRows(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { setDetailPage(1) }, [detailSearch, detailFilter, detailAssign, dateRange])

  function toggleExpand(key: string) {
    setExpanded(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next })
  }

  // 기간 필터
  const filteredRows = useMemo(() => {
    if (dateRange === "all") return rows
    let start: Date | null = null
    let end: Date | null   = null
    const now = new Date()
    if (dateRange === "week") {
      const day = now.getDay()
      start = new Date(now); start.setDate(now.getDate() - (day === 0 ? 6 : day - 1)); start.setHours(0, 0, 0, 0)
      end   = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999)
    } else if (dateRange === "month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    } else if (dateRange === "custom") {
      start = customStart ? new Date(customStart) : null
      end   = customEnd   ? new Date(customEnd + "T23:59:59") : null
    }
    return rows.filter(r => {
      if (!r.dueDate) return false
      const d = new Date(r.dueDate)
      if (start && d < start) return false
      if (end   && d > end)   return false
      return true
    })
  }, [rows, dateRange, customStart, customEnd])

  // 학생별: 미제출 많은 순, 0명 하단
  const studentSummaries = useMemo(() => {
    const map = new Map<string, { studentId: string; studentName: string; problems: SubmissionRow[] }>()
    for (const r of filteredRows) {
      if (!map.has(r.studentId)) map.set(r.studentId, { studentId: r.studentId, studentName: r.studentName, problems: [] })
      map.get(r.studentId)!.problems.push(r)
    }
    return [...map.values()].sort((a, b) => {
      const ua = a.problems.filter(p => !p.isSubmitted).length
      const ub = b.problems.filter(p => !p.isSubmitted).length
      if (ua === 0 && ub === 0) return a.studentName.localeCompare(b.studentName)
      if (ua === 0) return 1
      if (ub === 0) return -1
      return ub - ua
    })
  }, [filteredRows])

  // 과제별: 임박순, 마감된 것 후순위
  const assignmentSummaries = useMemo(() => {
    const map = new Map<string, { assignmentId: string; assignmentTitle: string; dueDate: string | null; problems: SubmissionRow[] }>()
    for (const r of filteredRows) {
      if (!map.has(r.assignmentId)) map.set(r.assignmentId, { assignmentId: r.assignmentId, assignmentTitle: r.assignmentTitle, dueDate: r.dueDate, problems: [] })
      map.get(r.assignmentId)!.problems.push(r)
    }
    const now = Date.now()
    return [...map.values()].sort((a, b) => {
      const aExp = a.dueDate ? new Date(a.dueDate).setHours(23, 59, 59) < now : false
      const bExp = b.dueDate ? new Date(b.dueDate).setHours(23, 59, 59) < now : false
      if (aExp && !bExp) return 1
      if (!aExp && bExp) return -1
      return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999")
    })
  }, [filteredRows])

  const assignmentOptions = useMemo(() =>
    ["전체", ...[...new Set(filteredRows.map(r => r.assignmentTitle))]]
  , [filteredRows])

  const detailRows = useMemo(() => {
    let list = filteredRows
    if (detailAssign !== "전체") list = list.filter(r => r.assignmentTitle === detailAssign)
    if (detailSearch.trim()) list = list.filter(r => r.studentName.includes(detailSearch.trim()) || r.problemTitle.includes(detailSearch.trim()))
    if (detailFilter === "unsubmitted") list = list.filter(r => !r.isSubmitted)
    else if (detailFilter === "correct") list = list.filter(r => r.isCorrect === true)
    else if (detailFilter === "wrong")   list = list.filter(r => r.isCorrect === false)
    return list
  }, [filteredRows, detailSearch, detailFilter, detailAssign])

  const detailPageCount  = Math.ceil(detailRows.length / DETAIL_LIMIT)
  const pagedDetailRows  = detailRows.slice((detailPage - 1) * DETAIL_LIMIT, detailPage * DETAIL_LIMIT)

  function submissionBadge(row: SubmissionRow) {
    if (!row.isSubmitted)        return <Badge variant="red"   size="sm">미제출</Badge>
    if (row.isCorrect === true)  return <Badge variant="blue"  size="sm">채점완료</Badge>
    if (row.isCorrect === false) return <Badge variant="amber" size="sm">재제출 필요</Badge>
    return                              <Badge variant="green" size="sm">제출완료</Badge>
  }

  const unsubCount = filteredRows.filter(r => !r.isSubmitted).length

  const DateRangeBar = (
    <div className="flex flex-wrap items-center gap-2 mb-3 pb-3 border-b border-gray-100">
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
        {([
          { key: "week",   label: "이번 주" },
          { key: "month",  label: "이번 달" },
          { key: "all",    label: "전체" },
          { key: "custom", label: "직접 선택" },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setDateRange(key)}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all
              ${dateRange === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {label}
          </button>
        ))}
      </div>
      {dateRange === "custom" && (
        <div className="flex items-center gap-1.5">
          <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-400" />
          <span className="text-xs text-gray-400">~</span>
          <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-400" />
        </div>
      )}
    </div>
  )

  return (
    <SectionCard
      title="과제 제출 현황"
      desc={`${unsubCount}건 미제출 · ${filteredRows.length}건`}
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
          {DateRangeBar}

          {/* ─ 학생별 뷰 ─ */}
          {viewMode === "student" && (
            filteredRows.length === 0
              ? <EmptyState icon={ClipboardList} title="해당 기간에 과제가 없습니다" />
              : (
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
                        const total  = problems.length
                        const unsub  = total - submitted
                        const allDone = unsub === 0
                        const lastSub = problems.filter(p => p.submittedAt).sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""))[0]
                        const isExp  = expanded.has(studentId)
                        return (
                          <Fragment key={studentId}>
                            <tr onClick={() => toggleExpand(studentId)}
                              className={`cursor-pointer transition-colors
                                ${allDone ? "bg-emerald-50/50 hover:bg-emerald-50/80"
                                  : submitted === 0 ? "bg-red-50/40 hover:bg-red-50/60"
                                  : "hover:bg-slate-50/60"}`}>
                              <td className={TD}>
                                <span className={`font-bold ${allDone ? "text-emerald-700" : submitted === 0 ? "text-red-700" : "text-gray-900"}`}>
                                  {studentName}
                                </span>
                              </td>
                              <td className={TD}><span className="text-gray-600">{total}</span></td>
                              <td className={TD}><span className="text-emerald-600 font-semibold">{submitted}</span></td>
                              <td className={TD}>
                                {unsub > 0
                                  ? <span className="text-red-500 font-semibold">{unsub}</span>
                                  : <span className="text-emerald-500 font-bold text-sm">✓</span>}
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
              )
          )}

          {/* ─ 과제별 뷰 ─ */}
          {viewMode === "assignment" && (
            filteredRows.length === 0
              ? <EmptyState icon={ClipboardList} title="해당 기간에 과제가 없습니다" />
              : (
                <div className="space-y-2">
                  {assignmentSummaries.map(({ assignmentId, assignmentTitle, dueDate, problems }) => {
                    const studentIds   = [...new Set(problems.map(p => p.studentId))]
                    const doneStudents = studentIds.filter(sid => problems.filter(p => p.studentId === sid).every(p => p.isSubmitted)).length
                    const submitted    = problems.filter(p => p.isSubmitted).length
                    const total        = problems.length
                    const isExpired    = dueDate ? new Date(dueDate).setHours(23, 59, 59) < Date.now() : false
                    const isExp        = expanded.has(assignmentId)
                    return (
                      <div key={assignmentId}
                        className={`border rounded-xl overflow-hidden ${isExpired ? "border-gray-200 bg-gray-50/60 opacity-70" : "border-gray-200 bg-white"}`}>
                        <button onClick={() => toggleExpand(assignmentId)} className="w-full text-left">
                          <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/80 transition-colors">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className={`text-sm font-bold ${isExpired ? "text-gray-500" : "text-gray-900"}`}>{assignmentTitle}</span>
                                {getDDayBadge(dueDate)}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                                <span>{studentIds.length}명</span>
                                <span className="text-emerald-600 font-semibold">완료 {doneStudents}명</span>
                                {studentIds.length - doneStudents > 0 && (
                                  <span className="text-red-500 font-semibold">미완료 {studentIds.length - doneStudents}명</span>
                                )}
                                {dueDate && <span>{new Date(dueDate).toLocaleDateString("ko-KR")} 마감</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <ProgressBar submitted={submitted} total={total} />
                              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExp ? "rotate-180" : ""}`} />
                            </div>
                          </div>
                        </button>
                        {isExp && (
                          <div className="border-t border-gray-100">
                            <table className="w-full text-xs">
                              <tbody className="divide-y divide-gray-50">
                                {studentIds.map(sid => {
                                  const sprobs   = problems.filter(p => p.studentId === sid)
                                  const sname    = sprobs[0]?.studentName ?? sid
                                  const subCount = sprobs.filter(p => p.isSubmitted).length
                                  return (
                                    <tr key={`${assignmentId}-${sid}`} className="hover:bg-gray-50/50">
                                      <td className="px-4 py-2 pl-6 w-28">
                                        <span className={`font-semibold ${subCount === 0 ? "text-red-600" : "text-gray-700"}`}>{sname}</span>
                                      </td>
                                      <td className="px-3 py-2 w-16 text-gray-500">{subCount}/{sprobs.length} 제출</td>
                                      <td className="px-3 py-2">
                                        <div className="flex flex-wrap gap-1">
                                          {sprobs.map((p, pi) => (
                                            <span key={pi} className={`px-1.5 py-0.5 rounded font-medium border
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
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
          )}

          {/* ─ 상세 뷰 ─ */}
          {viewMode === "detail" && (
            <>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <div className="relative">
                  <select value={detailAssign} onChange={e => setDetailAssign(e.target.value)}
                    className="appearance-none pl-3 pr-7 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-700 font-medium focus:outline-none focus:border-indigo-400 cursor-pointer">
                    {assignmentOptions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                </div>
                <div className="relative flex-1 min-w-[160px]">
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
                    {pagedDetailRows.length === 0 ? (
                      <tr><td colSpan={5} className="py-10 text-center text-sm text-gray-400">검색 결과 없음</td></tr>
                    ) : pagedDetailRows.map((r, i) => (
                      <tr key={i} className={`transition-colors ${!r.isSubmitted ? "bg-red-50/60 hover:bg-red-50/80" : "hover:bg-slate-50/60"}`}>
                        <td className={TD}>
                          <span className={`font-bold ${!r.isSubmitted ? "text-red-700" : "text-gray-900"}`}>{r.studentName}</span>
                        </td>
                        <td className="px-3 py-3"><span className="text-gray-600 text-sm">{r.assignmentTitle}</span></td>
                        <td className="px-3 py-3">
                          <span className="text-sm font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">{r.problemTitle}</span>
                        </td>
                        <td className="px-3 py-3">{submissionBadge(r)}</td>
                        <td className={TD}>
                          {r.submittedAt
                            ? <span className="text-gray-700">{new Date(r.submittedAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                            : <span className="text-red-400 font-semibold">미제출</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {detailPageCount > 1 && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400">{detailRows.length}건 중 {(detailPage - 1) * DETAIL_LIMIT + 1}–{Math.min(detailPage * DETAIL_LIMIT, detailRows.length)}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setDetailPage(p => Math.max(1, p - 1))} disabled={detailPage === 1}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors">
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    {Array.from({ length: Math.min(5, detailPageCount) }, (_, i) => {
                      const start = Math.max(1, Math.min(detailPage - 2, detailPageCount - 4))
                      const p = start + i
                      return (
                        <button key={p} onClick={() => setDetailPage(p)}
                          className={`w-7 h-7 text-xs font-semibold rounded-lg transition-colors
                            ${detailPage === p ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                          {p}
                        </button>
                      )
                    })}
                    <button onClick={() => setDetailPage(p => Math.min(detailPageCount, p + 1))} disabled={detailPage === detailPageCount}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
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
  const [mounted, setMounted] = useState(false)
  const session = useSession()?.data
  const router = useRouter()
  const [summary, setSummary] = useState<Summary | null>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!session) return
    if ((session.user as any)?.role !== "admin") router.push("/")
  }, [session, router])

  const loadSummary = useCallback(async () => {
    const res = await fetch("/api/admin/summary")
    if (res.ok) setSummary(await res.json())
  }, [])

  useEffect(() => { loadSummary() }, [loadSummary])

  if (!mounted) return null

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
