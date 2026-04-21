const STEPS = [
  {
    num:   "01",
    title: "문제 확인",
    desc:  "오늘의 과제와 추천 문제를 확인합니다.",
  },
  {
    num:   "02",
    title: "코드 작성",
    desc:  "에디터에서 직접 코드를 작성하고 실행해요.",
  },
  {
    num:   "03",
    title: "AI 피드백",
    desc:  "막히는 순간 AI가 즉시 분석하고 설명해요.",
  },
  {
    num:   "04",
    title: "제출 및 진도",
    desc:  "제출 후 결과를 확인하고 다음으로 이어가요.",
  },
]

export default function StepsSection() {
  return (
    <section className="py-24 px-5 bg-white">
      <div className="max-w-5xl mx-auto">

        <div className="text-center mb-14">
          <p className="text-xs font-bold text-indigo-500 tracking-widest uppercase mb-3">
            How it works
          </p>
          <h2 className="text-3xl font-bold text-gray-900">이렇게 학습이 이어집니다</h2>
        </div>

        {/* 데스크톱: 가로 배열 */}
        <div className="hidden md:flex items-stretch gap-3">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center flex-1 gap-3">

              {/* 스텝 카드 */}
              <div className="flex-1 bg-white border border-gray-200 rounded-2xl p-6
                hover:border-indigo-200 hover:shadow-sm transition-all duration-200">
                {/* 번호 + 선 */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm font-black text-indigo-500 tabular-nums shrink-0">
                    {s.num}
                  </span>
                  <div className="h-px flex-1 bg-indigo-100" />
                </div>
                <h3 className="font-bold text-gray-900 text-sm mb-1.5">{s.title}</h3>
                <p className="text-xs text-gray-600 leading-relaxed">{s.desc}</p>
              </div>

              {/* 화살표 연결자 */}
              {i < STEPS.length - 1 && (
                <svg className="w-4 h-4 text-indigo-300 shrink-0" fill="none"
                  viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          ))}
        </div>

        {/* 모바일: 세로 타임라인 */}
        <div className="flex flex-col md:hidden">
          {STEPS.map((s, i) => (
            <div key={i} className="flex gap-4 items-start">
              {/* 왼쪽: 번호 + 수직선 */}
              <div className="flex flex-col items-center shrink-0">
                <div className="w-9 h-9 bg-indigo-500 rounded-full flex items-center justify-center">
                  <span className="text-xs font-black text-white tabular-nums">{s.num}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="w-px flex-1 bg-indigo-100 my-1 min-h-[2rem]" />
                )}
              </div>
              {/* 오른쪽: 내용 */}
              <div className={`flex-1 pt-1.5 ${i < STEPS.length - 1 ? "pb-6" : ""}`}>
                <h3 className="font-bold text-gray-900 text-sm mb-1">{s.title}</h3>
                <p className="text-xs text-gray-600 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
