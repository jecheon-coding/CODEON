"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function ChangePasswordPage() {
  const { data: session } = useSession()
  const router = useRouter()

  const [newPw,    setNewPw]    = useState("")
  const [confirm,  setConfirm]  = useState("")
  const [error,    setError]    = useState("")
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (newPw.length < 6) {
      setError("비밀번호는 6자리 이상이어야 해요.")
      return
    }
    if (newPw !== confirm) {
      setError("비밀번호가 서로 달라요. 다시 확인해 주세요.")
      return
    }

    setLoading(true)
    const res = await fetch("/api/auth/change-password", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ new_password: newPw }),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(json.error ?? "오류가 발생했어요. 다시 시도해 주세요.")
      return
    }

    router.push("/course")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-8 py-9">

          {/* 헤더 */}
          <div className="text-center mb-7">
            <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-xl font-extrabold text-gray-900">비밀번호 변경</h1>
            <p className="text-sm text-gray-400 mt-1">
              처음 로그인했어요! 새 비밀번호를 만들어 주세요.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="password"
              placeholder="새 비밀번호 (6자리 이상)"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
            <input
              type="password"
              placeholder="비밀번호 확인"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />

            {error && (
              <p className="text-xs text-red-500 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-indigo-500 text-white rounded-xl text-base font-bold hover:bg-indigo-600 active:scale-95 transition-all mt-1 disabled:opacity-60"
            >
              {loading ? "저장 중..." : "비밀번호 저장하기"}
            </button>
          </form>

        </div>
        <p className="text-center text-xs text-gray-400 mt-6">제천코딩학원 Coding &amp; Play</p>
      </div>
    </div>
  )
}
