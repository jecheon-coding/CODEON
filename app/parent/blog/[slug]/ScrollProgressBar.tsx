"use client"

import { useEffect, useState } from "react"

export default function ScrollProgressBar() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const update = () => {
      const scrollTop    = window.scrollY
      const docHeight    = document.documentElement.scrollHeight - window.innerHeight
      setProgress(docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0)
    }
    window.addEventListener("scroll", update, { passive: true })
    update()
    return () => window.removeEventListener("scroll", update)
  }, [])

  return (
    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-100">
      <div
        className="h-full bg-indigo-500 transition-all duration-75"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
