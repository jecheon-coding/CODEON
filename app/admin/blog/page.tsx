"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Plus, Pencil, Trash2, Eye, EyeOff,
  Save, X, AlertCircle, CheckCircle2, Loader2,
  FileText, Upload,
} from "lucide-react"

type BlogPost = {
  id:           string
  title:        string
  slug:         string
  content:      string
  summary:      string
  key_points:   string[]
  tags:         string[]
  source_urls:  string[]
  is_published: boolean
  published_at: string
}

type FormState = {
  title:        string
  slug:         string
  summary:      string
  key_points:   string   // 줄바꿈으로 구분
  tags:         string   // 쉼표로 구분
  source_urls:  string   // 줄바꿈으로 구분
  content:      string
  is_published: boolean
}

const EMPTY_FORM: FormState = {
  title: "", slug: "", summary: "",
  key_points: "", tags: "", source_urls: "",
  content: "", is_published: false,
}

const inputCls  = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-gray-400"
const labelCls  = "block text-xs font-bold text-gray-700 mb-1.5"

export default function AdminBlogPage() {
  const { data: session } = useSession()
  const router = useRouter()

  const [posts,     setPosts]     = useState<BlogPost[]>([])
  const [loading,   setLoading]   = useState(true)
  const [editing,   setEditing]   = useState<BlogPost | null>(null)
  const [showForm,  setShowForm]  = useState(false)
  const [form,      setForm]      = useState<FormState>(EMPTY_FORM)
  const [saving,    setSaving]    = useState(false)
  const [err,       setErr]       = useState("")
  const [toast,     setToast]     = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (session && (session.user as any)?.role !== "admin") router.push("/")
  }, [session, router])

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/admin/blog")
    if (res.ok) setPosts(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(""), 3000)
  }

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setErr("")
    setShowForm(true)
  }

  function openEdit(p: BlogPost) {
    setEditing(p)
    setForm({
      title:        p.title,
      slug:         p.slug,
      summary:      p.summary ?? "",
      key_points:   (p.key_points ?? []).join("\n"),
      tags:         (p.tags ?? []).join(", "),
      source_urls:  (p.source_urls ?? []).join("\n"),
      content:      p.content ?? "",
      is_published: p.is_published ?? false,
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
      setForm(p => ({ ...p, content: ev.target?.result as string }))
    }
    reader.readAsText(file, "utf-8")
    e.target.value = ""
  }

  // 제목에서 slug 자동 생성
  function autoSlug(title: string) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80)
  }

  async function handleSave() {
    if (!form.title.trim()) { setErr("제목을 입력하세요"); return }
    if (!form.slug.trim())  { setErr("슬러그를 입력하세요"); return }
    setSaving(true); setErr("")

    const body = {
      title:        form.title.trim(),
      slug:         form.slug.trim(),
      content:      form.content,
      summary:      form.summary.trim(),
      key_points:   form.key_points.split("\n").map(s => s.trim()).filter(Boolean),
      tags:         form.tags.split(",").map(s => s.trim()).filter(Boolean),
      source_urls:  form.source_urls.split("\n").map(s => s.trim()).filter(Boolean),
      is_published: form.is_published,
    }

    let res: Response
    if (editing) {
      res = await fetch(`/api/admin/blog/${editing.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    } else {
      res = await fetch("/api/admin/blog", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    }

    if (!res.ok) { setErr((await res.json()).error ?? "오류 발생"); setSaving(false); return }
    showToast(editing ? "수정됐습니다" : "등록됐습니다")
    closeForm()
    load()
    setSaving(false)
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`"${title}" 글을 삭제할까요?`)) return
    await fetch(`/api/admin/blog/${id}`, { method: "DELETE" })
    showToast("삭제됐습니다")
    if (editing?.id === id) closeForm()
    load()
  }

  async function togglePublish(p: BlogPost) {
    await fetch(`/api/admin/blog/${p.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_published: !p.is_published }),
    })
    load()
  }

  const publishedCount = posts.filter(p => p.is_published).length

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-100">

      {/* NavBar */}
      <div className="bg-white border-b border-gray-200 px-8 py-3.5 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-gray-900 leading-none">블로그 관리</p>
            <p className="text-[11px] text-gray-400 mt-0.5">교육 트렌드 리포트 편집 · 삭제</p>
          </div>
        </div>
        <button
          onClick={() => router.push("/admin")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> 대시보드
        </button>
      </div>

      {/* 본문 */}
      <div className="flex-1 flex overflow-hidden min-h-0 px-6 py-5 gap-5">

        {/* 좌측: 글 목록 */}
        <div className="w-[34%] min-w-[280px] bg-white border border-gray-200 rounded-xl flex flex-col overflow-hidden shrink-0 shadow-sm">
          <div className="shrink-0 px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h1 className="text-sm font-extrabold text-gray-900">블로그 글 목록</h1>
              <p className="text-[11px] text-gray-400 mt-0.5">
                발행 <span className="font-bold text-indigo-600">{publishedCount}</span>건 · 전체 {posts.length}건
              </p>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> 글 추가
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <FileText className="w-8 h-8 text-gray-200" />
                <p className="text-sm font-semibold text-gray-500">등록된 글이 없습니다</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {posts.map((p) => (
                  <li
                    key={p.id}
                    onClick={() => openEdit(p)}
                    className={`px-4 py-3 cursor-pointer transition-colors ${
                      editing?.id === p.id ? "bg-indigo-50" : "hover:bg-gray-50/70"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${editing?.id === p.id ? "text-indigo-700" : "text-gray-800"}`}>
                          {p.title}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5 truncate">{p.slug}</p>
                        <p className="text-[10px] text-gray-300 mt-0.5">
                          {new Date(p.published_at).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          title={p.is_published ? "발행 중 (클릭 시 비공개)" : "비공개 (클릭 시 발행)"}
                          onClick={() => togglePublish(p)}
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border transition-colors whitespace-nowrap ${
                            p.is_published
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
                          }`}
                        >
                          {p.is_published
                            ? <><Eye className="w-2.5 h-2.5" /> 발행</>
                            : <><EyeOff className="w-2.5 h-2.5" /> 비공개</>
                          }
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.title)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* 우측: 편집 폼 */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white border border-gray-200 rounded-xl shadow-sm">
          {!showForm ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
              <FileText className="w-10 h-10 text-gray-200" />
              <p className="text-sm font-semibold">글을 선택하거나 새로 추가하세요</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">

              {/* 폼 헤더 */}
              <div className="shrink-0 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-gray-900">
                  {editing ? "글 수정" : "글 추가"}
                </h2>
                <button onClick={closeForm} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 상단 메타 필드 */}
              <div className="shrink-0 px-6 pt-4 pb-3 border-b border-gray-100 flex flex-col gap-3">
                {err && (
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />{err}
                  </div>
                )}

                {/* 제목 */}
                <div>
                  <label className={labelCls}>제목 <span className="text-red-500">*</span></label>
                  <input
                    value={form.title}
                    onChange={e => {
                      const t = e.target.value
                      setForm(p => ({ ...p, title: t, slug: p.slug || autoSlug(t) }))
                    }}
                    placeholder="블로그 글 제목"
                    className={inputCls}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* 슬러그 */}
                  <div>
                    <label className={labelCls}>슬러그 <span className="text-red-500">*</span></label>
                    <input
                      value={form.slug}
                      onChange={e => setForm(p => ({ ...p, slug: e.target.value }))}
                      placeholder="url-friendly-slug"
                      className={`${inputCls} font-mono text-xs`}
                    />
                  </div>
                  {/* 태그 */}
                  <div>
                    <label className={labelCls}>태그 (쉼표 구분)</label>
                    <input
                      value={form.tags}
                      onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
                      placeholder="AI 시대, SW 특기자 전형"
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* 요약 */}
                <div>
                  <label className={labelCls}>요약</label>
                  <textarea
                    value={form.summary}
                    onChange={e => setForm(p => ({ ...p, summary: e.target.value }))}
                    rows={2}
                    placeholder="2~3문장 요약"
                    className={`${inputCls} resize-none`}
                  />
                </div>

                {/* 핵심 포인트 */}
                <div>
                  <label className={labelCls}>핵심 포인트 (줄바꿈으로 구분)</label>
                  <textarea
                    value={form.key_points}
                    onChange={e => setForm(p => ({ ...p, key_points: e.target.value }))}
                    rows={2}
                    placeholder={"포인트 1\n포인트 2\n포인트 3"}
                    className={`${inputCls} resize-none`}
                  />
                </div>
              </div>

              {/* 마크다운 본문 */}
              <div className="flex-1 flex flex-col overflow-hidden px-6 py-3 min-h-0">
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`${labelCls} mb-0`}>본문 (마크다운)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 tabular-nums">{form.content.length.toLocaleString()}자</span>
                    <input ref={fileInputRef} type="file" accept=".md,.txt" onChange={handleFileUpload} className="hidden" />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1 px-2 py-1 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                    >
                      <Upload className="w-3 h-3" /> .md 업로드
                    </button>
                  </div>
                </div>
                <textarea
                  ref={textareaRef}
                  value={form.content}
                  onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                  placeholder={`## 서론\n\n내용을 입력하거나 .md 파일을 업로드하세요.`}
                  className="flex-1 min-h-0 resize-none px-3 py-2.5 border border-gray-300 rounded-lg text-gray-800 bg-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-gray-400"
                  style={{ fontFamily: "monospace", fontSize: "13px", lineHeight: "1.65" }}
                />
              </div>

              {/* 하단 버튼 */}
              <div className="shrink-0 px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.is_published}
                    onChange={e => setForm(p => ({ ...p, is_published: e.target.checked }))}
                    className="w-4 h-4 accent-indigo-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">학부모 화면에 발행</span>
                </label>
                <div className="flex gap-2">
                  {editing && (
                    <button
                      onClick={() => handleDelete(editing.id, editing.title)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 text-xs font-semibold rounded-xl transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> 삭제
                    </button>
                  )}
                  <button onClick={closeForm} className="px-4 py-2 text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors">
                    취소
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-colors"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {editing ? "저장" : "등록"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 토스트 */}
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl transition-all duration-300 pointer-events-none"
        style={{ opacity: toast ? 1 : 0, transform: `translateX(-50%) translateY(${toast ? 0 : 12}px)` }}
      >
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        {toast}
      </div>
    </div>
  )
}
