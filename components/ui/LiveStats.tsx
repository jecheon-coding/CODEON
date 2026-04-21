"use client"

const stats = [
  { value: "124명", label: "현재 접속 학생 수" },
  { value: "1,847개", label: "오늘 문제 풀이 수" },
  { value: "73%", label: "평균 정답률" },
]

export default function LiveStats() {
  return (
    <section className="bg-white py-8 px-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* 통계 카드 3개 — transparent + border only */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-transparent border border-gray-200 rounded-xl px-6 py-5 flex flex-col items-center gap-1 hover:border-indigo-200 hover:scale-105 transition-all duration-200"
            >
              <span className="text-2xl font-bold text-indigo-500">{stat.value}</span>
              <span className="text-sm text-gray-500">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* 성과 문구 + 후기 카드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* 성과 배너 — gradient bg */}
          <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-xl px-6 py-5 flex items-center gap-4 hover:scale-105 transition-all duration-200">
            <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-200">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-0.5">실제 성과</p>
              <p className="text-sm font-bold text-gray-800">
                학생 평균 정답률&nbsp;
                <span className="text-gray-400 line-through">42%</span>
                &nbsp;→&nbsp;
                <span className="text-indigo-600 text-base">73%</span>
                &nbsp;상승
              </p>
            </div>
          </div>

          {/* 학부모 후기 — 따옴표 아이콘 + 정렬 개선 */}
          <div className="bg-white border border-gray-100 rounded-xl px-6 py-5 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200 flex flex-col gap-3">
            {/* 따옴표 + 별점 */}
            <div className="flex items-center justify-between">
              <svg className="w-7 h-7 text-indigo-100" fill="currentColor" viewBox="0 0 32 32">
                <path d="M9.352 4C4.456 7.456 1 13.12 1 19.36c0 5.088 3.072 8.064 6.624 8.064 3.36 0 5.856-2.688 5.856-5.856 0-3.168-2.208-5.472-5.088-5.472-.576 0-1.344.096-1.536.192.48-3.264 3.552-7.104 6.624-9.024L9.352 4zm16.512 0c-4.8 3.456-8.256 9.12-8.256 15.36 0 5.088 3.072 8.064 6.624 8.064 3.264 0 5.856-2.688 5.856-5.856 0-3.168-2.304-5.472-5.184-5.472-.576 0-1.248.096-1.44.192.48-3.264 3.456-7.104 6.528-9.024L25.864 4z" />
              </svg>
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map((i) => (
                  <svg key={i} className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed flex-1">
              아이 스스로 코딩을 시작했어요. 막히면 AI한테 물어보면서 혼자 풀더라고요.
            </p>
            <p className="text-xs text-gray-400 font-semibold">— 학부모 김OO</p>
          </div>

        </div>
      </div>
    </section>
  )
}
