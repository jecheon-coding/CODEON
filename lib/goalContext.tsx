"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

type GoalCtx = { dailyGoal: number; setDailyGoal: (n: number) => void }

const GoalContext = createContext<GoalCtx>({ dailyGoal: 6, setDailyGoal: () => {} })

export function GoalProvider({ children }: { children: ReactNode }) {
  const [dailyGoal, setGoal] = useState(6)

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(data => {
        const v = data?.defaultDailyGoal
        if (typeof v === "number" && v >= 1 && v <= 20) setGoal(v)
      })
      .catch(() => {})
  }, [])

  const setDailyGoal = (n: number) => {
    const clamped = Math.min(20, Math.max(1, n))
    setGoal(clamped)
  }

  return <GoalContext.Provider value={{ dailyGoal, setDailyGoal }}>{children}</GoalContext.Provider>
}

export const useGoal = () => useContext(GoalContext)
