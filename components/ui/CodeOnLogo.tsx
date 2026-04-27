import Link from "next/link"

interface Props {
  variant?: "default" | "dark-bg"
  size?: "sm" | "md"
}

export default function CodeOnLogo({ variant = "default", size = "md" }: Props) {
  const box  = size === "sm" ? "w-6 h-6 rounded-md" : "w-7 h-7 rounded-lg"
  const icon = size === "sm" ? "w-3.5 h-3.5"        : "w-4 h-4"
  const text = size === "sm" ? "text-sm"             : "text-base"
  const col  = variant === "dark-bg" ? "text-slate-200" : "text-gray-900"

  return (
    <Link href="/" className="flex items-center gap-2 select-none shrink-0 opacity-90 hover:opacity-100 transition-opacity">
      <div className={`${box} bg-gray-900 flex items-center justify-center shrink-0`}>
        <svg className={`${icon} text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
            d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      </div>
      <span className={`font-bold tracking-tight ${text} ${col}`}>
        Code<span className="text-indigo-500">O</span>n
      </span>
    </Link>
  )
}
