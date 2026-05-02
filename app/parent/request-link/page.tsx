"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Send } from "lucide-react"
import CodeOnLogo from "@/components/ui/CodeOnLogo"

const RELATIONSHIPS = ["어머니", "아버지", "보호자"] as const

export default function RequestLinkPage() {
  const { data: session } = useSession()
  const router = useRouter()

  const [studentName,  setStudentName]  = useState("")
  const [phone,        setPhone]        = useState("")
  const [relationship, setRelationship] = useState<typeof RELATIONSHIPS[number]>("어머니")
  const [submitting,   setSubmitting]   = useState(false)
  const [error,        setError]        = useState("")

  const parentName = session?.user?.name ?? ""

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSubmitting(true)
    try {
      const res  = await fetch("/api/parent/request-link", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ studentName, phone, relationship }),
      })
      const json = await res.json()

      if (!res.ok) { setError(json.error ?? "요청 중 오류가 발생했습니다."); return }

      router.push("/parent/pending")
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해 주세요.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">

      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 h-14 flex items-center px-6">
        <div className="max-w-lg mx-auto w-full flex items-center gap-3">
          <CodeOnLogo />
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {/* 안내 */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔗</span>
            </div>
            <h1 className="text-xl font-extrabold text-gray-900 mb-2">자녀 연결 요청</h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              아래 정보를 입력하면 관리자가 확인 후 승인합니다.<br />
              승인되면 자녀의 학습 현황을 바로 확인할 수 있어요.
            </p>
          </div>

          {/* 폼 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

              {/* 학부모 이름 (읽기 전용) */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                  학부모 이름
                </label>
                <input
                  type="text"
                  value={parentName}
                  readOnly
                  className="w-full px-4 py-3 border border-gray-100 rounded-xl text-sm text-gray-400 bg-gray-50 cursor-not-allowed"
                />
              </div>

              {/* 관계 */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                  관계 <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-2">
                  {RELATIONSHIPS.map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRelationship(r)}
                      className={`flex-1 py-2.5 text-sm font-semibold rounded-xl border transition-all
                        ${relationship === r
                          ? "border-indigo-400 bg-indigo-50 text-indigo-600"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* 학생 이름 */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                  자녀 이름 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="예) 김민준"
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>

              {/* 연락처 */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                  연락처 <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="예) 010-1234-5678"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>

              {error && (
                <p className="text-xs text-red-500 text-center bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex items-center justify-center gap-2 w-full py-3.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
              >
                <Send className="w-4 h-4" />
                {submitting ? "제출 중..." : "연결 요청 제출"}
              </button>

            </form>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4 leading-relaxed">
            승인까지 보통 1 영업일 이내 처리됩니다.<br />
            문의는 담당 선생님께 연락해 주세요.
          </p>

        </div>
      </div>
    </div>
  )
}
