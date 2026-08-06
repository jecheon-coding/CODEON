import { useEffect, useState } from "react"

export const DEFAULT_SPEEDS = [0.5, 1, 2] as const
const BASE_INTERVAL_MS = 900

export function useStepPlayback(totalSteps: number, speeds: readonly number[] = DEFAULT_SPEEDS) {
  const [stepIndex, setStepIndex] = useState(0)
  const [playing,   setPlaying]   = useState(false)
  const [speed,     setSpeed]     = useState<number>(speeds[1] ?? speeds[0])

  const intervalMs = BASE_INTERVAL_MS / speed

  useEffect(() => {
    if (!playing || totalSteps === 0) return
    const timer = setInterval(() => {
      setStepIndex(prev => {
        if (prev >= totalSteps - 1) {
          setPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, intervalMs)
    return () => clearInterval(timer)
  }, [playing, intervalMs, totalSteps])

  function handleTogglePlay() {
    if (stepIndex >= totalSteps - 1) setStepIndex(0)
    setPlaying(p => !p)
  }
  function handleReset()    { setStepIndex(0); setPlaying(false) }
  function handlePrevStep() { setPlaying(false); setStepIndex(i => Math.max(0, i - 1)) }
  function handleNextStep() { setPlaying(false); setStepIndex(i => Math.min(totalSteps - 1, i + 1)) }

  return { stepIndex, playing, speed, setSpeed, handleTogglePlay, handleReset, handlePrevStep, handleNextStep }
}
