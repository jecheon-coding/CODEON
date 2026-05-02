"use client"

import React from "react"

export function ProblemListContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {children}
    </div>
  )
}

export function ProblemListItem({
  onClick,
  children,
  className,
  baseBackground,
  hoverBackground = "#F9F9FB",
  borderLeft,
}: {
  onClick?: () => void
  children: React.ReactNode
  className?: string
  baseBackground?: string
  hoverBackground?: string
  borderLeft?: string
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 select-none${onClick ? " cursor-pointer" : ""}${className ? ` ${className}` : ""}`}
      style={{
        padding: "10px 16px",
        borderBottom: "0.5px solid #E5E7EB",
        background: baseBackground,
        borderLeft,
      }}
      onMouseEnter={e => (e.currentTarget.style.background = hoverBackground)}
      onMouseLeave={e => (e.currentTarget.style.background = baseBackground ?? "")}
    >
      {children}
    </div>
  )
}
