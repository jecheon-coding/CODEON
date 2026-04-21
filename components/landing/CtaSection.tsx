"use client"

import { useSession }              from "next-auth/react"
import { useRouter }               from "next/navigation"
import { BookOpen, BarChart2, UserCheck } from "lucide-react"

const NOTICES = [
  { date: "2026.04", title: "4월 과제 업로드 완료 — 기초 과정 22~28번" },
  { date: "2026.03", title: "알고리즘 과정 신규 문제 15개 추가" },
  { date: "2026.03", title: "학부모 리포트 화면 업데이트 안내" },
]

const TRUST_POINTS = [
  { Icon: BookOpen,   text: "학원 진도 맞춤 과제" },
  { Icon: BarChart2,  text: "학생별 학습 관리"   },
  { Icon: UserCheck,  text: "학부모 확인 지원"   },
]

export default function CtaSection() {
  const { status } = useSession()
  const router = useRouter()

  const handleStudentLogin = () => {
    if (status === "authenticated") router.push("/dashboard")
    else router.push("/login")
  }

  return (
    <>
      {/* ── 학원 전용 신뢰 섹션 ── */}
      <section className="py-20 px-5 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">

            <div>
              <p className="text-xs font-bold text-indigo-500 tracking-widest uppercase mb-4">
                우리 학원 전용
              </p>
              <h2 className="text-2xl font-bold text-gray-900 leading-snug mb-3">
                수업에 맞춰 만든<br />전용 학습 플랫폼
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Python, 알고리즘, AI 학습을 학생 수준과 수업 흐름에 맞춰
                문제풀이부터 피드백까지 하나로 연결했습니다.
              </p>
            </div>

            <div className="space-y-4 md:pl-4">
              {TRUST_POINTS.map(({ Icon, text }, i) => (
                <div key={i} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
                  <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-indigo-500" strokeWidth={1.75} />
                  </div>
                  <span className="text-sm font-medium text-gray-800">{text}</span>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── 공지 + 문의 ── */}
      <section className="py-14 px-5 bg-[#F5F5F0] border-t border-gray-200">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">

            {/* 최근 공지 */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-5">최근 공지</h3>
              <div className="space-y-4">
                {NOTICES.map((n, i) => (
                  <div key={i} className="flex items-baseline gap-3">
                    <span className="text-[11px] font-bold text-gray-500 shrink-0 tabular-nums">
                      {n.date}
                    </span>
                    <p className="text-xs text-gray-700 leading-relaxed">{n.title}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 수강 문의 */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-2">수강 문의</h3>
              <p className="text-xs text-gray-600 mb-5 leading-relaxed">
                학원 등록 및 수강 관련 문의는 카카오톡 채널로 연락해 주세요.
              </p>
              <div className="flex flex-col gap-2.5 max-w-xs">
                <button
                  onClick={handleStudentLogin}
                  className="px-5 py-2.5 bg-gray-900 text-white text-sm font-bold
                    rounded-xl hover:bg-gray-800 transition-all duration-200 active:scale-95 text-center"
                >
                  학생 로그인
                </button>
                <a
                  href="https://pf.kakao.com/_xnKxfxn"
                  target="_blank" rel="noopener noreferrer"
                  className="px-5 py-2.5 text-sm font-semibold text-gray-700 border border-gray-300
                    rounded-xl hover:bg-white transition-all duration-200 text-center"
                >
                  카카오 채널 문의 →
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>
    </>
  )
}
