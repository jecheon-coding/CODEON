"use client"

import { useMemo } from "react"
import { AlertCircle, Package } from "lucide-react"
import { buildForLoopTraceVisualization } from "@/lib/loopTraversal"
import { useStepPlayback, DEFAULT_SPEEDS } from "@/hooks/useStepPlayback"
import { CodePanel } from "@/components/guide/graph/CodePanel"
import { CaptionBar } from "@/components/guide/graph/CaptionBar"
import { PlaybackControls } from "@/components/guide/graph/PlaybackControls"

function formatVal(v: string | number): string {
  return typeof v === "string" ? `'${v}'` : String(v)
}

export default function ForLoopTraceVisualizer({ code }: { code: string }) {
  const result = useMemo(() => buildForLoopTraceVisualization(code), [code])
  const totalSteps = result.ok ? result.steps.length : 0
  const playback = useStepPlayback(totalSteps)

  if (!result.ok) {
    return (
      <div className="not-prose my-3 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>for 반복문 데이터를 표시할 수 없습니다: {result.error}</span>
      </div>
    )
  }

  const { spec, steps, pseudocode, codeCollapseBefore } = result
  const stepIndex = Math.min(playback.stepIndex, steps.length - 1)
  const currentStep = steps[stepIndex]

  const printedList = spec.action.kind === "print"
    ? steps.slice(0, stepIndex + 1).map(s => s.printed).filter((p): p is string => p !== null)
    : []

  return (
    <div className="not-prose my-4 max-w-2xl mx-auto border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">
          for 반복문
        </span>
        <span className="text-sm font-bold text-gray-800">{spec.title || "for 반복 실행 흐름"}</span>
      </div>

      {/* 의사코드 패널 */}
      <CodePanel lines={pseudocode} activeLines={currentStep.codeLines} collapseBefore={codeCollapseBefore} />

      {/* 변수 상자 */}
      <div className="p-4 flex flex-wrap items-start gap-6">
        <div className="flex flex-col items-center">
          <span className="relative z-10 -mb-1.5 px-2.5 py-0.5 rounded-full border-2 bg-white border-sky-400 text-sky-700 text-[11px] font-bold shadow-sm">
            {spec.varName}
          </span>
          <div className={`min-w-20 pt-4 pb-2.5 px-3 rounded-xl border-[3px] flex flex-col items-center justify-center gap-1 font-mono text-sm font-bold text-center whitespace-nowrap transition-all duration-300 ${
            currentStep.currentValue !== null ? "bg-sky-500 border-sky-600 text-white scale-110 shadow-lg" : "bg-gray-50 border-gray-200 text-gray-300"
          }`}>
            <Package className={`w-4 h-4 ${currentStep.currentValue !== null ? "text-sky-200" : "text-gray-300"}`} />
            {currentStep.currentValue !== null ? formatVal(currentStep.currentValue) : "미정"}
          </div>
        </div>

        {spec.action.kind === "accumulate" && (
          <div className="flex flex-col items-center">
            <span className="relative z-10 -mb-1.5 px-2.5 py-0.5 rounded-full border-2 bg-white border-emerald-400 text-emerald-700 text-[11px] font-bold shadow-sm">
              {spec.action.accName}
            </span>
            <div className="min-w-20 pt-4 pb-2.5 px-3 rounded-xl border-[3px] bg-emerald-50 border-emerald-300 text-emerald-900 flex flex-col items-center justify-center gap-1 font-mono text-sm font-bold">
              <Package className="w-4 h-4 text-emerald-400" />
              {currentStep.accValue}
            </div>
          </div>
        )}

        {spec.action.kind === "print" && (
          <div className="flex-1 min-w-40">
            <span className="text-[11px] font-bold text-gray-500 block mb-1">출력 목록</span>
            <div className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-[12px] font-mono text-gray-700 min-h-9">
              {printedList.length > 0 ? printedList.join(" ") : "(아직 없음)"}
            </div>
          </div>
        )}
      </div>

      {currentStep.printed !== null && spec.action.kind === "accumulate" && (
        <div className="px-4 pb-4 -mt-2">
          <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[12px] font-mono text-emerald-700">
            출력 결과: {currentStep.printed}
          </div>
        </div>
      )}

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
