"use client";

import { useState } from "react";
import { ChevronDown, Users } from "lucide-react";
import { Problem } from "@/types/problem";

interface Props { problem: Problem; isDark: boolean }

// ── Sticky 섹션 헤더 ──────────────────────────────────────────────────────────
function SectionHeader({
  title, isDark, collapsible = false, open, onToggle,
}: {
  title:        string;
  isDark:       boolean;
  collapsible?: boolean;
  open?:        boolean;
  onToggle?:    () => void;
}) {
  const D = (dark: string, light: string) => isDark ? dark : light;

  const base = (
    <h3 className={`text-xs font-bold uppercase tracking-widest
      ${D("text-slate-400", "text-gray-400")}`}>
      {title}
    </h3>
  );

  if (!collapsible) {
    return (
      <div className={`sticky top-0 z-10 -mx-6 px-6 py-2 mb-2
        ${D("bg-slate-900 border-b border-slate-800/60",
            "bg-gray-50 border-b border-gray-100")}`}>
        {base}
      </div>
    );
  }

  return (
    <button
      onClick={onToggle}
      className={`sticky top-0 z-10 -mx-6 px-6 py-2 mb-2 w-[calc(100%+3rem)]
        flex items-center justify-between
        transition-colors duration-150
        ${D("bg-slate-900 border-b border-slate-800/60 hover:bg-slate-800/60",
            "bg-gray-50 border-b border-gray-100 hover:bg-gray-100/80")}`}
    >
      {base}
      <ChevronDown
        className={`w-3.5 h-3.5 transition-transform duration-200
          ${D("text-slate-500", "text-gray-400")}
          ${open ? "rotate-180" : "rotate-0"}`}
        strokeWidth={2.5}
      />
    </button>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────────
export default function ProblemDescription({ problem, isDark }: Props) {
  const D = (dark: string, light: string) => isDark ? dark : light;
  const [constraintsOpen, setConstraintsOpen] = useState(true);
  const [hintOpen,        setHintOpen]        = useState(false);

  return (
    <article className={`flex flex-col gap-6 text-sm ${D("text-slate-300", "text-gray-700")}`}>

      {/* 태그 + 제목 */}
      <div>
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {problem.is_community && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border
              flex items-center gap-1
              ${D("bg-amber-900/30 text-amber-400 border-amber-700/50",
                  "bg-amber-50 text-amber-600 border-amber-100")}`}>
              <Users className="w-3 h-3" />
              학생 제작
            </span>
          )}
          {problem.topic && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border
              ${D("bg-slate-700 text-blue-300 border-slate-600",
                  "bg-blue-50 text-blue-500 border-blue-100")}`}>
              {problem.topic}
            </span>
          )}
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
            ${problem.difficulty === "하" ? "bg-emerald-100 text-emerald-700"
            : problem.difficulty === "중" ? "bg-amber-100 text-amber-700"
            : "bg-rose-100 text-rose-700"}`}>
            난이도 {problem.difficulty}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full
            ${D("bg-slate-700 text-slate-400", "bg-gray-100 text-gray-500")}`}>
            {problem.category}
          </span>
        </div>
        <p className={`text-sm font-medium leading-snug
          ${D("text-slate-400", "text-gray-400")}`}>
          {problem.title}
        </p>
      </div>

      {/* 문제 설명 — 항상 표시, sticky 헤더 */}
      <section>
        <SectionHeader title="문제" isDark={isDark} />
        <p className="leading-[1.85] whitespace-pre-wrap">
          {problem.content}
        </p>
      </section>

      {/* 제한 사항 — 접기 가능 */}
      {problem.constraints && (
        <section>
          <SectionHeader
            title="제한 사항"
            isDark={isDark}
            collapsible
            open={constraintsOpen}
            onToggle={() => setConstraintsOpen(v => !v)}
          />
          {constraintsOpen && (
            <ul className="flex flex-col gap-1.5">
              {problem.constraints.split("\n").filter(Boolean).map((line, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className={`mt-[7px] w-1.5 h-1.5 rounded-full shrink-0
                    ${D("bg-slate-600", "bg-gray-300")}`} />
                  <span className="leading-[1.85]">{line}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* 힌트 — 기본 접힘, 접기 가능 */}
      {problem.hint && (
        <section>
          <SectionHeader
            title="힌트"
            isDark={isDark}
            collapsible
            open={hintOpen}
            onToggle={() => setHintOpen(v => !v)}
          />
          {hintOpen && (
            <div className={`rounded-xl p-4 border
              ${D("bg-amber-900/20 border-amber-700/40", "bg-amber-50 border-amber-100")}`}>
              <p className={`text-sm leading-relaxed whitespace-pre-wrap
                ${D("text-amber-200", "text-amber-800")}`}>
                {problem.hint}
              </p>
            </div>
          )}
        </section>
      )}

    </article>
  );
}
