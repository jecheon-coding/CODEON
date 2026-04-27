"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  LayoutGrid, ChevronRight, Flame, Heart, Users, Plus,
  Search, X, TrendingUp, Send, CheckCircle, AlertCircle, Target, Pencil,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Problem, MyCommunityStats } from "@/types/problem";
import { ProblemListContainer } from "@/components/problem/ProblemListItem";
import { PageLayout } from "@/components/ui/PageLayout";

// ── 타입 ─────────────────────────────────────────────────────────────────────
type ChallengeProb = Problem & {
  author_user_id:          string | null;
  is_community:            boolean;
  like_count:              number;
  solve_count:             number;
  community_difficulty_avg: number | null;
  author_name:             string | null;
  created_at:              string | null;
  status?:                 string;
  problem_type?:           string;
};

type TabValue    = "전체" | "인기" | "최신" | "친구 문제" | "내 문제" | "내가 푼 문제";
type DiffFilter  = "전체" | "하" | "중" | "상";
type ProblemType = "output" | "io";

// ── 상수 ─────────────────────────────────────────────────────────────────────
const DIFF_CLS: Record<string, string> = {
  하: "bg-emerald-50 text-emerald-700 border-emerald-100",
  중: "bg-amber-50  text-amber-700  border-amber-100",
  상: "bg-rose-50   text-rose-700   border-rose-100",
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending:   { label: "검토 대기", cls: "bg-amber-50 text-amber-600 border-amber-200" },
  published: { label: "공개됨",   cls: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  hidden:    { label: "숨김",     cls: "bg-gray-100 text-gray-500 border-gray-200" },
};

function maskName(name: string | null): string {
  if (!name) return "학생";
  if (name.length <= 1) return name + "*";
  return name.slice(0, 2) + "*".repeat(Math.max(1, name.length - 2));
}

function friendDiffLabel(avg: number | null): "하" | "중" | "상" | null {
  if (!avg) return null;
  if (avg < 1.5) return "하";
  if (avg <= 2.5) return "중";
  return "상";
}

function formatRelative(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)    return "방금";
  if (diff < 3600)  return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`;
  return new Date(dateStr).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

// ── 커뮤니티 문제 카드 ────────────────────────────────────────────────────────
function CommunityProblemCard({
  prob, likedSet, rank, showStatus, onClick, onLike,
}: {
  prob:       ChallengeProb;
  likedSet:   Set<string>;
  rank?:      number;
  showStatus?: boolean;
  onClick:    () => void;
  onLike:     (e: React.MouseEvent) => void;
}) {
  const liked   = likedSet.has(prob.id);
  const excerpt = prob.content.slice(0, 70) + (prob.content.length > 70 ? "…" : "");
  const isHot   = typeof rank === "number" && rank < 3 && (prob.like_count > 0 || prob.solve_count > 0);
  const diffLabel = friendDiffLabel(prob.community_difficulty_avg);
  const statusInfo = showStatus && prob.status ? STATUS_BADGE[prob.status] : null;

  return (
    <div
      onClick={onClick}
      className="group flex gap-3 cursor-pointer select-none transition-colors duration-100"
      style={{ padding: "10px 16px", borderBottom: "0.5px solid #E5E7EB" }}
      onMouseEnter={e => (e.currentTarget.style.background = "#F9F9FB")}
      onMouseLeave={e => (e.currentTarget.style.background = "")}
    >
      {/* 아바타 */}
      <div className="shrink-0 mt-0.5">
        {prob.is_community && prob.author_name ? (
          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 text-sm font-bold
            flex items-center justify-center">
            {prob.author_name.charAt(0)}
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center">
            <Flame className="w-4 h-4 text-orange-400" />
          </div>
        )}
      </div>

      {/* 본문 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          {!prob.is_community && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded
              bg-amber-50 text-amber-600 border border-amber-100">공식</span>
          )}
          {isHot && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded
              bg-rose-50 text-rose-500 border border-rose-100 flex items-center gap-0.5">
              <TrendingUp className="w-2.5 h-2.5" /> 인기
            </span>
          )}
          {statusInfo && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${statusInfo.cls}`}>
              {statusInfo.label}
            </span>
          )}
          <p className="text-sm font-bold text-slate-800 group-hover:text-orange-600
            transition-colors truncate">
            {prob.title}
          </p>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed mb-1.5 line-clamp-1">
          {excerpt}
        </p>

        {/* 하단 메타 + 좋아요/풀이 수 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            {prob.topic && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full
                bg-indigo-50 text-indigo-500 border border-indigo-100">
                {prob.topic}
              </span>
            )}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${DIFF_CLS[prob.difficulty] ?? ""}`}>
              {prob.difficulty}
            </span>
            {diffLabel && (
              <span className="text-[10px] text-gray-400">
                친구 평가: <span className="font-semibold text-gray-600">{diffLabel}</span>
              </span>
            )}
            {prob.is_community && prob.author_name && (
              <span className="text-[10px] text-gray-400">by {maskName(prob.author_name)}</span>
            )}
            {prob.created_at && (
              <span className="text-[10px] text-gray-300">{formatRelative(prob.created_at)}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0 text-[11px]">
            <button
              onClick={onLike}
              className={`flex items-center gap-0.5 transition-colors
                ${liked ? "text-rose-500" : "text-gray-400 hover:text-rose-400"}`}
            >
              <Heart className={`w-3 h-3 ${liked ? "fill-rose-500" : ""}`} />
              {prob.like_count}
            </button>
            <span className="text-gray-300">·</span>
            <span className="flex items-center gap-0.5 text-gray-400">
              <Users className="w-3 h-3" />{prob.solve_count}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 사이드바 ─────────────────────────────────────────────────────────────────
function CommunitySidebar({ stats, loading }: { stats: MyCommunityStats; loading: boolean }) {
  const countItems = [
    { label: "내가 만든",   value: stats.createdCount,  color: "text-orange-500"  },
    { label: "내가 푼",     value: stats.solvedCount,   color: "text-emerald-500" },
    { label: "받은 좋아요", value: stats.likesReceived, color: "text-rose-400"    },
  ];

  return (
    <aside className="w-56 shrink-0">
      <div className="sticky top-6 flex flex-col gap-3">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center">
              <Flame className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">도전 현황</p>
              <p className="text-[10px] text-gray-400">나의 커뮤니티 활동</p>
            </div>
          </div>
          {loading ? (
            <div className="flex flex-col gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 rounded-xl bg-gray-50 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-3 gap-2">
                {countItems.map(({ label, value, color }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-2 flex flex-col items-center gap-0.5">
                    <span className={`text-base font-extrabold ${color}`}>{value}</span>
                    <span className="text-[9px] text-gray-500 text-center leading-tight">{label}</span>
                  </div>
                ))}
              </div>
              <div className="bg-gray-50 rounded-xl px-3 py-2">
                <p className="text-[9px] text-gray-400 mb-0.5">이번 주 인기</p>
                <p className="text-xs font-bold text-amber-500 truncate">
                  {stats.weeklyHotName ?? "없음"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

// ── 빈 상태 ──────────────────────────────────────────────────────────────────
function EmptyState({ tab, onCreateClick, onTabChange }: {
  tab:           TabValue;
  onCreateClick: () => void;
  onTabChange:   (t: TabValue) => void;
}) {
  if (tab === "내가 푼 문제") return (
    <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
      <div className="flex justify-center mb-3"><Target className="w-10 h-10 text-gray-300" /></div>
      <p className="text-sm font-bold text-gray-700 mb-1">아직 풀어본 도전 문제가 없어요</p>
      <p className="text-xs text-gray-400 mb-4">도전 문제를 풀어보세요!</p>
      <button onClick={() => onTabChange("전체")}
        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs
          font-semibold rounded-xl transition-colors">
        도전 문제 보러가기
      </button>
    </div>
  );

  if (tab === "내 문제") return (
    <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
      <div className="flex justify-center mb-3"><Pencil className="w-10 h-10 text-gray-300" /></div>
      <p className="text-sm font-bold text-gray-700 mb-1">아직 만든 문제가 없어요</p>
      <p className="text-xs text-gray-400 mb-4">첫 번째 문제를 만들어보세요!</p>
      <button onClick={onCreateClick}
        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs
          font-semibold rounded-xl transition-colors">
        첫 문제 만들기
      </button>
    </div>
  );

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
      <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-3">
        <Flame className="w-7 h-7 text-orange-300" />
      </div>
      <p className="text-sm font-bold text-gray-700 mb-1">
        아직 등록된 도전 문제가 없어요
      </p>
      <p className="text-xs text-gray-400 mb-5 leading-relaxed">
        첫 번째 문제를 만들어<br />친구들에게 도전장을 보내보세요!
      </p>
      <button onClick={onCreateClick}
        className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs
          font-semibold rounded-xl transition-colors">
        문제 만들기
      </button>
    </div>
  );
}

// ── 문제 만들기 모달 ─────────────────────────────────────────────────────────
type Difficulty = "하" | "중" | "상";

interface CreateForm {
  problem_type:       ProblemType;
  title:              string;
  content:            string;
  difficulty:         Difficulty;
  topic:              string;
  input_description:  string;
  output_description: string;
  constraints:        string;
  example_input:      string;
  example_output:     string;
  initial_code:       string;
  hint:               string;
}

const FORM_INIT: CreateForm = {
  problem_type:       "output",
  title:              "",
  content:            "",
  difficulty:         "중",
  topic:              "",
  input_description:  "",
  output_description: "",
  constraints:        "",
  example_input:      "",
  example_output:     "",
  initial_code:       "# 여기에 코드를 작성하세요\n",
  hint:               "",
};

const TYPE_OPTIONS: { value: ProblemType; label: string; desc: string }[] = [
  { value: "output", label: "출력 문제",    desc: "정해진 값을 출력 (입력 없음)" },
  { value: "io",     label: "입력/출력 문제", desc: "입력을 받아 처리 후 출력" },
];

function CreateModal({ onClose, onCreated }: {
  onClose:   () => void;
  onCreated: () => void;
}) {
  const [form,       setForm]       = useState<CreateForm>(FORM_INIT);
  const [errors,     setErrors]     = useState<Partial<Record<keyof CreateForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverErr,  setServerErr]  = useState("");
  const [success,    setSuccess]    = useState(false);

  const set = (k: keyof CreateForm) => (v: string) => setForm(p => ({ ...p, [k]: v }));

  function validate() {
    const e: Partial<Record<keyof CreateForm, string>> = {};
    if (form.title.trim().length < 5)
      e.title = "제목은 최소 5자 이상 입력하세요 (예: 별 3줄 출력하기)";
    if (form.content.trim().length < 20)
      e.content = "문제 설명은 최소 20자 이상 입력하세요";
    if (!form.example_output.trim())
      e.example_output = "출력 예시는 채점 기준입니다. 반드시 입력하세요";
    if (form.problem_type === "io" && !form.example_input.trim())
      e.example_input = "입력/출력 문제는 입력 예시가 필요합니다";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true); setServerErr("");
    try {
      const res  = await fetch("/api/challenge/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setServerErr(data.error ?? "오류가 발생했습니다"); return; }
      setSuccess(true);
      onCreated();
    } catch { setServerErr("네트워크 오류가 발생했습니다"); }
    finally   { setSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto
        bg-white rounded-2xl shadow-2xl flex flex-col">

        {/* 헤더 */}
        <div className="sticky top-0 z-10 flex items-center gap-3 px-5 py-4
          bg-white border-b border-gray-100 rounded-t-2xl">
          <div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center">
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-extrabold text-gray-900">문제 만들기</p>
            <p className="text-[11px] text-gray-400">친구들에게 도전장을 보내보세요</p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg
              text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 성공 상태 */}
        {success ? (
          <div className="flex flex-col items-center justify-center gap-4 p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <div>
              <p className="text-base font-extrabold text-gray-900 mb-1">
                검토 요청이 완료되었습니다
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                관리자 검토 후 공개됩니다.<br />
                검토 진행 상황은 <span className="font-semibold text-orange-500">내 문제</span> 탭에서 확인하세요.
              </p>
            </div>
            <button onClick={onClose}
              className="mt-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white
                text-sm font-bold rounded-xl transition-colors">
              닫기
            </button>
          </div>
        ) : (

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
          {serverErr && (
            <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50
              border border-rose-200 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {serverErr}
            </div>
          )}

          {/* 문제 유형 */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
              문제 유형 <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => setForm(p => ({ ...p, problem_type: opt.value }))}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left
                    transition-all
                    ${form.problem_type === opt.value
                      ? "border-orange-400 bg-orange-50"
                      : "border-gray-200 bg-white hover:bg-gray-50"}`}
                >
                  <span className={`text-xs font-bold mb-0.5
                    ${form.problem_type === opt.value ? "text-orange-600" : "text-gray-700"}`}>
                    {opt.label}
                  </span>
                  <span className="text-[10px] text-gray-400 leading-tight">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 제목 */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">
              제목 <span className="text-rose-500">*</span>
            </label>
            <input value={form.title} onChange={e => set("title")(e.target.value)}
              placeholder="예) 별 3줄 출력하기, 두 수의 합 구하기"
              className={`w-full px-3 py-2 text-sm border rounded-xl
                focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent
                ${errors.title ? "border-rose-300 bg-rose-50" : "border-gray-200"}`} />
            {errors.title && <p className="text-[11px] text-rose-500 mt-1">{errors.title}</p>}
          </div>

          {/* 난이도 + 주제 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                난이도 <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-1">
                {(["하","중","상"] as Difficulty[]).map(d => (
                  <button key={d} type="button"
                    onClick={() => setForm(p => ({ ...p, difficulty: d }))}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all
                      ${form.difficulty === d
                        ? d === "하" ? "bg-emerald-500 text-white border-emerald-500"
                        : d === "중" ? "bg-amber-500 text-white border-amber-500"
                        :              "bg-rose-500 text-white border-rose-500"
                        : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">주제 태그</label>
              <input value={form.topic} onChange={e => set("topic")(e.target.value)}
                placeholder="예: 출력, 반복문, 문자열"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent" />
            </div>
          </div>

          {/* 문제 설명 */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">
              문제 설명 <span className="text-rose-500">*</span>
            </label>
            <textarea value={form.content} onChange={e => set("content")(e.target.value)}
              rows={5}
              placeholder={form.problem_type === "output"
                ? "무엇을 출력해야 하는지 자세히 작성하세요.\n예: \"*를 3줄에 걸쳐 각 줄마다 1개, 2개, 3개 출력하시오\""
                : "무엇을 입력받고 무엇을 출력해야 하는지 자세히 작성하세요.\n예: \"정수 n을 입력받아 n개의 별을 출력하시오\""}
              className={`w-full px-3 py-2 text-sm border rounded-xl resize-y
                focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent
                ${errors.content ? "border-rose-300 bg-rose-50" : "border-gray-200"}`} />
            {errors.content && <p className="text-[11px] text-rose-500 mt-1">{errors.content}</p>}
          </div>

          {/* 입출력 형식 */}
          <div className={`grid gap-3 ${form.problem_type === "io" ? "grid-cols-2" : "grid-cols-1"}`}>
            {form.problem_type === "io" && (
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                  입력 형식 <span className="font-normal text-gray-400">(선택)</span>
                </label>
                <textarea value={form.input_description} onChange={e => set("input_description")(e.target.value)}
                  rows={2} placeholder="예: 첫 번째 줄에 정수 n이 주어진다"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl resize-y
                    focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent" />
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                출력 형식 <span className="font-normal text-gray-400">(선택)</span>
              </label>
              <textarea value={form.output_description} onChange={e => set("output_description")(e.target.value)}
                rows={2}
                placeholder={form.problem_type === "output"
                  ? "예: 지정된 문자열을 그대로 출력한다"
                  : "예: n개의 별을 한 줄에 출력한다"}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl resize-y
                  focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent" />
            </div>
          </div>

          {/* 채점 기준 */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-0.5 block">
              채점 기준 <span className="text-rose-500">*</span>
            </label>
            <p className="text-[11px] text-gray-400 mb-1.5">
              {form.problem_type === "output"
                ? "출력 예시가 정답으로 사용됩니다."
                : "입력 예시에 대한 정확한 출력 결과를 입력하세요."}
            </p>
            <div className={`grid gap-2 ${form.problem_type === "io" ? "grid-cols-2" : "grid-cols-1"}`}>
              {form.problem_type === "io" && (
                <div>
                  <p className="text-[11px] text-gray-500 mb-1">
                    입력 예시 <span className="text-rose-400">*</span>
                  </p>
                  <textarea value={form.example_input} onChange={e => set("example_input")(e.target.value)}
                    rows={3} placeholder="입력받을 값 예시"
                    className={`w-full px-3 py-2 text-sm border rounded-xl resize-none font-mono
                      focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent
                      ${errors.example_input ? "border-rose-300 bg-rose-50" : "border-gray-200"}`} />
                  {errors.example_input && (
                    <p className="text-[11px] text-rose-500 mt-1">{errors.example_input}</p>
                  )}
                </div>
              )}
              <div>
                <p className="text-[11px] text-gray-500 mb-1">
                  출력 예시 <span className="text-rose-400">*</span>
                </p>
                <textarea value={form.example_output} onChange={e => set("example_output")(e.target.value)}
                  rows={3}
                  placeholder={form.problem_type === "output"
                    ? "정확한 출력 결과를 입력하세요\n이 값이 정답으로 사용됩니다"
                    : "위 입력에 대한 정확한 출력 결과"}
                  className={`w-full px-3 py-2 text-sm border rounded-xl resize-none font-mono
                    focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent
                    ${errors.example_output ? "border-rose-300 bg-rose-50" : "border-gray-200"}`} />
                {errors.example_output && (
                  <p className="text-[11px] text-rose-500 mt-1">{errors.example_output}</p>
                )}
              </div>
            </div>
          </div>

          {/* 힌트 */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">
              힌트 <span className="font-normal text-gray-400">(선택)</span>
            </label>
            <textarea value={form.hint} onChange={e => set("hint")(e.target.value)}
              rows={2}
              placeholder="정답을 직접 쓰지 말고 풀이 방향만 알려주세요 (예: for문을 활용해 보세요)"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl resize-y
                focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent" />
          </div>

          {/* 제출 */}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm font-semibold bg-gray-100 hover:bg-gray-200
                text-gray-600 rounded-xl transition-colors">
              취소
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold
                bg-gradient-to-r from-orange-500 to-amber-500
                hover:from-orange-600 hover:to-amber-600
                disabled:from-gray-300 disabled:to-gray-300
                text-white rounded-xl shadow-sm transition-all">
              {submitting
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Send className="w-3.5 h-3.5" />검토 요청하기</>}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function ChallengeHubPage() {
  const router  = useRouter();
  const { data: session, status } = useSession();
  const userId = (session?.user as { id?: string })?.id ?? null;

  const [problems,     setProblems]     = useState<ChallengeProb[]>([]);
  const [likedSet,     setLikedSet]     = useState<Set<string>>(new Set());
  const [solvedSet,    setSolvedSet]    = useState<Set<string>>(new Set());
  const [loading,      setLoading]      = useState(true);
  const [activeTab,    setActiveTab]    = useState<TabValue>("전체");
  const [diffFilter,   setDiffFilter]   = useState<DiffFilter>("전체");
  const [searchQuery,  setSearchQuery]  = useState("");
  const [showCreate,   setShowCreate]   = useState(false);
  const [stats,        setStats]        = useState<MyCommunityStats>({
    createdCount: 0, solvedCount: 0, likesReceived: 0, weeklyHotName: null,
  });

  async function loadData() {
    setLoading(true);

    const { data: rawProblems } = await supabase
      .from("problems")
      .select("*")
      .eq("category", "파이썬도전");

    const probs = (rawProblems ?? []) as ChallengeProb[];

    const authorIds = [...new Set(
      probs.filter(p => p.author_user_id).map(p => p.author_user_id!)
    )];
    const authorMap: Record<string, string> = {};
    if (authorIds.length > 0) {
      const { data: authors } = await supabase
        .from("users")
        .select("id, name")
        .in("id", authorIds);
      for (const a of authors ?? []) authorMap[a.id] = a.name ?? "학생";
    }

    const enriched: ChallengeProb[] = probs.map(p => ({
      ...p,
      author_name: p.author_user_id ? (authorMap[p.author_user_id] ?? "학생") : null,
    }));

    setProblems(enriched);

    if (userId) {
      const [likesRes, subsRes] = await Promise.all([
        supabase.from("problem_likes").select("problem_id").eq("user_id", userId),
        enriched.length > 0
          ? supabase.from("submissions").select("problem_id")
              .eq("user_id", userId).eq("is_correct", true)
              .in("problem_id", enriched.map(p => p.id))
          : Promise.resolve({ data: [] }),
      ]);
      const likedIds  = new Set((likesRes.data ?? []).map((l: { problem_id: string }) => l.problem_id));
      const solvedIds = new Set(((subsRes as { data: { problem_id: string }[] | null }).data ?? []).map(s => s.problem_id));
      setLikedSet(likedIds);
      setSolvedSet(solvedIds);

      const weekAgo      = Date.now() - 7 * 86_400_000;
      const myProbs      = enriched.filter(p => p.author_user_id === userId);
      const weeklyHotProb = myProbs
        .filter(p => p.created_at != null && new Date(p.created_at).getTime() >= weekAgo)
        .sort((a, b) => (b.like_count ?? 0) - (a.like_count ?? 0))[0];
      setStats({
        createdCount:  myProbs.length,
        solvedCount:   solvedIds.size,
        likesReceived: myProbs.reduce((s, p) => s + (p.like_count ?? 0), 0),
        weeklyHotName: weeklyHotProb?.title ?? null,
      });
    }

    setLoading(false);
  }

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") { router.push("/login"); return; }
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, userId]);

  useEffect(() => {
    window.addEventListener("focus", loadData);
    return () => window.removeEventListener("focus", loadData);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // 탭 필터링
  const displayProblems = useMemo(() => {
    // 일반 탭은 published 문제만 (status 없는 구형 데이터는 published로 간주)
    const published = problems.filter(p => !p.status || p.status === "published");

    let list: ChallengeProb[];
    if (activeTab === "인기") {
      list = [...published].sort((a, b) => (b.like_count ?? 0) - (a.like_count ?? 0));
    } else if (activeTab === "최신") {
      list = [...published].sort((a, b) =>
        (b.created_at ?? "").localeCompare(a.created_at ?? "")
      );
    } else if (activeTab === "친구 문제") {
      list = published.filter(p => p.is_community && p.author_user_id !== userId);
    } else if (activeTab === "내 문제") {
      list = problems.filter(p => p.author_user_id === userId);
    } else if (activeTab === "내가 푼 문제") {
      list = problems.filter(p => solvedSet.has(p.id));
    } else {
      list = published;
    }

    if (diffFilter !== "전체") list = list.filter(p => p.difficulty === diffFilter);

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) || (p.topic ?? "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [problems, activeTab, diffFilter, searchQuery, userId, solvedSet]);

  async function handleLike(e: React.MouseEvent, probId: string) {
    e.stopPropagation();
    if (!userId) return;
    const wasLiked = likedSet.has(probId);
    setLikedSet(prev => { const n = new Set(prev); wasLiked ? n.delete(probId) : n.add(probId); return n; });
    setProblems(prev => prev.map(p =>
      p.id === probId ? { ...p, like_count: (p.like_count ?? 0) + (wasLiked ? -1 : 1) } : p
    ));
    await fetch("/api/challenge/like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problemId: probId }),
    });
  }

  const tabs: TabValue[] = ["전체", "인기", "최신", "친구 문제", "내 문제", "내가 푼 문제"];
  const diffOptions: DiffFilter[] = ["전체", "하", "중", "상"];

  if (status === "loading") return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <>
    <div className="min-h-screen bg-gray-50 py-8">
      <PageLayout>

        {/* 브레드크럼 */}
        <nav className="flex items-center gap-1.5 mb-6">
          <LayoutGrid className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-orange-500 transition-colors">
            학습 홈
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
          <span className="text-sm text-gray-700 font-semibold">도전 문제</span>
        </nav>

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
              <Flame className="w-5 h-5 text-orange-500" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900">도전 문제</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                학생이 만들고 친구들이 푸는 참여형 문제 공간
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="hidden sm:flex items-center gap-1.5 px-4 py-2
              bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600
              text-white text-sm font-semibold rounded-xl shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            문제 만들기
          </button>
        </div>

        {/* 본문 */}
        <div className="flex gap-6 items-start">
          <CommunitySidebar stats={stats} loading={loading} />

          <div className="flex-1 min-w-0">
            {/* 탭 */}
            <div className="bg-white border border-gray-100 rounded-xl p-1 mb-4
              flex items-center gap-0.5 overflow-x-auto shadow-sm">
              {tabs.map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg
                    whitespace-nowrap transition-all duration-150
                    ${activeTab === tab
                      ? "bg-orange-500 text-white shadow-sm"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"}`}
                >
                  {tab}
                  {tab === "내 문제" && stats.createdCount > 0 && (
                    <span className="ml-1 text-[10px] opacity-80">{stats.createdCount}</span>
                  )}
                  {tab === "내가 푼 문제" && solvedSet.size > 0 && (
                    <span className="ml-1 text-[10px] opacity-80">{solvedSet.size}</span>
                  )}
                </button>
              ))}
            </div>

            {/* 검색 + 난이도 필터 */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="문제 제목 또는 태그 검색..."
                  className="w-full pl-8 pr-8 py-2 text-sm bg-white border border-gray-200
                    rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {diffOptions.map(d => (
                  <button key={d} onClick={() => setDiffFilter(d)}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all
                      ${diffFilter === d
                        ? "bg-orange-500 text-white shadow-sm"
                        : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-gray-400 mb-2">총 {displayProblems.length}개의 문제</p>

            {loading && (
              <ProblemListContainer>
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 animate-pulse bg-gray-50" style={{ borderBottom: "0.5px solid #E5E7EB" }} />
                ))}
              </ProblemListContainer>
            )}

            {!loading && displayProblems.length > 0 && (
              <ProblemListContainer>
                {displayProblems.map((prob, idx) => (
                  <CommunityProblemCard
                    key={prob.id}
                    prob={prob}
                    likedSet={likedSet}
                    rank={activeTab === "인기" ? idx : undefined}
                    showStatus={activeTab === "내 문제"}
                    onClick={() => router.push(`/problems/${prob.id}`)}
                    onLike={e => handleLike(e, prob.id)}
                  />
                ))}
              </ProblemListContainer>
            )}

            {!loading && displayProblems.length === 0 && (
              <EmptyState
                tab={activeTab}
                onCreateClick={() => setShowCreate(true)}
                onTabChange={setActiveTab}
              />
            )}
          </div>
        </div>
      </PageLayout>
    </div>

    {showCreate && (
      <CreateModal
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          loadData();
          setActiveTab("내 문제");
        }}
      />
    )}
    </>
  );
}
