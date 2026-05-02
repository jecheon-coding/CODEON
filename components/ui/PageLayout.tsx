import React from "react"

export function PageLayout({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`max-w-[1280px] mx-auto px-6${className ? ` ${className}` : ""}`}>
      {children}
    </div>
  )
}
