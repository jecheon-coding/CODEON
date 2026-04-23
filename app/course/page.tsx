"use client";

import { useRouter } from "next/navigation";

const STAGES = [
  { id: "basic", label: "기초" },
  { id: "algorithm", label: "알고리즘" },
  { id: "certificate", label: "자격증" },
  { id: "practical", label: "실전" },
  { id: "challenge", label: "도전" },
];

const COURSES = [
  {
    id: "basic",
    emoji: "🌱",
    title: "기초 과정",
    description: "파이썬의 기본 문법과 코딩의 기초를 다집니다.",
  },
  {
    id: "algorithm",
    emoji: "💡",
    title: "알고리즘 과정",
    description: "효율적인 코딩을 위한 핵심 알고리즘을 배웁니다.",
  },
  {
    id: "certificate",
    emoji: "🏆",
    title: "자격증 과정",
    description: "코딩 자격증 취득을 준비합니다.",
  },
  {
    id: "practical",
    emoji: "🚀",
    title: "실전 문제",
    description: "실제 코딩 테스트 유형의 문제로 실력을 검증합니다.",
  },
  {
    id: "challenge",
    emoji: "🔥",
    title: "도전 문제",
    description: "최고난도 문제에 도전하며 한계를 뛰어넘으세요.",
  },
];

const CURRENT_STAGE = "basic";

export default function ProblemsPage() {
  const router = useRouter();

  const currentIndex = STAGES.findIndex((s) => s.id === CURRENT_STAGE);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-16 px-4">
      {/* 제목 */}
      <h1 className="text-3xl font-bold text-gray-800 mb-2">과정 선택</h1>
      <p className="text-gray-500 mb-12">학습할 과정을 선택하세요.</p>

      {/* 학습 단계 로드맵 */}
      <div className="flex items-center mb-16">
        {STAGES.map((stage, index) => {
          const isActive = index === currentIndex;
          const isPast = index < currentIndex;

          return (
            <div key={stage.id} className="flex items-center">
              {/* 원 + 텍스트 */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all
                    ${isActive ? "bg-green-500 text-white ring-4 ring-green-200" : ""}
                    ${isPast ? "bg-green-300 text-white" : ""}
                    ${!isActive && !isPast ? "bg-gray-200 text-gray-400" : ""}
                  `}
                >
                  {isPast ? "✓" : index + 1}
                </div>
                <span
                  className={`mt-2 text-xs font-medium ${
                    isActive ? "text-green-600" : isPast ? "text-green-400" : "text-gray-400"
                  }`}
                >
                  {stage.label}
                  {isActive && (
                    <span className="ml-1 text-green-500 font-semibold">●</span>
                  )}
                </span>
              </div>

              {/* 연결선 */}
              {index < STAGES.length - 1 && (
                <div
                  className={`w-16 h-1 mx-2 mb-5 rounded ${
                    index < currentIndex ? "bg-green-300" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* 과정 선택 카드 */}
      <div className="flex flex-wrap justify-center gap-6 max-w-4xl">
        {COURSES.map((course) => (
          <div
            key={course.id}
            onClick={() => router.push(`/course/${course.id}`)}
            className="bg-white rounded-2xl shadow-md p-8 w-64 flex flex-col items-center text-center
              cursor-pointer transition-transform duration-200 hover:scale-105 hover:shadow-xl"
          >
            <span className="text-5xl mb-4">{course.emoji}</span>
            <h2 className="text-lg font-bold text-gray-800 mb-2">{course.title}</h2>
            <p className="text-sm text-gray-500 leading-relaxed">{course.description}</p>
            <div className="mt-6 w-full">
              <span className="inline-block bg-blue-50 text-blue-600 text-xs font-semibold px-4 py-1.5 rounded-full">
                시작하기 →
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
