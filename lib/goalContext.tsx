"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

type GoalCtx = { dailyGoal: number; setDailyGoal: (n: number) => void }

const GoalContext = createContext<GoalCtx>({ dailyGoal: 3, setDailyGoal: () => {} })

export function GoalProvider({ children }: { children: ReactNode }) {
  const [dailyGoal, setGoal] = useState(3)

  useEffect(() => {
    const saved = parseInt(localStorage.getItem("dailyGoal") ?? "3")
    if (!isNaN(saved) && saved >= 1 && saved <= 20) setGoal(saved)
  }, [])

  const setDailyGoal = (n: number) => {
    const clamped = Math.min(20, Math.max(1, n))
    localStorage.setItem("dailyGoal", String(clamped))
    setGoal(clamped)
  }

  return <GoalContext.Provider value={{ dailyGoal, setDailyGoal }}>{children}</GoalContext.Provider>
}

export const useGoal = () => useContext(GoalContext)
