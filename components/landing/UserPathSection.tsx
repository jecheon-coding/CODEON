"use client"

import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

const STUDENT_ITEMS = [
  "오늘 할 문제 확인",
  "코드 작성 및 실행",
  "AI 피드백 확인",
  "제출 후 다음 학습으로",
]

const PARENT_ITEMS = [
  "자녀 학습 현황 확인",
  "과제 진행 상태 확인",
  "공지와 피드백 확인",
  "학습 흐름 이해",
]

export default function UserPathSection() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const goStudent = () => {
    if (status === "authenticated" && (session?.user as any)?.role === "student") {
      router.push("/dashboard")
    } else {
      router.push("/login")
    }
  }

  const goParent = () => {
    const role = (session?.user as any)?.role
    if (status === "authenticated" && role === "parent") router.push("/parent")
    else router.push("/login?role=parent")
  }

  return (
    <section className="py-24 px-5 bg-[#F5F5F0]">
      <div className="max-w-5xl mx-auto">

        <div className="text-center mb-12">
          <p className="text-xs font-bold text-indigo-500 tracking-widest uppercase mb-3">
            Get Started
          </p>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">처음이신가요?</h2>
          <p className="text-sm text-gray-600">
            학생과 학부모 모두 별도 입구로 입장합니다
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">

          {/* 학생 카드 (강조) */}
          <div className="bg-gray-900 text-white rounded-2xl p-8 flex flex-col">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center mb-6 shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
              </svg>
            </div>
            <h3 className="text-lg font-bold mb-1.5">학생은 이렇게 학습합니다</h3>
            <p className="text-xs text-gray-400 mb-5">수업 흐름에 맞춰 단계적으로 학습해요</p>
            <ul className="space-y-3 mb-8 flex-1">
              {STUDENT_ITEMS.map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-gray-300">
                  <span className="w-5 h-5 bg-indigo-500/20 text-indigo-400 rounded-full
                    flex items-center justify-center text-[10px] font-bold shrink-0">
                    {i + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={goStudent}
              className="w-full py-3 bg-indigo-500 hover:bg-indigo-400 text-white
                text-sm font-bold rounded-xl transition-all duration-200 active:scale-[0.98]"
            >
              학생 로그인
            </button>
          </div>

          {/* 학부모 카드 */}
          <div className="bg-white border border-gray-200 rounded-2xl p-8 flex flex-col">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mb-6 shrink-0">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1.5">학부모는 이렇게 확인합니다</h3>
            <p className="text-xs text-gray-500 mb-5">자녀의 학습 현황을 한눈에 파악해요</p>
            <ul className="space-y-3 mb-8 flex-1">
              {PARENT_ITEMS.map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-gray-600">
                  <span className="w-5 h-5 bg-gray-100 text-gray-500 rounded-full
                    flex items-center justify-center text-[10px] font-bold shrink-0">
                    {i + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={goParent}
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800
                text-sm font-bold rounded-xl transition-all duration-200 active:scale-[0.98]
                border border-gray-200"
            >
              학부모용 보기
            </button>
          </div>

        </div>
      </div>
    </section>
  )
}
