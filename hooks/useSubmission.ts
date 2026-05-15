"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { runPythonInWorker } from "@/lib/pyodideWorker";
import { saveSubmission } from "@/services/submission.service";
import { Problem, SubmissionStatus, TestCase, CaseResult, CaseResultStatus } from "@/types/problem";

function lastErrorLine(msg: string): string {
  const lines = msg.split("\n").map(l => l.trim()).filter(Boolean)
  return lines[lines.length - 1] ?? msg
}

function normalizeOutput(s: string): string {
  return s.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trimEnd()
}

export function useSubmission(problem: Problem) {
  const { data: session } = useSession();
  const [caseResults,      setCaseResults]      = useState<CaseResult[] | null>(null)
  const [status,           setStatus]           = useState<SubmissionStatus>("");
  const [submitting,       setSubmitting]        = useState(false);
  const [progress,         setProgress]          = useState<{ current: number; total: number } | null>(null);
  const [submissionOutput, setSubmissionOutput]  = useState<string | null>(null);

  const submit = async (code: string): Promise<SubmissionStatus> => {
    setSubmitting(true);
    setCaseResults(null);
    setStatus("");
    setProgress(null);

    const timeoutMs = problem.time_limit_ms ?? undefined;
    setSubmissionOutput(null);

    const allCases: TestCase[] = Array.isArray(problem?.test_cases) ? problem.test_cases : [];

    try {
      // ── test_cases 기반 채점 ──────────────────────────────────────────────
      if (allCases.length > 0) {
        const results: CaseResult[] = [];
        setProgress({ current: 0, total: allCases.length });
        let firstPublicOutput: string | null = null;

        for (let i = 0; i < allCases.length; i++) {
          const tc = allCases[i];
          setProgress({ current: i + 1, total: allCases.length });
          let actual = "";
          let caseStatus: CaseResultStatus;
          let errorMsg: string | undefined;

          try {
            actual = await runPythonInWorker(code, tc.input ?? "", timeoutMs);
            const passed = normalizeOutput(actual) === normalizeOutput(tc.expected_output);
            caseStatus = passed ? "passed" : "wrong";
            if (!tc.is_hidden && firstPublicOutput === null) firstPublicOutput = actual;
          } catch (execErr: any) {
            const msg = execErr?.message ?? String(execErr);
            if (msg === "TIME_LIMIT_EXCEEDED") {
              caseStatus = "timeout";
            } else {
              caseStatus = "error";
              if (!tc.is_hidden) errorMsg = lastErrorLine(msg);
            }
          }

          const result: CaseResult = {
            caseNum:  i + 1,
            isHidden: tc.is_hidden,
            status:   caseStatus,
          };

          // 공개 케이스에만 입출력 데이터 첨부
          if (!tc.is_hidden) {
            if (caseStatus === "wrong") {
              result.input    = tc.input;
              result.expected = tc.expected_output;
              result.actual   = actual;
            } else if (caseStatus === "error") {
              result.input    = tc.input;
              result.errorMsg = errorMsg;
            }
          }

          results.push(result);
        }

        const overallStatus: SubmissionStatus =
          results.some(r => r.status === "error")   ? "error"   :
          results.some(r => r.status === "timeout")  ? "timeout" :
          results.some(r => r.status === "wrong")    ? "wrong"   :
          "correct";

        setCaseResults(results);
        setStatus(overallStatus);
        setSubmissionOutput(firstPublicOutput);

        const passedCount = results.filter(r => r.status === "passed").length;
        const dbResult =
          overallStatus === "correct" ? "정답" :
          overallStatus === "timeout" ? "시간초과" :
          overallStatus === "error"   ? "런타임 에러" : "오답";

        await persistResult(code, `${passedCount}/${results.length} 케이스 통과`, overallStatus === "correct", dbResult);
        return overallStatus;
      }

      // ── correct_answer 폴백 채점 ─────────────────────────────────────────
      if (problem.correct_answer) {
        let actual = "";
        try {
          actual = await runPythonInWorker(code, "", timeoutMs);
          setSubmissionOutput(actual);
        } catch (execErr: any) {
          const msg = execErr?.message ?? String(execErr);
          const isTimeout = msg === "TIME_LIMIT_EXCEEDED";
          const st: SubmissionStatus = isTimeout ? "timeout" : "error";
          const cr: CaseResult = {
            caseNum: 1, isHidden: false,
            status: isTimeout ? "timeout" : "error",
            ...(!isTimeout ? { errorMsg: lastErrorLine(msg) } : {}),
          };
          setCaseResults([cr]);
          setStatus(st);
          await persistResult(code, isTimeout ? "시간초과" : lastErrorLine(msg), false, isTimeout ? "시간초과" : "런타임 에러");
          return st;
        }

        const passed = normalizeOutput(actual) === normalizeOutput(problem.correct_answer);
        const cr: CaseResult = {
          caseNum: 1, isHidden: false,
          status: passed ? "passed" : "wrong",
          ...(!passed ? { expected: problem.correct_answer, actual } : {}),
        };
        setCaseResults([cr]);
        const st: SubmissionStatus = passed ? "correct" : "wrong";
        setStatus(st);
        await persistResult(code, passed ? "정답" : "오답", passed, passed ? "정답" : "오답");
        return st;
      }

      // ── 채점 기준 없음 ──────────────────────────────────────────────────
      setStatus("no_criteria");
      return "no_criteria";

    } catch (err: any) {
      setStatus("error");
      return "error";
    } finally {
      setSubmitting(false);
      setProgress(null);
    }
  };

  const persistResult = async (code: string, output: string, isCorrect: boolean, result: string) => {
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return;
    try {
      await saveSubmission({ user_id: userId, problem_id: problem.id, code, output, result, is_correct: isCorrect });
    } catch {}
  };

  const reset = () => { setCaseResults(null); setStatus(""); setProgress(null); setSubmissionOutput(null); };

  return { caseResults, status, submitting, progress, submit, reset, submissionOutput };
}
