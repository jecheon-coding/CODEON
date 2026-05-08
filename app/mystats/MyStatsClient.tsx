"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, BarChart2, Trophy, Target, CheckCircle2, TrendingUp } from "lucide-react"
import { PageLayout } from "@/components/ui/PageLayout"
import CodeOnLogo from "@/components/ui/CodeOnLogo"

interface WeekDay {
  date: string
  day: string
  count: number
}

interface StatsData {
  myRank: number | null
  myScore: number
  totalRankers: number
  percentile: number | null
  solvedCount: number
  totalSubmissions: number
  correctSubmissions: number
  wrongSubmissions: number
  weeklyActivity: WeekDay[]
}

function DonutChart({ correct, total }: { correct: number; total: number }) {
  const r    = 52
  const circ = 2 * Math.PI * r
  const ratio = total > 0 ? correct / total : 0
  const pct   = Math.round(ratio * 100)

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 120 120" className="w-36 h-36">
        {/* 오답 배경 링 */}
        <circle cx="60" cy="60" r={r} fill="none" stroke="#FEE2E2" strokeWidth="13" />
        {/* 정답 호 */}
        {total > 0 && (
          <circle
            cx="60" cy="60" r={r}
            fill="none"
            stroke="#534AB7"
            strokeWidth="13"
            strokeDasharray={`${ratio * circ} ${circ}`}
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
          />
        )}
        <text x="60" y="56" textAnchor="middle" fontSize="20" fontWeight="900" fill="#111827">{pct}%</text>
        <text x="60" y="72" textAnchor="middle" fontSize="10" fill="#9CA3AF">정답률</text>
      </svg>
      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#534AB7] inline-block" />정답 {correct}</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-200 inline-block" />오답 {total - correct}</span>
      </div>
    </div>
  )
}

