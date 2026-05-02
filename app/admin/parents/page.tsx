"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Plus, Trash2, RefreshCw, ToggleLeft, ToggleRight,
  Users, AlertCircle, Loader2, ChevronLeft, Eye, EyeOff,
} from "lucide-react"

interface ParentRow {
  id:           string
  name:         string
  loginId:      string
  isActive:     boolean
  createdAt:    string
  studentNames: string[]
}

const EMPTY_FORM = { name: "", loginId: "", password: "" }

export default function AdminParentsPage() {
  const router  = useRouter()
  const [parents, setParents]     = useState<ParentRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState("")

  const [form, setForm]           = useState(EMPTY_FORM)
  const [showPw, setShowPw]       = useState(false)
  const [saving, setSaving]       = useState(false)
  const [saveErr, setSaveErr]     = useState("")

  const [resetTarget, setResetTarget] = useState<ParentRow | null>(null)
  const [resetPw, setResetPw]         = useState("")
  const [showResetPw, setShowResetPw] = useState(false)
  const [resetting, setResetting]     = useState(false)
  const [resetErr, setResetErr]       = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/admin/parents")
      if (!res.ok) throw new Error((await res.json()).error ?? "오류")
      setParents(await res.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── 계정 생성 ──────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveErr("")
    setSaving(true)
    try {
      const res = await fetch("/api/admin/parents", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: form.name, loginId: form.loginId, password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) { setSaveErr(data.error ?? "오류"); return }
      setForm(EMPTY_FORM)
      load()
    } catch {
      setSaveErr("서버 오류가 발생했습니다.")
    } finally {
      setSaving(false)
    }
  }

  // ── 활성화 토글 ───────────────────────────────────────────────────────────
  const toggleActive = async (p: ParentRow) => {
    await fetch(`/api/admin/parents/${p.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ isActive: !p.isActive }),
    })
    load()
  }

  // ── 비밀번호 재설정 ───────────────────────────────────────────────────────
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetTarget) return
    setResetErr("")
    setResetting(true)
    try {
      const res = await fetch(`/api/admin/parents/${resetTarget.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ password: resetPw }),
      })
      const data = await res.json()
      if (!res.ok) { setResetErr(data.error ?? "오류"); return }
      setResetTarget(null)
      setResetPw("")
      load()
    } catch {
      setResetErr("서버 오류가 발생했습니다.")
    } finally {
      setResetting(false)
    }
  }

  // ── 삭제 ─────────────────────────────────────────────────────────────────
  const handleDelete = async (p: ParentRow) => {
    if (!confirm(`'${p.name}' 계정을 삭제하시겠습니까?`)) return
    await fetch(`/api/admin/parents/${p.id}`, { method: "DELETE" })
    load()
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center gap-4">
        <button
          onClick={() => router.push("/admin")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors font-medium"
        >
          <ChevronLeft className="w-4 h-4" /> 대시보드
        </button>
        <div className="h-4 w-px bg-gray-200" />
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <span className="text-sm font-extrabold text-gray-900">학부모 계정 관리</span>
        </div>
        <button
          onClick={load}
          className="ml-auto flex items-center gap-1.5 text-xs text-gray-400 hover:text-indigo-600 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> 새로고침
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8 space-y-8">

        {/* ── 신규 계정 생성 ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-extrabold text-gray-900 mb-4">신규 학부모 계정 생성</h2>
          <form onSubmit={handleCreate} className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-gray-400 font-medium">이름</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="홍길동"
                required
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400 w-36"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-gray-400 font-medium">아이디</label>
              <input
                type="text"
                value={form.loginId}
                onChange={(e) => setForm(f => ({ ...f, loginId: e.target.value }))}
                placeholder="parent01"
                required
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400 w-36"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-gray-400 font-medium">임시 비밀번호</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="6자 이상"
                  required
                  minLength={6}
                  className="px-3 py-2 pr-8 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400 w-40"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              계정 생성
            </button>
            {saveErr && (
              <p className="text-xs text-red-500 flex items-center gap-1 w-full mt-1">
                <AlertCircle className="w-3.5 h-3.5" /> {saveErr}
              </p>
            )}
          </form>
          <p className="mt-3 text-[11px] text-gray-400">
            생성된 계정은 처음 로그인 시 비밀번호 변경이 강제됩니다.
          </p>
        </div>

        {/* ── 계정 목록 ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-extrabold text-gray-900 mb-4">
            학부모 계정 목록 <span className="font-normal text-gray-400">({parents.length}명)</span>
          </h2>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100 mb-4">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            </div>
          ) : parents.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">등록된 학부모 계정이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-[11px] text-gray-400 font-medium">
                    <th className="text-left py-2 pr-4">이름</th>
                    <th className="text-left py-2 pr-4">아이디</th>
                    <th className="text-left py-2 pr-4">연결된 자녀</th>
                    <th className="text-left py-2 pr-4">가입일</th>
                    <th className="text-left py-2 pr-4">상태</th>
                    <th className="text-left py-2">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {parents.map((p) => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 pr-4 font-medium text-gray-900">{p.name}</td>
                      <td className="py-3 pr-4 text-gray-500 font-mono text-xs">{p.loginId}</td>
                      <td className="py-3 pr-4 text-gray-500">
                        {p.studentNames.length > 0
                          ? p.studentNames.join(", ")
                          : <span className="text-gray-300">미연결</span>}
                      </td>
                      <td className="py-3 pr-4 text-gray-400 text-xs">
                        {new Date(p.createdAt).toLocaleDateString("ko-KR")}
                      </td>
                      <td className="py-3 pr-4">
                        <button
                          onClick={() => toggleActive(p)}
                          className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-colors ${
                            p.isActive
                              ? "bg-green-50 text-green-600 hover:bg-green-100"
                              : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                          }`}
                        >
                          {p.isActive
                            ? <><ToggleRight className="w-3.5 h-3.5" /> 활성</>
                            : <><ToggleLeft  className="w-3.5 h-3.5" /> 비활성</>}
                        </button>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setResetTarget(p); setResetPw(""); setResetErr("") }}
                            className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 font-medium px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
                          >
                            <RefreshCw className="w-3 h-3" /> 비밀번호 재설정
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" /> 삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── 비밀번호 재설정 모달 ── */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-extrabold text-gray-900 mb-1">비밀번호 재설정</h3>
            <p className="text-xs text-gray-400 mb-4">
              <span className="font-semibold text-gray-700">{resetTarget.name}</span>
              &nbsp;({resetTarget.loginId}) 계정의 새 임시 비밀번호를 입력하세요.
            </p>

            <form onSubmit={handleReset} className="space-y-3">
              <div className="relative">
                <input
                  type={showResetPw ? "text" : "password"}
                  value={resetPw}
                  onChange={(e) => setResetPw(e.target.value)}
                  placeholder="새 임시 비밀번호 (6자 이상)"
                  required
                  minLength={6}
                  className="w-full px-3 py-2.5 pr-9 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
                />
                <button
                  type="button"
                  onClick={() => setShowResetPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showResetPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {resetErr && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {resetErr}
                </p>
              )}

              <p className="text-[11px] text-gray-400">
                재설정 후 해당 학부모는 다음 로그인 시 비밀번호를 다시 변경해야 합니다.
              </p>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : "재설정"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
