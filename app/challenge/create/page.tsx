"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  LayoutGrid, ChevronRight, Flame, ArrowLeft, Send, AlertCircle,
} from "lucide-react";

type Difficulty = "하" | "중" | "상";

interface FormState {
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

const INITIAL: FormState = {
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

// ── 필드 레이블 컴포넌트 ─────────────────────────────────────────────────────
function FieldLabel({ label, required, hint }: { label: string; required?: boolean; hint?: string }) {
  return (
    <div className="mb-1.5">
      <label className="text-sm font-semibold text-gray-700">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

// ── 텍스트 인풋 ──────────────────────────────────────────────────────────────
function TextInput({ value, onChange, placeholder, error }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; error?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-3 py-2 text-sm bg-white border rounded-xl
        focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent
        ${error ? "border-rose-300 bg-rose-50" : "border-gray-200"}`}
    />
  );
}

// ── 텍스트에어리어 ────────────────────────────────────────────────────────────
function TextArea({ value, onChange, placeholder, rows = 4, mono = false, error }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number; mono?: boolean; error?: boolean;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`w-full px-3 py-2 text-sm bg-white border rounded-xl resize-y
        focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent
        ${mono ? "font-mono" : ""}
        ${error ? "border-rose-300 bg-rose-50" : "border-gray-200"}`}
    />
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function ChallengCreatePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [form,       setForm]       = useState<FormState>(INITIAL);
  const [errors,     setErrors]     = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  const set = (key: keyof FormState) => (val: string) =>
    setForm(prev => ({ ...prev, [key]: val }));

  function validate(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.title.trim())         e.title         = "제목을 입력하세요";
    if (!form.content.trim())       e.content       = "문제 설명을 입력하세요";
    if (!form.example_output.trim()) e.example_output = "출력 예시는 정답 채점에 사용됩니다. 반드시 입력하세요";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setServerError("");
    try {
      const res = await fetch("/api/challenge/create", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error ?? "오류가 발생했습니다");
        return;
      }
      router.push(`/problems/${data.id}`);
    } catch {
      setServerError("네트워크 오류가 발생했습니다");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  const role = (session?.user as { role?: string })?.role;
  if (role && role !== "student") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">학생 계정으로 로그인해야 문제를 만들 수 있습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">

        {/* 브레드크럼 */}
        <nav className="flex items-center gap-1.5 mb-6">
          <LayoutGrid className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-orange-500 transition-colors">
            학습 홈
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
          <Link href="/course/challenge" className="text-sm text-gray-400 hover:text-orange-500 transition-colors">
            도전 문제
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
          <span className="text-sm text-gray-700 font-semibold">문제 만들기</span>
        </nav>

        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center
              justify-center hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </button>
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
            <Flame className="w-5 h-5 text-orange-500" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">문제 만들기</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              친구들에게 도전장을 보내보세요
            </p>
          </div>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* 서버 에러 */}
          {serverError && (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200
              rounded-xl px-4 py-3 text-sm text-rose-600">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {serverError}
            </div>
          )}

          {/* 섹션 1: 기본 정보 */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
              기본 정보
            </p>

            <div className="flex flex-col gap-4">
              {/* 제목 */}
              <div>
                <FieldLabel label="제목" required />
                <TextInput
                  value={form.title}
                  onChange={set("title")}
                  placeholder="문제 제목을 입력하세요"
                  error={!!errors.title}
                />
                {errors.title && (
                  <p className="text-xs text-rose-500 mt-1">{errors.title}</p>
                )}
              </div>

              {/* 난이도 */}
              <div>
                <FieldLabel label="난이도" required />
                <div className="flex gap-2">
                  {(["하", "중", "상"] as Difficulty[]).map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, difficulty: d }))}
                      className={`flex-1 py-2 text-sm font-semibold rounded-xl border transition-all
                        ${form.difficulty === d
                          ? d === "하"
                            ? "bg-emerald-500 text-white border-emerald-500"
                            : d === "중"
                            ? "bg-amber-500 text-white border-amber-500"
                            : "bg-rose-500 text-white border-rose-500"
                          : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* 주제 태그 */}
              <div>
                <FieldLabel label="주제 태그" hint="예: 반복문, 함수, 문자열" />
                <TextInput
                  value={form.topic}
                  onChange={set("topic")}
                  placeholder="예: 반복문"
                />
              </div>
            </div>
          </div>

          {/* 섹션 2: 문제 내용 */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
              문제 내용
            </p>

            <div className="flex flex-col gap-4">
              {/* 문제 설명 */}
              <div>
                <FieldLabel label="문제 설명" required />
                <TextArea
                  value={form.content}
                  onChange={set("content")}
                  placeholder="문제 상황과 요구 사항을 설명해 주세요"
                  rows={6}
                  error={!!errors.content}
                />
                {errors.content && (
                  <p className="text-xs text-rose-500 mt-1">{errors.content}</p>
                )}
              </div>

              {/* 입력 / 출력 형식 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <FieldLabel label="입력 형식" hint="없으면 비워두세요" />
                  <TextArea
                    value={form.input_description}
                    onChange={set("input_description")}
                    placeholder="입력 없음"
                    rows={3}
                  />
                </div>
                <div>
                  <FieldLabel label="출력 형식" />
                  <TextArea
                    value={form.output_description}
                    onChange={set("output_description")}
                    placeholder="출력 형식을 설명하세요"
                    rows={3}
                  />
                </div>
              </div>

              {/* 제한 사항 */}
              <div>
                <FieldLabel label="제한 사항" hint="줄바꿈으로 여러 항목 입력" />
                <TextArea
                  value={form.constraints}
                  onChange={set("constraints")}
                  placeholder="예: 입력값은 1 이상 1000 이하의 정수입니다"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* 섹션 3: 예시 및 채점 */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">
              예시 및 채점
            </p>
            <p className="text-xs text-gray-400 mb-4">
              출력 예시는 자동 채점에 사용됩니다. 반드시 입력하세요.
            </p>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <FieldLabel label="입력 예시" hint="없으면 비워두세요" />
                  <TextArea
                    value={form.example_input}
                    onChange={set("example_input")}
                    placeholder="입력 없음"
                    rows={3}
                    mono
                  />
                </div>
                <div>
                  <FieldLabel label="출력 예시" required hint="채점 기준으로 사용됩니다" />
                  <TextArea
                    value={form.example_output}
                    onChange={set("example_output")}
                    placeholder="Hello, World!"
                    rows={3}
                    mono
                    error={!!errors.example_output}
                  />
                  {errors.example_output && (
                    <p className="text-xs text-rose-500 mt-1">{errors.example_output}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 섹션 4: 추가 설정 */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
              추가 설정
            </p>

            <div className="flex flex-col gap-4">
              {/* 초기 코드 */}
              <div>
                <FieldLabel label="초기 코드" hint="풀이 화면에서 학생에게 제공되는 코드 템플릿" />
                <TextArea
                  value={form.initial_code}
                  onChange={set("initial_code")}
                  rows={4}
                  mono
                />
              </div>

              {/* 힌트 */}
              <div>
                <FieldLabel label="힌트" hint="학생이 막혔을 때 볼 수 있는 힌트 (선택)" />
                <TextArea
                  value={form.hint}
                  onChange={set("hint")}
                  placeholder="예: 문자열 슬라이싱을 활용해 보세요"
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3
              bg-gradient-to-r from-orange-500 to-amber-500
              hover:from-orange-600 hover:to-amber-600
              disabled:from-gray-300 disabled:to-gray-300
              text-white text-sm font-bold rounded-2xl shadow-sm
              transition-all active:scale-[0.99]"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                문제 등록하기
              </>
            )}
          </button>

        </form>
      </div>
    </div>
  );
}
