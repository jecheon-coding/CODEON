export default function PendingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="text-center bg-white rounded-2xl p-12 shadow-sm max-w-sm w-full mx-4">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">
          승인 대기 중입니다
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          선생님이 확인 후 승인해 드릴게요.<br />
          승인되면 바로 학습을 시작할 수 있어요.
        </p>
      </div>
    </div>
  )
}
