"use client"

import { usePathname } from "next/navigation"
import PythonEditorPanel from "@/components/PythonEditorPanel"

const STARTER_CODE = `# 여기에 파이썬 코드를 작성하세요
`

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // /guide 목록 페이지는 에디터 없이, /guide/[id] 챕터 페이지는 에디터 포함
  const isChapterPage = pathname !== "/guide" && pathname.startsWith("/guide/")

  if (!isChapterPage) return <>{children}</>

  return (
    <div className="h-screen flex overflow-hidden">
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">{children}</div>
      <section className="w-[35%] min-w-[320px] shrink-0 overflow-hidden">
        <PythonEditorPanel initialCode={STARTER_CODE} storageKey="guide" />
      </section>
    </div>
  )
}
