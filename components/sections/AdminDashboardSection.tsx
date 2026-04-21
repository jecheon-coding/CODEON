"use client"

import { BarChart2, Activity, AlertCircle } from "lucide-react"

const students = [
  { name: "김민준", progress: 88 },
  { name: "이서연", progress: 72 },
  { name: "박지호", progress: 61 },
]

const weakTags = ["재귀함수", "이중 반복문", "리스트 인덱싱", "조건문 중첩"]

const recentActivity = [
  { name: "최유진", action: "스택 문제 3번 제출", time: "2분 전" },
  { name: "강도현", action: "힌트 요청 — 재귀", time: "5분 전" },
  { name: "윤서아", action: "정렬 문제 통과", time: "9분 전" },
]

export default function AdminDashboardSection() {
  return (
    <section id="academy" className="py-20 px-6 bg-white">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

        {/* Left — Text */}
        <div>
          <p className="text-sm font-semibold text-indigo-500 uppercase tracking-wide mb-3">
            학원 관리 대시보드
          </p>
          <h2 className="text-3xl font-bold text-gray-900 leading-snug mb-4">
            수업 준비는 짧게,<br />지도는 더 정확하게
          </h2>
          <p className="text-gray-600 mt-3 mb-8 leading-relaxed">
            반 전체 학생의 데이터를 AI가 자동 정리합니다. 누가 어디서 막혔는지, 어떤 개념이 취약한지 강사가 직접 분석할 필요 없이 한눈에 파악하세요.
          </p>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <BarChart2 className="w-4.5 h-4.5 text-indigo-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">실시간 진도 모니터링</p>
                <p className="text-sm text-gray-500 mt-0.5">학생별 문제 풀이 현황과 진도율을 실시간으로 확인</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                <Activity className="w-4.5 h-4.5 text-purple-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">AI 자동 코드 분석</p>
                <p className="text-sm text-gray-500 mt-0.5">제출된 코드를 AI가 분석해 오류 패턴 자동 정리</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-4.5 h-4.5 text-rose-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">취약점 자동 추출</p>
                <p className="text-sm text-gray-500 mt-0.5">반 전체 취약 개념을 집계해 수업 방향 제안</p>
              </div>
            </li>
          </ul>
        </div>

        {/* Right — Dashboard Cards (계층 구조) */}
        <div className="flex flex-col gap-4">

          {/* Row 1 — 진도율 (full width, 강조 카드) */}
          <div className="rounded-2xl shadow-lg p-6 bg-white border border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">학생별 진도율</p>
            <ul className="space-y-4">
              {students.map((s) => (
                <li key={s.name}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-semibold text-gray-700">{s.name}</span>
                    <span className="text-indigo-600 font-bold">{s.progress}%</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-700"
                      style={{ width: `${s.progress}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Row 2 — 정답률 + 취약 개념 */}
          <div className="grid grid-cols-2 gap-4">

            {/* 정답률 */}
            <div className="rounded-2xl shadow-lg p-6 bg-white border border-gray-100 flex flex-col items-center justify-center">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">정답률</p>
              <p className="text-4xl font-bold text-indigo-500">73%</p>
              <p className="text-xs text-gray-400 mt-1">이번 주 평균</p>
            </div>

            {/* 취약 개념 */}
            <div className="rounded-2xl shadow-lg p-6 bg-white border border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">취약 개념</p>
              <div className="flex flex-wrap gap-1.5">
                {weakTags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-indigo-50 text-indigo-600 text-xs font-medium px-2 py-0.5 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

          </div>

          {/* Row 3 — 최근 활동 */}
          <div className="rounded-2xl shadow-lg p-6 bg-white border border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">최근 활동</p>
            <ul className="space-y-2.5">
              {recentActivity.map((item) => (
                <li key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-indigo-600">{item.name[0]}</span>
                    </div>
                    <span className="text-sm text-gray-700">
                      <span className="font-medium">{item.name}</span> · {item.action}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{item.time}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </section>
  )
}
