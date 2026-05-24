import PythonEditorPanel from "@/components/PythonEditorPanel"

const STARTER_CODE = `# 여기에 파이썬 코드를 작성하세요
`

export default function GuideChapterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex overflow-hidden">
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">{children}</div>
      <section className="w-[35%] min-w-[320px] shrink-0 overflow-hidden">
        <PythonEditorPanel initialCode={STARTER_CODE} storageKey="guide" />
      </section>
    </div>
  )
}
