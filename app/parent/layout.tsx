import type { ReactNode } from "react"

// Auth guards and must_change_password redirect are handled by middleware.ts
export default function ParentLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
