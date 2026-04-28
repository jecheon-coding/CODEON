"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Clock, CheckCircle2, XCircle } from "lucide-react"
import CodeOnLogo from "@/components/ui/CodeOnLogo"

export default function ParentPendingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [requestStatus, setRequestStatus] = useState<"pending" | "approved" | "rejected" | null>(null)
  const [rejectReason, setRejectReason] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "loading") return
    if (!session?.user) { router.push("/login?role=parent"); return }

    const checkStatus = async () => {
      const res = await fetch("/api/parent/link-status")

      if (res.status === 401) { router.push("/login?role=parent"); return }

      const json = await res.json()

      if (!json.data) {
        router.push("/parent/request-link")
        return
      }

      setRequestStatus(json.data.status)
      setRejectReason(json.data.reject_reason ?? null)

      if (json.data.status === "approved") {
        router.push("/parent")
        return
      }

      setLoading(false)
    }

    checkStatus()
  }, [status, session, router])

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <header className="bg-white border-b border-gray-100 h-14 flex items-center px-6">
        <div className="max-w-lg mx-auto w-full flex items-center gap-3">
          <CodeOnLogo />
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">

          {requestStatus === "rejected" ? (
            <>
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
              <h1 className="text-xl font-extrabold text-gray-900 mb-2">연결 요청이 반려되었습니다</h1>
              <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                관리자가 요청을 승인하지 않았습니다.<br />
                아래 사유를 확인하고 다시 신청해 주세요.
              </p>
              {rejectReason && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700 mb-6 text-left">
                  <span className="font-semibold">반려 사유:</span> {rejectReason}
                </div>
              )}
              <button
                onClick={() => router.push("/parent/request-link")}
                className="w-full py-3.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold rounded-xl transition-colors"
              >
                다시 연결 요청하기
              </button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Clock className="w-8 h-8 text-amber-400" />
              </div>
              <h1 className="text-xl font-extrabold text-gray-900 mb-2">승인 대기 중입니다</h1>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                연결 요청이 제출되었습니다.<br />
                관리자가 확인 후 승인하면 자동으로 대시보드가 열립니다.<br />
                <span className="text-gray-400 text-xs mt-1 block">보통 1 영업일 이내에 처리됩니다.</span>
              </p>

              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-700">요청 접수 완료</p>
                    <p className="text-xs text-gray-400">관리자 검토 중</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => window.location.reload()}
                className="text-sm text-indigo-500 hover:text-indigo-600 font-medium transition-colors"
              >
                새로고침하여 상태 확인
              </button>
            </>
          )}

          <p className="text-center text-xs text-gray-400 mt-6 leading-relaxed">
            문의는 담당 선생님께 연락해 주세요.
          </p>
        </div>
      </div>
    </div>
  )
}
