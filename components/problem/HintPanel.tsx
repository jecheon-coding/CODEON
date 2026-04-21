"use client";

import { useState } from "react";
import { Lightbulb, Sparkles, RotateCcw, ChevronDown, ChevronRight, CheckSquare } from "lucide-react";
import { Problem, SubmissionStatus } from "@/types/problem";

interface Props {
  problem:          Problem;
  code:             string;
  submissionStatus: SubmissionStatus;
  isDark:           boolean;
}

const STATUS_LABEL: Record<string, { light: string; dark: string; text: string }> = {
  correct: {
    light: "text-emerald-600 bg-emerald-50 border-emerald-200",
    dark:  "text-emerald-300 bg-emerald-900/30 border-emerald-700",
    text:  "✓ 정답 — 훌륭해요!",
  },
  wrong: {
    light: "text-red-600 bg-red-50 border-red-200",
    dark:  "text-red-300 bg-red-900/30 border-red-700",
    text:  "✗ 오답 — 힌트를 확인해보세요.",
  },
  error: {
    light: "text-yellow-600 bg-yellow-50 border-yellow-200",
    dark:  "text-yellow-300 bg-yellow-900/30 border-yellow-700",
    text:  "! 오류 — 코드를 점검해보세요.",
  },
};

function parseSteps(text: string): string[] {
  const steps: string[] = [];
  let cur = "";
  for (const line of text.split("\n").map((l) => l.trim()).filter(Boolean)) {
    if (/^[1-3]단계[:.]/.test(line) || /^\*\*[1-3]단계/.test(line)) {
      if (cur) steps.push(cur.trim());
      cur = line.replace(/\*\*/g, "");
    } else {
      cur += (cur ? " " : "") + line.replace(/\*\*/g, "");
    }
  }
  if (cur) steps.push(cur.trim());
  return steps.length >= 2 ? steps : [text.trim()];
}

