"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  BookOpen, LogOut, Plus, Pencil, Trash2, Eye, EyeOff,
  ArrowLeft, Save, X, AlertCircle, CheckCircle2, Loader2, Upload,
} from "lucide-react"

type Chapter = {
  id:            string
  title:         string
  category:      string | null
  content:       string
  parent_id:     string | null
  order_index:   number
  is_published:  boolean
  show_hint:     boolean
  show_solution: boolean
  created_at:    string
  updated_at:    string
}

const CATEGORIES     = ["공통", "파이썬기초", "파이썬알고리즘", "파이썬자격증", "파이썬실전"]
const CATEGORY_TABS  = ["전체", "파이썬기초", "파이썬알고리즘", "파이썬자격증", "파이썬실전", "공통"] as const
type CategoryTab = typeof CATEGORY_TABS[number]

const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-gray-400"
const labelCls = "block text-xs font-bold text-gray-700 mb-1.5"

type FormState = {
  title:         string
  category:      string
  content:       string
  order_index:   number
  is_published:  boolean
  show_hint:     boolean
  show_solution: boolean
  parent_id:     string
}

export default function AdminLearningPage() {
  const session = useSession()?.data
  const router  = useRouter()

  const [chapters,    setChapters]    = useState<Chapter[]>([])
  const [loading,     setLoading]     = useState(true)
  const [editing,     setEditing]     = useState<Chapter | null>(null)
  const [showForm,    setShowForm]    = useState(false)
  const [activeTab,   setActiveTab]   = useState<CategoryTab>("전체")
  const [form,      setForm]      = useState<FormState>({
    title: "", category: "공통", content: "", order_index: 0, is_published: false, show_hint: true, show_solution: true, parent_id: "",
  })
  const [saving,    setSaving]    = useState(false)
  const [err,       setErr]       = useState("")
  const [toast,     setToast]     = useState("")
  const fileInputRef    = useRef<HTMLInputElement>(null)
  const textareaRef     = useRef<HTMLTextAreaElement>(null)

  // Ctrl+S 저장 단축키
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s" && showForm) {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showForm, form, editing])

  useEffect(() => {
    if (session && (session.user as any)?.role !== "admin") router.push("/")
  }, [session, router])

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/admin/learning")
    if (res.ok) setChapters(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(""), 3000)
  }

  function openCreate() {
    setEditing(null)
    setForm({ title: "", category: "공통", content: "", order_index: chapters.length, is_published: false, show_hint: true, show_solution: true, parent_id: "" })
    setErr("")
    setShowForm(true)
  }

  function openEdit(c: Chapter) {
    setEditing(c)
    setForm({
      title:         c.title,
      category:      c.category ?? "공통",
      content:       c.content,
      order_index:   c.order_index,
      is_published:  c.is_published,
      show_hint:     c.show_hint ?? true,
      show_solution: c.show_solution ?? true,
      parent_id:     c.parent_id ?? "",
    })
    setErr("")
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setErr("")
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      setForm(p => ({ ...p, content: text }))
      if (!form.title && file.name.endsWith(".md")) {
        setForm(p => ({ ...p, title: file.name.replace(/\.md$/, "") }))
      }
    }
    reader.readAsText(file, "utf-8")
    e.target.value = ""
  }

  async function handleSave() {
    if (!form.title.trim()) { setErr("제목을 입력하세요"); return }
    setSaving(true); setErr("")
    try {
      const body = {
        title:         form.title.trim(),
        category:      form.category === "공통" ? null : form.category,
        content:       form.content,
        order_index:   form.order_index,
        is_published:  form.is_published,
        show_hint:     form.show_hint,
        show_solution: form.show_solution,
        parent_id:     form.parent_id || null,
      }
      if (editing) {
        const res = await fetch(`/api/admin/learning/${editing.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) { setErr((await res.json()).error ?? "오류 발생"); return }
        showToast("챕터가 수정됐습니다")
      } else {
        const res = await fetch("/api/admin/learning", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) { setErr((await res.json()).error ?? "오류 발생"); return }
        showToast("챕터가 추가됐습니다")
      }
      closeForm()
      load()
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm("이 챕터를 삭제할까요?")) return
    await fetch(`/api/admin/learning/${id}`, { method: "DELETE" })
    showToast("삭제됐습니다")
    if (editing?.id === id) closeForm()
    load()
  }

  async function togglePublish(c: Chapter) {
    await fetch(`/api/admin/learning/${c.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_published: !c.is_published }),
    })
    load()
  }

  const filteredChapters = activeTab === "전체"
    ? chapters
    : activeTab === "공통"
      ? chapters.filter(c => !c.category)
      : chapters.filter(c => c.category === activeTab)

  const publishedCount = chapters.filter(c => c.is_published).length

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-100">

      {/* ── NavBar ── */}
      <div className="bg-white border-b border-gray-200 px-8 py-3.5 flex items-center justify-between shrink-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-gray-900 leading-none">학습 자료 관리</p>
            <p className="text-[11px] text-gray-400 mt-0.5">파이썬 가이드 챕터 관리</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admin")}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> 대시보드
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors font-medium"
          >
            <LogOut className="w-4 h-4" /> 로그아웃
          </button>
        </div>
      </div>

      {/* ── 본문 (좌우 분할) ── */}
      <div className="flex-1 flex overflow-hidden min-h-0 px-6 py-5 gap-5">

        {/* ── 좌측: 챕터 목록 ── */}
        <div className="w-[32%] min-w-[280px] bg-white border border-gray-200 rounded-xl flex flex-col overflow-hidden shrink-0 shadow-sm">
          {/* 목록 헤더 */}
          <div className="shrink-0 px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h1 className="text-sm font-extrabold text-gray-900">학습 자료 챕터</h1>
              <p className="text-[11px] text-gray-400 mt-0.5">
                발행 중 <span className="font-bold text-indigo-600">{publishedCount}</span>개 · 전체 {chapters.length}개
              </p>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> 챕터 추가
            </button>
          </div>

          {/* 카테고리 탭 */}
          <div className="shrink-0 flex overflow-x-auto border-b border-gray-100 px-2 pt-1 gap-0.5">
            {CATEGORY_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-2 text-[11px] font-bold whitespace-nowrap rounded-t-lg transition-colors border-b-2 ${
                  activeTab === tab
                    ? "border-indigo-500 text-indigo-600 bg-indigo-50/60"
                    : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                }`}
              >
                {tab}
                <span className="ml-1 text-[10px] font-semibold text-gray-300">
                  {tab === "전체" ? chapters.length
                   : tab === "공통" ? chapters.filter(c => !c.category).length
                   : chapters.filter(c => c.category === tab).length}
                </span>
              </button>
            ))}
          </div>

          {/* 챕터 테이블 */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : filteredChapters.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <BookOpen className="w-8 h-8 text-gray-200" />
                <p className="text-sm font-semibold text-gray-500">등록된 챕터가 없습니다</p>
              </div>
            ) : (
              <table className="w-full table-fixed">
                <colgroup>
                  <col />
                  <col className="w-16" />
                  <col className="w-16" />
                </colgroup>
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 sticky top-0">
                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">제목</th>
                    <th className="px-2 py-2 text-center text-[10px] font-bold text-gray-400 uppercase">발행</th>
                    <th className="px-2 py-2 text-right text-[10px] font-bold text-gray-400 uppercase">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredChapters.map((c, i) => {
                    const isChild = !!c.parent_id
                    const catColor: Record<string, string> = {
                      "파이썬기초":     "bg-blue-50 text-blue-600 border-blue-100",
                      "파이썬알고리즘": "bg-purple-50 text-purple-600 border-purple-100",
                      "파이썬자격증":   "bg-amber-50 text-amber-600 border-amber-100",
                      "파이썬실전":     "bg-green-50 text-green-600 border-green-100",
                    }
                    const badge = c.category ? (catColor[c.category] ?? "bg-gray-100 text-gray-500 border-gray-200") : null
                    return (
                    <tr
                      key={c.id}
                      onClick={() => openEdit(c)}
                      className={`border-b border-gray-50 cursor-pointer transition-colors ${
                        editing?.id === c.id ? "bg-indigo-50" : "hover:bg-gray-50/70"
                      } ${i === filteredChapters.length - 1 ? "border-b-0" : ""}`}
                    >
                      <td className={`py-2 overflow-hidden ${isChild ? "pl-7 pr-2" : "px-4"}`}>
                        {isChild && (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-300 mr-2 mb-0.5 shrink-0" />
                        )}
                        <p className={`text-sm font-semibold truncate inline ${editing?.id === c.id ? "text-indigo-700" : "text-gray-800"}`}>
                          {c.title}
                        </p>
                        {badge && (
                          <span className={`ml-1.5 inline-block px-1.5 py-0.5 text-[9px] font-semibold rounded border ${badge}`}>
                            {c.category}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-center" onClick={e => { e.stopPropagation(); togglePublish(c) }}>
                        <button className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border transition-colors whitespace-nowrap ${
                          c.is_published
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
                        }`}>
                          {c.is_published
                            ? <><Eye className="w-2.5 h-2.5 shrink-0" /> 발행</>
                            : <><EyeOff className="w-2.5 h-2.5 shrink-0" /> 미발행</>
                          }
                        </button>
                      </td>
                      <td className="px-2 py-2" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5">
                          <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button onClick={() => handleDelete(c.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── 우측: 편집 폼 ── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white border border-gray-200 rounded-xl shadow-sm">
          {!showForm ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
              <BookOpen className="w-10 h-10 text-gray-200" />
              <p className="text-sm font-semibold">챕터를 선택하거나 새로 추가하세요</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">

              {/* 폼 헤더 */}
              <div className="shrink-0 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-gray-900">
                  {editing ? "챕터 수정" : "챕터 추가"}
                </h2>
                <button
                  onClick={closeForm}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 상단 고정 필드 — 2줄 압축 */}
              <div className="shrink-0 px-6 pt-4 pb-3 border-b border-gray-100 flex flex-col gap-2.5">
                {/* 1행: 제목 */}
                <div>
                  <label className={labelCls}>제목 <span className="text-red-500">*</span></label>
                  <input
                    value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="예) 변수와 자료형"
                    className={inputCls}
                  />
                </div>

                {/* 2행: 상위챕터 + 카테고리 + 순서 + 파일업로드 */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className={labelCls}>상위 챕터 (장)</label>
                    <select
                      value={form.parent_id}
                      onChange={e => setForm(p => ({ ...p, parent_id: e.target.value }))}
                      className={inputCls}
                    >
                      <option value="">없음 (최상위)</option>
                      {chapters
                        .filter(c => !c.parent_id && (!editing || c.id !== editing.id))
                        .map(c => <option key={c.id} value={c.id}>{c.title}</option>)
                      }
                    </select>
                  </div>
                  <div className="w-36">
                    <label className={labelCls}>카테고리</label>
                    <select
                      value={form.category}
                      onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                      className={inputCls}
                    >
                      {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className="w-20">
                    <label className={labelCls}>순서</label>
                    <input
                      type="number" min={0}
                      value={form.order_index}
                      onChange={e => setForm(p => ({ ...p, order_index: Number(e.target.value) }))}
                      className={inputCls}
                    />
                  </div>
                  <div className="shrink-0">
                    <input ref={fileInputRef} type="file" accept=".md,.txt" onChange={handleFileUpload} className="hidden" />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title="마크다운 파일 업로드"
                      className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 border-dashed rounded-lg text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors whitespace-nowrap"
                    >
                      <Upload className="w-4 h-4" /> .md 업로드
                    </button>
                  </div>
                </div>
              </div>

              {/* 마크다운 textarea — 남은 높이 전부 */}
              <div className="flex-1 flex flex-col overflow-hidden px-6 py-3 min-h-0">
                <div className="flex items-center justify-between mb-1.5">
                  <label className={labelCls + " mb-0"}>내용 (마크다운)</label>
                  <span className="text-[10px] text-gray-400 tabular-nums">{form.content.length.toLocaleString()} 자</span>
                </div>
                <textarea
                  ref={textareaRef}
                  value={form.content}
                  onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                  placeholder={`# 제목\n\n내용을 입력하거나 위에서 .md 파일을 업로드하세요.\n\n\`\`\`python\nprint("Hello!")\n\`\`\``}
                  className="flex-1 min-h-0 resize-none px-3 py-2.5 border border-gray-300 rounded-lg text-gray-800 bg-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-gray-400"
                  style={{ fontFamily: "'Cascadia Code', 'JetBrains Mono', Consolas, 'Courier New', monospace", fontSize: "14px", lineHeight: "1.65" }}
                />
              </div>

              {/* 하단 고정: 발행 + 오류 + 버튼 */}
              <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-white">
                {err && (
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                    <AlertCircle className="w-4 h-4 shrink-0" />{err}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.is_published}
                        onChange={e => setForm(p => ({ ...p, is_published: e.target.checked }))}
                        className="w-4 h-4 accent-indigo-600 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">학생 화면에 발행</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.show_hint}
                        onChange={e => setForm(p => ({ ...p, show_hint: e.target.checked }))}
                        className="w-4 h-4 accent-amber-500 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">힌트 보기</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.show_solution}
                        onChange={e => setForm(p => ({ ...p, show_solution: e.target.checked }))}
                        className="w-4 h-4 accent-indigo-500 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">정답 코드 보기</span>
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={closeForm}
                      className="px-4 py-2 text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 px-5 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-colors"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {editing ? "저장" : "추가"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 토스트 ── */}
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2
          bg-gray-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl
          transition-all duration-300 pointer-events-none"
        style={{ opacity: toast ? 1 : 0, transform: `translateX(-50%) translateY(${toast ? 0 : 12}px)` }}
      >
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        {toast}
      </div>
    </div>
  )
}
