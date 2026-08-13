"use client"

import { useMemo } from "react"
import { AlertCircle } from "lucide-react"
import { buildFormatThousandsVisualization } from "@/lib/formatTraversal"
import { useStepPlayback, DEFAULT_SPEEDS } from "@/hooks/useStepPlayback"
import { CodePanel } from "@/components/guide/graph/CodePanel"
import { CaptionBar } from "@/components/guide/graph/CaptionBar"
import { PlaybackControls } from "@/components/guide/graph/PlaybackControls"

export default function FormatThousandsVisualizer({ code }: { code: string }) {
  const result = useMemo(() => buildFormatThousandsVisualization(code), [code])
  const totalSteps = result.ok ? result.steps.length : 0
  const playback = useStepPlayback(totalSteps)

  if (!result.ok) {
    return (
      <div className="not-prose my-3 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>천 단위 구분 데이터를 표시할 수 없습니다: {result.error}</span>
      </div>
    )
  }

  const { spec, steps, pseudocode, codeCollapseBefore } = result
  const currentStep = steps[Math.min(playback.stepIndex, steps.length - 1)]

  return (
    <div className="not-prose my-4 max-w-2xl mx-auto border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
          천단위 구분
        </span>
        <span className="text-sm font-bold text-gray-800">{spec.title || "쉼표 삽입 과정"}</span>
      </div>

      {/* 의사코드 패널 */}
      <CodePanel lines={pseudocode} activeLines={currentStep.codeLines} collapseBefore={codeCollapseBefore} />

      {/* 원본 숫자 + 결과 */}
      <div className="p-4 space-y-3">
        <div>
          <span className="text-[10px] font-bold text-gray-400">원본 숫자</span>
          <div className="mt-1 inline-block px-3 py-2 rounded-lg border font-mono text-sm bg-gray-50 border-gray-200 text-gray-700">
            {spec.number}
          </div>
        </div>
        <div>
          <span className="text-[10px] font-bold text-gray-400">결과</span>
          <div className="mt-1 inline-block px-3 py-2 rounded-lg border font-mono text-sm bg-emerald-50 border-emerald-300 text-emerald-800 min-h-[2.25rem] min-w-[3rem]">
            {currentStep.partial || " "}
          </div>
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
