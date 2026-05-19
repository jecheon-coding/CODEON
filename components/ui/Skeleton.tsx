import React from "react"

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded-lg bg-gray-100 ${className ?? ""}`} style={style} />
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <Skeleton className="w-9 h-9 rounded-xl mb-3" />
      <Skeleton className="h-8 w-20 mb-2" />
      <Skeleton className="h-3 w-16" />
    </div>
  )
}

export function RowSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl px-4 py-3 border border-gray-100 flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function PageSpinner({ text }: { text?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F5F8]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#534AB7] border-t-transparent rounded-full animate-spin" />
        {text && <p className="text-sm text-gray-400">{text}</p>}
      </div>
    </div>
  )
}
