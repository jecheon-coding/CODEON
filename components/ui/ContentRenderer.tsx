"use client"

import React from "react"

interface Props {
  content: string
  isDark?: boolean
  className?: string
}

function parseRow(line: string): string[] {
  return line.split("|").slice(1, -1).map(c => c.trim())
}

function isSeparator(line: string): boolean {
  return /^\|[\s|:\-]+\|$/.test(line.trim())
}

function isTableLine(line: string): boolean {
  return line.trim().startsWith("|")
}

export default function ContentRenderer({ content, isDark = false, className }: Props) {
  if (!content) return null

  const D = (dark: string, light: string) => isDark ? dark : light

  const lines = content.split("\n")
  const segments: { type: "text" | "table"; lines: string[] }[] = []

  let buffer: string[] = []
  let inTable = false

  for (const line of lines) {
    if (isTableLine(line)) {
      if (!inTable) {
        if (buffer.length) segments.push({ type: "text", lines: [...buffer] })
        buffer = []
        inTable = true
      }
      buffer.push(line)
    } else {
      if (inTable) {
        segments.push({ type: "table", lines: [...buffer] })
        buffer = []
        inTable = false
      }
      buffer.push(line)
    }
  }
  if (buffer.length) {
    segments.push({ type: inTable ? "table" : "text", lines: buffer })
  }

  return (
    <div className={className}>
      {segments.map((seg, si) => {
        if (seg.type === "text") {
          const text = seg.lines.join("\n")
          if (!text.trim()) return null
          return (
            <p key={si} className="leading-[1.85] whitespace-pre-wrap">
              {text}
            </p>
          )
        }

        // 테이블 파싱
        const tableLines = seg.lines.filter(l => l.trim())
        if (tableLines.length === 0) return null

        let headerCells: string[] | null = null
        let dataLines: string[]

        if (tableLines.length >= 2 && isSeparator(tableLines[1])) {
          headerCells = parseRow(tableLines[0])
          dataLines = tableLines.slice(2)
        } else {
          dataLines = tableLines
        }

        const dataRows = dataLines.map(parseRow)

        return (
          <div key={si} className="overflow-x-auto my-3">
            <table className={`border-collapse text-sm ${D("text-slate-200", "text-gray-700")}`}>
              {headerCells && (
                <thead>
                  <tr>
                    {headerCells.map((h, i) => (
                      <th key={i} className={`border px-3 py-1.5 text-center font-bold
                        ${D("border-slate-600 bg-slate-700 text-slate-200",
                            "border-gray-300 bg-gray-100 text-gray-800")}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {dataRows.map((row, ri) => (
                  <tr key={ri} className={D("even:bg-slate-800/40", "even:bg-gray-50")}>
                    {row.map((cell, ci) => (
                      <td key={ci} className={`border px-3 py-1.5 text-center
                        ${D("border-slate-600", "border-gray-300")}`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}
