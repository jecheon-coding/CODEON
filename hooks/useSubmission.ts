"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { runPythonCode } from "@/lib/pyodide";
import { saveSubmission } from "@/services/submission.service";
import { supabase } from "@/lib/supabase";
import { Problem, SubmissionStatus, TestCase } from "@/types/problem";

// 테스트케이스 별 실행 결과 구조
interface CaseResult {
  caseNum:  number;
  input:    string | null;
  expected: string;
  actual:   string;
  passed:   boolean;
}

export function useSubmission(problem: Problem) {
  const { data: session } = useSession();
  const [output,     setOutput]     = useState("");
  const [status,     setStatus]     = useState<SubmissionStatus>("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (code: string): Promise<SubmissionStatus> => {
    setSubmitting(true);
    setOutput("");
    setStatus("");

    // ── [1] test_cases 조회 — 제출 시점 Supabase 직접 조회 ──────────────
    console.log("[제출] 시작 ──────────────────────────────");
    console.log("  problem.id      :", problem.id);
    console.log("  correct_answer  :", problem.correct_answer ?? "(없음)");
    console.log("  code 길이       :", code.length);

    const { data: fetchedCases, error: fetchError } = await supabase
      .from("test_cases")
      .select("*")
      .eq("problem_id", problem.id)
      .order("display_order", { ascending: true });

    console.log("  fetchedCases 수 :", fetchedCases?.length ?? 0);
    console.log("  fetchError      :", fetchError ?? null);

    if (fetchError) {
      console.error("[제출] DB 조회 오류:", fetchError.message);
      setOutput(`채점 기준 조회 중 DB 오류가 발생했습니다:\n${fetchError.message}`);
      setStatus("error");
      setSubmitting(false);
      return "error";
    }

    const directCases: TestCase[] = Array.isArray(fetchedCases) ? fetchedCases : [];
    const joinedCases: TestCase[] = Array.isArray(problem?.test_cases) ? problem.test_cases : [];
    const allCases: TestCase[]    = directCases.length > 0 ? directCases : joinedCases;

    console.log("  final allCases 수:", allCases.length,
                "(공개:", allCases.filter(t => !t.is_hidden).length,
                "/ 히든:", allCases.filter(t => t.is_hidden).length, ")");

    try {
      // ── [2] test_cases 기반 채점 ──────────────────────────────────────
      if (allCases.length > 0) {
        console.log("[제출] 채점 방식: test_cases");

        const results: CaseResult[] = [];

        for (let i = 0; i < allCases.length; i++) {
          const tc    = allCases[i];
          const label = tc.is_hidden ? "(히든)" : "(공개)";

          console.log(`  케이스 ${i + 1}/${allCases.length} ${label}`);
          console.log("    input   :", JSON.stringify(tc.input));
          console.log("    expect  :", JSON.stringify(tc.expected_output));

          // ── 코드 실행 ────────────────────────────────────────────────
          let actual: string;
          try {
            actual = await runPythonCode(code, tc.input ?? "");
          } catch (execErr: any) {
            const msg = execErr?.message ?? String(execErr);
            console.error(`  케이스 ${i + 1} 런타임 에러:`, msg);

            const runtimeOutput = buildRuntimeErrorOutput(i + 1, tc.input, msg);
            setOutput(runtimeOutput);
            setStatus("error");
            await persistResult(code, runtimeOutput, false, "런타임 에러");
            return "error";
          }

          console.log("    actual  :", JSON.stringify(actual));

          const passed = normalizeOutput(actual) === normalizeOutput(tc.expected_output);
          results.push({ caseNum: i + 1, input: tc.input, expected: tc.expected_output, actual, passed });

          if (!passed) {
            console.log(`  케이스 ${i + 1} → 오답`);

            const wrongOutput = buildWrongOutput(i + 1, tc.input, tc.expected_output, actual);
            setOutput(wrongOutput);
            setStatus("wrong");
            await persistResult(code, wrongOutput, false, "오답");
            return "wrong";
          }

          console.log(`  케이스 ${i + 1} → 통과`);
        }

        // ── 전체 통과 ─────────────────────────────────────────────────
        console.log("[제출] 결과: 정답 ✓ (통과:", results.length, "케이스)");

        const correctOutput = `모든 테스트케이스 통과 (${results.length}/${results.length})`;
        setOutput(correctOutput);
        setStatus("correct");
        await persistResult(code, correctOutput, true, "정답");
        return "correct";
      }

      // ── [3] correct_answer 폴백 채점 ─────────────────────────────────
      if (problem.correct_answer) {
        console.log("[제출] 채점 방식: correct_answer (폴백)");

        let actual: string;
        try {
          actual = await runPythonCode(code);
        } catch (execErr: any) {
          const msg = execErr?.message ?? String(execErr);
          console.error("[제출] 실행 에러:", msg);
          setOutput(msg);
          setStatus("error");
          await persistResult(code, msg, false, "런타임 에러");
          return "error";
        }

        const passed = normalizeOutput(actual) === normalizeOutput(problem.correct_answer);
        console.log("[제출] correct_answer 비교:", passed ? "정답" : "오답");

        const savedOutput = passed
          ? `정답 (correct_answer 일치)`
          : `오답\n기대 출력: ${problem.correct_answer.trim()}\n실제 출력: ${actual.trim()}`;

        setOutput(savedOutput);
        setStatus(passed ? "correct" : "wrong");
        await persistResult(code, savedOutput, passed, passed ? "정답" : "오답");
        return passed ? "correct" : "wrong";
      }

      // ── [4] 등록된 테스트케이스 없음 ─────────────────────────────────
      console.warn("[제출] 등록된 테스트케이스 없음 — test_cases 0건, correct_answer 없음");
      setOutput("이 문제에는 등록된 테스트케이스가 없습니다.");
      setStatus("no_criteria");
      return "no_criteria";

    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error("[제출] 시스템 오류:", msg);
      setOutput(`제출 처리 중 오류가 발생했습니다:\n${msg}`);
      setStatus("error");
      return "error";
    } finally {
      setSubmitting(false);
      console.log("[제출] 종료 ──────────────────────────────");
    }
  };

  // ── Supabase 저장 (실패해도 채점 결과에 영향 없음) ──────────────────────
  const persistResult = async (
    code: string, output: string, isCorrect: boolean, result: string
  ) => {
    const userId = (session?.user as any)?.id as string | undefined;

    console.log("[제출] 저장 시도 ──────────────────────────");
    console.log("  user_id    :", userId ?? "(없음 — 저장 스킵)");
    console.log("  problem_id :", problem.id);
    console.log("  result     :", result);
    console.log("  is_correct :", isCorrect);

    if (!userId) {
      console.warn("[제출] user_id 없음 — DB 저장 스킵 (로그인 상태 확인 필요)");
      return;
    }

    try {
      await saveSubmission({
        user_id:    userId,
        problem_id: problem.id,
        code,
        output,
        result,
        is_correct: isCorrect,
      });
      console.log("[제출] DB 저장 완료 ✓ | user_id:", userId, "| result:", result);
    } catch (dbErr: any) {
      console.warn("[제출] DB 저장 실패 (채점 결과 유지):", dbErr?.message ?? dbErr);
    }
  };

  const reset = () => { setOutput(""); setStatus(""); };

  return { output, status, submitting, submit, reset };
}

// ── 저장/표시용 텍스트 빌더 ────────────────────────────────────────────────

function buildWrongOutput(
  caseNum: number, input: string | null, expected: string, actual: string
): string {
  const lines = [`케이스 ${caseNum} 오답`];
  if (input !== null && input.trim() !== "") {
    lines.push(`입력: ${input.trim()}`);
  }
  lines.push(`기대 출력: ${expected.trim()}`);
  lines.push(`실제 출력: ${actual.trim()}`);
  return lines.join("\n");
}

function buildRuntimeErrorOutput(
  caseNum: number, input: string | null, errorMsg: string
): string {
  const lines = [`케이스 ${caseNum} 런타임 에러`];
  if (input !== null && input.trim() !== "") {
    lines.push(`입력: ${input.trim()}`);
  }
  lines.push(errorMsg);
  return lines.join("\n");
}

// ── 출력 정규화: trim + CRLF→LF + 줄 끝 공백 제거 ──────────────────────────
function normalizeOutput(s: string): string {
  return s
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}
