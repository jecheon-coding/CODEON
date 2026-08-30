"use client"

import { useMemo } from "react"
import { AlertCircle, Package } from "lucide-react"
import { buildIfElifFlowVisualization, type BranchState } from "@/lib/conditionalTraversal"
import { useStepPlayback, DEFAULT_SPEEDS } from "@/hooks/useStepPlayback"
import { CodePanel } from "@/components/guide/graph/CodePanel"
import { CaptionBar } from "@/components/guide/graph/CaptionBar"
import { PlaybackControls } from "@/components/guide/graph/PlaybackControls"

const STATE_ICON: Record<BranchState, string> = {
  pending: "⏳", checking: "🔍", true: "✅", false: "❌", skipped: "⏭️",
}
const STATE_STYLE: Record<BranchState, string> = {
  pending:  "bg-gray-50 border-gray-200 text-gray-400",
  checking: "bg-blue-50 border-blue-400 text-blue-700 ring-2 ring-blue-200",
  true:     "bg-emerald-50 border-emerald-400 text-emerald-700",
  false:    "bg-gray-50 border-gray-300 text-gray-500",
  skipped:  "bg-gray-50 border-gray-200 text-gray-300 italic",
}

export default function IfElifFlowVisualizer({ code }: { code: string }) {
  const result = useMemo(() => buildIfElifFlowVisualization(code), [code])
  const totalSteps = result.ok ? result.steps.length : 0
  const playback = useStepPlayback(totalSteps)

  if (!result.ok) {
    return (
      <div className="not-prose my-3 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>조건문 흐름 데이터를 표시할 수 없습니다: {result.error}</span>
      </div>
    )
  }

  const { spec, steps, pseudocode, codeCollapseBefore } = result
  const currentStep = steps[Math.min(playback.stepIndex, steps.length - 1)]

  return (
    <div className="not-prose my-4 max-w-2xl mx-auto border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
          조건문 흐름
        </span>
        <span className="text-sm font-bold text-gray-800">{spec.title || "if / elif / else"}</span>
        <span className="ml-auto text-[11px] font-medium text-gray-400">
          {spec.mode === "elif" ? "elif — 첫 참에서 멈춤" : "if 나열 — 전부 검사"}
        </span>
      </div>

      {/* 의사코드 패널 */}
      <CodePanel lines={pseudocode} activeLines={currentStep.codeLines} collapseBefore={codeCollapseBefore} />

      {/* 조건 목록 + 변수 상자 */}
      <div className="p-4 space-y-3">
        <div className="space-y-1.5">
          {spec.branches.map((b, i) => {
            const state = currentStep.branchStates[i]
            return (
              <div
                key={i}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-[12px] transition-colors duration-200 ${STATE_STYLE[state]}`}
              >
                <span>{STATE_ICON[state]}</span>
                <span>{spec.mode === "elif" && i > 0 ? "elif" : "if"} {spec.varName} {b.op} {b.threshold}</span>
                {state === "skipped" && <span className="ml-auto text-[10px]">검사 안 함</span>}
              </div>
            )
          })}
          {currentStep.elseState !== null && (
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-[12px] transition-colors duration-200 ${
                currentStep.elseState === "active"
                  ? "bg-emerald-50 border-emerald-400 text-emerald-700"
                  : currentStep.elseState === "skipped"
                  ? "bg-gray-50 border-gray-200 text-gray-300 italic"
                  : "bg-gray-50 border-gray-200 text-gray-400"
              }`}
            >
              <span>{currentStep.elseState === "active" ? "✅" : currentStep.elseState === "skipped" ? "⏭️" : "⏳"}</span>
              <span>else</span>
              {currentStep.elseState === "skipped" && <span className="ml-auto text-[10px]">검사 안 함</span>}
            </div>
          )}
        </div>

        {/* 액션 변수 상자 */}
        <div className="flex flex-col items-center pt-2">
          <span
            className={`relative z-10 -mb-1.5 px-2.5 py-0.5 rounded-full border-2 text-[11px] font-bold shadow-sm transition-colors duration-300 ${
              currentStep.overwritten ? "bg-rose-600 border-rose-700 text-white" : "bg-white border-indigo-400 text-indigo-700"
            }`}
          >
            {spec.actionName}
          </span>
          <div
            className={`min-w-20 pt-4 pb-2.5 px-3 rounded-xl border-[3px] flex flex-col items-center justify-center gap-1 font-mono text-sm font-bold text-center whitespace-nowrap transition-all duration-300 ${
              currentStep.overwritten
                ? "bg-rose-500 border-rose-600 text-white scale-110 shadow-lg"
                : currentStep.currentValue !== null
                ? "bg-indigo-50 border-indigo-300 text-indigo-900"
                : "bg-gray-50 border-gray-200 text-gray-300"
            }`}
          >
            <Package className={`w-4 h-4 ${currentStep.overwritten ? "text-rose-200" : "text-indigo-400"}`} />
            {currentStep.currentValue !== null ? `'${currentStep.currentValue}'` : "미정"}
          </div>
          {currentStep.overwritten && (
            <span className="mt-1 text-[10px] font-bold text-rose-600">덮어써짐!</span>
          )}
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
