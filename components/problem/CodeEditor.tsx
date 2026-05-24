"use client";

import { useEffect, useRef, useState } from "react";
import {
  Play, Send, Terminal, ChevronDown, Loader2,
  CheckCircle2, XCircle, AlertCircle, ArrowRight, Sparkles, Lightbulb,
} from "lucide-react";
import { Problem, SubmissionStatus, CaseResult } from "@/types/problem";
import { useCodeExecution } from "@/hooks/useCodeExecution";
import { useSubmission }    from "@/hooks/useSubmission";

interface Props {
  problem:           Problem;
  isDark:            boolean;
  clearSignal:       number;
  testInput:         string;
  onTestInputChange: (v: string) => void;
  inputOpen:         boolean;
  onInputOpenChange: (v: boolean) => void;
  flashSignal?:      number;
  onCodeChange?:     (code: string) => void;
  onSubmitResult?:   (status: SubmissionStatus) => void;
  onNextProblem?:    () => void;
}

type OutputTab = "output" | "error" | "result";

const EDITOR_FONT = "var(--font-fira-code), 'JetBrains Mono', Consolas, monospace";
const CONSOLE_H   = 180;

export default function CodeEditor({
  problem, isDark, clearSignal,
  testInput, onTestInputChange, inputOpen, onInputOpenChange,
  flashSignal,
  onCodeChange, onSubmitResult, onNextProblem,
}: Props) {
  const editorRef      = useRef<HTMLDivElement>(null);
  const editorInstance = useRef<any>(null);

  const [activeTab, setActiveTab] = useState<OutputTab>("output");
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [analysis,  setAnalysis]  = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // ── 입력창 flash 애니메이션 ──
  const [isFlashing,   setIsFlashing]   = useState(false);
  const flashTimerRef  = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!flashSignal) return;
    clearTimeout(flashTimerRef.current);
    setIsFlashing(true);
    flashTimerRef.current = setTimeout(() => setIsFlashing(false), 300);
    return () => clearTimeout(flashTimerRef.current);
  }, [flashSignal]);

  const execution  = useCodeExecution();
  const submission = useSubmission(problem);

  // ── 에디터 상태 (실행 완료 표시) ──
  const prevRunningRef = useRef(false);
  const [runState,    setRunState]    = useState<"idle" | "done">("idle");
  const doneTimerRef  = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const wasRunning = prevRunningRef.current;
    prevRunningRef.current = execution.running;
    if (wasRunning && !execution.running) {
      clearTimeout(doneTimerRef.current);
      setRunState("done");
      doneTimerRef.current = setTimeout(() => setRunState("idle"), 2000);
    }
    return () => clearTimeout(doneTimerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execution.running]);

  // ── Monaco 초기화 ──
  useEffect(() => {
    const load = async () => {
      // 워커를 설정하지 않으면 메인 스레드에서 실행되어 UI 프리징 발생
      if (typeof window !== "undefined" && !(window as any).MonacoEnvironment) {
        ;(window as any).MonacoEnvironment = {
          getWorker(_moduleId: string, _label: string) {
            return new Worker(
              new URL(
                "monaco-editor/esm/vs/editor/editor.worker",
                import.meta.url
              )
            )
          },
        }
      }

      const monaco = await import("monaco-editor");
      if (editorInstance.current || !editorRef.current) return;

      // ── Python 자동완성 프로바이더 (한 번만 등록) ──────────────────────────
      const PYTHON_BUILTINS = [
        { name: "print",     params: "*objects, sep=' ', end='\\n'" },
        { name: "input",     params: "prompt=''" },
        { name: "int",       params: "x=0" },
        { name: "float",     params: "x=0" },
        { name: "str",       params: "object=''" },
        { name: "bool",      params: "x=False" },
        { name: "len",       params: "s" },
        { name: "range",     params: "start, stop, step=1" },
        { name: "list",      params: "iterable=()" },
        { name: "dict",      params: "" },
        { name: "set",       params: "iterable=()" },
        { name: "tuple",     params: "iterable=()" },
        { name: "sorted",    params: "iterable, key=None, reverse=False" },
        { name: "reversed",  params: "sequence" },
        { name: "enumerate", params: "iterable, start=0" },
        { name: "zip",       params: "*iterables" },
        { name: "map",       params: "function, iterable" },
        { name: "filter",    params: "function, iterable" },
        { name: "sum",       params: "iterable, start=0" },
        { name: "max",       params: "*args" },
        { name: "min",       params: "*args" },
        { name: "abs",       params: "x" },
        { name: "round",     params: "number, ndigits=0" },
        { name: "pow",       params: "base, exp, mod=None" },
        { name: "divmod",    params: "x, y" },
        { name: "chr",       params: "i" },
        { name: "ord",       params: "c" },
        { name: "hex",       params: "x" },
        { name: "oct",       params: "x" },
        { name: "bin",       params: "x" },
        { name: "all",       params: "iterable" },
        { name: "any",       params: "iterable" },
        { name: "type",      params: "object" },
        { name: "isinstance", params: "object, classinfo" },
        { name: "open",      params: "file, mode='r'" },
        // 문자열 메서드
        { name: "isdigit",    params: "" },
        { name: "isalpha",    params: "" },
        { name: "isalnum",    params: "" },
        { name: "isnumeric",  params: "" },
        { name: "islower",    params: "" },
        { name: "isupper",    params: "" },
        { name: "isspace",    params: "" },
        { name: "lower",      params: "" },
        { name: "upper",      params: "" },
        { name: "title",      params: "" },
        { name: "capitalize", params: "" },
        { name: "strip",      params: "chars=None" },
        { name: "lstrip",     params: "chars=None" },
        { name: "rstrip",     params: "chars=None" },
        { name: "split",      params: "sep=None, maxsplit=-1" },
        { name: "replace",    params: "old, new, count=-1" },
        { name: "join",       params: "iterable" },
        { name: "startswith", params: "prefix" },
        { name: "endswith",   params: "suffix" },
        { name: "find",       params: "sub, start=0, end=-1" },
        { name: "count",      params: "sub" },
        { name: "format",     params: "*args, **kwargs" },
        { name: "zfill",      params: "width" },
        { name: "center",     params: "width, fillchar=' '" },
        { name: "ljust",      params: "width, fillchar=' '" },
        { name: "rjust",      params: "width, fillchar=' '" },
        // 리스트 메서드
        { name: "append",     params: "object" },
        { name: "extend",     params: "iterable" },
        { name: "insert",     params: "index, object" },
        { name: "remove",     params: "value" },
        { name: "pop",        params: "index=-1" },
        { name: "index",      params: "value, start=0, stop=-1" },
        { name: "sort",       params: "key=None, reverse=False" },
        { name: "reverse",    params: "" },
        { name: "copy",       params: "" },
        // 딕셔너리 메서드
        { name: "keys",       params: "" },
        { name: "values",     params: "" },
        { name: "items",      params: "" },
        { name: "get",        params: "key, default=None" },
        { name: "update",     params: "other" },
      ]

      function extractUserSymbols(code: string) {
        const symbols: { name: string; params: string; kind: "function" | "class" | "variable" }[] = []
        const seen = new Set<string>()

        // def funcname(params):
        for (const m of code.matchAll(/^[ \t]*def\s+(\w+)\s*\(([^)]*)\)/gm)) {
          if (!seen.has(m[1])) { seen.add(m[1]); symbols.push({ name: m[1], params: m[2].trim(), kind: "function" }) }
        }
        // class ClassName:
        for (const m of code.matchAll(/^class\s+(\w+)/gm)) {
          if (!seen.has(m[1])) { seen.add(m[1]); symbols.push({ name: m[1], params: "", kind: "class" }) }
        }
        // 단순 변수 할당: varname = ...
        const RESERVED = new Set(["if","else","for","while","def","class","import","from","return","True","False","None","and","or","not","in","is","lambda"])
        for (const m of code.matchAll(/^(\w+)\s*=/gm)) {
          if (!seen.has(m[1]) && !RESERVED.has(m[1])) { seen.add(m[1]); symbols.push({ name: m[1], params: "", kind: "variable" }) }
        }
        return symbols
      }

      if (!(window as any).__monacoCompletionRegistered) {
        ;(window as any).__monacoCompletionRegistered = true
        monaco.languages.registerCompletionItemProvider("python", {
          provideCompletionItems(model, position) {
            const word  = model.getWordUntilPosition(position)
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber:   position.lineNumber,
              startColumn:     word.startColumn,
              endColumn:       word.endColumn,
            }
            const CIK = monaco.languages.CompletionItemKind
            const ITR = monaco.languages.CompletionItemInsertTextRule

            const userSymbols = extractUserSymbols(model.getValue())

            const userSuggestions = userSymbols.map(s => ({
              label:      s.kind === "function" ? `${s.name}(${s.params})` : s.name,
              kind:       s.kind === "function" ? CIK.Function : s.kind === "class" ? CIK.Class : CIK.Variable,
              detail:     s.kind === "function" ? "사용자 정의 함수" : s.kind === "class" ? "클래스" : "변수",
              insertText: s.name,
              sortText:   "0" + s.name,
              range,
            }))

            const builtinSuggestions = PYTHON_BUILTINS.map(b => ({
              label:      `${b.name}(${b.params})`,
              kind:       CIK.Function,
              detail:     "Python 내장 함수",
              insertText: b.name,
              sortText:   "1" + b.name,
              range,
            }))

            return { suggestions: [...userSuggestions, ...builtinSuggestions] }
          },
        })
      }

      editorInstance.current = monaco.editor.create(editorRef.current, {
        value:                problem.initial_code ?? "# Python 코드를 작성하세요",
        language:             "python",
        theme:                isDark ? "vs-dark" : "vs",
        automaticLayout:      true,
        fontSize:             14,
        lineHeight:           22,
        fontFamily:           EDITOR_FONT,
        fontLigatures:        true,
        padding:              { top: 14, bottom: 14 },
        minimap:              { enabled: false },
        scrollBeyondLastLine: false,
        renderLineHighlight:  "line",
        overviewRulerLanes:   0,
        tabSize:              4,
        quickSuggestions:     { other: true, comments: false, strings: false },
        suggestOnTriggerCharacters: true,
        wordBasedSuggestions: "off",
        tabCompletion:        "on",
        autoClosingQuotes:    "languageDefined",
      });

      editorInstance.current.onDidChangeModelContent(() => {
        onCodeChange?.(editorInstance.current.getValue());
      });


      editorInstance.current.onDidChangeCursorPosition((e: any) => {
        setCursorPos({ line: e.position.lineNumber, col: e.position.column });
      });

      // Python 자동 들여쓰기: addCommand로 Monaco 커맨드 시스템 레벨에서 Enter 처리
      // (onKeyDown은 Monaco 내부 처리를 막지 못함)
      editorInstance.current.addCommand(
        monaco.KeyCode.Enter,
        () => {
          const editor   = editorInstance.current;
          const model    = editor?.getModel();
          const position = editor?.getPosition();
          if (!editor || !model || !position) return;

          const lineContent  = model.getLineContent(position.lineNumber);
          const beforeCursor = lineContent.substring(0, position.column - 1);
          const indentBase   = (lineContent.match(/^(\s*)/) ?? ["", ""])[1];

          if (/^\s*(?:def|class|for|if|elif|else|while|try|with|finally|except|async).*:\s*$/.test(beforeCursor)) {
            editor.trigger("keyboard", "type", { text: "\n" + indentBase + "    " });
          } else {
            editor.trigger("keyboard", "type", { text: "\n" + indentBase });
          }
        },
        "!suggestWidgetVisible && !inSnippetMode",
      );
    };

    load();
    return () => { editorInstance.current?.dispose(); editorInstance.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem.id]);

  useEffect(() => {
    editorInstance.current?.updateOptions({ theme: isDark ? "vs-dark" : "vs" });
  }, [isDark]);

  useEffect(() => {
    if (clearSignal === 0) return;
    editorInstance.current?.setValue(problem.initial_code ?? "");
    onTestInputChange("");
    execution.reset();
    submission.reset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearSignal]);

  const getCode = () => editorInstance.current?.getValue() ?? "";

  const handleRun = () => {
    setActiveTab("output");
    execution.run(getCode(), testInput);
  };

  const handleSubmit = async () => {
    setActiveTab("result");
    setAnalysis(null);
    const finalStatus = await submission.submit(getCode());
    onSubmitResult?.(finalStatus);
  };

  const handleAnalyze = async () => {
    const code = getCode();
    const failedCases = (submission.caseResults ?? [])
      .filter(r => r.status !== "passed")
      .slice(0, 3)
      .map(r => ({ input: r.input, expected: r.expected, actual: r.actual, errorMsg: r.errorMsg }));
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemTitle:   problem.title,
          problemContent: (problem as any).content ?? "",
          code,
          failedCases,
        }),
      });
      const data = await res.json();
      setAnalysis(data.analysis ?? "분석에 실패했습니다.");
    } catch {
      setAnalysis("분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setAnalyzing(false);
    }
  };

  const busy      = execution.running || submission.submitting;
  const D         = (dark: string, light: string) => isDark ? dark : light;

  const statusLabel =
    execution.running   ? "● 실행 중..."          :
    runState === "done" ? "● 완료"               :
    "● 준비됨";
  const statusColor =
    execution.running   ? "text-amber-400"    :
    runState === "done" ? "text-emerald-400"  :
    "text-gray-600";

  const codeHasInput      = getCode().includes("input(");
  const needsInputWarning = codeHasInput && !testInput.trim() && !execution.running;

  return (
    <div className={`h-full flex flex-col rounded-xl overflow-hidden border shadow-sm
      ${D("border-slate-700", "border-gray-200")}`}>

      {/* ── 에디터 헤더 ── */}
      <div className="h-10 flex items-center justify-between px-4 bg-[#2d2d2d] shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28ca41]" />
          <span className="ml-3 text-xs font-mono text-gray-400 select-none">main.py</span>
        </div>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded
          bg-white/8 text-gray-500 select-none`}>
          Python 3
        </span>
      </div>

      {/* ── Monaco 에디터 ── */}
      <div
        ref={editorRef}
        className={`flex-1 min-h-0 ${D("bg-[#1e1e1e]", "bg-[#fffffe]")}`}
      />

      {/* ── 상태바 ── */}
      <div className={`h-5 flex items-center justify-between px-4 shrink-0 select-none
        ${D("bg-[#2d2d2d]", "bg-gray-100")} border-t ${D("border-white/5", "border-gray-200")}`}>
        <span className={`text-[10px] font-mono tabular-nums transition-colors duration-300 ${statusColor}`}>
          {statusLabel}
        </span>
        <span className="text-[10px] font-mono text-gray-500 tabular-nums">
          Ln {cursorPos.line}, Col {cursorPos.col}
        </span>
      </div>

      {/* ── 버튼 바 ── */}
      <div className={`h-12 flex items-center justify-between px-4 shrink-0
        border-t ${D("bg-[#252525] border-white/8", "bg-gray-50 border-gray-200")}`}>

        {/* 테스트 입력 토글 */}
        <button
          onClick={() => onInputOpenChange(!inputOpen)}
          className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg
            transition-colors duration-150
            ${inputOpen
              ? D("text-emerald-300 bg-emerald-900/30", "text-emerald-600 bg-emerald-50")
              : D("text-gray-500 hover:text-emerald-300 hover:bg-emerald-900/20",
                  "text-gray-500 hover:text-emerald-600 hover:bg-emerald-50")}`}
        >
          <Terminal size={11} />
          테스트 입력
          <ChevronDown
            size={10}
            className={`transition-transform duration-150 ${inputOpen ? "rotate-180" : ""}`}
          />
        </button>

        {/* 실행 + 제출 */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRun}
            disabled={busy}
            className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-1.5
              rounded-lg transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed
              ${D("bg-emerald-600 hover:bg-emerald-500 text-white",
                  "bg-emerald-500 hover:bg-emerald-600 text-white")}`}
          >
            {execution.running ? (
              <><Loader2 size={13} className="animate-spin" /> 실행 중...</>
            ) : (
              <><Play size={13} className="fill-current" /> 실행</>
            )}
          </button>

          <button
            onClick={handleSubmit}
            disabled={busy}
            className="flex items-center gap-1.5 text-sm font-semibold text-white
              bg-indigo-500 hover:bg-indigo-600 px-4 py-1.5 rounded-lg
              transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send size={13} />
            {submission.submitting ? "채점 중..." : "제출"}
          </button>
        </div>
      </div>

      {/* ── 테스트 입력 패널 ── */}
      {inputOpen && (
        <div className={`shrink-0 border-t transition-colors duration-200
          ${isFlashing
            ? D("border-indigo-700/50 bg-indigo-900/40", "border-indigo-300 bg-indigo-100")
            : D("border-emerald-700/30 bg-[#191e19]",    "border-emerald-200 bg-emerald-50/70")}`}>
          <div className="px-4 pt-2.5 pb-1.5 flex items-center justify-between">
            <div className={`flex items-center gap-1.5 text-[11px] font-semibold
              ${D("text-emerald-400", "text-emerald-600")}`}>
              <Terminal size={10} />
              테스트 입력값을 직접 넣고 실행해 보세요
            </div>
            {testInput.trim() && (
              <button
                onClick={() => onTestInputChange("")}
                className={`text-[11px] transition-colors duration-150
                  ${D("text-slate-500 hover:text-slate-300", "text-gray-400 hover:text-gray-600")}`}
              >
                지우기
              </button>
            )}
          </div>
          <textarea
            value={testInput}
            onChange={(e) => onTestInputChange(e.target.value)}
            placeholder={"예) 홍길동 (Enter로 여러 줄 입력 가능)"}
            spellCheck={false}
            rows={3}
            className={`w-full px-4 pb-3 text-xs font-mono resize-none
              focus:outline-none leading-relaxed block bg-transparent
              ${D("text-emerald-300 placeholder:text-emerald-900/60",
                  "text-gray-700 placeholder:text-gray-400")}`}
          />
        </div>
      )}

      {/* ── 콘솔 ── */}
      <div
        className={`flex flex-col shrink-0 border-t
          ${D("bg-slate-950 border-white/8", "bg-slate-900 border-gray-700")}`}
        style={{ height: `${CONSOLE_H}px` }}
      >
        {/* 탭 바 */}
        <div className={`h-9 flex items-stretch gap-0.5 px-3 border-b shrink-0
          ${D("border-white/8", "border-white/8")}`}>
          <div className="flex items-center mr-1.5">
            <Terminal size={12} className="text-gray-600" />
          </div>
          {(["output", "error", "result"] as const).map((tab) => {
            const labels: Record<OutputTab, string> = {
              output: "출력", error: "에러", result: "제출 결과",
            };
            const isActive     = activeTab === tab;
            const hasErrorDot  = tab === "error"  && !!execution.error;
            const hasResultDot = tab === "result" && !!submission.status;

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 text-xs px-3
                  transition-all duration-150 font-medium
                  ${isActive
                    ? "text-white font-semibold border-b-2 border-indigo-500 -mb-[1px]"
                    : "text-gray-500 opacity-50 hover:opacity-75 hover:text-gray-300 hover:bg-white/5"}`}
              >
                {labels[tab]}
                {hasErrorDot  && <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />}
                {hasResultDot && (
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0
                    ${submission.status === "correct" ? "bg-emerald-400" : "bg-red-400"}`} />
                )}
              </button>
            );
          })}
        </div>

        {/* 탭 내용 */}
        <div className="flex-1 px-4 py-3 overflow-y-auto font-mono min-h-0">

          {activeTab === "output" && (
            execution.output
              ? <pre className="text-sm text-green-400 whitespace-pre-wrap leading-relaxed">

                  {execution.output}
                </pre>
              : needsInputWarning
              ? <div className="flex flex-col gap-2">
                  <div className="inline-flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25">
                    <AlertCircle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-300 leading-relaxed">
                      <p className="font-semibold mb-0.5">입력값이 필요한 코드예요.</p>
                      <p className="text-amber-400/80">
                        아래 <strong className="text-amber-300">테스트 입력</strong> 버튼을 눌러 입력값을 넣은 뒤 실행해보세요.
                      </p>
                    </div>
                  </div>
                  {!inputOpen && (
                    <button
                      onClick={() => onInputOpenChange(true)}
                      className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg w-fit
                        bg-emerald-900/30 text-emerald-300 hover:bg-emerald-900/50 transition-colors"
                    >
                      <Terminal size={10} /> 테스트 입력 열기
                    </button>
                  )}
                </div>
              : <p className="text-xs text-gray-600">
                  // 실행 버튼을 눌러 출력 결과를 확인하세요.
                </p>
          )}

          {activeTab === "error" && (
            execution.error
              ? <pre className="text-sm text-red-400 whitespace-pre-wrap leading-relaxed">
                  {execution.error}
                </pre>
              : <p className="text-xs text-gray-600">// 에러가 없습니다.</p>
          )}

          {activeTab === "result" && (
            <ResultView
              status={submission.status}
              caseResults={submission.caseResults}
              progress={submission.progress}
              onNextProblem={onNextProblem}
              onAnalyze={handleAnalyze}
              analyzing={analyzing}
              analysis={analysis}
            />
          )}

        </div>
      </div>

    </div>
  );
}

// ── 제출 결과 뷰 ──
function ResultView({
  status, caseResults, progress, onNextProblem,
  onAnalyze, analyzing, analysis,
}: {
  status: SubmissionStatus;
  caseResults: CaseResult[] | null;
  progress: { current: number; total: number } | null;
  onNextProblem?: () => void;
  onAnalyze?: () => void;
  analyzing?: boolean;
  analysis?: string | null;
}) {
  // 채점 중 진행 상황
  if (progress) {
    return (
      <div className="flex items-center gap-2 text-xs text-indigo-400">
        <Loader2 size={11} className="animate-spin" />
        채점 중... {progress.current} / {progress.total} 케이스
      </div>
    );
  }

  if (!status) return (
    <p className="text-xs text-gray-600">// 제출 버튼을 눌러 채점 결과를 확인하세요.</p>
  );

  const CONFIG: Record<string, { Icon: any; color: string; bar: string; msg: string }> = {
    correct:     { Icon: CheckCircle2, color: "text-emerald-400", bar: "border-emerald-500", msg: "정답입니다! 훌륭해요"                 },
    wrong:       { Icon: XCircle,      color: "text-red-400",     bar: "border-red-500",     msg: "오답입니다. 다시 시도해보세요."       },
    timeout:     { Icon: AlertCircle,  color: "text-amber-400",   bar: "border-amber-500",   msg: "시간 초과입니다."                    },
    error:       { Icon: AlertCircle,  color: "text-yellow-400",  bar: "border-yellow-500",  msg: "실행 중 오류가 발생했습니다."         },
    no_criteria: { Icon: AlertCircle,  color: "text-slate-400",   bar: "border-slate-500",   msg: "채점 기준이 등록되지 않은 문제입니다." },
  };

  const c = CONFIG[status];
  if (!c) return null;

  const failedCases = (caseResults ?? []).filter(r => r.status !== "passed" && !r.isHidden);

  return (
    <div className="flex flex-col gap-2.5">
      <div className={`flex items-center gap-2 border-l-2 pl-3 ${c.bar}`}>
        <c.Icon size={14} className={c.color} />
        <span className={`text-sm font-semibold ${c.color}`}>{c.msg}</span>
        {status === "correct" && <Sparkles size={13} className="text-emerald-400" />}
        {caseResults && (
          <span className="text-xs text-gray-500 ml-1">
            ({caseResults.filter(r => r.status === "passed").length}/{caseResults.length} 통과)
          </span>
        )}
      </div>

      {/* 정답: 다음 문제 유도 */}
      {status === "correct" && onNextProblem && (
        <button
          onClick={onNextProblem}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg w-fit
            bg-emerald-500 hover:bg-emerald-600 text-white transition-colors duration-150"
        >
          다음 문제 풀기 <ArrowRight size={11} />
        </button>
      )}

      {/* 오답/오류: 케이스별 상세 */}
      {failedCases.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-0.5">
          {failedCases.map((r) => (
            <div key={r.caseNum} className="text-[11px] font-mono leading-relaxed">
              <span className="text-yellow-400 font-semibold">케이스 {r.caseNum}</span>
              {r.status === "wrong" && (
                <>
                  {r.input    != null && <div><span className="text-gray-500">입력: </span><span className="text-gray-400">{r.input || "(없음)"}</span></div>}
                  {r.expected != null && <div><span className="text-gray-500">기대 출력: </span><span className="text-emerald-400">{r.expected}</span></div>}
                  {r.actual   != null && <div><span className="text-gray-500">실제 출력: </span><span className="text-red-400">{r.actual}</span></div>}
                </>
              )}
              {r.status === "error" && r.errorMsg && (
                <div><span className="text-gray-500">오류: </span><span className="text-red-400">{r.errorMsg}</span></div>
              )}
              {r.status === "timeout" && (
                <div className="text-amber-400">시간 초과</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 오답/오류: AI 오답 분석 */}
      {(status === "wrong" || status === "error") && onAnalyze && (
        <div className="flex flex-col gap-2 mt-0.5">
          {!analysis ? (
            <button
              onClick={onAnalyze}
              disabled={analyzing}
              className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg w-fit
                bg-indigo-600 hover:bg-indigo-700 text-white transition-colors duration-150 disabled:opacity-60"
            >
              {analyzing
                ? <><Loader2 size={10} className="animate-spin" /> 분석 중...</>
                : <><Lightbulb size={10} /> AI 오답 분석</>}
            </button>
          ) : (
            <div className="bg-indigo-950/40 border border-indigo-800/40 rounded-lg p-3 flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <Lightbulb size={11} className="text-indigo-400 shrink-0" />
                <span className="text-[11px] font-bold text-indigo-300">AI 오답 분석</span>
              </div>
              <p className="text-[11px] text-gray-300 leading-relaxed whitespace-pre-wrap">{analysis}</p>
              <button
                onClick={onAnalyze}
                disabled={analyzing}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 w-fit disabled:opacity-50"
              >
                {analyzing ? "분석 중..." : "↺ 다시 분석"}
              </button>
            </div>
          )}
          <p className="text-[10px] text-gray-600">
            단계별 힌트는 아래 <span className="text-indigo-400">AI 코치</span>를 이용하세요.
          </p>
        </div>
      )}
    </div>
  );
}
