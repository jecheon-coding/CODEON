"use client";

import { useRouter } from "next/navigation";
import { AdjacentProblem } from "@/types/problem";

interface Props {
  prev: AdjacentProblem;
  next: AdjacentProblem;
  category: string; // 목록으로 돌아갈 course slug
}

// category → slug 매핑 (courseMeta와 동일 기준)
const CATEGORY_SLUG: Record<string, string> = {
  파이썬기초:    "basic",
  파이썬알고리즘: "algorithm",
  파이썬자격증:  "certificate",
  파이썬실전:    "practical",
  파이썬도전:    "challenge",
};

export default function ProblemNavigation({ prev, next, category }: Props) {
  const router = useRouter();
  const slug   = CATEGORY_SLUG[category] ?? "basic";

  return (
    <div className="flex items-center justify-between gap-2 pt-2">
      {/* 이전 문제 */}
      <button
        onClick={() => prev && router.push(`/problems/${prev.id}`)}
        disabled={!prev}
        className="flex items-center gap-1.5 text-sm text-gray-500
          hover:text-gray-800 disabled:text-gray-200 disabled:cursor-not-allowed
          transition-colors"
      >
        ← <span className="truncate max-w-[120px]">{prev?.title ?? "이전 문제"}</span>
      </button>

      {/* 목록으로 */}
      <button
        onClick={() => router.push(`/course/${slug}`)}
        className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200
          px-3 py-1.5 rounded-lg hover:border-gray-300 transition-all"
      >
        목록
      </button>

      {/* 다음 문제 */}
      <button
        onClick={() => next && router.push(`/problems/${next.id}`)}
        disabled={!next}
        className="flex items-center gap-1.5 text-sm text-gray-500
          hover:text-gray-800 disabled:text-gray-200 disabled:cursor-not-allowed
          transition-colors"
      >
        <span className="truncate max-w-[120px]">{next?.title ?? "다음 문제"}</span> →
      </button>
    </div>
  );
}
