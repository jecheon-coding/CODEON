export default function DemoSection() {
  return (
    <section className="py-24 px-5 bg-white">
      <div className="max-w-5xl mx-auto">

        <div className="mb-10">
          <p className="text-xs font-bold text-indigo-500 tracking-widest uppercase mb-3">
            Platform Preview
          </p>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            실제 학습 화면이 이렇게 생겼어요
          </h2>
          <p className="text-sm text-gray-600">
            문제 확인부터 AI 피드백, 학습 현황까지 한 화면에서
          </p>
        </div>

        <div className="grid grid-cols-12 gap-4 items-stretch">

          {/* 문제 카드 */}
          <div className="col-span-12 md:col-span-5 rounded-2xl border border-gray-200 overflow-hidden flex flex-col">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex items-center justify-between shrink-0">
              <span className="text-xs font-semibold text-gray-600">문제</span>
              <div className="flex gap-1.5">
                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
                  난이도 하
                </span>
                <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-semibold border border-blue-200">
                  출력 / 문자열
                </span>
              </div>
            </div>
            <div className="p-5 flex flex-col flex-1">
              <h3 className="text-sm font-bold text-gray-900 mb-2">리스트에서 최댓값 찾기</h3>
              <p className="text-xs text-gray-700 leading-relaxed">
                정수 n개로 이루어진 리스트가 주어질 때,<br />
                리스트에서 가장 큰 수를 출력하시오.
              </p>
              <div className="mt-4 pt-4 border-t border-gray-100 flex-1">
                <p className="text-[10px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">입력 예시</p>
                <code className="text-xs bg-gray-900 text-green-400 px-3 py-2 rounded-lg block font-mono">
                  3 5 2 9 1
                </code>
                <p className="text-[10px] font-semibold text-gray-500 mt-3 mb-1.5 uppercase tracking-wide">출력 예시</p>
                <code className="text-xs bg-gray-900 text-amber-400 px-3 py-2 rounded-lg block font-mono">
                  9
                </code>
              </div>
            </div>
          </div>

          {/* 우측 컬럼 */}
          <div className="col-span-12 md:col-span-7 flex flex-col gap-4">

            {/* AI 피드백 카드 */}
            <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-5 h-5 bg-indigo-500 rounded-md flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <span className="text-xs font-bold text-indigo-600">AI 피드백</span>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed">
                <code className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[11px] font-mono">max()</code>를
                활용하면 더 간단하게 풀 수 있어요. 한 줄로 완성해 보세요!
              </p>
            </div>

            {/* 오늘의 과제 + 최근 제출 */}
            <div className="grid grid-cols-2 gap-4 flex-1">

              <div className="rounded-2xl border border-gray-200 bg-white p-5 flex flex-col">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-3">
                  오늘의 과제
                </p>
                <div className="space-y-2.5 flex-1">
                  {[
                    { title: "변수와 출력",  done: true  },
                    { title: "조건문 기초",  done: true  },
                    { title: "반복문 활용",  done: false },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0
                        ${item.done ? "bg-emerald-500" : "border-2 border-gray-200"}`}>
                        {item.done && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className={`text-xs ${item.done ? "text-gray-400 line-through" : "text-gray-800 font-medium"}`}>
                        {item.title}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] font-medium text-gray-500 mt-3 pt-3 border-t border-gray-100">
                  3개 중 2개 완료
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 flex flex-col">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-3">
                  최근 제출
                </p>
                <div className="space-y-3 flex-1">
                  {[
                    { label: "기초 12번", result: "정답", ok: true  },
                    { label: "기초 11번", result: "정답", ok: true  },
                    { label: "기초 10번", result: "오답", ok: false },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-xs text-gray-700">{item.label}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded
                        ${item.ok
                          ? "text-emerald-700 bg-emerald-50"
                          : "text-red-600 bg-red-50"}`}>
                        {item.result}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </section>
  )
}
