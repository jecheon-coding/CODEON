import Link from "next/link"
import { ArrowLeft, Lock } from "lucide-react"

// 학생에게 접근이 허용되지 않은 과정(파이썬가이드/알고리즘학습/문제풀이 과정)에
// 진입했을 때 보여주는 공용 화면. app/guide/page.tsx의 "준비 중" 화면과 같은 톤.
export function AccessDeniedScreen({ label }: { label: string }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center gap-3 h-14">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-600 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> 학습 홈
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-5">
        <div className="w-16 h-16 bg-gray-400 rounded-2xl flex items-center justify-center">
          <Lock className="w-8 h-8 text-white" />
        </div>
        <div className="text-center">
          <p className="text-xl font-extrabold text-gray-900 mb-2">접근 권한이 없습니다</p>
          <p className="text-sm text-gray-500">{label} 과정은 선생님이 아직 열어주지 않았어요.</p>
        </div>
        <Link
          href="/dashboard"
          className="mt-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          학습 홈으로 돌아가기
        </Link>
      </main>
    </div>
  )
}
