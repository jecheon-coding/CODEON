"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

const tabs = [
  {
    label: "학생용",
    title: "막힐 때마다 즉시 해결",
    description:
      "AI 튜터가 24시간 대기 중입니다. 코드를 제출하면 어디서 틀렸는지 바로 알려주고, 개념 설명부터 힌트까지 제공해요. 혼자서도 꾸준히 성장할 수 있는 개인 진도 관리 시스템을 경험하세요.",
    highlights: ["즉각적인 AI 피드백", "개인 맞춤 힌트 제공", "진도 자동 기록 및 관리"],
  },
  {
    label: "학원용",
    title: "수업 준비는 짧게, 지도는 더 정확하게",
    description:
      "반 전체 학생의 진도율과 정답률을 한눈에 파악하세요. AI가 코드를 자동 분석해 취약한 개념을 추출하고, 강사가 꼭 집중해야 할 학생을 알려줍니다. 수업 준비 시간을 절반으로 줄이세요.",
    highlights: ["실시간 진도 모니터링", "AI 자동 코드 분석", "취약 개념 자동 추출"],
  },
  {
    label: "학부모용",
    title: "아이의 성장을 숫자로 확인하세요",
    description:
      "매주 자동 발송되는 성장 보고서로 아이의 학습 현황을 파악하세요. AI가 분석한 사고력 변화와 정답률 추이를 통해 우리 아이가 어떻게 성장하고 있는지 명확하게 볼 수 있습니다.",
    highlights: ["주간 성장 보고서 자동 발송", "AI 기반 사고력 분석", "학습 결과 시각화"],
  },
]

export default function RoleTabs() {
  const [active, setActive] = useState(0)
  const router  = useRouter()
  const current = tabs[active]

  return (
    <section id="student" className="bg-gray-50 py-10 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Tab Bar */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-white rounded-full shadow-sm border border-gray-100 p-1 gap-1">
            {tabs.map((tab, i) => (
              <button
                key={tab.label}
                onClick={() => setActive(i)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                  active === i
                    ? "bg-indigo-500 text-white shadow-md"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-3xl mx-auto text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-3">{current.title}</h3>
          <p className="text-gray-600 leading-relaxed mb-6">{current.description}</p>
          <ul className="flex flex-col sm:flex-row justify-center gap-3 mb-6">
            {current.highlights.map((h) => (
              <li
                key={h}
                className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-600 text-sm font-medium px-4 py-1.5 rounded-full"
              >
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                {h}
              </li>
            ))}
          </ul>

          {active === 2 && (
            <button
              onClick={() => router.push("/parent")}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
            >
              학부모 대시보드 바로가기 →
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
