"use client";

import { useState } from "react";
import { Copy, Check, Terminal } from "lucide-react";
import { Problem } from "@/types/problem";

interface Props {
  problem:        Problem;
  isDark:         boolean;
  onSendToInput?: (text: string) => void;
}

function normalizeEscapes(str: string): string {
  return str
    .replace(/\\r\\n/g, "\n")
    .replace(/\\r/g,    "\n")
    .replace(/\\n/g,    "\n")
    .replace(/\\t/g,    "\t")
}

function useClipboard() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copy = async (text: string, key: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {}
  };
  return { copiedKey, copy };
}

// ── 형식 카드 (설명용 — 복사 없음, prose 폰트) ────────────────────────────────
function FormatBox({
  label, content, isDark, accent = false,
}: {
  label:   string;
  content: string;
  isDark:  boolean;
  accent?: boolean;
}) {
  const D = (dark: string, light: string) => isDark ? dark : light;
  const normalized = normalizeEscapes(content);

  return (
    <div className={`rounded-xl overflow-hidden border flex flex-col
      ${D("border-slate-700", accent ? "border-indigo-200" : "border-gray-200")}`}>

      <div className={`px-3.5 py-2 border-b
        ${D(
          "border-slate-700 bg-slate-800",
          accent ? "border-indigo-100 bg-indigo-50" : "border-gray-100 bg-gray-50",
        )}`}>
        <span className={`text-[11px] font-medium tracking-wide
          ${D(
            accent ? "text-indigo-300" : "text-slate-400",
            accent ? "text-indigo-400" : "text-gray-400",
          )}`}>
          {label}
        </span>
      </div>

      <div className={`px-3.5 py-3 text-sm leading-[1.85] whitespace-pre-wrap break-words flex-1
        ${D("bg-slate-800/50 text-slate-300", "bg-white text-gray-700")}`}>
        {normalized}
      </div>
    </div>
  );
}

// ── 예시 카드 (코드 스타일 — 복사 있음, 모노 폰트) ───────────────────────────
function ExampleBox({
  label, content, copyKey, isDark, copiedKey, onCopy, accent = false, onSendToInput,
}: {
  label:          string;
  content:        string;
  copyKey:        string;
  isDark:         boolean;
  copiedKey:      string | null;
  onCopy:         (text: string, key: string) => void;
  accent?:        boolean;
  onSendToInput?: (text: string) => void;
}) {
  const D          = (dark: string, light: string) => isDark ? dark : light;
  const copied     = copiedKey === copyKey;
  const normalized = content ? normalizeEscapes(content) : content;

  return (
    <div className={`rounded-xl overflow-hidden border
      ${D("border-slate-700", accent ? "border-indigo-200" : "border-gray-200")}`}>

      <div className={`flex items-center justify-between px-3 py-2
        ${D("bg-slate-950", "bg-slate-800")}`}>
        <span className={`text-[11px] font-bold uppercase tracking-widest
          ${D(
            accent ? "text-indigo-300" : "text-indigo-300",
            accent ? "text-indigo-400" : "text-indigo-400",
          )}`}>
          {label}
        </span>
        <div className="flex items-center gap-1">
          {onSendToInput && normalized && (
            <button
              onClick={() => onSendToInput(normalized)}
              className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded
                transition-all
                ${D("text-emerald-400 hover:text-white hover:bg-emerald-800/60",
                    "text-emerald-600 hover:text-white hover:bg-emerald-500")}`}
            >
              <Terminal size={10} />
              입력창으로
            </button>
          )}
          <button
            onClick={() => onCopy(normalized ?? "", copyKey)}
            aria-label={`${label} 복사`}
            className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded
              transition-all
              ${copied
                ? D("text-emerald-300 bg-emerald-900/40", "text-emerald-600 bg-emerald-50")
                : D("text-slate-400 hover:text-white hover:bg-slate-600",
                    "text-gray-400 hover:text-gray-700 hover:bg-gray-200")}`}
          >
            {copied ? <><Check size={11} /> 복사됨</> : <><Copy size={11} /> 복사</>}
          </button>
        </div>
      </div>

      <pre
        className={`px-4 py-3 text-sm whitespace-pre-wrap break-words leading-relaxed min-h-[48px]
          ${D("bg-slate-950 text-emerald-300", "bg-gray-900 text-emerald-400")}`}
        style={{ fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace" }}
      >
        {normalized || "(없음)"}
      </pre>
    </div>
  );
}

export default function ProblemExamples({ problem, isDark, onSendToInput }: Props) {
  const { copiedKey, copy } = useClipboard();
  const D = (dark: string, light: string) => isDark ? dark : light;

  const hasInputFmt  = !!problem.input_description;
  const hasOutputFmt = !!problem.output_description;
  const hasFormat    = hasInputFmt || hasOutputFmt;

  const firstCase     = problem.test_cases?.find((tc) => !tc.is_hidden) ?? null;
  const exampleInput  = problem.example_input  ?? firstCase?.input  ?? null;
  const exampleOutput = problem.example_output ?? firstCase?.expected_output ?? null;
  const hasExample    = !!exampleOutput;

  if (!hasFormat && !hasExample) return null;

  return (
    <section>
      <h3 className={`text-base font-semibold mb-3 ${D("text-slate-200", "text-gray-800")}`}>
        입력 / 출력
      </h3>

      <div className={`rounded-xl border overflow-hidden
        ${D("border-slate-700/60", "border-gray-200")}`}>

        {/* 형식 행 */}
        {hasFormat && (
          <div className={`p-4 ${D("bg-slate-800/50", "bg-white")}`}>
            <p className={`text-xs font-medium mb-2.5 ${D("text-slate-500", "text-gray-400")}`}>
              형식
            </p>
            {/* items-stretch는 grid 기본값이므로 FormatBox의 flex-1이 높이를 채움 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {hasInputFmt && (
                <FormatBox
                  label="입력 형식" content={problem.input_description!}
                  isDark={isDark}
                />
              )}
              {hasOutputFmt && (
                <FormatBox
                  label="출력 형식" content={problem.output_description!}
                  isDark={isDark} accent
                />
              )}
            </div>
          </div>
        )}

        {hasFormat && hasExample && (
          <div className={`h-px ${D("bg-slate-700/60", "bg-gray-100")}`} />
        )}

        {/* 예시 행 */}
        {hasExample && (
          <div className={`p-4 ${D("bg-slate-900/60", "bg-gray-50")}`}>
            <p className={`text-xs font-medium mb-2.5 ${D("text-slate-500", "text-gray-400")}`}>
              예시
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {exampleInput != null && (
                <ExampleBox
                  label="입력 예시" content={exampleInput || "(입력 없음)"}
                  copyKey="ex-input" isDark={isDark} copiedKey={copiedKey} onCopy={copy}
                  onSendToInput={onSendToInput}
                />
              )}
              <ExampleBox
                label="출력 예시" content={exampleOutput!}
                copyKey="ex-output" isDark={isDark} copiedKey={copiedKey} onCopy={copy}
                accent
              />
            </div>

            {onSendToInput && (
              <p className={`mt-3 text-xs leading-relaxed ${D("text-slate-500", "text-gray-400")}`}>
                <strong className={D("text-slate-400", "text-gray-500")}>입력창으로</strong> 버튼을 누르면
                오른쪽 테스트 입력창에 자동으로 값이 입력됩니다.
              </p>
            )}
          </div>
        )}

      </div>
    </section>
  );
}
