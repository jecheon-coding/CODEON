"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Group, Panel, Separator } from "react-resizable-panels";
import {
  ChevronLeft, ChevronRight,
  Sun, Moon, RotateCcw,
  Heart, Flame, Flag, Users,
} from "lucide-react";
import { Problem, AdjacentProblem, SubmissionStatus, ReactionType, ReactionCount, REACTION_TYPES } from "@/types/problem";
import { supabase } from "@/lib/supabase";
import {
  ProblemUserState, calcUserStatus, USER_STATUS_BADGE,
  type SubmissionSummaryRow,
} from "@/lib/submissionStatus";
import ProblemDescription from "@/components/problem/ProblemDescription";
import ProblemExamples    from "@/components/problem/ProblemExamples";
import CodeEditor         from "@/components/problem/CodeEditor";
import HintPanel          from "@/components/problem/HintPanel";

type VoteCounts = Record<1 | 2 | 3, number>;

const VOTE_LABELS: Record<1 | 2 | 3, string> = { 1: "쉬워요", 2: "보통이에요", 3: "어려워요" };

function maskName(name: string | null): string {
  if (!name) return "학생";
  if (name.length <= 1) return name + "*";
  return name.slice(0, 2) + "*".repeat(Math.max(1, name.length - 2));
}

// ── 커뮤니티 패널 (도전 문제 전용) ────────────────────────────────────────────
function CommunityPanel({
  problem, isDark, userId, isSolved,
}: {
  problem:  Problem;
  isDark:   boolean;
  userId:   string | null;
  isSolved: boolean;
}) {
  const D = (dark: string, light: string) => isDark ? dark : light;

  const [isLiked,    setIsLiked]    = useState(false);
  const [likeCount,  setLikeCount]  = useState(problem.like_count ?? 0);
  const [myRating,   setMyRating]   = useState<1 | 2 | 3 | null>(null);
  const [voteCounts, setVoteCounts] = useState<VoteCounts>({ 1: 0, 2: 0, 3: 0 });
  const [reactionCounts, setReactionCounts] = useState<ReactionCount>({
    "재밌어요": 0, "설명이 좋아요": 0, "창의적이에요": 0, "헷갈려요": 0,
  });
  const [myReactions, setMyReactions] = useState<Set<ReactionType>>(new Set());
  const [authorName,  setAuthorName]  = useState<string | null>(problem.author_name ?? null);

  const { data: sessionData } = useSession();
  const currentUserId = userId ?? (sessionData?.user as { id?: string })?.id ?? null;

  useEffect(() => {
    if (!currentUserId) return;
    ;(async () => {
      const { supabase: sb } = await import("@/lib/supabase");

      const [likeRes, ratingsRes, reactionsRes] = await Promise.all([
        sb.from("problem_likes")
          .select("problem_id")
          .eq("problem_id", problem.id)
          .eq("user_id", currentUserId)
          .maybeSingle(),
        sb.from("problem_ratings")
          .select("difficulty_score, user_id")
          .eq("problem_id", problem.id),
        sb.from("problem_reactions")
          .select("reaction_type, user_id")
          .eq("problem_id", problem.id),
      ]);

      setIsLiked(!!likeRes.data);

      const counts: VoteCounts = { 1: 0, 2: 0, 3: 0 };
      for (const r of ratingsRes.data ?? []) {
        const s = r.difficulty_score as 1 | 2 | 3;
        if (s in counts) counts[s]++;
        if (r.user_id === currentUserId) setMyRating(s);
      }
      setVoteCounts(counts);

      const tally: ReactionCount = {
        "재밌어요": 0, "설명이 좋아요": 0, "창의적이에요": 0, "헷갈려요": 0,
      };
      const mine = new Set<ReactionType>();
      for (const r of reactionsRes.data ?? []) {
        tally[r.reaction_type as ReactionType]++;
        if (r.user_id === currentUserId) mine.add(r.reaction_type as ReactionType);
      }
      setReactionCounts(tally);
      setMyReactions(mine);

      if (problem.author_user_id && !problem.author_name) {
        const { data: author } = await sb
          .from("users").select("name").eq("id", problem.author_user_id!).single();
        if (author) setAuthorName(author.name);
      }
    })();
  }, [currentUserId, problem.id]);

  async function handleLike() {
    if (!currentUserId) return;
    const was = isLiked;
    setIsLiked(!was);
    setLikeCount(n => n + (was ? -1 : 1));
    await fetch("/api/challenge/like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problemId: problem.id }),
    });
  }

  async function handleRate(score: 1 | 2 | 3) {
    if (!currentUserId || !isSolved) return;
    const prev = myRating;
    setMyRating(score);
    setVoteCounts(c => {
      const next = { ...c, [score]: c[score] + 1 };
      if (prev) next[prev] = Math.max(0, next[prev] - 1);
      return next;
    });
    const res = await fetch("/api/challenge/rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problemId: problem.id, score }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.voteCounts) setVoteCounts(data.voteCounts);
    }
  }

  async function handleReact(rt: ReactionType) {
    if (!currentUserId) return;
    const was = myReactions.has(rt);
    setMyReactions(prev => { const next = new Set(prev); was ? next.delete(rt) : next.add(rt); return next; });
    setReactionCounts(prev => ({ ...prev, [rt]: prev[rt] + (was ? -1 : 1) }));
    await fetch("/api/challenge/react", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problemId: problem.id, reactionType: rt }),
    });
  }

  const totalVotes = voteCounts[1] + voteCounts[2] + voteCounts[3];

  return (
    <section className={`rounded-xl border overflow-hidden
      ${D("border-slate-700/60", "border-orange-100")}`}>

      {/* 헤더 */}
      <div className={`px-4 py-2.5 border-b flex items-center justify-between
        ${D("bg-slate-800 border-slate-700", "bg-orange-50 border-orange-100")}`}>
        <span className={`flex items-center gap-1.5 text-[11px] font-bold
          ${D("text-orange-400", "text-orange-500")}`}>
          <Users className="w-3 h-3" />
          학생 제작
        </span>
        {problem.is_community && authorName ? (
          <span className={`text-xs ${D("text-slate-400", "text-gray-500")}`}>
            by {maskName(authorName)}
          </span>
        ) : !problem.is_community ? (
          <span className={`flex items-center gap-1 text-[11px] font-semibold
            ${D("text-amber-400", "text-amber-600")}`}>
            <Flame className="w-3 h-3" /> 공식
          </span>
        ) : null}
      </div>

      <div className={`px-4 py-3 flex flex-col gap-3
        ${D("bg-slate-900/60", "bg-white")}`}>

        {/* 좋아요 — 항상 표시 */}
        <button
          onClick={handleLike}
          disabled={!currentUserId}
          className={`flex items-center gap-2 text-sm font-semibold py-1.5 px-3 rounded-lg
            transition-all w-fit
            ${isLiked
              ? D("text-rose-400 bg-rose-900/30", "text-rose-500 bg-rose-50")
              : D("text-slate-400 hover:text-rose-400 hover:bg-rose-900/20",
                  "text-gray-400 hover:text-rose-400 hover:bg-rose-50")}`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
          좋아요 {likeCount}
        </button>

        {/* 정답 후에만 표시 */}
        {isSolved ? (
          <>
            {/* 난이도 투표 (하/중/상) */}
            <div>
              <p className={`text-[11px] font-semibold mb-1.5
                ${D("text-slate-500", "text-gray-500")}`}>
                난이도 평가
                {totalVotes > 0 && (
                  <span className={`ml-1.5 font-normal ${D("text-slate-600", "text-gray-400")}`}>
                    ({totalVotes}명 참여)
                  </span>
                )}
              </p>
              <div className="flex gap-1.5">
                {([1, 2, 3] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => handleRate(s)}
                    className={`flex-1 flex flex-col items-center py-2 px-1 rounded-xl border text-xs
                      font-semibold transition-all
                      ${myRating === s
                        ? s === 1
                          ? D("bg-emerald-900/40 text-emerald-400 border-emerald-700",
                              "bg-emerald-50 text-emerald-600 border-emerald-300")
                          : s === 2
                          ? D("bg-amber-900/40 text-amber-400 border-amber-700",
                              "bg-amber-50 text-amber-600 border-amber-300")
                          : D("bg-rose-900/40 text-rose-400 border-rose-700",
                              "bg-rose-50 text-rose-600 border-rose-300")
                        : D("border-slate-700 text-slate-400 hover:border-slate-500",
                            "border-gray-200 text-gray-500 hover:border-gray-300")}`}
                  >
                    <span>{VOTE_LABELS[s]}</span>
                    {voteCounts[s] > 0 && (
                      <span className="text-[10px] opacity-70 mt-0.5">{voteCounts[s]}명</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 반응 태그 */}
            <div>
              <p className={`text-[11px] font-semibold mb-1.5
                ${D("text-slate-500", "text-gray-500")}`}>반응</p>
              <div className="flex flex-wrap gap-1.5">
                {REACTION_TYPES.map(rt => {
                  const active = myReactions.has(rt);
                  return (
                    <button
                      key={rt}
                      onClick={() => handleReact(rt)}
                      disabled={!currentUserId}
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-full border
                        transition-all
                        ${active
                          ? D("bg-amber-900/30 text-amber-300 border-amber-700/50",
                              "bg-amber-50 text-amber-700 border-amber-200")
                          : D("text-slate-500 border-slate-700 hover:border-amber-600/50 hover:text-amber-400",
                              "text-gray-500 border-gray-200 hover:border-amber-200 hover:text-amber-600")}`}
                    >
                      {rt}{reactionCounts[rt] > 0 && (
                        <span className="opacity-70 ml-1">{reactionCounts[rt]}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 신고 */}
            <div className={`pt-1 border-t border-dashed
              ${D("border-slate-800", "border-gray-100")}`}>
              <button className={`flex items-center gap-1 text-[10px]
                ${D("text-slate-600 hover:text-slate-400", "text-gray-300 hover:text-gray-500")}
                transition-colors`}>
                <Flag className="w-3 h-3" />
                신고하기
              </button>
            </div>
          </>
        ) : (
          <p className={`text-[11px] ${D("text-slate-600", "text-gray-400")}`}>
            정답을 맞히면 난이도 평가와 반응을 남길 수 있어요.
          </p>
        )}

      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  problem: Problem;
  prev:    AdjacentProblem;
  next:    AdjacentProblem;
}

const CATEGORY_SLUG: Record<string, string> = {
  파이썬기초: "basic", 파이썬알고리즘: "algorithm",
  파이썬자격증: "certificate", 파이썬실전: "practical", 파이썬도전: "challenge",
};
const DIFF_BADGE: Record<string, string> = {
  하: "bg-emerald-100 text-emerald-700",
  중: "bg-amber-100  text-amber-700",
  상: "bg-rose-100   text-rose-700",
};

export default function ProblemPageClient({ problem, prev, next }: Props) {
  const router             = useRouter();
  const { data: session }  = useSession();

  const [code,        setCode]        = useState(problem.initial_code ?? "");
  const [status,      setStatus]      = useState<SubmissionStatus>("");
  const [userState,   setUserState]   = useState<ProblemUserState>({ status: "미제출", count: 0 });
  const [isDark,      setIsDark]      = useState(false);
  const [clearSignal, setClearSignal] = useState(0);
  const [testInput,    setTestInput]    = useState("");
  const [inputOpen,    setInputOpen]    = useState(false);
  const [flashSignal,  setFlashSignal]  = useState(0);

  const userId     = (session?.user as { id?: string })?.id ?? null;
  const isSolved   = userState.status === "정답";
  const isChallenge = problem.category === "파이썬도전";

  useEffect(() => {
    if (localStorage.getItem("codeon-theme") === "dark") setIsDark(true);
  }, []);

  useEffect(() => {
    const userId = (session?.user as any)?.id as string | undefined;
    console.log("[문제진입] user_id:", userId ?? "(없음)", "| problem_id:", problem.id);
    if (!userId) return;

    (async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select("problem_id, is_correct")
        .eq("user_id", userId)
        .eq("problem_id", problem.id);

      console.log("[문제진입] 조회 결과:", data ?? [], "| error:", error?.message ?? null);
      if (error) { console.warn("[ProblemPageClient] 제출 기록 조회 실패:", error.message); return; }
      setUserState(calcUserStatus((data ?? []) as SubmissionSummaryRow[]));
    })();
  }, [session, problem.id]);

  const toggleDark = () =>
    setIsDark((v) => {
      const next = !v;
      localStorage.setItem("codeon-theme", next ? "dark" : "light");
      return next;
    });

  const handleSubmitResult = (s: SubmissionStatus) => {
    setStatus(s);
    setUserState((prev) => {
      const newCount = prev.count + 1;
      if (s === "correct") return { status: "정답", count: newCount };
      if (prev.status === "정답") return { ...prev, count: newCount };
      return { status: "시도중", count: newCount };
    });
    if (s === "correct") router.refresh();
  };

  const handleSendToInput = (text: string) => {
    setTestInput(text);
    setInputOpen(true);
    setFlashSignal((n) => n + 1);
  };

  const slug = CATEGORY_SLUG[problem.category] ?? "basic";
  const D    = (dark: string, light: string) => (isDark ? dark : light);

  return (
    <div className={`h-screen flex flex-col overflow-hidden ${D("bg-slate-950", "bg-gray-100")}`}>

      {/* ══ HEADER ══ */}
      <header className={`h-14 shrink-0 z-10 border-b
        ${D("bg-slate-800 border-slate-700", "bg-white border-gray-200")}`}>
        <div className="h-full max-w-[1720px] mx-auto px-5 flex items-center gap-2.5">

          {/* 목록으로 */}
          <button
            onClick={() => router.push(`/course/${slug}`)}
            className={`flex items-center gap-0.5 text-sm px-2.5 py-1.5 rounded-lg
              transition-colors duration-150 shrink-0 font-medium
              ${D("text-slate-400 hover:text-slate-100 hover:bg-slate-700",
                  "text-gray-500 hover:text-gray-800 hover:bg-gray-100")}`}
          >
            <ChevronLeft size={14} strokeWidth={2.5} />
            목록으로
          </button>

          <div className={`w-px h-4 shrink-0 ${D("bg-slate-700", "bg-gray-200")}`} />

          <h1 className={`text-sm font-semibold truncate flex-1 min-w-0
            ${D("text-slate-200", "text-gray-800")}`}>
            {problem.title}
          </h1>

          <div className={`w-px h-4 shrink-0 ${D("bg-slate-700", "bg-gray-200")}`} />

          {/* 초기화 */}
          <button
            onClick={() => setClearSignal((n) => n + 1)}
            title="코드 초기화"
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg
              font-medium transition-colors duration-150 shrink-0
              ${D("text-slate-400 hover:text-slate-100 hover:bg-slate-700",
                  "text-gray-500 hover:text-gray-800 hover:bg-gray-100")}`}
          >
            <RotateCcw size={12} /> 초기화
          </button>

          {/* 이전 / 다음 */}
          <div className="flex items-center gap-2 shrink-0">
            {([
              { adj: prev, label: "이전", icon: <ChevronLeft size={13} />, dir: "prev" },
              { adj: next, label: "다음", icon: <ChevronRight size={13} />, dir: "next" },
            ] as const).map(({ adj, label, icon, dir }) => (
              <button
                key={dir}
                onClick={() => adj && router.push(`/problems/${adj.id}`)}
                disabled={!adj}
                title={adj?.title}
                className={`flex items-center gap-0.5 text-xs px-2 py-1.5 rounded-lg
                  transition-colors duration-150 font-medium
                  ${adj
                    ? D("text-slate-400 hover:text-slate-100 hover:bg-slate-700",
                        "text-gray-500 hover:text-gray-800 hover:bg-gray-100")
                    : D("text-slate-700 cursor-not-allowed", "text-gray-250 cursor-not-allowed opacity-30")}`}
              >
                {dir === "prev" && icon}{label}{dir === "next" && icon}
              </button>
            ))}
          </div>

          {/* 다크모드 토글 */}
          <button
            onClick={toggleDark}
            aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
            className={`w-8 h-8 flex items-center justify-center rounded-lg
              transition-colors duration-150 shrink-0
              ${D("text-slate-400 hover:text-yellow-300 hover:bg-slate-700",
                  "text-gray-400 hover:text-indigo-500 hover:bg-gray-100")}`}
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </header>

      {/* ══ BODY ══ */}
      <div className="flex-1 min-h-0 flex justify-center">
        <div className="flex-1 min-h-0 max-w-[1720px] w-full flex flex-col">
          <Group orientation="horizontal" className="flex-1 min-h-0">

            <Panel id="left" defaultSize="40%" minSize="25%" maxSize="52%">
              <div className={`h-full overflow-y-auto ${D("bg-slate-900", "bg-gray-50")}`}>
                <div className="px-6 py-6 flex flex-col gap-8">
                  <ProblemDescription problem={problem} isDark={isDark} />
                  <ProblemExamples
                    problem={problem}
                    isDark={isDark}
                    onSendToInput={handleSendToInput}
                  />
                  {isChallenge && (
                    <CommunityPanel
                      problem={problem}
                      isDark={isDark}
                      userId={userId}
                      isSolved={isSolved}
                    />
                  )}
                </div>
              </div>
            </Panel>

            <Separator
              id="resize-handle"
              style={{ width: "8px" }}
              className="group relative flex items-center justify-center cursor-col-resize"
            >
              <div className={`w-[3px] h-full rounded-full transition-all duration-150
                group-hover:bg-blue-500 group-hover:shadow-[0_0_8px_2px_rgba(59,130,246,0.4)]
                ${isDark ? "bg-slate-700" : "bg-gray-300"}`} />
            </Separator>

            <Panel id="right" defaultSize="60%" minSize="46%" maxSize="75%">
              <div className={`h-full flex flex-col ${D("bg-slate-900", "bg-gray-50")}`}>

                <div className="flex-1 min-h-0 p-4 pb-2">
                  <CodeEditor
                    problem={problem}
                    isDark={isDark}
                    clearSignal={clearSignal}
                    testInput={testInput}
                    onTestInputChange={setTestInput}
                    inputOpen={inputOpen}
                    onInputOpenChange={setInputOpen}
                    flashSignal={flashSignal}
                    onCodeChange={setCode}
                    onSubmitResult={handleSubmitResult}
                    onNextProblem={next ? () => router.push(`/problems/${next.id}`) : undefined}
                  />
                </div>

                <div className="shrink-0 px-4 pb-4">
                  <HintPanel
                    problem={problem}
                    code={code}
                    submissionStatus={status}
                    isDark={isDark}
                  />
                </div>

              </div>
            </Panel>

          </Group>
        </div>
      </div>

    </div>
  );
}
