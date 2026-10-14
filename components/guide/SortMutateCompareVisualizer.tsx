"use client"

import { useMemo } from "react"
import { AlertCircle } from "lucide-react"
import { buildSortMutateCompareVisualization } from "@/lib/sortingSetsTraversal"
import { useStepPlayback, DEFAULT_SPEEDS } from "@/hooks/useStepPlayback"
import { CodePanel } from "@/components/guide/graph/CodePanel"
import { CaptionBar } from "@/components/guide/graph/CaptionBar"
import { PlaybackControls } from "@/components/guide/graph/PlaybackControls"

function ListBox({ label, values, highlight }: { label: string; values: number[]; highlight: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`relative z-10 -mb-1.5 px-2.5 py-0.5 rounded-full border-2 text-[11px] font-bold shadow-sm transition-colors duration-300 ${
        highlight ? "bg-rose-600 border-rose-700 text-white" : "bg-white border-sky-400 text-sky-700"
      }`}>
        {label}
      </span>
      <div className={`px-3 pt-4 pb-2.5 rounded-xl border-[3px] flex items-center gap-1.5 font-mono text-sm font-bold transition-all duration-300 ${
        highlight ? "bg-rose-500 border-rose-600 text-white scale-105 shadow-lg" : "bg-sky-50 border-sky-300 text-sky-900"
      }`}>
        [{values.join(", ")}]
      </div>
    </div>
  )
}

export default function SortMutateCompareVisualizer({ code }: { code: string }) {
  const result = useMemo(() => buildSortMutateCompareVisualization(code), [code])
  const totalSteps = result.ok ? result.steps.length : 0
  const playback = useStepPlayback(totalSteps)

  if (!result.ok) {
    return (
      <div className="not-prose my-3 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>sort/sorted 데이터를 표시할 수 없습니다: {result.error}</span>
      </div>
    )
  }

  const { spec, steps, pseudocode, codeCollapseBefore } = result
  const currentStep = steps[Math.min(playback.stepIndex, steps.length - 1)]
  const varName = spec.mode === "sort" ? "numbers" : "lst"

  return (
    <div className="not-prose my-4 max-w-2xl mx-auto border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">
          sort() vs sorted()
        </span>
        <span className="text-sm font-bold text-gray-800">{spec.title || `${spec.mode}() 동작`}</span>
      </div>

      {/* 의사코드 패널 */}
      <CodePanel lines={pseudocode} activeLines={currentStep.codeLines} collapseBefore={codeCollapseBefore} />

      {/* 리스트 상자 */}
      <div className="p-4 flex flex-wrap items-start gap-6 justify-center">
        <ListBox label={varName} values={currentStep.original} highlight={currentStep.mutated} />
        {currentStep.resultList && (
          <ListBox label="new_lst" values={currentStep.resultList} highlight={false} />
        )}
      </div>

      {/* 캡션 */}
      <CaptionBar text={currentStep.caption} />

      {/* 재생 컨트롤 */}
      <PlaybackControls
        stepIndex={playback.stepIndex}
        totalSteps={totalSteps}
        playing={playback.playing}
        speed={playback.speed}
        speeds={DEFAULT_SPEEDS}
        onReset={playback.handleReset}
        onPrev={playback.handlePrevStep}
        onNext={playback.handleNextStep}
        onTogglePlay={playback.handleTogglePlay}
        onSpeedChange={playback.setSpeed}
      />
    </div>
  )
}
