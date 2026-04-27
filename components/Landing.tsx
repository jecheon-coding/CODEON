"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Sparkles, Menu, X,
  Brain, CheckCircle2,
  Layers, Code2,
  Zap, Target, MessageSquare,
  TrendingUp, Bell, Shield, AlertTriangle, Clock,
  Laptop, Smartphone, UserCheck, Settings,
  ArrowRight, Phone, MapPin,
} from "lucide-react"
import CodeOnLogo from "@/components/ui/CodeOnLogo"

// ── 데이터 ──────────────────────────────────────────────────────────────────

const NOTICES = [
  { date: "2026.04", title: "4월 과제 업로드 완료 — 기초 과정 22~28번" },
  { date: "2026.03", title: "알고리즘 과정 신규 문제 15개 추가" },
  { date: "2026.03", title: "학부모 리포트 화면 업데이트 안내" },
]

const GRADE_CARDS = [
  {
    Icon: Layers,
    color: "#D85A30",
    grade: "초등",
    title: "코딩, 재미있게 시작해요",
    desc: "스크래치부터 파이썬 기초까지, 놀이처럼 배우는 첫 걸음",
    items: ["변수·조건·반복 기초", "간단한 게임 만들기", "파이썬 입문"],
  },
  {
    Icon: Code2,
    color: "#534AB7",
    grade: "중등",
    title: "논리적 사고를 키워요",
    desc: "파이썬 심화와 알고리즘 기초로 문제 해결 능력을 기릅니다",
    items: ["자료구조 이해", "알고리즘 기초 풀이", "코딩 테스트 입문"],
  },
  {
    Icon: Brain,
    color: "#185FA5",
    grade: "고등",
    title: "실력으로 증명해요",
    desc: "알고리즘 심화, 프로젝트 개발, 대입·취업 대비까지",
    items: ["알고리즘 심화 훈련", "팀 프로젝트 개발", "대입 SW 특기자 대비"],
  },
]

const AI_FEATURES = [
  {
    Icon: Zap,
    color: "#D85A30",
    title: "즉각 피드백",
    desc: "코드 제출 즉시 무엇이 틀렸는지, 왜 틀렸는지 설명해줍니다. 기다림 없는 학습 사이클.",
  },
  {
    Icon: Target,
    color: "#534AB7",
    title: "맞춤형 힌트",
    desc: "포기하지 않도록 수준에 맞는 단계별 힌트를 제공합니다. 정답이 아닌 방향을 안내해요.",
  },
  {
    Icon: MessageSquare,
    color: "#639922",
    title: "대화형 설명",
    desc: "질문하면 개념부터 차근차근 대화로 설명합니다. 선생님처럼, 항상 옆에 있어요.",
  },
]

const KEY_FEATURES = [
  {
    Icon: Laptop,
    color: "#534AB7",
    title: "학생 앱",
    desc: "Monaco 에디터 + AI 튜터가 통합된 브라우저 기반 코딩 환경",
  },
  {
    Icon: Smartphone,
    color: "#185FA5",
    title: "학부모 대시보드",
    desc: "자녀의 학습 현황, 과제율, 진도를 언제 어디서나 확인",
  },
  {
    Icon: UserCheck,
    color: "#639922",
    title: "강사 관리 도구",
    desc: "과제 출제, 학생 진도 모니터링, 피드백 설정을 한 곳에서",
  },
  {
    Icon: Settings,
    color: "#D85A30",
    title: "관리자 도구",
    desc: "계정 생성, 권한 관리, 학원 운영에 필요한 모든 설정",
  },
]

// ── 컴포넌트 ─────────────────────────────────────────────────────────────────