export default function HintPanel({ problem, code, submissionStatus, isDark }: Props) {
  const [rawHint,   setRawHint]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [revealed,  setRevealed]  = useState(0);
  const [collapsed, setCollapsed] = useState(true); // 기본 접힘 → 에디터 공간 우선 확보

  const steps      = rawHint ? parseSteps(rawHint) : [];
  const statusMeta = STATUS_LABEL[submissionStatus];
  const D          = (dark: string, light: string) => isDark ? dark : light;

  const fetchHint = async () => {
    setLoading(true);
    setRawHint("");
    setRevealed(0);

    const prompt = `
너는 친절한 코딩 강사다.
문제: ${problem.title}
문제 설명: ${problem.content}
학생 코드:
${code || "(작성 없음)"}

정답은 절대 알려주지 말고, 힌트를 정확히 3단계로 나눠 제공해라.
각 단계는 "1단계:", "2단계:", "3단계:" 로 시작하고, 각 단계는 2~3문장 이내로 짧게 작성해.
`;

    try {
      const res  = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY}`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "AI 응답 없음";
      setRawHint(text);
      setRevealed(1);
    } catch {
      setRawHint("AI 호출 실패. 잠시 후 다시 시도해 주세요.");
      setRevealed(1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`border rounded-xl overflow-hidden shadow-sm
      ${D("border-slate-700 bg-slate-800", "border-gray-200 bg-white")}`}>

      {/* 패널 헤더 */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className={`w-full flex items-center justify-between px-4 py-3
          transition-colors border-b
          ${D("bg-slate-800 hover:bg-slate-700 border-white/10",
              "bg-white hover:bg-gray-50 border-gray-100")}`}
      >
        <div className="flex items-center gap-2">
          <Lightbulb size={14} className="text-indigo-400" />
          <span className={`text-sm font-bold ${D("text-slate-100", "text-gray-800")}`}>
            AI 코치
          </span>
          {statusMeta && (
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border
              ${isDark ? statusMeta.dark : statusMeta.light}`}>
              {statusMeta.text}
            </span>
          )}
        </div>
        <ChevronDown
          size={14}
          className={`transition-transform ${collapsed ? "" : "rotate-180"}
            ${D("text-slate-500", "text-gray-400")}`}
        />
      </button>

      {/* 패널 본문 */}
      {!collapsed && (
        <div className={`px-4 py-4 flex flex-col gap-3
          ${D("bg-slate-800", "bg-white")}`}>

          {/* 안내 텍스트 */}
          {!rawHint && !loading && (
            <p className={`text-xs leading-relaxed ${D("text-slate-400", "text-gray-500")}`}>
              막히는 부분이 있으면 AI 코치에게 3단계 힌트를 받아보세요.
              정답은 알려주지 않고 방향만 안내합니다.
            </p>
          )}

          {/* 로딩 */}
          {loading && (
            <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 border
              ${D("bg-indigo-900/30 border-indigo-700", "bg-indigo-50 border-indigo-100")}`}>
              <Sparkles size={13} className="text-indigo-400 animate-pulse" />
              <span className={`text-xs font-medium ${D("text-indigo-300", "text-indigo-500")}`}>
                AI가 힌트를 생각하고 있어요...
              </span>
            </div>
          )}

          {/* 단계형 힌트 — Progressive Disclosure */}
          {steps.length > 0 && !loading && (() => {
            const STEP_STYLE = [
              { light: "bg-blue-50 border-blue-100",   dark: "bg-blue-900/30 border-blue-700",   label: "text-blue-500 dark:text-blue-300"   },
              { light: "bg-indigo-50 border-indigo-100", dark: "bg-indigo-900/30 border-indigo-700", label: "text-indigo-500 dark:text-indigo-300" },
              { light: "bg-violet-50 border-violet-100", dark: "bg-violet-900/30 border-violet-700", label: "text-violet-500 dark:text-violet-300" },
            ];
            return (
              <div className="flex flex-col gap-2">
                {/* 공개된 힌트 카드 */}
                {steps.slice(0, revealed).map((step, i) => {
                  const s = STEP_STYLE[i] ?? STEP_STYLE[STEP_STYLE.length - 1];
                  return (
                    <div key={i} className={`rounded-xl rounded-tl-sm px-4 py-3 border
                      ${isDark ? s.dark : s.light}`}>
                      <p className={`text-[11px] font-bold mb-1 ${s.label}`}>
                        {i + 1}단계 힌트
                      </p>
                      <p className={`text-sm leading-relaxed ${D("text-slate-200", "text-gray-700")}`}>
                        {step}
                      </p>
                    </div>
                  );
                })}

                {/* 다음 힌트 버튼 — 남은 힌트가 있을 때만 */}
                {revealed < steps.length && (
                  <button
                    onClick={() => setRevealed(revealed + 1)}
                    className={`flex items-center gap-1.5 w-full px-4 py-2.5 border border-dashed
                      rounded-xl text-xs font-semibold transition-all active:scale-[0.98]
                      ${D("border-slate-600 text-slate-400 hover:border-indigo-500 hover:text-indigo-300 hover:bg-indigo-900/20",
                          "border-gray-200 text-gray-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50")}`}
                  >
                    <ChevronRight size={13} />
                    {revealed + 1}단계 힌트 보기
                    <span className={`ml-auto text-[10px] font-normal ${D("text-slate-600", "text-gray-300")}`}>
                      {steps.length - revealed}개 남음
                    </span>
                  </button>
                )}
              </div>
            );
          })()}

          {/* 힌트 버튼 */}
          <button
            onClick={fetchHint}
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full py-2.5
              bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold
              rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading
              ? <><Sparkles size={13} className="animate-spin" /> AI 생각 중...</>
              : rawHint
              ? <><RotateCcw size={13} /> 힌트 다시 받기</>
              : <><Lightbulb size={13} /> AI 힌트 받기</>}
          </button>

          {/* 학습 포인트 */}
          {problem.topic && (
            <div className={`rounded-xl px-4 py-3.5 border
              ${D("bg-slate-700/60 border-slate-600", "bg-gray-50 border-gray-200")}`}>
              <div className={`flex items-center gap-1.5 mb-2
                ${D("text-slate-400", "text-gray-500")}`}>
                <CheckSquare size={12} />
                <p className="text-[11px] font-bold uppercase tracking-widest">학습 포인트</p>
              </div>
              <p className={`text-xs leading-relaxed ${D("text-slate-300", "text-gray-600")}`}>
                이 문제는&nbsp;
                <span className={`font-semibold px-1 py-0.5 rounded ${D("text-indigo-300 bg-indigo-900/40", "text-indigo-600 bg-indigo-50")}`}>
                  {problem.topic}
                </span>
                &nbsp;개념을 다룹니다.
                {problem.difficulty === "하" && " 기본 문법을 정확하게 적용하는 것이 핵심입니다."}
                {problem.difficulty === "중" && " 로직의 흐름을 단계적으로 설계해보세요."}
                {problem.difficulty === "상" && " 엣지 케이스와 효율성을 함께 고려해야 합니다."}
              </p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
