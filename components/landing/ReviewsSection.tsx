import { Bot, ClipboardList, GitBranch, Users } from "lucide-react"

const VALUE_CARDS = [
  {
    Icon:  Bot,
    title: "AI가 바로 설명해줘요",
    desc:  "막히는 부분에 바로 피드백. 틀린 이유부터 다음 한 줄까지, AI가 옆에서 설명해줍니다.",
  },
  {
    Icon:  ClipboardList,
    title: "문제풀이와 과제를 한 곳에서",
    desc:  "흩어진 과제·오답·복습을 하나의 체크리스트로. 오늘 해야 할 것만 한눈에 보입니다.",
  },
  {
    Icon:  GitBranch,
    title: "학생별 맞춤 학습 흐름",
    desc:  "실력·속도에 따라 다음 단계가 갈라집니다. 한 사람 한 사람의 경로로 이어지는 커리큘럼.",
  },
  {
    Icon:  Users,
    title: "학부모도 함께 확인 가능",
    desc:  "학습 진도와 성취를 보호자 화면에서 바로. 아이의 성장을 매주 간단한 리포트로 전달합니다.",
  },
]

export default function ReviewsSection() {
  return (
    <section className="py-20 px-5 bg-[#F5F5F0]">
      <div className="max-w-5xl mx-auto">

        <div className="mb-10">
          <p className="text-xs font-bold text-indigo-500 tracking-widest uppercase mb-3">Features</p>
          <h2 className="text-3xl font-bold text-gray-900">CodeOn이 도와드리는 것들</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {VALUE_CARDS.map(({ Icon, title, desc }, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-7 border border-gray-200
                hover:border-indigo-200 hover:shadow-sm transition-all duration-200 flex flex-col gap-4"
            >
              {/* 아이콘 */}
              <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-indigo-500" strokeWidth={1.75} />
              </div>

              <div>
                <h3 className="text-base font-bold text-gray-900 mb-1.5 leading-snug">{title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
