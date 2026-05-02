"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  BookOpen, LogOut, Plus, Pencil, Trash2, Eye, EyeOff,
  ArrowLeft, Save, X, AlertCircle, CheckCircle2, Loader2,
} from "lucide-react"

type Notice = {
  id:         string
  date:       string
  content:    string
  is_visible: boolean
  created_at: string
}

const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-gray-400"
const labelCls = "block text-xs font-bold text-gray-700 mb-1.5"

export default function AdminNoticesPage() {
  const session = useSession()?.data
  const router  = useRouter()

  const [notices,  setNotices]  = useState<Notice[]>([])
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState<Notice | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState({ date: "", content: "", is_visible: true })
  const [saving,   setSaving]   = useState(false)
  const [err,      setErr]      = useState("")
  const [toast,    setToast]    = useState("")

  useEffect(() => {
    if (session && (session.user as any)?.role !== "admin") router.push("/")
  }, [session, router])

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/admin/notices")
    if (res.ok) setNotices(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(""), 3000)
  }

  function openCreate() {
    setEditing(null)
    setForm({ date: "", content: "", is_visible: true })
    setErr("")
    setShowForm(true)
  }

  function openEdit(n: Notice) {
    setEditing(n)
    setForm({ date: n.date, content: n.content, is_visible: n.is_visible })
    setErr("")
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setErr("")
  }

  async function handleSave() {
    if (!form.date.trim() || !form.content.trim()) { setErr("날짜와 내용을 입력하세요"); return }
    setSaving(true); setErr("")
    try {
      if (editing) {
        const res = await fetch(`/api/admin/notices/${editing.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
        if (!res.ok) { setErr((await res.json()).error ?? "오류 발생"); return }
        showToast("공지가 수정됐습니다")
      } else {
        const res = await fetch("/api/admin/notices", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
        if (!res.ok) { setErr((await res.json()).error ?? "오류 발생"); return }
        showToast("공지가 추가됐습니다")
      }
      closeForm()
      load()
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm("이 공지를 삭제할까요?")) return
    await fetch(`/api/admin/notices/${id}`, { method: "DELETE" })
    showToast("삭제됐습니다")
    load()
  }

  async function toggleVisible(n: Notice) {
    await fetch(`/api/admin/notices/${n.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_visible: !n.is_visible }),
    })
    load()
  }

  const visibleCount = notices.filter(n => n.is_visible).length

  return (
    <div className="min-h-screen bg-slate-100">
      {/* NavBar */}
      <div className="bg-white border-b border-gray-200 px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-gray-900 leading-none">공지 관리</p>
            <p className="text-[11px] text-gray-400 mt-0.5">랜딩 페이지 공지사항</p>
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

      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-extrabold text-gray-900">공지사항 관리</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              랜딩 페이지 하단에 표시됩니다 · 노출 중 <span className="font-bold text-indigo-600">{visibleCount}</span>/5개
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> 공지 추가
          </button>
        </div>

        {/* 공지 목록 */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : notices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <CheckCircle2 className="w-8 h-8 text-gray-200" />
              <p className="text-sm font-semibold text-gray-500">등록된 공지가 없습니다</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wide w-24">날짜</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wide">내용</th>
                  <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wide w-20">노출</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wide w-24">관리</th>
                </tr>
              </thead>
              <tbody>
                {notices.map((n, i) => (
                  <tr key={n.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${i === notices.length - 1 ? "border-b-0" : ""}`}>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-bold text-gray-700 tabular-nums">{n.date}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm text-gray-800 leading-snug">{n.content}</p>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => toggleVisible(n)}
                        title={n.is_visible ? "숨김으로 전환" : "노출로 전환"}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                          n.is_visible
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
                        }`}
                      >
                        {n.is_visible ? <><Eye className="w-3 h-3" /> 노출</> : <><EyeOff className="w-3 h-3" /> 숨김</>}
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(n)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(n.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-3 text-center">
          노출 중인 공지 최대 5개가 랜딩 페이지에 최신순으로 표시됩니다
        </p>
      </div>

      {/* 추가/수정 모달 */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeForm} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-extrabold text-gray-900">
                {editing ? "공지 수정" : "공지 추가"}
              </h2>
              <button onClick={closeForm} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className={labelCls}>날짜 <span className="text-red-500">*</span></label>
                <input
                  value={form.date}
                  onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  placeholder="예) 2026.04"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>내용 <span className="text-red-500">*</span></label>
                <textarea
                  value={form.content}
                  onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                  rows={3}
                  placeholder="공지 내용을 입력하세요"
                  className={`${inputCls} resize-none`}
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.is_visible}
                  onChange={e => setForm(p => ({ ...p, is_visible: e.target.checked }))}
                  className="w-4 h-4 accent-indigo-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">랜딩 페이지에 노출</span>
              </label>
            </div>

            {err && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 mt-4">
                <AlertCircle className="w-4 h-4 shrink-0" />{err}
              </div>
            )}

            <div className="flex gap-2 mt-5">
              <button onClick={closeForm}
                className="flex-1 py-2.5 text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors">
                취소
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editing ? "저장" : "추가"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 */}
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
