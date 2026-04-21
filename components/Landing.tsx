"use client"

import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import CodeOnLogo      from "@/components/ui/CodeOnLogo"
import HeroSection     from "@/components/landing/HeroSection"
import DemoSection     from "@/components/landing/DemoSection"
import ReviewsSection  from "@/components/landing/ReviewsSection"
import StepsSection    from "@/components/landing/StepsSection"
import UserPathSection from "@/components/landing/UserPathSection"
import CtaSection      from "@/components/landing/CtaSection"

export default function Landing() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const handleStudentLogin = () => {
    if (status === "authenticated" && (session?.user as any)?.role === "student") {
      router.push("/dashboard")
    } else {
      router.push("/login")
    }
  }

  const handleParentNav = () => {
    const role = (session?.user as any)?.role
    if (status === "authenticated" && role === "parent") router.push("/parent")
    else router.push("/login?role=parent")
  }

  return (
    <div className="min-h-screen bg-white">

      {/* ── Navbar ─────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">

          <CodeOnLogo />

          {/* 메뉴 */}
          <div className="hidden sm:flex items-center gap-7">
            <button
              onClick={() => document.getElementById("user-path")?.scrollIntoView({ behavior: "smooth" })}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              학생용
            </button>
            <button
              onClick={handleParentNav}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              학부모용
            </button>
            <a
              href="https://pf.kakao.com/_xnKxfxn"
              target="_blank" rel="noopener noreferrer"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              수강 문의
            </a>
          </div>

          {/* 로그인 CTA */}
          <button
            onClick={handleStudentLogin}
            className="px-4 py-1.5 bg-gray-900 text-white text-sm font-semibold rounded-lg
              hover:bg-gray-800 active:scale-95 transition-all duration-200"
          >
            로그인
          </button>
        </div>
      </nav>

      {/* ── 섹션 ───────────────────────────────────────────── */}
      <HeroSection />
      <DemoSection />
      <ReviewsSection />
      <StepsSection />
      <div id="user-path"><UserPathSection /></div>
      <CtaSection />

      {/* ── 푸터 ───────────────────────────────────────────── */}
      <footer className="py-10 px-5 bg-slate-950">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start justify-between gap-8">

          {/* 로고 + 태그라인 */}
          <div className="flex items-center gap-2.5 shrink-0">
            <CodeOnLogo variant="dark-bg" />
            <span className="text-[10px] text-slate-500 hidden sm:block">AI 코딩 학습 플랫폼</span>
          </div>

          {/* 학원 정보 */}
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-400 mb-1">
              제천코딩학원 Coding &amp; Play
            </p>
            <p className="text-xs text-slate-500 mb-0.5">
              충북 제천시 죽하로 15길 34 (장락동)
            </p>
            <p className="text-xs text-slate-500 mb-2">
              수강 문의: 043-652-1998
            </p>
            <p className="text-[10px] text-slate-600">
              © {new Date().getFullYear()} Codeon. All rights reserved.
            </p>
          </div>

        </div>
      </footer>

    </div>
  )
}
