"use client"

import { useMemo } from "react"
import { AlertCircle, Package } from "lucide-react"
import { buildVarAssignVisualization } from "@/lib/basicsTraversal"
import { useStepPlayback, DEFAULT_SPEEDS } from "@/hooks/useStepPlayback"
import { CodePanel } from "@/components/guide/graph/CodePanel"
import { CaptionBar } from "@/components/guide/graph/CaptionBar"
import { PlaybackControls } from "@/components/guide/graph/PlaybackControls"

function formatForDisplay(value: string | number | boolean): string {
  if (typeof value === "string") return `'${value}'`
  if (typeof value === "boolean") return value ? "True" : "False"
  return String(value)
}

export default function VarAssignVisualizer({ code }: { code: string }) {
  const result = useMemo(() => buildVarAssignVisualization(code), [code])
  const totalSteps = result.ok ? result.steps.length : 0
  const playback = useStepPlayback(totalSteps)

  if (!result.ok) {
    return (
      <div className="not-prose my-3 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>변수 할당 데이터를 표시할 수 없습니다: {result.error}</span>
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
          변수 할당
        </span>
        <span className="text-sm font-bold text-gray-800">{spec.title || "변수 만들기"}</span>
      </div>

      {/* 의사코드 패널 */}
      <CodePanel lines={pseudocode} activeLines={currentStep.codeLines} collapseBefore={codeCollapseBefore} />

      {/* 메모리 상자 */}
      <div className="p-4">
        {currentStep.boxes.length === 0 ? (
          <div className="text-[12px] text-gray-400 text-center py-4">아직 만들어진 변수가 없습니다.</div>
        ) : (
          <div className="flex flex-wrap gap-4">
            {currentStep.boxes.map(box => {
              const active = box.name === currentStep.activeName
              return (
                <div key={box.name} className="flex flex-col items-center">
                  {/* 이름표 — 상자에 매달린 태그 모양 */}
                  <span
                    className={`relative z-10 -mb-1.5 px-2.5 py-0.5 rounded-full border-2 text-[11px] font-bold shadow-sm transition-colors duration-300 ${
                      active ? "bg-indigo-600 border-indigo-700 text-white" : "bg-white border-amber-400 text-amber-700"
                    }`}
                  >
                    {box.name}
                  </span>
                  {/* 상자 */}
                  <div
                    className={`min-w-20 pt-4 pb-2.5 px-3 rounded-xl border-[3px] flex flex-col items-center justify-center gap-1 font-mono text-sm font-bold text-center whitespace-nowrap transition-all duration-300 ${
                      active
                        ? "bg-indigo-500 border-indigo-600 text-white scale-110 shadow-lg"
                        : "bg-amber-50 border-amber-300 text-amber-900"
                    }`}
                  >
                    <Package className={`w-4 h-4 ${active ? "text-indigo-200" : "text-amber-400"}`} />
                    {formatForDisplay(box.value)}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {currentStep.printedLine !== null && (
          <div className="mt-4 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[12px] font-mono text-emerald-700">
            출력 결과: {currentStep.printedLine}
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