function BarChart({ data }: { data: WeekDay[] }) {
  const maxCount = Math.max(...data.map(d => d.count), 1)
  const BAR_H    = 72
  const BAR_W    = 24
  const GAP      = 12
  const totalW   = data.length * (BAR_W + GAP) - GAP

  return (
    <div className="flex flex-col items-center w-full">
      <svg viewBox={`0 0 ${totalW} ${BAR_H + 24}`} className="w-full max-w-xs">
        {data.map((d, i) => {
          const h = maxCount > 0 ? (d.count / maxCount) * BAR_H : 0
          const x = i * (BAR_W + GAP)
          return (
            <g key={d.date}>
              {/* 빈 배경 막대 */}
              <rect x={x} y={0} width={BAR_W} height={BAR_H} rx="6" fill="#F3F4F6" />
              {/* 실제 막대 */}
              {h > 0 && (
                <rect x={x} y={BAR_H - h} width={BAR_W} height={h} rx="6"
                  fill={d.count > 0 ? "#534AB7" : "#E5E7EB"} />
              )}
              {/* 요일 라벨 */}
              <text x={x + BAR_W / 2} y={BAR_H + 16} textAnchor="middle" fontSize="10" fill="#9CA3AF">{d.day}</text>
              {/* 개수 라벨 (0이면 숨김) */}
              {d.count > 0 && (
                <text x={x + BAR_W / 2} y={BAR_H - h - 4} textAnchor="middle" fontSize="9" fontWeight="700" fill="#534AB7">{d.count}</text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default function MyStatsClient() {
  const router = useRouter()
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/mystats")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const correctRate = data && data.totalSubmissions > 0
    ? Math.round(data.correctSubmissions / data.totalSubmissions * 100)
    : 0

  return (
    <div className="min-h-screen bg-[#F4F5F8]">
      {/* 네비게이션 */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white border-b border-gray-100">
        <PageLayout className="h-14 flex items-center justify-between">
          <CodeOnLogo />
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            대시보드
          </button>
        </PageLayout>
      </nav>

      <PageLayout className="pt-20 pb-20">

        {/* 헤더 */}
        <div className="text-center py-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <BarChart2 className="w-7 h-7 text-[#534AB7]" />
            <h1 className="text-2xl font-black text-gray-900">내 학습 통계</h1>
          </div>
          <p className="text-sm text-gray-500">나의 학습 현황과 점수를 확인하세요</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#534AB7] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* 상단 4-카드 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">

              {/* 내 순위 */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center mb-3">
                  <Trophy className="w-5 h-5 text-amber-500" strokeWidth={1.75} />
                </div>
                <p className="text-2xl font-black text-gray-900 tabular-nums leading-none mb-1">
                  {data?.myRank ? `${data.myRank}위` : "—"}
                </p>
                <p className="text-xs text-gray-500">
                  {data?.percentile ? `상위 ${data.percentile}%` : "기록 없음"}
                </p>
              </div>

              {/* 획득 점수 */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="w-9 h-9 bg-[#534AB7]/10 rounded-xl flex items-center justify-center mb-3">
                  <TrendingUp className="w-5 h-5 text-[#534AB7]" strokeWidth={1.75} />
                </div>
                <p className="text-2xl font-black text-gray-900 tabular-nums leading-none mb-1">
                  {data?.myScore?.toLocaleString() ?? 0}
                </p>
                <p className="text-xs text-gray-500">획득 점수</p>
              </div>

              {/* 정답 문제수 */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500" strokeWidth={1.75} />
                </div>
                <p className="text-2xl font-black text-gray-900 tabular-nums leading-none mb-1">
                  {data?.solvedCount ?? 0}
                  <span className="text-sm font-medium text-gray-400">문제</span>
                </p>
                <p className="text-xs text-gray-500">정답 문제 수</p>
              </div>

              {/* 정답률 */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
                  <Target className="w-5 h-5 text-blue-500" strokeWidth={1.75} />
                </div>
                <p className="text-2xl font-black text-gray-900 tabular-nums leading-none mb-1">
                  {correctRate}
                  <span className="text-sm font-medium text-gray-400">%</span>
                </p>
                <p className="text-xs text-gray-500">
                  {data?.totalSubmissions ?? 0}회 제출 중
                </p>
              </div>

            </div>

            {/* 차트 2-컬럼 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* 도넛 차트 */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h2 className="text-sm font-bold text-gray-700 mb-5">제출 정답 비율</h2>
                <div className="flex items-center justify-center">
                  <DonutChart
                    correct={data?.correctSubmissions ?? 0}
                    total={data?.totalSubmissions ?? 0}
                  />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-gray-500">
                  <div>
                    <p className="text-lg font-black text-gray-900 tabular-nums">{data?.totalSubmissions ?? 0}</p>
                    <p>전체 제출</p>
                  </div>
                  <div>
                    <p className="text-lg font-black text-[#534AB7] tabular-nums">{data?.correctSubmissions ?? 0}</p>
                    <p>정답</p>
                  </div>
                  <div>
                    <p className="text-lg font-black text-red-400 tabular-nums">{data?.wrongSubmissions ?? 0}</p>
                    <p>오답</p>
                  </div>
                </div>
              </div>

              {/* 바 차트 */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h2 className="text-sm font-bold text-gray-700 mb-5">최근 7일 풀이 활동</h2>
                {data?.weeklyActivity && data.weeklyActivity.length > 0 ? (
                  <BarChart data={data.weeklyActivity} />
                ) : (
                  <div className="flex items-center justify-center h-24 text-sm text-gray-400">
                    기록이 없습니다
                  </div>
                )}
                <p className="text-center text-xs text-gray-400 mt-3">
                  총 {data?.weeklyActivity?.reduce((s, d) => s + d.count, 0) ?? 0}회 제출
                </p>
              </div>

            </div>

            {/* 순위 없음 안내 */}
            {!data?.myRank && (
              <div className="mt-4 bg-gray-50 border border-gray-100 rounded-2xl p-5 text-center">
                <Trophy className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">아직 순위가 없습니다.</p>
                <p className="text-xs text-gray-400 mt-1">문제를 풀면 순위에 등록됩니다!</p>
              </div>
            )}
          </>
        )}

      </PageLayout>
    </div>
  )
}
