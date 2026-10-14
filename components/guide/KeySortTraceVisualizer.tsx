"use client"

import { useMemo } from "react"
import { AlertCircle } from "lucide-react"
import { buildKeySortVisualization } from "@/lib/sortingSetsTraversal"
import { useStepPlayback, DEFAULT_SPEEDS } from "@/hooks/useStepPlayback"
import { CodePanel } from "@/components/guide/graph/CodePanel"
import { CaptionBar } from "@/components/guide/graph/CaptionBar"
import { PlaybackControls } from "@/components/guide/graph/PlaybackControls"

export default function KeySortTraceVisualizer({ code }: { code: string }) {
  const result = useMemo(() => buildKeySortVisualization(code), [code])
  const totalSteps = result.ok ? result.steps.length : 0
  const playback = useStepPlayback(totalSteps)

  if (!result.ok) {
    return (
      <div className="not-prose my-3 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>key 정렬 데이터를 표시할 수 없습니다: {result.error}</span>
      </div>
    )
  }

  const { spec, steps, pseudocode, codeCollapseBefore } = result
  const currentStep = steps[Math.min(playback.stepIndex, steps.length - 1)]
  const order = currentStep.sortedOrder ?? spec.items.map((_, i) => i)

  return (
    <div className="not-prose my-4 max-w-2xl mx-auto border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
          key 정렬
        </span>
        <span className="text-sm font-bold text-gray-800">{spec.title || "이름표 붙여 정렬하기"}</span>
      </div>

      {/* 의사코드 패널 */}
      <CodePanel lines={pseudocode} activeLines={currentStep.codeLines} collapseBefore={codeCollapseBefore} />

      {/* 항목 목록 */}
      <div className="p-4 flex flex-wrap gap-2 justify-center">
        {order.map((origIdx, pos) => {
          const it = spec.items[origIdx]
          const labeled = currentStep.sortedOrder !== null || origIdx <= currentStep.labeledUpTo
          return (
            <div key={origIdx} className="flex flex-col items-center transition-all duration-500" style={{ order: pos }}>
              {labeled && (
                <span className="mb-1 px-2 py-0.5 rounded-full border border-indigo-300 bg-indigo-50 text-indigo-700 text-[10px] font-mono font-bold">
                  ({it.keyParts.join(", ")})
                </span>
              )}
              <div className={`min-w-14 px-3 py-2 rounded-xl border-[3px] flex items-center justify-center font-mono text-sm font-bold transition-all duration-500 ${
                labeled ? "bg-indigo-500 border-indigo-600 text-white" : "bg-gray-50 border-gray-200 text-gray-300"
              }`}>
                {it.display}
              </div>
            </div>
          )
        })}
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
