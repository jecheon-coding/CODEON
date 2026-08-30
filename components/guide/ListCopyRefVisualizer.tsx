"use client"

import { useMemo } from "react"
import { AlertCircle } from "lucide-react"
import { buildListCopyRefVisualization, type Cell, type ListValue, type ListCopyRefMode } from "@/lib/listTraversal"
import { useStepPlayback, DEFAULT_SPEEDS } from "@/hooks/useStepPlayback"
import { CodePanel } from "@/components/guide/graph/CodePanel"
import { CaptionBar } from "@/components/guide/graph/CaptionBar"
import { PlaybackControls } from "@/components/guide/graph/PlaybackControls"

function bVarName(mode: ListCopyRefMode): string {
  if (mode === "assign") return "ref_list"
  if (mode === "shallow") return "copy_list"
  return "deep_copy_list"
}

function formatVal(v: ListValue): string {
  return typeof v === "string" ? `'${v}'` : String(v)
}

function CellView({ cell, nestedBoxes }: { cell: Cell; nestedBoxes: Record<string, ListValue[]> }) {
  if (cell.kind === "value") {
    return (
      <div className="min-w-10 h-10 px-2 rounded-lg border-2 bg-gray-50 border-gray-300 text-gray-700 flex items-center justify-center font-mono text-sm font-bold">
        {formatVal(cell.value)}
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center">
      <span className="text-[9px] font-bold text-fuchsia-600 mb-0.5">🔗 {cell.boxId}</span>
      <div className="flex gap-1 px-2 py-1.5 rounded-lg border-2 border-fuchsia-400 bg-fuchsia-50">
        {(nestedBoxes[cell.boxId] ?? []).map((v, i) => (
          <span key={i} className="font-mono text-xs font-bold text-fuchsia-700">{formatVal(v)}</span>
        ))}
      </div>
    </div>
  )
}

export default function ListCopyRefVisualizer({ code }: { code: string }) {
  const result = useMemo(() => buildListCopyRefVisualization(code), [code])
  const totalSteps = result.ok ? result.steps.length : 0
  const playback = useStepPlayback(totalSteps)

  if (!result.ok) {
    return (
      <div className="not-prose my-3 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>참조/복사 데이터를 표시할 수 없습니다: {result.error}</span>
      </div>
    )
  }

  const { spec, steps, pseudocode, codeCollapseBefore } = result
  const currentStep = steps[Math.min(playback.stepIndex, steps.length - 1)]
  const bName = bVarName(spec.mode)
  const sameBox = currentStep.bOuter !== null && currentStep.aBoxId === currentStep.bBoxId

  return (
    <div className="not-prose my-4 max-w-2xl mx-auto border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
          참조와 복사
        </span>
        <span className="text-sm font-bold text-gray-800">{spec.title || "할당 vs copy() vs deepcopy()"}</span>
      </div>

      {/* 의사코드 패널 */}
      <CodePanel lines={pseudocode} activeLines={currentStep.codeLines} collapseBefore={codeCollapseBefore} />

      {/* 상자 다이어그램 */}
      <div className="p-4 space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-bold text-gray-500">my_list</span>
            {sameBox && <span className="text-[11px] font-bold text-indigo-600">= {bName} (같은 상자를 가리킴)</span>}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {currentStep.aOuter.map((cell, i) => (
              <CellView key={i} cell={cell} nestedBoxes={currentStep.nestedBoxes} />
            ))}
          </div>
        </div>

        {currentStep.bOuter && !sameBox && (
          <div>
            <span className="text-[11px] font-bold text-gray-500 mb-1.5 block">{bName}</span>
            <div className="flex flex-wrap gap-1.5">
              {currentStep.bOuter.map((cell, i) => (
                <CellView key={i} cell={cell} nestedBoxes={currentStep.nestedBoxes} />
              ))}
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
