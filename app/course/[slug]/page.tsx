"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  LayoutGrid, ChevronRight,
  Sprout, BrainCircuit, Award, Flame, ShieldCheck,
  CheckCircle2, CircleDot, Circle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  ProblemUserState, buildProblemStatusMap, USER_STATUS_BADGE,
  type SubmissionSummaryRow,
} from "@/lib/submissionStatus";

// ── 타입 ──────────────────────────────────────────────────────────────────────
type Problem = {
  id: string;
  title: string;
  difficulty: string;
  topic: string | null;
  content: string;
};

// ── 상수 ──────────────────────────────────────────────────────────────────────
const COURSE_META: Record<string, {
  Icon: LucideIcon; iconBg: string; iconColor: string;
  label: string; description: string; category: string;
}> = {
  basic:       { Icon: Sprout,       iconBg: "bg-green-50",  iconColor: "text-green-500",  label: "기초 과정",    description: "파이썬의 기본 문법과 코딩의 기초를 다집니다.",      category: "파이썬기초"    },
  algorithm:   { Icon: BrainCircuit, iconBg: "bg-violet-50", iconColor: "text-violet-500", label: "알고리즘 과정", description: "효율적인 코딩을 위한 핵심 알고리즘을 배웁니다.",    category: "파이썬알고리즘" },
  certificate: { Icon: Award,        iconBg: "bg-amber-50",  iconColor: "text-amber-500",  label: "자격증 과정",  description: "코딩 자격증 취득 대비",        category: "파이썬자격증"  },
  practical:   { Icon: ShieldCheck,  iconBg: "bg-blue-50",   iconColor: "text-blue-500",   label: "실전 문제",    description: "실제 코딩 테스트 유형의 문제로 실력을 검증합니다.", category: "파이썬실전"    },
  challenge:   { Icon: Flame,        iconBg: "bg-orange-50", iconColor: "text-orange-500", label: "도전 문제",    description: "최고난도 문제에 도전하며 한계를 뛰어넘으세요.",     category: "파이썬도전"    },
};

const DIFF: Record<string, { label: string; time: string; cls: string }> = {
  하: { label: "입문", time: "2분",  cls: "bg-emerald-50 text-emerald-700 border border-emerald-100" },
  중: { label: "중급", time: "5분",  cls: "bg-amber-50  text-amber-700  border border-amber-100"  },
  상: { label: "고급", time: "10분", cls: "bg-rose-50   text-rose-700   border border-rose-100"   },
};

// 왼쪽 상태 아이콘 시스템 — Circle → CircleDot → CheckCircle2
const STATUS_ICON: Record<string, { Icon: LucideIcon; cls: string }> = {
  미제출: { Icon: Circle,       cls: "text-gray-300" },
  시도중: { Icon: CircleDot,    cls: "text-amber-400" },
  정답:   { Icon: CheckCircle2, cls: "text-emerald-500" },
};

