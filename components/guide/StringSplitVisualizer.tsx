"use client"

import { useMemo } from "react"
import { AlertCircle, Package } from "lucide-react"
import { buildStringSplitVisualization } from "@/lib/stringMethodsTraversal"
import { useStepPlayback, DEFAULT_SPEEDS } from "@/hooks/useStepPlayback"
import { CodePanel } from "@/components/guide/graph/CodePanel"
import { CaptionBar } from "@/components/guide/graph/CaptionBar"
import { PlaybackControls } from "@/components/guide/graph/PlaybackControls"

export default function StringSplitVisualizer({ code }: { code: string }) {
  const result = useMemo(() => buildStringSplitVisualization(code), [code])
  const totalSteps = result.ok ? result.steps.length : 0
  const playback = useStepPlayback(totalSteps)

  if (!result.ok) {
    return (
      <div className="not-prose my-3 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>문자열 분리 데이터를 표시할 수 없습니다: {result.error}</span>
      </div>
    )
  }

  const { spec, steps, pseudocode, codeCollapseBefore } = result
  const currentStep = steps[Math.min(playback.stepIndex, steps.length - 1)]

  return (
    <div className="not-prose my-4 max-w-2xl mx-auto border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
          문자열 분리
        </span>
        <span className="text-sm font-bold text-gray-800">{spec.title || "split()"}</span>
      </div>

      {/* 의사코드 패널 */}
      <CodePanel lines={pseudocode} activeLines={currentStep.codeLines} collapseBefore={codeCollapseBefore} />

      {/* split 결과 칩 */}
      <div className="p-4 space-y-3">
        <div>
          <span className="text-[10px] font-bold text-gray-400">split() 결과</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {currentStep.tokens.map((t, i) => (
              <span
                key={i}
                className={`px-2 py-1 rounded border font-mono text-xs transition-colors duration-300 ${
                  currentStep.printedIndex === i
                    ? "bg-indigo-500 border-indigo-600 text-white font-bold"
                    : "bg-gray-50 border-gray-200 text-gray-600"
                }`}
              >
                &apos;{t}&apos;
              </span>
            ))}
          </div>
        </div>

        {/* 언패킹된 변수 상자 (varNames가 있을 때만) */}
        {currentStep.boxes && (
          <div>
            <span className="text-[10px] font-bold text-gray-400">변수에 담긴 값</span>
            <div className="mt-2 flex flex-wrap gap-4">
              {currentStep.boxes.map((box, i) => {
                const active = currentStep.printedIndex === i
                return (
                  <div key={box.name} className="flex flex-col items-center">
                    <span
                      className={`relative z-10 -mb-1.5 px-2.5 py-0.5 rounded-full border-2 text-[11px] font-bold shadow-sm transition-colors duration-300 ${
                        active ? "bg-indigo-600 border-indigo-700 text-white" : "bg-white border-green-400 text-green-700"
                      }`}
                    >
                      {box.name}
                    </span>
                    <div
                      className={`min-w-20 pt-4 pb-2.5 px-3 rounded-xl border-[3px] flex flex-col items-center justify-center gap-1 font-mono text-sm font-bold text-center whitespace-nowrap transition-all duration-300 ${
                        active ? "bg-indigo-500 border-indigo-600 text-white scale-110 shadow-lg" : "bg-green-50 border-green-300 text-green-900"
                      }`}
                    >
                      <Package className={`w-4 h-4 ${active ? "text-indigo-200" : "text-green-400"}`} />
                      &apos;{box.value}&apos;
                    </div>
                  </div>
                )
              })}
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
