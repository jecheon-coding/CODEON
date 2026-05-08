"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft, Trophy, Medal } from "lucide-react"
import { PageLayout } from "@/components/ui/PageLayout"
import CodeOnLogo from "@/components/ui/CodeOnLogo"

interface Entry {
  rank: number
  maskedName: string
  score: number
  solvedCount: number
  isMe: boolean
}

interface Props {
  leaderboard: Entry[]
  myRank: number | null
  myScore: number
  total: number
}

const MEDAL = ["🥇", "🥈", "🥉"]
const MEDAL_BG = [
  "from-amber-50 to-yellow-100 border-amber-200",
  "from-slate-50 to-gray-100 border-slate-200",
  "from-orange-50 to-amber-50 border-orange-200",
]
const MEDAL_SCORE_COLOR = ["text-amber-600", "text-slate-500", "text-orange-500"]

export default function LeaderboardClient({ leaderboard, myRank, myScore, total }: Props) {
  const router = useRouter()

  const top3  = leaderboard.slice(0, 3)
  const rest  = leaderboard.slice(3)
  const myInTop50 = leaderboard.some(e => e.isMe)

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
            <Trophy className="w-7 h-7 text-amber-500" />
            <h1 className="text-2xl font-black text-gray-900">학생 랭킹</h1>
          </div>
          <p className="text-sm text-gray-500">
            난이도 · 과정 · 정확도 가중 점수 기준 · 전체 {total}명
          </p>
          {myRank && (
            <div className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full
              bg-[#534AB7]/10 border border-[#534AB7]/20">
              <span className="text-sm font-bold text-[#534AB7]">내 순위 {myRank}위</span>
              <span className="text-xs text-[#534AB7]/70">{myScore.toLocaleString()}점</span>
            </div>
          )}
        </div>

        {/* 상위 3위 카드 */}
        {top3.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {top3.map((e, i) => (
              <div
                key={e.rank}
                className={`bg-gradient-to-b ${MEDAL_BG[i]} border rounded-2xl p-4 text-center
                  ${e.isMe ? "ring-2 ring-[#534AB7]" : ""}`}
              >
                <div className="text-3xl mb-1">{MEDAL[i]}</div>
                <p className="text-xs text-gray-500 font-medium mb-0.5">{e.rank}위</p>
                <p className="text-sm font-extrabold text-gray-900 truncate">{e.maskedName}</p>
                {e.isMe && (
                  <span className="text-[10px] font-bold text-[#534AB7] bg-[#534AB7]/10
                    px-1.5 py-0.5 rounded-full">나</span>
                )}
                <p className={`text-lg font-black tabular-nums mt-1 ${MEDAL_SCORE_COLOR[i]}`}>
                  {e.score.toLocaleString()}
                  <span className="text-xs font-medium opacity-70">점</span>
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">{e.solvedCount}문제 정답</p>
              </div>
            ))}
          </div>
        )}

        {/* 4위 이하 테이블 */}
        {rest.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 w-12">순위</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-400">이름</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-400">점수</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-400 hidden sm:table-cell">정답 수</th>
                </tr>
              </thead>
              <tbody>
                {rest.map((e, i) => (
                  <tr
                    key={e.rank}
                    className={`border-b border-gray-50 last:border-0 transition-colors
                      ${e.isMe
                        ? "bg-[#534AB7]/5 border-[#534AB7]/10"
                        : "hover:bg-gray-50"}`}
                  >
                    <td className="px-4 py-3 tabular-nums font-bold text-gray-400 text-sm">
                      {e.rank}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800">
                      <div className="flex items-center gap-2">
                        {e.maskedName}
                        {e.isMe && (
                          <span className="text-[10px] font-bold text-[#534AB7] bg-[#534AB7]/10
                            px-1.5 py-0.5 rounded-full">나</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-black tabular-nums text-gray-900">
                      {e.score.toLocaleString()}
                      <span className="text-xs font-normal text-gray-400">점</span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 tabular-nums hidden sm:table-cell">
                      {e.solvedCount}문제
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 내 순위가 50위 밖인 경우 하단 고정 표시 */}
        {myRank && !myInTop50 && (
          <div className="mt-4 bg-[#534AB7]/10 border border-[#534AB7]/20 rounded-2xl p-4
            flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Medal className="w-5 h-5 text-[#534AB7]" />
              <div>
                <p className="text-xs text-[#534AB7]/70 font-medium">나의 순위</p>
                <p className="text-sm font-extrabold text-[#534AB7]">{myRank}위</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">점수</p>
              <p className="text-lg font-black tabular-nums text-[#534AB7]">
                {myScore.toLocaleString()}점
              </p>
            </div>
          </div>
        )}

        {leaderboard.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">아직 풀이 기록이 없습니다.</p>
            <p className="text-xs mt-1">문제를 풀면 랭킹에 등록됩니다!</p>
          </div>
        )}

      </PageLayout>
    </div>
  )
}
