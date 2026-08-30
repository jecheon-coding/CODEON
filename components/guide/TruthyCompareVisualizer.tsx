"use client"

import { useMemo } from "react"
import { AlertCircle } from "lucide-react"
import { buildTruthyCompareVisualization } from "@/lib/conditionalTraversal"
import { useStepPlayback, DEFAULT_SPEEDS } from "@/hooks/useStepPlayback"
import { CodePanel } from "@/components/guide/graph/CodePanel"
import { CaptionBar } from "@/components/guide/graph/CaptionBar"
import { PlaybackControls } from "@/components/guide/graph/PlaybackControls"

export default function TruthyCompareVisualizer({ code }: { code: string }) {
  const result = useMemo(() => buildTruthyCompareVisualization(code), [code])
  const totalSteps = result.ok ? result.steps.length : 0
  const playback = useStepPlayback(totalSteps)

  if (!result.ok) {
    return (
      <div className="not-prose my-3 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>참/거짓 비교 데이터를 표시할 수 없습니다: {result.error}</span>
      </div>
    )
  }

  const { spec, steps, pseudocode, codeCollapseBefore } = result
  const currentStep = steps[Math.min(playback.stepIndex, steps.length - 1)]

  return (
    <div className="not-prose my-4 max-w-2xl mx-auto border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
          참/거짓 판단
        </span>
        <span className="text-sm font-bold text-gray-800">{spec.title || "참(True)과 거짓(False)으로 판단되는 값"}</span>
      </div>

      {/* 의사코드 패널 */}
      <CodePanel lines={pseudocode} activeLines={currentStep.codeLines} collapseBefore={codeCollapseBefore} />

      {/* 값 + 판정 */}
      <div className="p-4 flex justify-center">
        <div
          className={`flex flex-col items-center gap-2 px-6 py-4 rounded-xl border-2 min-w-40 transition-colors duration-300 ${
            currentStep.truthy ? "bg-emerald-50 border-emerald-400" : "bg-gray-50 border-gray-300"
          }`}
        >
          <span className="font-mono text-base font-bold text-gray-800">{currentStep.literal}</span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
              currentStep.truthy ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-500"
            }`}
          >
            bool() → {currentStep.truthy ? "True" : "False"}
          </span>
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
