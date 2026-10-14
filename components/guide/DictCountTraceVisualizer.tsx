"use client"

import { useMemo } from "react"
import { AlertCircle } from "lucide-react"
import { buildDictCountVisualization } from "@/lib/sortingSetsTraversal"
import { useStepPlayback, DEFAULT_SPEEDS } from "@/hooks/useStepPlayback"
import { CodePanel } from "@/components/guide/graph/CodePanel"
import { CaptionBar } from "@/components/guide/graph/CaptionBar"
import { PlaybackControls } from "@/components/guide/graph/PlaybackControls"

export default function DictCountTraceVisualizer({ code }: { code: string }) {
  const result = useMemo(() => buildDictCountVisualization(code), [code])
  const totalSteps = result.ok ? result.steps.length : 0
  const playback = useStepPlayback(totalSteps)

  if (!result.ok) {
    return (
      <div className="not-prose my-3 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>빈도수 세기 데이터를 표시할 수 없습니다: {result.error}</span>
      </div>
    )
  }

  const { spec, steps, pseudocode, codeCollapseBefore } = result
  const currentStep = steps[Math.min(playback.stepIndex, steps.length - 1)]

  return (
    <div className="not-prose my-4 max-w-2xl mx-auto border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
          딕셔너리 빈도수
        </span>
        <span className="text-sm font-bold text-gray-800">{spec.title || "get()으로 세기"}</span>
      </div>

      {/* 의사코드 패널 */}
      <CodePanel lines={pseudocode} activeLines={currentStep.codeLines} collapseBefore={codeCollapseBefore} />

      {/* cnt 딕셔너리 박스 */}
      <div className="p-4">
        {currentStep.orderedKeys.length === 0 ? (
          <div className="text-[12px] text-gray-400 text-center py-4">cnt = {"{}"}  (아직 비어 있음)</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {currentStep.orderedKeys.map(k => {
              const active = k === currentStep.currentWord
              return (
                <div key={k} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-[3px] font-mono text-sm font-bold transition-all duration-300 ${
                  active ? "bg-amber-500 border-amber-600 text-white scale-110 shadow-lg" : "bg-amber-50 border-amber-200 text-amber-800"
                }`}>
                  <span>'{k}'</span>
                  <span className="opacity-60">:</span>
                  <span>{currentStep.counts[k]}</span>
                </div>
              )
            })}
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
