"use client"

import { useMemo } from "react"
import { AlertCircle } from "lucide-react"
import { buildFormatBaseVisualization } from "@/lib/formatTraversal"
import { useStepPlayback, DEFAULT_SPEEDS } from "@/hooks/useStepPlayback"
import { CodePanel } from "@/components/guide/graph/CodePanel"
import { CaptionBar } from "@/components/guide/graph/CaptionBar"
import { PlaybackControls } from "@/components/guide/graph/PlaybackControls"

const BASE_LABEL: Record<number, string> = { 2: "2진법", 8: "8진법", 16: "16진법" }

export default function FormatBaseVisualizer({ code }: { code: string }) {
  const result = useMemo(() => buildFormatBaseVisualization(code), [code])
  const totalSteps = result.ok ? result.steps.length : 0
  const playback = useStepPlayback(totalSteps)

  if (!result.ok) {
    return (
      <div className="not-prose my-3 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>진법 변환 데이터를 표시할 수 없습니다: {result.error}</span>
      </div>
    )
  }

  const { spec, steps, pseudocode, codeCollapseBefore } = result
  const currentStep = steps[Math.min(playback.stepIndex, steps.length - 1)]
  const isTerminal = currentStep.result !== null

  return (
    <div className="not-prose my-4 max-w-2xl mx-auto border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">
          진법 변환
        </span>
        <span className="text-sm font-bold text-gray-800">{spec.title || `${BASE_LABEL[spec.base]} 변환 원리`}</span>
      </div>

      {/* 의사코드 패널 */}
      <CodePanel lines={pseudocode} activeLines={currentStep.codeLines} collapseBefore={codeCollapseBefore} />

      {/* 진행 상태 */}
      <div className="p-4 space-y-3">
        <div className="text-[11px] font-mono text-gray-700">지금 나눌 값: {currentStep.current}</div>

        <div>
          <span className="text-[10px] font-bold text-gray-400">모은 나머지 (수집 순서)</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {currentStep.remainders.length === 0 && <span className="text-[11px] text-gray-300">없음</span>}
            {currentStep.remainders.map((r, i) => (
              <span key={i} className="px-2 py-1 rounded border font-mono text-xs bg-amber-100 border-amber-400 text-amber-700">
                {r}
              </span>
            ))}
          </div>
        </div>

        {isTerminal && (
          <div>
            <span className="text-[10px] font-bold text-gray-400">뒤집은 최종 결과</span>
            <div className="mt-1 inline-block px-3 py-2 rounded-lg border font-mono text-sm bg-emerald-50 border-emerald-300 text-emerald-800">
              {currentStep.result}
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
