"use client"

import { Play, Pause, SkipBack, ChevronLeft, ChevronRight } from "lucide-react"

export function PlaybackControls({
  stepIndex, totalSteps, playing, speed, speeds,
  onReset, onPrev, onNext, onTogglePlay, onSpeedChange,
}: {
  stepIndex:     number
  totalSteps:    number
  playing:       boolean
  speed:         number
  speeds:        readonly number[]
  onReset:       () => void
  onPrev:        () => void
  onNext:        () => void
  onTogglePlay:  () => void
  onSpeedChange: (s: number) => void
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-t border-gray-100 bg-gray-50">
      <button onClick={onReset} title="처음으로" className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors">
        <SkipBack className="w-3.5 h-3.5" />
      </button>
      <button onClick={onPrev} disabled={stepIndex === 0} title="이전 스텝" className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 transition-colors">
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={onTogglePlay}
        className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
      >
        {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </button>
      <button onClick={onNext} disabled={stepIndex >= totalSteps - 1} title="다음 스텝" className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 transition-colors">
        <ChevronRight className="w-3.5 h-3.5" />
      </button>

      <span className="text-[11px] text-gray-400 font-mono tabular-nums ml-1">
        {stepIndex + 1} / {totalSteps}
      </span>

      <div className="ml-auto flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5">
        {speeds.map(s => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-colors ${
              speed === s ? "bg-indigo-100 text-indigo-700" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  )
}
