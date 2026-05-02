"use client"

import { useRouter } from "next/navigation"
import { BookOpen, ArrowLeft, LogOut } from "lucide-react"
import { signOut } from "next-auth/react"
import AssignmentWizard from "../AssignmentWizard"

export default function NewAssignmentPage() {
  const router = useRouter()
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
            <p className="text-sm font-extrabold text-gray-900 leading-none">과제 생성</p>
            <p className="text-[11px] text-gray-400 mt-0.5">문제와 학생을 선택한 뒤 마감일을 설정하세요</p>
          </div>
        </div>
        <button onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors font-medium">
          <LogOut className="w-4 h-4" /> 로그아웃
        </button>
      </div>
      <div className="max-w-[1400px] mx-auto px-8 py-8">
        <AssignmentWizard />
      </div>
    </div>
  )
}
