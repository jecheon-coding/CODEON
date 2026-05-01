"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Loader2, AlertCircle, CheckCircle2, Lock } from "lucide-react"
import CodeOnLogo from "@/components/ui/CodeOnLogo"

export default function ChangePasswordPage() {
  const router = useRouter()
  const [newPassword, setNewPassword]     = useState("")
  const [confirmPassword, setConfirm]     = useState("")
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState("")
  const [done, setDone]                   = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (newPassword.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/parent/change-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "오류가 발생했습니다.")
        return
      }
      setDone(true)
      // 세션 갱신을 위해 재로그인 안내
    } catch {
      setError("서버 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <main className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-[400px] bg-white rounded-[32px] shadow-sm border border-gray-100 p-10 flex flex-col items-center gap-6">
          <CheckCircle2 className="w-14 h-14 text-green-500" />
          <div className="text-center">
            <p className="text-lg font-extrabold text-gray-900">비밀번호가 변경되었습니다</p>
            <p className="text-sm text-gray-400 mt-1">새 비밀번호로 다시 로그인해 주세요.</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login?role=parent" })}
            className="w-full py-4 bg-[#6366f1] text-white text-[15px] font-bold rounded-2xl hover:bg-[#5558e3] transition-all"
          >
            로그인 화면으로
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-[400px] bg-white rounded-[32px] shadow-sm border border-gray-100 p-10 flex flex-col items-center">
        <div className="mb-8">
          <CodeOnLogo />
        </div>

        <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center mb-4">
          <Lock className="w-6 h-6 text-indigo-500" />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-xl font-extrabold text-gray-900 mb-1">비밀번호 변경</h1>
          <p className="text-sm text-gray-400">처음 로그인 시 비밀번호를 변경해야 합니다.</p>
        </div>

        {error && (
          <div className="w-full mb-4 flex items-center gap-2 p-3 bg-red-50 text-red-600 text-xs font-medium rounded-xl border border-red-100">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="새 비밀번호 (6자 이상)"
            required
            className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-[15px] focus:outline-none focus:border-[#6366f1] transition-all placeholder:text-gray-300"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="비밀번호 확인"
            required
            className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-[15px] focus:outline-none focus:border-[#6366f1] transition-all placeholder:text-gray-300"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#6366f1] hover:bg-[#5558e3] text-white text-[15px] font-bold rounded-2xl transition-all flex items-center justify-center gap-2 mt-2 shadow-sm disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "비밀번호 변경"}
          </button>
        </form>
      </div>
    </main>
  )
}
