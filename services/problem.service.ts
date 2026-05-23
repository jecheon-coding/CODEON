import { supabaseServer as supabase } from "@/lib/supabaseServer";
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

export type CertSessionInfo = {
  round: number        // 회차 번호 (1차, 2차 ...)
  index: number        // 현재 문제 위치 (1-based)
  total: number        // 회차 내 전체 문제 수
  grade: 1 | 2 | 3    // 급수
  typeName: string     // "기출" | "모의"
}

function parseCertFields(topic: string | null, title: string) {
  const src    = `${topic ?? ""} ${title}`
  const gradeM = src.match(/([123])급/)
  const roundM = src.match(/(\d+)차/)
  return {
    grade: gradeM ? (parseInt(gradeM[1]) as 1 | 2 | 3) : null,
    type:  /기출/.test(src) ? "exam" : /모의/.test(src) ? "mock" : null,
    round: roundM ? parseInt(roundM[1]) : null,
  }
}

/** 자격증 과정 회차 정보 — 현재 문제의 위치(index/total) 반환 */
export async function getCertSessionInfo(
  problemId: string,
  topic: string | null,
  title: string,
): Promise<CertSessionInfo | null> {
  const { grade, type, round } = parseCertFields(topic, title)
  if (!grade || !type || !round) return null

  const { data } = await supabase
    .from("problems")
    .select("id, topic, title")
    .eq("category", "파이썬자격증")
    .eq("status", "published")
    .order("id")

  if (!data) return null

  const sessionProblems = data.filter(p => {
    const m = parseCertFields(p.topic, p.title)
    return m.grade === grade && m.type === type && m.round === round
  })

  const idx = sessionProblems.findIndex(p => p.id === problemId)
  if (idx === -1) return null

  return {
    round,
    index: idx + 1,
    total: sessionProblems.length,
    grade,
    typeName: type === "exam" ? "기출" : "모의",
  }
}

/**
 * 같은 category + topic 내 이전/다음 문제 조회
 * - 목록의 display_order → id 정렬 기준과 동일하게 순서 결정
 */
export async function getAdjacentProblems(
  problemId: string,
  category: string,
  topic: string | null
): Promise<{ prev: AdjacentProblem; next: AdjacentProblem }> {
  let query = supabase
    .from("problems")
    .select("id, title, display_order")
    .eq("category", category)
    .eq("status", "published")
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("id");

  if (topic) {
    query = query.eq("topic", topic);
  }

  const { data } = await query;
  if (!data) return { prev: null, next: null };

  // display_order 기준으로 클라이언트 정렬 (목록과 동일한 순서)
  const sorted = [...data].sort((a, b) => {
    if (a.display_order == null && b.display_order == null) return a.id < b.id ? -1 : 1;
    if (a.display_order == null) return 1;
    if (b.display_order == null) return -1;
    if (a.display_order !== b.display_order) return a.display_order - b.display_order;
    return a.id < b.id ? -1 : 1;
  });

  const idx = sorted.findIndex((p) => p.id === problemId);
  return {
    prev: idx > 0 ? sorted[idx - 1] : null,
    next: idx < sorted.length - 1 ? sorted[idx + 1] : null,
  };
}
