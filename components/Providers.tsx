"use client"

import { SessionProvider } from "next-auth/react"
import { GoalProvider } from "@/lib/goalContext"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus refetchInterval={0}>
      <GoalProvider>
        {children}
      </GoalProvider>
    </SessionProvider>
  )
}