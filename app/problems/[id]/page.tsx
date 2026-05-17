import { notFound } from "next/navigation";
import {
  getProblemById,
  getTestCases,
  getAdjacentProblems,
  getCertSessionInfo,
  type CertSessionInfo,
} from "@/services/problem.service";
import ProblemPageClient from "./ProblemPageClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProblemPage({ params }: Props) {
  const { id } = await params;

  const [problem, testCases] = await Promise.all([
    getProblemById(id),
    getTestCases(id),
  ]);

  if (!problem) notFound();

  const isCert = problem.category === "파이썬자격증"

  const [{ prev, next }, certSession] = await Promise.all([
    getAdjacentProblems(problem.id, problem.category),
    isCert
      ? getCertSessionInfo(problem.id, problem.topic, problem.title)
      : Promise.resolve(null),
  ])

  const problemWithCases = { ...problem, test_cases: testCases };

  return (
    <ProblemPageClient
      problem={problemWithCases}
      prev={prev}
      next={next}
      certSession={certSession}
    />
  );
}
