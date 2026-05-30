"use client"

import { useEffect, useRef } from "react"
import { useSession, signOut } from "next-auth/react"

const IDLE_MS = 3 * 60 * 60 * 1000  // 3시간 무활동

export default function IdleWatcher() {
  const { data: session } = useSession()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!session) return

    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        signOut({ callbackUrl: "/login" })
      }, IDLE_MS)
    }

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const
    events.forEach(ev => window.addEventListener(ev, reset, { passive: true }))
    reset()

    return () => {
      events.forEach(ev => window.removeEventListener(ev, reset))
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [session])

  return null
}
