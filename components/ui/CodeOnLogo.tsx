interface Props {
  /** 텍스트 색상 오버라이드 — 기본: 어두운 배경에선 "dark" */
  variant?: "default" | "dark-bg"
  size?: "sm" | "md"
}

/**
 * 전역 공용 CodeOn 로고
 * 아이콘: 검정 rounded-lg + 흰 </> SVG
 * 텍스트: CodeOn (O는 indigo)
 */
export default function CodeOnLogo({ variant = "default", size = "md" }: Props) {
  const box  = size === "sm" ? "w-6 h-6 rounded-md" : "w-7 h-7 rounded-lg"
  const icon = size === "sm" ? "w-3.5 h-3.5"        : "w-4 h-4"
  const text = size === "sm" ? "text-sm"             : "text-base"
  const col  = variant === "dark-bg" ? "text-slate-200" : "text-gray-900"

  return (
    <div className="flex items-center gap-2 select-none shrink-0">
      <div className={`${box} bg-gray-900 flex items-center justify-center shrink-0`}>
        <svg className={`${icon} text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
            d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      </div>
      <span className={`font-bold tracking-tight ${text} ${col}`}>
        Code<span className="text-indigo-500">O</span>n
      </span>
    </div>
  )
}
