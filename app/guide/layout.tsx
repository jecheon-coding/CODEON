"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import PythonEditorPanel from "@/components/PythonEditorPanel"
import { ProgressContext } from "./progress-context"

const STARTER_CODE = ``

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isChapterPage = pathname !== "/guide" && pathname.startsWith("/guide/")

  // 챕터 이동 시에도 완료 상태가 유지되도록 레이아웃 레벨에서 관리
  const [completedSet, setCompletedSet] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch("/api/learning/progress")
      .then(r => r.json())
      .then((rows: { chapter_id: string }[]) => {
        if (Array.isArray(rows)) setCompletedSet(new Set(rows.map(r => r.chapter_id)))
      })
      .catch(() => {})
  }, [])

  if (!isChapterPage) return <>{children}</>

  return (
    <ProgressContext.Provider value={{ completedSet, setCompletedSet }}>
      <div className="h-screen flex overflow-hidden">
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">{children}</div>
        <section className="w-[35%] min-w-[320px] shrink-0 overflow-hidden">
          <PythonEditorPanel initialCode={STARTER_CODE} storageKey="guide" />
        </section>
      </div>
    </ProgressContext.Provider>
  )
}
