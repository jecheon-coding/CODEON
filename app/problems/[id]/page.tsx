import { notFound } from "next/navigation";
import {
  getProblemById,
  getTestCases,
  getAdjacentProblems,
} from "@/services/problem.service";
import ProblemPageClient from "./ProblemPageClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProblemPage({ params }: Props) {
  const { id } = await params;

  // 문제 + 테스트케이스 병렬 조회
  const [problem, testCases] = await Promise.all([
    getProblemById(id),
    getTestCases(id),
  ]);

  if (!problem) notFound();

  // 이전/다음 문제 (같은 category 기준)
  const { prev, next } = await getAdjacentProblems(problem.id, problem.category);

  // test_cases를 problem 객체에 병합해서 단일 출처로 내려보냄
  const problemWithCases = { ...problem, test_cases: testCases };

  return (
    <ProblemPageClient
      problem={problemWithCases}
      prev={prev}
      next={next}
    />
  );
}
