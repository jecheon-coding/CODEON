import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { supabaseServer } from "@/lib/supabaseServer";
import { problemCategoryToSlug, isCourseAllowed, COURSE_ACCESS_META } from "@/lib/courseAccess";
import { AccessDeniedScreen } from "@/components/guide/AccessDeniedScreen";
import {
  getProblemById,
  getTestCases,
  getAdjacentProblems,
  getCertSessionInfo,
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

  // 링크를 통한 직접 접근으로 과정 제한을 우회하지 못하도록 과목 카테고리를 검사한다.
  // 로그인 세션이 없는 경우(이 페이지는 원래 로그인 체크가 없었음)는 기존 동작을 유지한다.
  const session = await getServerSession(authOptions);
  const role    = (session?.user as any)?.role as string | undefined;
  if (role === "student") {
    const userId = (session!.user as any).id as string;
    const courseSlug = problemCategoryToSlug(problem.category);
    const { data: me } = await supabaseServer.from("users").select("allowed_courses").eq("id", userId).single();
    if (!isCourseAllowed(me?.allowed_courses, courseSlug)) {
      return <AccessDeniedScreen label={courseSlug ? COURSE_ACCESS_META[courseSlug].label : problem.category} />;
    }
  }

  const isCert = problem.category === "파이썬자격증"

  const [{ prev, next }, certSession] = await Promise.all([
    getAdjacentProblems(problem.id, problem.category, problem.topic),
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
