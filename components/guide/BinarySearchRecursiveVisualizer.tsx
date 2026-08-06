"use client"

import { useMemo } from "react"
import { AlertCircle } from "lucide-react"
import { buildBinarySearchRecursiveVisualization, type BinarySearchRecursiveStep } from "@/lib/binarySearchTraversal"
import { useStepPlayback, DEFAULT_SPEEDS } from "@/hooks/useStepPlayback"
import { CodePanel } from "@/components/guide/graph/CodePanel"
import { CaptionBar } from "@/components/guide/graph/CaptionBar"
import { PlaybackControls } from "@/components/guide/graph/PlaybackControls"
import { GridCanvas, type CellState } from "@/components/guide/grid/GridCanvas"

function cellState(c: number, step: BinarySearchRecursiveStep): CellState {
  const top = step.callStack[step.callStack.length - 1]
  if (step.foundIndex === c) return "visited"
  if (!top) return "wall"
  if (top.mid === c) return "current"
  if (c < top.left || c > top.right) return "wall"
  return "empty"
}

export default function BinarySearchRecursiveVisualizer({ code }: { code: string }) {
  const result = useMemo(() => buildBinarySearchRecursiveVisualization(code), [code])
  const totalSteps = result.ok ? result.steps.length : 0
  const playback = useStepPlayback(totalSteps)

  if (!result.ok) {
    return (
      <div className="not-prose my-3 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>재귀 이분탐색 데이터를 표시할 수 없습니다: {result.error}</span>
      </div>
    )
  }

  const { spec, steps, pseudocode, codeCollapseBefore } = result
  const currentStep = steps[Math.min(playback.stepIndex, steps.length - 1)]

  return (
    <div className="not-prose my-4 max-w-2xl mx-auto border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
          재귀 이분탐색
        </span>
        <span className="text-sm font-bold text-gray-800">{spec.title || "배열 이분탐색 (재귀)"}</span>
      </div>

      {/* 의사코드 패널 */}
      <CodePanel lines={pseudocode} activeLines={currentStep.codeLines} collapseBefore={codeCollapseBefore} />

      {/* 본문: 배열 + 사이드 패널 */}
      <div className="flex flex-col md:flex-row">
        <GridCanvas
          rows={1} cols={spec.array.length} padding={0}
          getCellState={(_r, c) => cellState(c, currentStep)}
          getCellLabel={(_r, c) => String(spec.array[c])}
          isCellActive={(_r, c) => {
            const top = currentStep.callStack[currentStep.callStack.length - 1]
            return !!top && top.mid === c
          }}
        />

        <aside className="w-full md:w-52 shrink-0 border-t md:border-t-0 md:border-l border-gray-100 px-4 py-3">
          <h4 className="text-[11px] font-bold text-gray-500 mb-1">호출 스택 (Call Stack)</h4>
          <div className="flex flex-col-reverse gap-1">
            {currentStep.callStack.length === 0 && (
              <span className="text-[11px] text-gray-300">비어 있음</span>
            )}
            {currentStep.callStack.map((frame, i) => (
              <div
                key={i}
                className={`px-2 py-1 text-[11px] font-mono rounded border ${
                  i === currentStep.callStack.length - 1
                    ? "bg-indigo-50 text-indigo-700 border-indigo-300 font-bold"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                search({frame.left}, {frame.right})
              </div>
            ))}
          </div>
        </aside>
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
