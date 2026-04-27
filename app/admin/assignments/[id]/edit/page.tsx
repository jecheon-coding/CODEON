"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { BookOpen, ArrowLeft, LogOut, Loader2 } from "lucide-react"
import { signOut } from "next-auth/react"
import AssignmentWizard from "../../AssignmentWizard"

type AssignmentDetail = {
  title: string; dueDate: string | null; problemIds: string[]; studentIds: string[]
}

export default function EditAssignmentPage() {
  const params   = useParams()
  const router   = useRouter()
  const id       = params.id as string
  const [data,     setData]     = useState<AssignmentDetail | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/assignments/${id}`)
      .then(r => {
        if (!r.ok) { setNotFound(true); setLoading(false); return null }
        return r.json()
      })
      .then(d => { if (d) { setData(d); setLoading(false) } })
  }, [id])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/admin")}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors mr-1">
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </button>
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-gray-900 leading-none">과제 수정</p>
            <p className="text-[11px] text-gray-400 mt-0.5">내용을 수정한 뒤 저장하세요</p>
          </div>
        </div>
        <button onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors font-medium">
          <LogOut className="w-4 h-4" /> 로그아웃
        </button>
      </div>

      <div className="max-w-[1400px] mx-auto px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          </div>
        ) : notFound ? (
          <div className="flex items-center justify-center py-24">
            <p className="text-gray-500 text-sm">과제를 찾을 수 없습니다.</p>
          </div>
        ) : data && (
          <AssignmentWizard
            assignmentId={id}
            initialTitle={data.title}
            initialDueDate={data.dueDate ? new Date(data.dueDate).toISOString().slice(0, 16) : undefined}
            initialProblemIds={data.problemIds}
            initialStudentIds={data.studentIds}
          />
        )}
      </div>
    </div>
  )
}
