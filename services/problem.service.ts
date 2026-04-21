import { supabase } from "@/lib/supabase";
import { Problem, AdjacentProblem, TestCase } from "@/types/problem";

/** 문제 단건 조회 */
export async function getProblemById(id: string): Promise<Problem | null> {
  const { data, error } = await supabase
    .from("problems")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as Problem;
}

/**
 * 테스트케이스 조회
 * - test_cases 테이블이 없으면 빈 배열 반환 (correct_answer 방식으로 폴백)
 */
export async function getTestCases(problemId: string): Promise<TestCase[]> {
  const { data, error } = await supabase
    .from("test_cases")
    .select("*")
    .eq("problem_id", problemId)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("[getTestCases] Supabase 오류:", error.message, "| problemId:", problemId);
    return [];
  }
  if (!data || data.length === 0) {
    console.warn("[getTestCases] 결과 없음. problemId:", problemId);
  }
  return data ?? [];
}

/**
 * 같은 category 내 이전/다음 문제 조회
 * - course/[slug] 에서 넘어올 때 category 기준으로 순서 결정
 */
export async function getAdjacentProblems(
  problemId: string,
  category: string
): Promise<{ prev: AdjacentProblem; next: AdjacentProblem }> {
  const { data } = await supabase
    .from("problems")
    .select("id, title")
    .eq("category", category)
    .order("id");

  if (!data) return { prev: null, next: null };

  const idx = data.findIndex((p) => p.id === problemId);
  return {
    prev: idx > 0 ? data[idx - 1] : null,
    next: idx < data.length - 1 ? data[idx + 1] : null,
  };
}
