"use client"

import { useMemo } from "react"
import { AlertCircle } from "lucide-react"
import { buildOrTrapVisualization } from "@/lib/conditionalTraversal"
import { useStepPlayback, DEFAULT_SPEEDS } from "@/hooks/useStepPlayback"
import { CodePanel } from "@/components/guide/graph/CodePanel"
import { CaptionBar } from "@/components/guide/graph/CaptionBar"
import { PlaybackControls } from "@/components/guide/graph/PlaybackControls"

function BoolBadge({ value }: { value: boolean | null }) {
  if (value === null) {
    return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-300">?</span>
  }
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
        value ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-500"
      }`}
    >
      {value ? "True" : "False"}
    </span>
  )
}

export default function OrTrapVisualizer({ code }: { code: string }) {
  const result = useMemo(() => buildOrTrapVisualization(code), [code])
  const totalSteps = result.ok ? result.steps.length : 0
  const playback = useStepPlayback(totalSteps)

  if (!result.ok) {
    return (
      <div className="not-prose my-3 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>or의 함정 데이터를 표시할 수 없습니다: {result.error}</span>
      </div>
    )
  }

  const { spec, steps, pseudocode, codeCollapseBefore } = result
  const currentStep = steps[Math.min(playback.stepIndex, steps.length - 1)]

  return (
    <div className="not-prose my-4 max-w-2xl mx-auto border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
          or의 함정
        </span>
        <span className="text-sm font-bold text-gray-800">{spec.title || `${spec.varName} == ${spec.compareValue} or ${spec.orValue}`}</span>
      </div>

      {/* 의사코드 패널 */}
      <CodePanel lines={pseudocode} activeLines={currentStep.codeLines} collapseBefore={codeCollapseBefore} />

      {/* 조각 비교 */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-center gap-3">
          <div className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 min-w-32">
            <span className="font-mono text-[12px] text-gray-600">{spec.varName} == {spec.compareValue}</span>
            <BoolBadge value={currentStep.leftResult} />
          </div>
          <span className="text-sm font-bold text-gray-400">or</span>
          <div className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 min-w-32">
            <span className="font-mono text-[12px] text-gray-600">{spec.orValue}</span>
            <BoolBadge value={currentStep.rightTruthy} />
          </div>
        </div>

        {currentStep.combined !== null && (
          <div className="flex justify-center">
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-mono text-sm font-bold ${
                currentStep.combined
                  ? "bg-red-50 border-red-400 text-red-700"
                  : "bg-gray-50 border-gray-300 text-gray-500"
              }`}
            >
              결과 <BoolBadge value={currentStep.combined} />
            </div>
          </div>
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
