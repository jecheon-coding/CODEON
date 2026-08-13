"use client"

import { useMemo } from "react"
import { AlertCircle } from "lucide-react"
import { buildStringFindVisualization } from "@/lib/stringMethodsTraversal"
import { useStepPlayback, DEFAULT_SPEEDS } from "@/hooks/useStepPlayback"
import { CodePanel } from "@/components/guide/graph/CodePanel"
import { CaptionBar } from "@/components/guide/graph/CaptionBar"
import { PlaybackControls } from "@/components/guide/graph/PlaybackControls"

export default function StringFindVisualizer({ code }: { code: string }) {
  const result = useMemo(() => buildStringFindVisualization(code), [code])
  const totalSteps = result.ok ? result.steps.length : 0
  const playback = useStepPlayback(totalSteps)

  if (!result.ok) {
    return (
      <div className="not-prose my-3 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>문자열 탐색 데이터를 표시할 수 없습니다: {result.error}</span>
      </div>
    )
  }

  const { spec, steps, pseudocode, codeCollapseBefore } = result
  const currentStep = steps[Math.min(playback.stepIndex, steps.length - 1)]
  const targetLen = spec.target.length

  return (
    <div className="not-prose my-4 max-w-2xl mx-auto border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
          문자열 탐색
        </span>
        <span className="text-sm font-bold text-gray-800">
          {spec.title || `${spec.mode}() 동작 원리`}
        </span>
        {currentStep.raised && (
          <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
            ValueError!
          </span>
        )}
      </div>

      {/* 의사코드 패널 */}
      <CodePanel lines={pseudocode} activeLines={currentStep.codeLines} collapseBefore={codeCollapseBefore} />

      {/* 문자 단위 표시 */}
      <div className="p-4">
        <div className="flex flex-wrap gap-1 font-mono text-sm">
          {[...spec.text].map((ch, idx) => {
            const isMatch = currentStep.resultIndex !== null && currentStep.resultIndex >= 0 &&
              idx >= currentStep.resultIndex && idx < currentStep.resultIndex + targetLen
            const inRange = !isMatch && currentStep.i !== null && idx >= currentStep.i && idx < currentStep.i + targetLen
            return (
              <span
                key={idx}
                className={`w-6 h-6 flex items-center justify-center rounded border transition-colors duration-200 ${
                  isMatch
                    ? "bg-emerald-500 text-white border-emerald-600 font-bold"
                    : inRange
                    ? "bg-amber-100 text-amber-700 border-amber-400 font-bold"
                    : "bg-gray-50 text-gray-600 border-gray-200"
                }`}
              >
                {ch}
              </span>
            )
          })}
        </div>
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
