"use client";

import { useRouter } from "next/navigation";
import { Problem, AdjacentProblem, SubmissionStatus } from "@/types/problem";

interface Props {
  problem: Problem;
  prev: AdjacentProblem;
  next: AdjacentProblem;
  submissionStatus: SubmissionStatus;
}

const DIFF_BADGE: Record<string, string> = {
  하: "bg-emerald-100 text-emerald-700",
  중: "bg-amber-100  text-amber-700",
  상: "bg-rose-100   text-rose-700",
};

const STATUS_BADGE: Record<string, { style: string; label: string }> = {
  correct: { style: "bg-emerald-500 text-white",  label: "정답" },
  wrong:   { style: "bg-red-500    text-white",   label: "오답" },
  error:   { style: "bg-yellow-500 text-white",   label: "오류" },
  "":      { style: "bg-gray-100   text-gray-400", label: "미제출" },
};

const CATEGORY_SLUG: Record<string, string> = {
  파이썬기초:    "basic",
  파이썬알고리즘: "algorithm",
  파이썬자격증:  "certificate",
  파이썬실전:    "practical",
  파이썬도전:    "challenge",
};

export default function ProblemHeader({ problem, prev, next, submissionStatus }: Props) {
  const router = useRouter();
  const slug   = CATEGORY_SLUG[problem.category] ?? "basic";
  const statusMeta = STATUS_BADGE[submissionStatus] ?? STATUS_BADGE[""];

  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center px-5 gap-4 shrink-0">

      {/* 왼쪽: breadcrumb + 문제 정보 */}
      <div className="flex items-center gap-3 flex-1 min-w-0">

        {/* breadcrumb */}
        <button
          onClick={() => router.push(`/course/${slug}`)}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors whitespace-nowrap"
        >
          {problem.category}
        </button>
        <span className="text-gray-200 text-xs">/</span>

        {/* 문제 번호 + 제목 */}
        <h1 className="text-sm font-bold text-gray-900 truncate">
          {problem.title}
        </h1>

        {/* 배지 묶음 */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* 카테고리(토픽) */}
          {problem.topic && (
            <span className="text-xs bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full border border-blue-100 font-medium">
              {problem.topic}
            </span>
          )}

          {/* 난이도 */}
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${DIFF_BADGE[problem.difficulty] ?? "bg-gray-100 text-gray-500"}`}>
            {problem.difficulty}
          </span>

          {/* 제출 상태 */}
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusMeta.style}`}>
            {statusMeta.label}
          </span>
        </div>
      </div>

      {/* 오른쪽: 이전 / 목록 / 다음 */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => prev && router.push(`/problems/${prev.id}`)}
          disabled={!prev}
          title={prev?.title ?? ""}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800
            disabled:text-gray-200 disabled:cursor-not-allowed px-2.5 py-1.5
            rounded-lg hover:bg-gray-100 transition-all"
        >
          ← 이전
        </button>

        <button
          onClick={() => router.push(`/course/${slug}`)}
          className="text-xs text-gray-500 hover:text-gray-800 px-2.5 py-1.5
            rounded-lg hover:bg-gray-100 transition-all border border-gray-200"
        >
          목록
        </button>

        <button
          onClick={() => next && router.push(`/problems/${next.id}`)}
          disabled={!next}
          title={next?.title ?? ""}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800
            disabled:text-gray-200 disabled:cursor-not-allowed px-2.5 py-1.5
            rounded-lg hover:bg-gray-100 transition-all"
        >
          다음 →
        </button>
      </div>

    </header>
  );
}
