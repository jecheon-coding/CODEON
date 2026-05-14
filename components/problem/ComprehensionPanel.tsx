"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Brain, Send, SkipForward, Sparkles, CheckCircle2, Plus, AlertCircle, BookOpen } from "lucide-react";
import { Problem } from "@/types/problem";

interface Props {
  problem: Problem;
  code: string;
  isDark: boolean;
  required?: boolean;
  onComplete?: () => void;
}

type Phase = "loading" | "question" | "answering" | "evaluating" | "done" | "skipped" | "error";

export default function ComprehensionPanel({ problem, code, isDark, required = false, onComplete }: Props) {
  const [phase, setPhase]           = useState<Phase>("loading");
  const [question, setQuestion]     = useState("");
  const [answer, setAnswer]         = useState("");
  const [feedback, setFeedback]     = useState("");
  const [correction, setCorrection] = useState<string | null>(null);
  const [bonusScore, setBonusScore] = useState(0);
  const [inputError, setInputError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasFetched                = useRef(false);

  const D = (dark: string, light: string) => isDark ? dark : light;

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    generateQuestion();
  }, []);

  const generateQuestion = async () => {
    setPhase("loading");
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `너는 친절한 코딩 강사야. 학생이 방금 이 문제를 풀었어.

문제: ${problem.title}
학생 코드:
${code}

학생이 자기 코드를 이해하고 풀었는지 확인하려고 해.
코드의 핵심 로직이나 사용한 개념에 대해 서술형 질문 1개를 만들어.

조건:
- 코드를 직접 보지 않고도 자신의 말로 설명해야 하는 질문
- Yes/No 대답이 아닌 서술형
- 한국어로, 1문장
- 질문만 출력 (서론이나 설명 없이)`,
              }]
            }]
          }),
        }
      );
      const data = await res.json();
      const q = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
      if (q) { setQuestion(q); setPhase("question"); }
      else setPhase("error");
    } catch {
      setPhase("error");
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answer.trim()) return;
    if (answer.trim().length < 15) {
      setInputError("답변이 너무 짧습니다. 조금 더 자세히 설명해보세요.");
      textareaRef.current?.select();
      textareaRef.current?.focus();
      return;
    }
    setInputError("");
    setPhase("evaluating");

    let fb = "";
    let isRelevant = false;
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `너는 코딩 강사야. 학생 답변이 질문에 성실하게 답했는지 엄격하게 판단해.

문제: ${problem.title}
학생 코드:
${code}

질문: ${question}
학생 답변: ${answer}

[판단 기준]
- relevant: false 조건 (하나라도 해당하면 false)
  * 질문과 무관한 내용 (예: "모르겠어요", "AI에게 물어봐요", 질문 내용을 그대로 반복)
  * 코드나 문제와 전혀 관련 없는 답변
  * 의미 없는 글자/단어 나열
- relevant: true 조건
  * 코드의 동작이나 개념을 자신의 말로 설명하려는 시도가 있음 (완벽하지 않아도 됨)

[correction 작성 규칙]
- 학생 답변이 틀리거나 불완전한 부분이 있으면, 올바른 개념을 2~4문장으로 친절하게 설명해줘
- 학생 답변이 완벽하다면 null
- relevant: false이면 반드시 올바른 설명 제공

반드시 아래 JSON 형식으로만 응답해 (다른 텍스트 없이):
{"relevant": true, "feedback": "피드백 1~2문장", "correction": "올바른/보완 설명 또는 null"}
또는
{"relevant": false, "feedback": "무엇을 설명해야 하는지 한 문장", "correction": "이 질문에 대한 올바른 설명 2~4문장"}`,
              }]
            }]
          }),
        }
      );
      const data = await res.json();
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
      // JSON 파싱 시도
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        isRelevant = parsed.relevant === true;
        fb = parsed.feedback ?? "평가를 불러오지 못했어요.";
        if (parsed.correction && parsed.correction !== "null") setCorrection(parsed.correction);
      } else {
        fb = "평가를 불러오지 못했어요.";
      }
    } catch {
      fb = "평가를 불러오지 못했어요.";
    }

    setFeedback(fb);
    if (isRelevant) onComplete?.();

    // DB 저장 + 가산점 (관련 답변일 때만)
    try {
      const r = await fetch("/api/comprehension", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId: problem.id,
          question,
          answer,
          feedback: fb,
          skipped: !isRelevant,  // 무관한 답변은 건너뛰기로 처리 (가산점 없음)
        }),
      });
      const saved = await r.json();
      if (saved.bonusScore) setBonusScore(saved.bonusScore);
    } catch { /* 저장 실패는 무시 */ }

    setPhase("done");
  };

  const handleSkip = async () => {
    setPhase("skipped");
    try {
      await fetch("/api/comprehension", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId: problem.id,
          question,
          skipped: true,
        }),
      });
    } catch { /* 저장 실패는 무시 */ }
  };

  return (
    <div className={`mt-3 rounded-xl border overflow-hidden
      ${D("border-violet-600/50 bg-[#1e1a3a]", "border-violet-200 bg-violet-50")}`}>

      {/* 헤더 */}
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b
        ${D("border-violet-600/40 bg-violet-900/40", "border-violet-100 bg-violet-100/60")}`}>
        <Brain size={14} className={D("text-violet-300", "text-violet-500")} />
        <span className={`text-xs font-bold ${D("text-violet-100", "text-violet-700")}`}>이해 확인</span>
        <span className={`text-[11px] ${D("text-violet-300", "text-violet-400")}`}>· 내 코드를 설명해보세요</span>
        {required
          ? <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white">필수</span>
          : <span className={`ml-auto text-[11px] font-semibold ${D("text-amber-300", "text-violet-500")}`}>답변 시 가산점 지급</span>
        }
      </div>

      <div className="px-4 py-3">

        {/* 로딩 */}
        {phase === "loading" && (
          <div className={`flex items-center gap-2 text-xs ${D("text-violet-200", "text-violet-500")}`}>
            <Sparkles size={13} className="animate-pulse" />
            AI가 질문을 만들고 있어요...
          </div>
        )}

        {/* 오류 */}
        {phase === "error" && (
          <p className={`text-xs ${D("text-gray-300", "text-gray-400")}`}>
            질문을 불러오지 못했어요.
          </p>
        )}

        {/* 질문 + 입력 */}
        {(phase === "question" || phase === "answering") && (
          <div className="flex flex-col gap-2.5">
            <p className={`text-sm font-medium leading-relaxed ${D("text-violet-200", "text-violet-800")}`}>
              {question}
            </p>
            <textarea
              ref={textareaRef}
              value={answer}
              onChange={e => { setAnswer(e.target.value); if (inputError) setInputError(""); if (phase === "question") setPhase("answering"); }}
              placeholder="자신의 말로 설명해보세요... (15자 이상)"
              rows={3}
              className={`w-full text-sm rounded-lg px-3 py-2 border resize-none outline-none transition-colors
                ${inputError
                  ? D("bg-slate-800/60 border-red-500 text-gray-200", "bg-white border-red-400 text-gray-700")
                  : D(
                    "bg-slate-800/60 border-violet-700 text-gray-200 placeholder:text-slate-600 focus:border-violet-400",
                    "bg-white border-violet-200 text-gray-700 placeholder:text-violet-300 focus:border-violet-400"
                  )}`}
            />
            <div className="flex items-center justify-between">
              {inputError
                ? <p className="text-[11px] text-red-400 flex items-center gap-1"><AlertCircle size={11} /> {inputError}</p>
                : <span />
              }
              <span className={`text-[11px] tabular-nums ${answer.trim().length >= 15
                ? D("text-emerald-400", "text-emerald-600")
                : D("text-slate-500", "text-gray-400")}`}>
                {answer.trim().length} / 15자
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSubmitAnswer}
                disabled={!answer.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 hover:bg-violet-600
                  disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <Send size={11} /> 제출
              </button>
              {!required && (
                <button
                  onClick={handleSkip}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
                    ${D("text-slate-500 hover:bg-slate-700/60", "text-gray-400 hover:bg-gray-100")}`}
                >
                  <SkipForward size={11} /> 건너뛰기
                </button>
              )}
              {required && (
                <p className={`text-[11px] ${D("text-amber-400", "text-amber-600")}`}>
                  이해 확인을 완료해야 다음 문제로 넘어갈 수 있습니다
                </p>
              )}
            </div>
          </div>
        )}

        {/* 평가 중 */}
        {phase === "evaluating" && (
          <div className={`flex items-center gap-2 text-xs ${D("text-violet-400", "text-violet-500")}`}>
            <Sparkles size={13} className="animate-pulse" />
            AI가 답변을 확인 중이에요...
          </div>
        )}

        {/* 결과 */}
        {phase === "done" && (
          <div className="flex flex-col gap-2">
            {/* 가산점 획득 */}
            {bonusScore > 0 && (
              <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg
                ${D("bg-amber-900/30 text-amber-300 border border-amber-700/40", "bg-amber-50 text-amber-600 border border-amber-200")}`}>
                <Plus size={12} />
                가산점 +{bonusScore}점 획득!
              </div>
            )}
            {/* 내 답변 */}
            <div className={`text-xs rounded-lg px-3 py-2 border
              ${D("bg-slate-800/50 border-slate-600 text-gray-300", "bg-white border-gray-200 text-gray-500")}`}>
              <p className={`text-[11px] font-bold mb-1 ${D("text-slate-500", "text-gray-400")}`}>내 답변</p>
              <p>{answer}</p>
            </div>
            {/* AI 피드백 — 가산점 없으면 경고 스타일 */}
            <div className={`flex items-start gap-2 rounded-lg px-3 py-2.5 border
              ${bonusScore > 0
                ? D("bg-emerald-900/20 border-emerald-800/40 text-emerald-200", "bg-emerald-50 border-emerald-200 text-emerald-700")
                : D("bg-amber-900/20 border-amber-800/40 text-amber-200",   "bg-amber-50 border-amber-200 text-amber-700")
              }`}>
              {bonusScore > 0
                ? <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-emerald-500" />
                : <AlertCircle  size={13} className="mt-0.5 shrink-0 text-amber-500" />
              }
              <p className="text-xs leading-relaxed">{feedback}</p>
            </div>
            {/* 올바른/보완 설명 */}
            {correction && (
              <div className={`flex items-start gap-2 rounded-lg px-3 py-2.5 border
                ${D("bg-indigo-900/20 border-indigo-700/40 text-indigo-200", "bg-indigo-50 border-indigo-200 text-indigo-800")}`}>
                <BookOpen size={13} className={`mt-0.5 shrink-0 ${D("text-indigo-300", "text-indigo-400")}`} />
                <div>
                  <p className={`text-[11px] font-bold mb-1 ${D("text-indigo-400", "text-indigo-400")}`}>올바른 설명</p>
                  <p className="text-xs leading-relaxed">{correction}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 건너뜀 */}
        {phase === "skipped" && (
          <p className={`text-xs ${D("text-slate-300", "text-gray-500")}`}>
            건너뛰었습니다. 다음에는 꼭 설명해보세요!
            <span className={`ml-1 font-semibold ${D("text-amber-400", "text-amber-500")}`}>(가산점 없음)</span>
          </p>
        )}

      </div>
    </div>
  );
}
