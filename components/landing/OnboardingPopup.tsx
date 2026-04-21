"use client"

export default function OnboardingPopup({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl animate-in fade-in-0 zoom-in-95">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Codeon 학습 가이드</h2>
        <p className="text-gray-600 mb-6">
          Codeon 플랫폼을 처음 이용하시는군요! 다음 단계를 따라 학습을 시작해보세요.
        </p>
        <ol className="space-y-4">
          <li className="flex items-start gap-4">
            <div className="bg-indigo-100 text-indigo-600 rounded-full w-8 h-8 flex items-center justify-center font-bold shrink-0">1</div>
            <div>
              <h3 className="font-semibold text-gray-800">문제 선택</h3>
              <p className="text-sm text-gray-500">대시보드 또는 과정 목록에서 풀고 싶은 문제를 선택하세요.</p>
            </div>
          </li>
          <li className="flex items-start gap-4">
            <div className="bg-indigo-100 text-indigo-600 rounded-full w-8 h-8 flex items-center justify-center font-bold shrink-0">2</div>
            <div>
              <h3 className="font-semibold text-gray-800">코드 작성</h3>
              <p className="text-sm text-gray-500">문제의 요구사항에 맞게 파이썬 코드를 작성합니다.</p>
            </div>
          </li>
          <li className="flex items-start gap-4">
            <div className="bg-indigo-100 text-indigo-600 rounded-full w-8 h-8 flex items-center justify-center font-bold shrink-0">3</div>
            <div>
              <h3 className="font-semibold text-gray-800">실행 및 제출</h3>
              <p className="text-sm text-gray-500">코드를 실행하여 결과를 확인하고, 정답이라고 생각되면 제출하세요.</p>
            </div>
          </li>
          <li className="flex items-start gap-4">
            <div className="bg-indigo-100 text-indigo-600 rounded-full w-8 h-8 flex items-center justify-center font-bold shrink-0">4</div>
            <div>
              <h3 className="font-semibold text-gray-800">AI 피드백 확인</h3>
              <p className="text-sm text-gray-500">제출 후 AI가 제공하는 상세한 코드 피드백을 확인하며 실력을 향상시키세요.</p>
            </div>
          </li>
        </ol>
        <button
          onClick={onDismiss}
          className="mt-8 w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 active:scale-[.98] transition-all duration-150"
        >
          확인했습니다!
        </button>
      </div>
    </div>
  )
}