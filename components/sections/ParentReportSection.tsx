"use client"

import { FileText, Brain, BarChart2 } from "lucide-react"

const weeklyBars = [
  { day: "월", score: 55 },
  { day: "화", score: 70 },
  { day: "수", score: 65 },
  { day: "목", score: 82 },
  { day: "금", score: 90 },
]

export default function ParentReportSection() {
  return (
    <section id="parent" className="py-20 px-6 bg-gradient-to-b from-indigo-50 to-white">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

        {/* Left — iPhone Mockup (order-last on mobile so text reads first) */}
        <div className="flex justify-center order-last lg:order-first">
          <div className="relative w-64">
            {/* Phone frame */}
            <div className="rounded-[2.5rem] border-4 border-gray-800 bg-white shadow-2xl overflow-hidden">
              {/* Notch */}
              <div className="bg-gray-800 h-6 flex items-center justify-center">
                <div className="w-16 h-1.5 bg-gray-600 rounded-full" />
              </div>

              {/* Screen content */}
              <div className="p-4 space-y-3 bg-gray-50 min-h-[420px]">

                {/* Header */}
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-gray-800">Codeon 리포트</span>
                  <span className="text-[10px] text-gray-400">2025. 4. 14</span>
                </div>

                {/* Weekly report card */}
                <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                  <p className="text-[10px] font-semibold text-indigo-500 mb-1">주간 성장 보고서</p>
                  <p className="text-xs font-bold text-gray-800">김민준 학생</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">이번 주 총 24문제 · 정답 18개</p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="text-lg font-extrabold text-indigo-500">75%</span>
                    <span className="text-[10px] text-green-500 font-semibold">▲ 지난주 대비 +12%</span>
                  </div>
                </div>

                {/* Score change chart */}
                <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                  <p className="text-[10px] font-semibold text-gray-500 mb-2">이번 주 점수 변화</p>
                  <div className="flex items-end gap-1.5 h-14">
                    {weeklyBars.map((b) => (
                      <div key={b.day} className="flex flex-col items-center gap-0.5 flex-1">
                        <div
                          className="w-full bg-indigo-400 rounded-t"
                          style={{ height: `${b.score * 0.56}px` }}
                        />
                        <span className="text-[8px] text-gray-400">{b.day}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI feedback */}
                <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                  <p className="text-[10px] font-semibold text-indigo-600 mb-1">AI 피드백</p>
                  <p className="text-[10px] text-gray-600 leading-relaxed">
                    재귀 함수 개념에서 성장이 보입니다. 이중 반복문 연습을 조금 더 하면 다음 단계로 빠르게 올라갈 수 있어요!
                  </p>
                </div>

              </div>

              {/* Home bar */}
              <div className="bg-gray-800 h-5 flex items-center justify-center">
                <div className="w-10 h-1 bg-gray-600 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Right — Text */}
        <div>
          <p className="text-sm font-semibold text-indigo-500 uppercase tracking-wide mb-3">
            학부모 리포트 시스템
          </p>
          <h2 className="text-3xl font-bold text-gray-900 leading-snug mb-4">
            아이의 성장을<br />숫자로 확인하세요
          </h2>
          <p className="text-gray-600 mt-3 mb-8 leading-relaxed">
            매주 자동으로 발송되는 성장 보고서로 아이의 학습 현황을 파악하세요. 점수 변화와 AI 분석 피드백으로 어디서 성장했고 무엇을 더 연습해야 하는지 한눈에 알 수 있습니다.
          </p>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-indigo-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">주간 성장 보고서 자동 발송</p>
                <p className="text-sm text-gray-500 mt-0.5">매주 학습 요약과 성장 지표를 자동으로 정리</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                <Brain className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">AI 기반 사고력 분석</p>
                <p className="text-sm text-gray-500 mt-0.5">단순 정답률을 넘어 논리적 사고 패턴까지 분석</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
                <BarChart2 className="w-4 h-4 text-rose-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">학습 결과 시각화</p>
                <p className="text-sm text-gray-500 mt-0.5">점수 변화 그래프로 성장 흐름을 직관적으로 확인</p>
              </div>
            </li>
          </ul>
        </div>

      </div>
    </section>
  )
}