// ── 문제 카드 (3-zone 압축형) ─────────────────────────────────────────────────
function ProblemCard({
  problem, index, userState, onClick,
}: {
  problem:   Problem;
  index:     number;
  userState: ProblemUserState;
  onClick:   () => void;
}) {
  const diff      = DIFF[problem.difficulty];
  const uiBadge   = USER_STATUS_BADGE[userState.status];
  const { Icon: StatusIcon, cls: statusIconCls } = STATUS_ICON[userState.status];

  return (
    <div
      onClick={onClick}
      className="group bg-white border border-gray-100 rounded-xl px-4 py-2.5
        flex items-center gap-3 cursor-pointer select-none shadow-sm
        hover:border-indigo-300 hover:shadow-md
        transition-all duration-150"
    >
      {/* 왼쪽: 상태 아이콘 */}
      <StatusIcon
        className={`w-5 h-5 shrink-0 transition-colors duration-150 ${statusIconCls}
          ${userState.status === "미제출" ? "group-hover:text-indigo-300" : ""}`}
        strokeWidth={userState.status === "정답" ? 2 : 1.75}
      />

      {/* 가운데: 제목 + 설명 + 메타 */}
      <div className="flex-1 min-w-0">
        <p className="text-base font-bold text-slate-800 truncate
          group-hover:text-indigo-700 transition-colors duration-150">
          {problem.title}
        </p>
        <p className="text-xs text-slate-600 truncate leading-tight mt-0.5">
          {problem.content.slice(0, 70)}
        </p>
        {(problem.topic || diff) && (
          <div className="flex items-center gap-1.5 mt-1">
            {problem.topic && (
              <span className="text-[11px] bg-indigo-50 text-indigo-400 px-1.5 py-0.5
                rounded-md font-medium leading-none">
                {problem.topic}
              </span>
            )}
            {diff && (
              <span className="text-[11px] text-slate-400/70 leading-none">
                예상 {diff.time}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 오른쪽: 난이도 + 상태 가로 배치, 제출수 하단 */}
      <div className="flex flex-col items-end gap-1 shrink-0 min-w-[96px]">
        <div className="flex items-center gap-1 flex-wrap justify-end">
          {diff && (
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md
              whitespace-nowrap leading-snug ${diff.cls}`}>
              {diff.label}
            </span>
          )}
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md
            whitespace-nowrap leading-snug ${uiBadge.cls}`}>
            {uiBadge.label}
          </span>
        </div>
        {userState.count > 0 && (
          <span className="text-[10px] text-slate-400 leading-none tabular-nums">
            {userState.count}회 제출
          </span>
        )}
      </div>
    </div>
  );
}

// ── 왼쪽 InfoPanel ────────────────────────────────────────────────────────────
function InfoPanel({
  meta, problems, statusMap, onContinue,
}: {
  meta:       (typeof COURSE_META)[string];
  problems:   Problem[];
  statusMap:  Record<string, ProblemUserState>;
  onContinue: () => void;
}) {
  const getStatus = (id: string) => statusMap[id]?.status ?? "미제출";

  const total      = problems.length;
  const done       = problems.filter((p) => getStatus(p.id) === "정답").length;
  const inProgress = problems.filter((p) => getStatus(p.id) === "시도중").length;
  const notStarted = problems.filter((p) => getStatus(p.id) === "미제출").length;
  const pct        = total > 0 ? Math.round((done / total) * 100) : 0;

  const nextProblem =
    problems.find((p) => getStatus(p.id) === "시도중") ??
    problems.find((p) => getStatus(p.id) === "미제출") ??
    problems[0];

  const { Icon, iconBg, iconColor } = meta;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">

      {/* 과정 헤더 */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-3 mb-2.5">
          <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center shrink-0`}>
            <Icon className={`w-5 h-5 ${iconColor}`} strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-snug">{meta.label}</h1>
            <p className="text-xs text-gray-400 mt-0.5">전체 {total}문제</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">{meta.description}</p>
      </div>

      <hr className="border-gray-100" />

      {/* 진행률 */}
      <div className="px-5 py-4">
        <div className="flex justify-between items-baseline mb-1.5">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
            진행률
          </span>
          <span className="text-sm font-extrabold text-indigo-600 tabular-nums">
            {done}
            <span className="text-xs font-semibold text-gray-400"> / {total} 완료</span>
          </span>
        </div>
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[11px] text-gray-300 mt-1 text-right tabular-nums">{pct}%</p>
      </div>

      <hr className="border-gray-100" />

      {/* 학습 현황 */}
      <div className="px-5 py-4">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2.5">
          학습 현황
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: "완료",   val: done,       bg: "bg-emerald-50/50", txt: "text-emerald-500", sub: "text-emerald-400/70" },
            { label: "진행중", val: inProgress, bg: "bg-amber-50/50",   txt: "text-amber-400",   sub: "text-amber-400/70"   },
            { label: "미완료", val: notStarted, bg: "bg-gray-50",       txt: "text-gray-400",    sub: "text-gray-400/70"    },
          ].map(({ label, val, bg, txt, sub }) => (
            <div key={label} className={`${bg} rounded-xl py-2.5 text-center`}>
              <p className={`text-lg font-bold leading-none ${txt}`}>{val}</p>
              <p className={`text-[11px] mt-1 ${sub}`}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* 이어하기 */}
      <div className="px-5 py-4">
        {nextProblem && (
          <p className="text-[11px] text-gray-400 mb-2 flex items-center gap-1.5 leading-relaxed">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block shrink-0" />
            다음:&nbsp;
            <span className="text-gray-600 font-medium truncate">{nextProblem.title}</span>
          </p>
        )}
        <button
          onClick={onContinue}
          disabled={total === 0}
          className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]
            disabled:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed
            text-white font-semibold py-2.5 rounded-xl
            transition-all duration-150 text-sm"
        >
          {total === 0 ? "등록된 문제 없음" : "이어하기 →"}
        </button>
      </div>
    </div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────
export default function CourseProblemListPage() {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();
  const meta = COURSE_META[slug];
  const { data: session, status } = useSession();

  const [problems,  setProblems]  = useState<Problem[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, ProblemUserState>>({});
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const [search,     setSearch]     = useState("");
  const [diffFilter, setDiffFilter] = useState<"전체" | "하" | "중" | "상">("전체");
  const [topicTab,   setTopicTab]   = useState("전체");

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (!meta) return;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("problems")
        .select("id, title, difficulty, topic, content")
        .eq("category", meta.category)
        .order("id");
      if (error) setError("문제를 불러오는 중 오류가 발생했습니다.");
      else        setProblems(data ?? []);
      setLoading(false);
    })();
  }, [slug, meta]);

  useEffect(() => {
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId || problems.length === 0) {
      setStatusMap(buildProblemStatusMap(problems.map((p) => p.id), []));
      return;
    }
    (async () => {
      const { data: subs, error } = await supabase
        .from("submissions")
        .select("problem_id, is_correct, created_at")
        .eq("user_id", userId);
      if (error) {
        setStatusMap(buildProblemStatusMap(problems.map((p) => p.id), []));
        return;
      }

      setStatusMap(buildProblemStatusMap(
        problems.map((p) => p.id),
        (subs ?? []) as SubmissionSummaryRow[],
      ));

      // 가장 최근 정답 문제의 topic으로 탭 자동 설정
      const lastCorrect = (subs ?? [])
        .filter((s): s is { problem_id: string; is_correct: boolean; created_at: string } =>
          s.is_correct === true && !!s.created_at
        )
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

      if (lastCorrect) {
        const lastProblem = problems.find(p => p.id === lastCorrect.problem_id);
        if (lastProblem?.topic) {
          setTopicTab(lastProblem.topic);
        }
      }
    })();
  }, [session, problems]);

  const topicTabs = useMemo(() => {
    const unique = [...new Set(problems.map((p) => p.topic).filter(Boolean))] as string[];
    return ["전체", ...unique];
  }, [problems]);

  const filtered = useMemo(() => problems.filter((p) => {
    const matchTopic  = topicTab   === "전체" || p.topic === topicTab;
    const matchDiff   = diffFilter === "전체" || p.difficulty === diffFilter;
    const matchSearch = p.title.includes(search);
    return matchTopic && matchDiff && matchSearch;
  }), [problems, topicTab, diffFilter, search]);

  const handleContinue = () => {
    const getStatus = (id: string) => statusMap[id]?.status ?? "미제출";
    const next =
      problems.find((p) => getStatus(p.id) === "시도중") ??
      problems.find((p) => getStatus(p.id) === "미제출") ??
      problems[0];
    if (next) router.push(`/problems/${next.id}`);
  };

  const isFiltered   = search || diffFilter !== "전체" || topicTab !== "전체";
  const resetFilters = () => { setSearch(""); setDiffFilter("전체"); setTopicTab("전체"); };

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">학습 정보 확인 중...</p>
        </div>
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        존재하지 않는 과정입니다.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">

        {/* 브레드크럼 */}
        <nav className="flex items-center gap-1.5 mb-5 mt-2">
          <LayoutGrid className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <Link
            href="/dashboard"
            className="text-sm text-gray-400 hover:text-indigo-500 transition-colors duration-150"
          >
            학습 홈
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
          <span className="text-sm text-gray-600 font-medium">{meta.label}</span>
        </nav>

        {/* 2컬럼 */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* ── 왼쪽 패널 ── */}
          <div className="w-full lg:w-68 xl:w-72 lg:sticky lg:top-8 shrink-0">
            <InfoPanel
              meta={meta}
              problems={problems}
              statusMap={statusMap}
              onContinue={handleContinue}
            />
          </div>

          {/* ── 오른쪽: 필터 + 목록 ── */}
          <div className="flex-1 min-w-0 flex flex-col gap-1.5">

            {/* ① 카테고리 탭 */}
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex min-w-max border-b border-gray-200">
                {topicTabs.map((tab) => {
                  const isActive = topicTab === tab;
                  const count = tab === "전체"
                    ? problems.length
                    : problems.filter((p) => p.topic === tab).length;
                  return (
                    <button
                      key={tab}
                      onClick={() => setTopicTab(tab)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 text-xs whitespace-nowrap
                        border-b-2 -mb-px transition-all duration-150
                        ${isActive
                          ? "border-indigo-600 text-indigo-600 font-bold"
                          : "border-transparent text-gray-500 font-medium hover:text-gray-800 hover:border-gray-300"
                        }`}
                    >
                      {tab}
                      <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-normal
                        ${isActive ? "bg-indigo-100 text-indigo-500" : "bg-gray-100 text-gray-400"}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ② 검색 + 난이도 필터 */}
            <div className="bg-white border border-gray-100 rounded-xl px-3.5 py-1.5
              flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center gap-2 flex-1">
                <svg className="w-3.5 h-3.5 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                    d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="문제 제목 검색..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 text-xs text-gray-700 placeholder-gray-300
                    bg-transparent focus:outline-none"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="text-gray-300 hover:text-gray-500 text-xs leading-none transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="hidden sm:block w-px h-4 bg-gray-100 shrink-0" />

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-gray-400 font-medium shrink-0">난이도</span>
                <div className="flex gap-0.5">
                  {(["전체", "하", "중", "상"] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDiffFilter(d)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold
                        transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
                        ${diffFilter === d
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-gray-500 hover:bg-gray-100 hover:text-gray-800 active:bg-gray-200"
                        }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ③ 문제 수 + 필터 초기화 */}
            {!loading && !error && (
              <div className="flex items-center justify-between px-0.5">
                <p className="text-[11px] font-semibold text-gray-400">
                  총 <span className="text-gray-700">{filtered.length}</span>개의 문제
                </p>
                {isFiltered && (
                  <button
                    onClick={resetFilters}
                    className="text-[11px] text-indigo-400 hover:text-indigo-600 transition-colors"
                  >
                    필터 초기화
                  </button>
                )}
              </div>
            )}

            {/* ④ 문제 리스트 */}
            {loading && (
              <div className="flex flex-col gap-1.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-[68px] bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            )}

            {!loading && error && (
              <div className="bg-red-50 border border-red-100 rounded-xl
                text-center text-red-400 text-sm py-10">
                {error}
              </div>
            )}

            {!loading && !error && filtered.length === 0 && (
              <div className="text-center text-gray-400 py-16">
                <p className="text-3xl mb-3">📭</p>
                <p className="text-sm">
                  {isFiltered ? "검색 결과가 없습니다." : "아직 등록된 문제가 없습니다."}
                </p>
                {isFiltered && (
                  <button
                    onClick={resetFilters}
                    className="mt-3 text-xs text-indigo-400 hover:text-indigo-600 underline"
                  >
                    필터 초기화
                  </button>
                )}
              </div>
            )}

            {!loading && !error && filtered.length > 0 && (
              <div className="flex flex-col gap-1">
                {filtered.map((problem, index) => (
                  <ProblemCard
                    key={problem.id}
                    problem={problem}
                    index={index}
                    userState={statusMap[problem.id] ?? { status: "미제출", count: 0 }}
                    onClick={() => router.push(`/problems/${problem.id}`)}
                  />
                ))}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
