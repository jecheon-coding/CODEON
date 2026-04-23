"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function Onboarding() {
  const { data: session } = useSession()
  const router = useRouter()

  const [name, setName] = useState("")
  const [grade, setGrade] = useState("")
  const [className, setClassName] = useState("")
  const [phone, setPhone] = useState("")

  const handleSubmit = async () => {
    if (!session?.user?.email) return

    await supabase
      .from("users")
      .update({
        name,
        grade,
        class: className,
        parent_phone: phone,
        status: "pending",
      })
      .eq("email", session.user.email)

    router.push("/waiting")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="bg-white p-8 rounded-2xl w-96 shadow-md">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">학생 정보 입력</h2>
          <p className="text-sm text-gray-500 mt-1">정보를 입력하면 선생님 승인 후 학습을 시작할 수 있어요.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
            <input
              placeholder="홍길동"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">학년</label>
            <input
              placeholder="예: 6학년"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              onChange={(e) => setGrade(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">반</label>
            <input
              placeholder="예: 2반"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              onChange={(e) => setClassName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">학부모 연락처</label>
            <input
              placeholder="010-0000-0000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!name || !grade || !className || !phone}
          className="w-full mt-6 bg-indigo-500 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          저장하고 시작하기
        </button>
      </div>
    </div>
  )
}