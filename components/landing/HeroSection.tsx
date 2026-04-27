"use client"

import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Lock, ThumbsUp } from "lucide-react"

export default function HeroSection() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const handleStudentLogin = () => {
    if (status === "authenticated" && (session?.user as any)?.role === "student") {
      router.push("/dashboard")
    } else {
      router.push("/login")
    }
  }

  const handleParentInfo = () => {
    const role = (session?.user as any)?.role
    if (status === "authenticated" && role === "parent") router.push("/parent")
    else router.push("/login?role=parent")
  }

  return (
    <section className="pt-32 pb-0 px-5 bg-gradient-to-b from-[#F5F5F0] to-white overflow-hidden">
      <div className="max-w-5xl mx-auto">

        {/* 배지 */}
        <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-600
          text-xs font-semibold px-3 py-1 rounded-full mb-7 select-none">
          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
          제천코딩학원 수강생 전용 AI 학습 플랫폼
        </div>

        {/* 헤드라인 */}
        <h1 className="text-5xl sm:text-[3.75rem] font-black text-gray-900
          leading-[1.15] tracking-tight mb-5">
          지금, 너의 코딩을<br />
          <span className="text-indigo-500">켜는 순간.</span>
        </h1>

        {/* 보조 문구 — 대비 강화 */}
        <p className="text-base sm:text-lg text-gray-700 leading-relaxed mb-8 max-w-lg">
          문제풀이, 과제, AI 피드백을 우리 학원<br className="hidden sm:block" />
          수업 흐름에 맞게 한 곳에서.
        </p>

        {/* CTA */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <button
            onClick={handleStudentLogin}
            className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white
              rounded-xl text-sm font-bold hover:bg-gray-800 active:scale-95
              transition-all duration-200 shadow-sm"
          >
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            학생 로그인
          </button>
          <button
            onClick={handleParentInfo}
            className="px-6 py-3 text-gray-700 border border-gray-300 rounded-xl
              text-sm font-semibold hover:border-gray-400 hover:bg-gray-50
              active:scale-95 transition-all duration-200"
          >
            학부모 안내
          </button>
          <a
            href="https://pf.kakao.com/_xnKxfxn"
            target="_blank" rel="noopener noreferrer"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            수강 문의 →
          </a>
        </div>

        {/* 보조 문구 — 대비 조정 */}
        <p className="text-xs text-gray-500 mb-14">
          <Lock className="inline w-3 h-3 mr-1 -mt-0.5" /> 수강생 전용 플랫폼 · 초대받은 학생만 이용 가능합니다
        </p>

        {/* 에디터 목업 */}
        <div className="relative">
          <div
            className="rounded-2xl border border-gray-700 overflow-hidden"
            style={{
              transform: "perspective(1200px) rotateX(6deg) rotateY(-1deg) scale(0.97)",
              transformOrigin: "top center",
              boxShadow: "0 24px 64px rgba(0,0,0,0.14)",
            }}
          >
            {/* 윈도우 크롬 */}
            <div className="bg-[#2d2d2d] px-4 py-2.5 flex items-center gap-1.5 border-b border-gray-700">
              <span className="w-3 h-3 rounded-full bg-red-400" />
              <span className="w-3 h-3 rounded-full bg-yellow-400" />
              <span className="w-3 h-3 rounded-full bg-green-400" />
              <span className="ml-4 text-xs text-gray-400 font-mono">main.py — CodeOn Editor</span>
            </div>

            {/* 에디터 본문 */}
            <div className="bg-[#1e1e1e] px-6 py-5 text-left font-mono text-sm min-h-[220px]"
              style={{ lineHeight: "1.7" }}>
              <div className="flex gap-5">
                <div className="select-none text-right min-w-[1rem]" style={{ color: "#4b5563" }}>
                  {[1,2,3,4,5,6,7,8].map(n => <div key={n}>{n}</div>)}
                </div>
                <div className="flex-1 overflow-x-auto" style={{ color: "#e5e7eb" }}>
                  <div>
                    <span style={{ color: "#60a5fa" }}>def</span>{" "}
                    <span style={{ color: "#60a5fa" }}>find_max</span>
                    <span>(nums):</span>
                  </div>
                  <div>
                    <span className="ml-4" style={{ color: "#6b7280" }}># 리스트에서 최댓값을 반환합니다</span>
                  </div>
                  <div>
                    <span className="ml-4">max_val = nums[</span>
                    <span style={{ color: "#fbbf24" }}>0</span>
                    <span>]</span>
                  </div>
                  <div>
                    <span className="ml-4" style={{ color: "#60a5fa" }}>for</span>
                    <span> n </span>
                    <span style={{ color: "#60a5fa" }}>in</span>
                    <span> nums:</span>
                  </div>
                  <div>
                    <span className="ml-8" style={{ color: "#60a5fa" }}>if</span>
                    <span> n &gt; max_val:</span>
                  </div>
                  <div>
                    <span className="ml-12">max_val = n</span>
                  </div>
                  <div>
                    <span className="ml-4" style={{ color: "#60a5fa" }}>return</span>
                    <span> max_val</span>
                  </div>
                  <div className="mt-1">
                    <span style={{ color: "#4ade80" }}>▶</span>
                    <span style={{ color: "#6b7280" }}> 출력: </span>
                    <span style={{ color: "#fbbf24" }}>9</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI 피드백 바 */}
            <div
              className="border-t border-gray-700 border-l-4 border-l-indigo-500 px-6 py-3 flex items-center gap-3"
              style={{ background: "linear-gradient(to right, #1e2d45, #1e1e1e)" }}
            >
              <span className="text-xs font-bold uppercase tracking-wide shrink-0" style={{ color: "#93c5fd" }}>
                AI 피드백
              </span>
              <span className="text-xs" style={{ color: "#e5e7eb" }}>
                반복문 대신{" "}
                <code className="px-1 rounded" style={{ background: "#1e3a5f", color: "#93c5fd" }}>max()</code>
                {" "}내장함수를 쓰면 더 간결해요! <ThumbsUp className="inline w-3 h-3 ml-0.5 -mt-0.5" />
              </span>
            </div>
          </div>

          {/* 하단 페이드 — 강도 축소 */}
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent
            pointer-events-none opacity-60" />
        </div>

      </div>
    </section>
  )
}
