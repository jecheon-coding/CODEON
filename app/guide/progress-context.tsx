"use client"
import { createContext, useContext } from "react"

export type ProgressContextType = {
  completedSet: Set<string>
  setCompletedSet: React.Dispatch<React.SetStateAction<Set<string>>>
}

export const ProgressContext = createContext<ProgressContextType>({
  completedSet: new Set(),
  setCompletedSet: () => {},
})

export const useProgress = () => useContext(ProgressContext)
