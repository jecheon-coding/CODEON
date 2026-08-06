"use client"

import { Info } from "lucide-react"

export function CaptionBar({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 px-4 py-2.5 bg-yellow-50 border-t border-yellow-200 text-[12px] text-yellow-800">
      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <span className="min-w-0 flex-1 break-words">{text}</span>
    </div>
  )
}