export default function Landing() {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
    setMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-white">

      {/* ══════════════════════════════════════════════════════
          1. HEADER
      ══════════════════════════════════════════════════════ */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16 h-16 flex items-center justify-between">

          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <CodeOnLogo />
          </button>

          <div className="flex items-center gap-6">
            <nav className="hidden lg:flex items-center gap-8">
              <button
                onClick={() => scrollTo("student-section")}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                학생용
              </button>
              <button
                onClick={() => scrollTo("parent-section")}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                학부모용
              </button>
              <button
                onClick={() => scrollTo("contact-section")}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                수강 문의
              </button>
            </nav>

            <button
              onClick={() => router.push("/login")}
              className="px-5 py-2 bg-[#534AB7] text-white text-sm font-bold rounded-lg
                hover:bg-[#443DA0] active:scale-95 transition-all duration-200"
            >
              로그인
            </button>

            <button
              onClick={() => setMobileMenuOpen(v => !v)}
              className="lg:hidden p-2 text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="메뉴"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* 모바일 드롭다운 */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white px-6 py-4 flex flex-col gap-4">
            <button onClick={() => scrollTo("student-section")} className="text-sm font-medium text-gray-700 text-left hover:text-[#534AB7] transition-colors">
              학생용
            </button>
            <button onClick={() => scrollTo("parent-section")} className="text-sm font-medium text-gray-700 text-left hover:text-[#534AB7] transition-colors">
              학부모용
            </button>
            <button onClick={() => scrollTo("contact-section")} className="text-sm font-medium text-gray-700 text-left hover:text-[#534AB7] transition-colors">
              수강 문의
            </button>
          </div>
        )}
      </header>

      {/* ══════════════════════════════════════════════════════
          2. HERO  #hero
      ══════════════════════════════════════════════════════ */}
      <section id="hero" className="bg-gradient-to-br from-[#534AB7] via-[#2E56A8] to-[#185FA5] pt-20 lg:pt-32 pb-24 lg:pb-36">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16">

          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20
            text-white text-xs font-semibold px-4 py-1.5 rounded-full mb-8 select-none">
            <Sparkles className="w-3.5 h-3.5" />
            AI 튜터 코딩 학습 플랫폼
          </div>

          <h1 className="text-5xl lg:text-7xl font-black leading-tight tracking-tight mb-8">
            <span className="text-gray-900">AI 튜터와 함께하는 코딩,</span><br />
            <span className="text-sky-300">실력이 다릅니다</span>
          </h1>

          <p className="text-base lg:text-lg text-white/80 leading-relaxed mb-3 max-w-2xl">
            기초부터 프로젝트까지, 맞춤형 학습으로
            초등부터 고등까지 차근차근 배우세요.
          </p>
          <p className="text-sm text-white/60 leading-relaxed mb-12 max-w-2xl">
            막히는 부분은 즉시 해결, 진도는 자기 속도로.
            수백만 학생들이 선택한 AI 튜터 시스템.
          </p>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => router.push("/contact/academy")}
              className="px-7 py-3.5 bg-white text-gray-900 rounded-xl text-sm font-bold
                hover:bg-white/90 active:scale-95 transition-all duration-200 shadow-lg shadow-black/20"
            >
              학원 관리자 문의
            </button>
            <button
              onClick={() => router.push("/login")}
              className="px-7 py-3.5 border-2 border-white/60 text-white rounded-xl
                text-sm font-semibold hover:bg-white/10 active:scale-95 transition-all duration-200"
            >
              학부모 대시보드 보기
            </button>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          3. 실제 학습 화면  #learning-interface
      ══════════════════════════════════════════════════════ */}
      <section id="learning-interface" className="bg-[#0F0F1A] py-24">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16">

          <div className="mb-12">
            <p className="text-xs font-bold text-[#534AB7] tracking-widest uppercase mb-3">Platform Preview</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-3">실제 학습 화면이 이렇게 생겼어요</h2>
            <p className="text-sm text-white/50">문제 확인부터 AI 피드백, 학습 현황까지 한 화면에서</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-stretch">

            {/* 문제 리스트 */}
            <div className="lg:col-span-2 bg-[#161625] border border-white/10 rounded-2xl overflow-hidden flex flex-col">
              <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between">
                <span className="text-xs font-bold text-white/60 uppercase tracking-wide">문제 목록</span>
                <span className="text-[10px] bg-[#534AB7]/30 text-[#8B83E8] px-2 py-0.5 rounded-full font-semibold">
                  3개 진행중
                </span>
              </div>
              <div className="flex-1 divide-y divide-white/5">
                {[
                  { num: "01", title: "최댓값 찾기",    level: "하", done: true },
                  { num: "02", title: "리스트 정렬",    level: "하", active: true },
                  { num: "03", title: "딕셔너리 활용",  level: "중" },
                  { num: "04", title: "재귀함수 이해",  level: "중" },
                ].map((item, i) => (
                  <div key={i} className={`flex items-center gap-3 px-5 py-4 ${item.active ? "bg-[#534AB7]/10 border-l-2 border-[#534AB7]" : ""}`}>
                    <span className="text-xs font-mono text-white/30 w-5 shrink-0">{item.num}</span>
                    <span className={`text-sm flex-1 ${item.done ? "text-white/30 line-through" : item.active ? "text-white font-semibold" : "text-white/70"}`}>
                      {item.title}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] bg-white/10 text-white/40 px-1.5 py-0.5 rounded font-medium">난이도 {item.level}</span>
                      {item.done   && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      {item.active && <div className="w-1.5 h-1.5 bg-[#534AB7] rounded-full animate-pulse" />}
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-white/10">
                <div className="flex justify-between text-xs text-white/40 mb-1.5">
                  <span>오늘 진도</span><span>1 / 4</span>
                </div>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full w-1/4 bg-[#534AB7] rounded-full" />
                </div>
              </div>
            </div>

            {/* 코드 + AI 피드백 */}
            <div className="lg:col-span-3 bg-[#161625] border border-white/10 rounded-2xl overflow-hidden flex flex-col">
              <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">리스트 정렬</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-semibold">진행중</span>
                </div>
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400" /><span className="w-2.5 h-2.5 rounded-full bg-yellow-400" /><span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                </div>
              </div>
              <div className="bg-[#1e1e1e] px-6 py-5 font-mono text-sm flex-1" style={{ lineHeight: "1.7" }}>
                <div className="flex gap-5">
                  <div className="select-none text-right min-w-[1rem] text-gray-600">
                    {[1,2,3,4,5,6].map(n => <div key={n}>{n}</div>)}
                  </div>
                  <div style={{ color: "#e5e7eb" }}>
                    <div><span style={{ color: "#60a5fa" }}>def</span>{" "}<span style={{ color: "#60a5fa" }}>sort_list</span><span>(nums):</span></div>
                    <div><span className="ml-4" style={{ color: "#6b7280" }}># 오름차순 정렬 후 반환</span></div>
                    <div><span className="ml-4">result = </span><span style={{ color: "#4ade80" }}>sorted</span><span>(nums)</span></div>
                    <div><span className="ml-4" style={{ color: "#60a5fa" }}>return</span><span> result</span></div>
                    <div className="mt-2"><span style={{ color: "#4ade80" }}>▶</span><span style={{ color: "#6b7280" }}> 출력: </span><span style={{ color: "#fbbf24" }}>[1, 2, 3, 5, 9]</span></div>
                    <div><span className="text-emerald-400 font-bold">정답입니다!</span><span style={{ color: "#6b7280" }}> 테스트 3/3 통과</span></div>
                  </div>
                </div>
              </div>
              <div className="border-t border-white/10 border-l-4 border-l-[#534AB7] px-6 py-4 flex items-start gap-3"
                style={{ background: "linear-gradient(to right, #1e2d45, #1e1e1e)" }}>
                <Brain className="w-4 h-4 text-blue-300 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-blue-300 uppercase tracking-wide block mb-1">AI 튜터</span>
                  <span className="text-xs text-gray-300">
                    훌륭해요! <code className="bg-blue-950 text-blue-300 px-1 rounded">sorted()</code>를 잘 활용했어요.{" "}
                    다음 단계로 <code className="bg-blue-950 text-blue-300 px-1 rounded">key=</code> 옵션을 써서 내림차순도 도전해볼까요?
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          4. 학생 섹션  #student-section
             (학년별 여정 + AI 튜터 + 주요 기능)
      ══════════════════════════════════════════════════════ */}
      <section id="student-section" className="bg-white py-24">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16">

          {/* 4-A. 학년별 학습 여정 */}
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-[#534AB7] tracking-widest uppercase mb-3">Learning Journey</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">학년별 맞춤 학습 여정</h2>
            <p className="text-sm text-gray-500">초등부터 고등까지, 각 단계에 맞는 커리큘럼으로</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
            {GRADE_CARDS.map(({ Icon, color, grade, title, desc, items }, i) => (
              <div key={i} className="rounded-2xl border-2 p-8 hover:shadow-lg transition-all duration-300"
                style={{ borderColor: `${color}30`, backgroundColor: `${color}08` }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6" style={{ backgroundColor: `${color}20` }}>
                  <Icon className="w-6 h-6" style={{ color }} />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest mb-2 block" style={{ color }}>{grade}</span>
                <h3 className="text-xl font-bold text-gray-900 mb-2 leading-snug">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-6">{desc}</p>
                <ul className="space-y-2.5">
                  {items.map((item, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-sm text-gray-700">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* 4-B. AI 튜터가 하는 일 */}
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-[#534AB7] tracking-widest uppercase mb-3">AI Tutor</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">AI 튜터가 하는 일</h2>
            <p className="text-sm text-gray-500">선생님이 항상 옆에 있는 것처럼, 24시간 함께합니다</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
            {AI_FEATURES.map(({ Icon, color, title, desc }, i) => (
              <div key={i} className="bg-gray-50 rounded-2xl border border-gray-100 p-8 hover:shadow-md transition-all duration-300">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6" style={{ backgroundColor: `${color}15` }}>
                  <Icon className="w-6 h-6" style={{ color }} />
                </div>
                <div className="text-2xl font-black mb-4 tabular-nums" style={{ color: `${color}50` }}>
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* 4-C. 주요 기능 */}
          <div className="text-center mb-14">
            <p className="text-xs font-bold text-[#534AB7] tracking-widest uppercase mb-3">Features</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">하나의 플랫폼, 모든 역할</h2>
            <p className="text-sm text-gray-500">학생, 학부모, 강사, 관리자 모두를 위한 전용 도구</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {KEY_FEATURES.map(({ Icon, color, title, desc }, i) => (
              <div key={i} className="bg-white rounded-2xl border-2 border-gray-100 p-7 flex flex-col gap-5 hover:shadow-md transition-all duration-300">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                  <Icon className="w-6 h-6" style={{ color }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
                <button
                  onClick={() => router.push("/login")}
                  className="flex items-center gap-1 text-xs font-semibold transition-colors"
                  style={{ color }}
                >
                  자세히 보기 <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          5. 학부모 대시보드  #parent-section
      ══════════════════════════════════════════════════════ */}
      <section id="parent-section" className="bg-gray-50 py-24">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* 텍스트 */}
            <div>
              <p className="text-xs font-bold text-[#534AB7] tracking-widest uppercase mb-4">Parent Dashboard</p>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight mb-4">
                아이의 학습을<br />한눈에 파악하세요
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-10">
                실시간 진도, 과제 완료율, AI 피드백 기록까지.<br />
                자녀가 어디서 막히고 있는지 학부모가 먼저 알 수 있습니다.
              </p>
              <div className="space-y-5 mb-10">
                {[
                  { Icon: TrendingUp, color: "#534AB7", title: "주간 진도율 추적",  desc: "매주 학습량과 성취도 변화를 그래프로 확인" },
                  { Icon: Bell,       color: "#D85A30", title: "과제 미완료 알림",  desc: "제출 기한이 지난 과제를 즉시 알림으로 파악" },
                  { Icon: Shield,     color: "#639922", title: "안전한 개인정보",   desc: "학원 구성원 외 접근 불가, 완전 폐쇄형 플랫폼" },
                ].map(({ Icon, color, title, desc }, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
                      <Icon className="w-5 h-5" style={{ color }} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 mb-0.5">{title}</p>
                      <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => router.push("/login")}
                className="flex items-center gap-2 px-6 py-3 bg-[#534AB7] text-white
                  text-sm font-bold rounded-xl hover:bg-[#443DA0] active:scale-95 transition-all duration-200"
              >
                학부모 대시보드 시작 <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* 대시보드 목업 */}
            <div className="rounded-2xl border border-gray-200 shadow-2xl overflow-hidden bg-white">
              <div className="bg-gray-100 px-4 py-2.5 flex items-center gap-2 border-b border-gray-200">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-yellow-400" />
                <span className="w-3 h-3 rounded-full bg-green-400" />
                <div className="ml-3 flex-1 bg-white rounded px-3 py-1 text-xs text-gray-400 font-mono">
                  codeon.kr/parent
                </div>
              </div>
              <div className="bg-gray-50 p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-sm font-bold text-gray-900">김민준 학생 학습 현황</p>
                    <p className="text-xs text-gray-400 mt-0.5">2026년 4월 3주차</p>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-bold">정상 학습중</span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  {/* 과제율 원형 */}
                  <div className="bg-white rounded-xl p-4 border border-gray-100 flex flex-col items-center gap-1">
                    <svg viewBox="0 0 100 100" className="w-20 h-20 -rotate-90">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#534AB7" strokeWidth="8"
                        strokeLinecap="round" strokeDasharray={`${251.3 * 0.92} 251.3`} />
                    </svg>
                    <p className="text-xl font-black text-gray-900 -mt-1">92%</p>
                    <p className="text-[10px] text-gray-500">과제 완료율</p>
                  </div>
                  {/* 학습시간 */}
                  <div className="bg-white rounded-xl p-4 border border-gray-100 flex flex-col justify-between">
                    <Clock className="w-5 h-5 text-[#185FA5]" />
                    <div>
                      <p className="text-2xl font-black text-gray-900">12h</p>
                      <p className="text-[10px] text-gray-500">이번 주 학습시간</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-emerald-500" />
                      <span className="text-[10px] text-emerald-600 font-semibold">전주 대비 +2h</span>
                    </div>
                  </div>
                </div>

                {/* 진도 바 */}
                <div className="bg-white rounded-xl p-4 border border-gray-100 mb-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">과목별 진도</p>
                  {[
                    { label: "Python 기초", pct: 78, color: "#534AB7" },
                    { label: "알고리즘",    pct: 45, color: "#185FA5" },
                    { label: "프로젝트",    pct: 23, color: "#639922" },
                  ].map(({ label, pct, color }, i) => (
                    <div key={i} className="mb-3 last:mb-0">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-700 font-medium">{label}</span>
                        <span className="text-gray-400 font-semibold">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* 경고 */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <p className="text-xs text-amber-700 font-medium">반복문 파트 재복습 권장 — 오답률 40%</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          6. 최종 CTA  #contact-section
      ══════════════════════════════════════════════════════ */}
      <section id="contact-section" className="bg-gradient-to-br from-[#534AB7] to-[#185FA5] py-24">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16 text-center">

          <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-4">Get Started</p>
          <h2 className="text-3xl lg:text-5xl font-black text-white leading-tight mb-5">
            처음이신가요?
          </h2>
          <p className="text-base lg:text-lg text-white/70 leading-relaxed mb-10 max-w-xl mx-auto">
            수백 명의 학생이 AI 튜터로 실력을 키우고 있습니다.<br />
            지금 바로 시작해 보세요.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => router.push("/contact/academy")}
              className="flex items-center gap-2 px-8 py-4 bg-white text-gray-900
                rounded-xl text-sm font-bold hover:bg-white/90 active:scale-95
                transition-all duration-200 shadow-lg shadow-black/20"
            >
              학원 관리자 문의 <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => router.push("/login")}
              className="flex items-center gap-2 px-8 py-4 border-2 border-white/50 text-white
                rounded-xl text-sm font-semibold hover:bg-white/10 active:scale-95 transition-all duration-200"
            >
              학부모 대시보드 보기
            </button>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          7. FOOTER
      ══════════════════════════════════════════════════════ */}
      <footer className="bg-slate-950 py-16">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">

            <div>
              <CodeOnLogo variant="dark-bg" />
              <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                AI 코딩 학습 플랫폼<br />
                수강생 전용 · 초대받은 학생만 이용 가능합니다
              </p>
            </div>

            <div>
              <p className="text-sm font-bold text-slate-400 mb-5">최근 공지</p>
              <div className="space-y-4">
                {NOTICES.map((n, i) => (
                  <div key={i} className="flex items-baseline gap-3">
                    <span className="text-[11px] font-bold text-slate-600 shrink-0 tabular-nums">{n.date}</span>
                    <p className="text-xs text-slate-500 leading-relaxed">{n.title}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-slate-400 mb-5">수강 문의</p>
              <div className="space-y-3 mb-5">
                <div className="flex items-center gap-2.5 text-xs text-slate-500">
                  <Phone className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  043-652-1998
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
                  충북 제천시 죽하로 15길 34 (장락동)
                </div>
              </div>
              <button
                onClick={() => router.push("/contact/academy")}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#534AB7] text-white
                  text-xs font-bold rounded-lg hover:bg-[#443DA0] transition-colors"
              >
                상담 예약하기 <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

          <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-slate-700">
              © {new Date().getFullYear()} 제천코딩학원 Coding & Play. All rights reserved.
            </p>
            <p className="text-[11px] text-slate-700">Powered by CodeOn AI Platform</p>
          </div>

        </div>
      </footer>

    </div>
  )
}
