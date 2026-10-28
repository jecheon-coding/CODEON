"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

type GoalCtx = { dailyGoal: number; setDailyGoal: (n: number) => void }

const GoalContext = createContext<GoalCtx>({ dailyGoal: 6, setDailyGoal: () => {} })

export function GoalProvider({ children }: { children: ReactNode }) {
  const [dailyGoal, setGoal] = useState(6)

  useEffect(() => {
    // 사이트 기본값과 개인 설정을 함께 불러와, 개인 설정이 있으면 그걸 우선한다.
    Promise.all([
      fetch("/api/settings").then(r => r.json()).catch(() => null),
      fetch("/api/goal").then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([siteData, personalData]) => {
      const siteDefault = siteData?.defaultDailyGoal
      if (typeof siteDefault === "number" && siteDefault >= 1 && siteDefault <= 20) setGoal(siteDefault)

      const personal = personalData?.dailyGoal
      if (typeof personal === "number" && personal >= 1 && personal <= 20) setGoal(personal)
    })
  }, [])

  const setDailyGoal = (n: number) => {
    const clamped = Math.min(20, Math.max(1, n))
    setGoal(clamped)
    fetch("/api/goal", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dailyGoal: clamped }),
    }).catch(() => {})
  }

  return <GoalContext.Provider value={{ dailyGoal, setDailyGoal }}>{children}</GoalContext.Provider>
}

export const useGoal = () => useContext(GoalContext)
