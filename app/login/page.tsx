"use client"

import { signIn, signOut, useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, Suspense, type FormEvent } from "react"
import { deriveSessionKind } from "@/lib/session-utils"
import CodeOnLogo from "@/components/ui/CodeOnLogo"

type LoginType   = "student" | "parent"
type StudentMode = "id" | "code"
type ParentMode  = "id" | "google"

function LoginPageInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()

  // ?role=parent → 학부모 전용 진입 경로
  const isParentEntry = searchParams.get("role") === "parent"

  const sessionKind = deriveSessionKind(status, session)

  // 학부모 진입인데 학생 세션 → 계정 불일치
  const isWrongAccount = isParentEntry && sessionKind === "student"
  // 수강생 진입인데 학부모 세션 → 계정 불일치 (수강생 로그인 경로에서 parent redirect 차단)
  const isParentOnStudentPath = !isParentEntry && sessionKind === "parent"

  const [loginType,   setLoginType]   = useState<LoginType>(isParentEntry ? "parent" : "student")
  const [studentMode, setStudentMode] = useState<StudentMode>("id")
  const [parentMode,  setParentMode]  = useState<ParentMode>("id")
  const [userId,      setUserId]      = useState("")
  const [password,    setPassword]    = useState("")
  const [schoolCode,  setSchoolCode]  = useState("")
  const [studentName, setStudentName] = useState("")
  const [error,       setError]       = useState("")
  const [signingOut,  setSigningOut]  = useState(false)

  // ── 인증 후 role 기반 라우팅 ──────────────────────────────────────────────
  useEffect(() => {
    // 관리자 로그인 성공 → /admin
    if (sessionKind === "admin") {
      router.push("/admin")
      return
    }

    // 학부모 세션 → 경로 무관하게 학부모 대시보드로 이동
    if (sessionKind === "parent") {
      router.push("/parent")
      return
    }

    // 아래는 학생/미인증 상태에서만 실행
    if (isWrongAccount)        return
    if (isParentOnStudentPath) return

    // 학생 로그인 성공 후 라우팅
    if (sessionKind === "student") {
      if (session?.user?.must_change_password) { router.push("/change-password"); return }
      if (session?.user?.status === "pending")  { router.push("/pending");         return }
      router.push("/dashboard")
    }
  }, [sessionKind, session, isParentEntry, isWrongAccount, isParentOnStudentPath, router])

  // ── 로그아웃 핸들러 ──────────────────────────────────────────────────────
  const handleLogout = async (callbackUrl: string) => {
    setSigningOut(true)
    await signOut({ callbackUrl })
  }

  // ── 아이디 + 비밀번호 로그인 ─────────────────────────────────────────────
  const handleIdLogin = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    if (!userId || !password) { setError("아이디와 비밀번호를 입력해 주세요."); return }

    const result = await signIn("credentials", {
      login_id: userId,
      password,
      redirect: false,
    })
    if (result?.error) {
      setError(
        result.error === "CredentialsSignin"
          ? "아이디 또는 비밀번호가 틀렸어요."
          : result.error,
      )
    }
  }

  // ── 학원코드 + 이름 로그인 ────────────────────────────────────────────────
  const handleCodeLogin = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    if (!schoolCode || !studentName) { setError("학원코드와 이름을 입력해 주세요."); return }

    const result = await signIn("credentials", {
      student_code: schoolCode,
      student_name: studentName,
      redirect:     false,
    })
    if (result?.error) {
      setError(
        result.error === "CredentialsSignin"
          ? "학원코드 또는 이름이 맞지 않아요."
          : result.error,
      )
    }
  }

  // ── 로딩 / 리다이렉트 스피너 ─────────────────────────────────────────────
  // 학생 세션이 확인되거나 부모가 ?role=parent 로 진입 시 → 이동 중이므로 스피너
  const isRedirecting =
    sessionKind === "loading" ||
    sessionKind === "admin" ||
    sessionKind === "parent" ||
    (sessionKind === "student" && !isParentEntry)

  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">
            {sessionKind === "loading" ? "로그인 확인 중..." : "로그인 성공! 잠시만 기다려주세요..."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
      <div className="w-full max-w-sm">

        {/* ── 학생 세션으로 학부모 페이지 접근 시 경고 ── */}
        {isWrongAccount && (
          <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 leading-relaxed">
            <p className="text-center">
              ⚠️ <span className="font-semibold">현재 학생 계정으로 로그인되어 있습니다.</span><br />
              학부모 페이지는 학부모 Google 계정으로만 접근할 수 있습니다.
            </p>
            <button
              onClick={() => handleLogout("/login?role=parent")}
              disabled={signingOut}
              className="mt-3 w-full py-2 text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg transition-colors disabled:opacity-50"
            >
              {signingOut ? "로그아웃 중..." : "학생 계정 로그아웃 후 학부모 로그인"}
            </button>
          </div>
        )}

        {/* ── 학부모 세션으로 수강생 로그인 경로 접근 시 안내 ── */}
        {isParentOnStudentPath && (
          <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800 leading-relaxed">
            <p className="text-center">
              👋 <span className="font-semibold">현재 학부모 계정으로 로그인되어 있습니다.</span><br />
              수강생으로 로그인하려면 먼저 로그아웃 해주세요.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <button
                onClick={() => router.push("/parent")}
                className="w-full py-2 text-xs font-bold bg-blue-100 hover:bg-blue-200 text-blue-900 rounded-lg transition-colors"
              >
                학부모 페이지로 이동
              </button>
              <button
                onClick={() => handleLogout("/login")}
                disabled={signingOut}
                className="w-full py-2 text-xs font-bold bg-white hover:bg-blue-50 border border-blue-200 text-blue-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {signingOut ? "로그아웃 중..." : "로그아웃 후 수강생으로 로그인"}
              </button>
            </div>
          </div>
        )}

        {/* ── 학부모 전용 진입 안내 배너 (미로그인) ── */}
        {isParentEntry && !isWrongAccount && sessionKind === "none" && (
          <div className="mb-4 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl text-sm text-indigo-700 text-center leading-relaxed">
            🔒 <span className="font-semibold">학부모 전용 페이지입니다.</span><br />
            학부모 계정(Google)으로 로그인해 주세요.
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-8 py-9">

          {/* 로고 */}
          <div className="flex items-center justify-center mb-7">
            <CodeOnLogo />
          </div>

          <div className="text-center mb-6">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">제천코딩학원</h1>
            <p className="text-sm text-gray-400 mt-1 font-medium">코딩앤플레이 AI 학습 플랫폼</p>
          </div>

          {/* 탭 */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6 gap-1">
            {(["student", "parent"] as const).map((type) => (
              <button
                key={type}
                onClick={() => { setLoginType(type); setError("") }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  loginType === type
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {type === "student" ? "수강생 로그인" : "학부모 로그인"}
              </button>
            ))}
          </div>

          {/* ── 수강생 로그인 ── */}
          {loginType === "student" && (
            <div>
              <div className="flex gap-2 mb-5">
                {(["id", "code"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => { setStudentMode(mode); setError("") }}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all duration-200 ${
                      studentMode === mode
                        ? "border-indigo-400 bg-indigo-50 text-indigo-600"
                        : "border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600"
                    }`}
                  >
                    {mode === "id" ? "아이디로 로그인" : "학원코드로 로그인"}
                  </button>
                ))}
              </div>

              {studentMode === "id" && (
                <form onSubmit={handleIdLogin} className="flex flex-col gap-3">
                  <input type="text"     placeholder="아이디"   value={userId}   onChange={e => setUserId(e.target.value)}
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
                  <input type="password" placeholder="비밀번호" value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
                  {error && <p className="text-xs text-red-500 text-center">{error}</p>}
                  <button type="submit" className="w-full py-3.5 bg-indigo-500 text-white rounded-xl text-base font-bold hover:bg-indigo-600 active:scale-95 transition-all mt-1">
                    로그인
                  </button>
                </form>
              )}

              {studentMode === "code" && (
                <form onSubmit={handleCodeLogin} className="flex flex-col gap-3">
                  <input type="text" placeholder="학원코드 (선생님께 받은 코드)" value={schoolCode} onChange={e => setSchoolCode(e.target.value)}
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
                  <input type="text" placeholder="내 이름" value={studentName} onChange={e => setStudentName(e.target.value)}
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
                  {error && <p className="text-xs text-red-500 text-center">{error}</p>}
                  <button type="submit" className="w-full py-3.5 bg-indigo-500 text-white rounded-xl text-base font-bold hover:bg-indigo-600 active:scale-95 transition-all mt-1">
                    로그인
                  </button>
                </form>
              )}

              <p className="text-xs text-gray-400 text-center mt-4 leading-relaxed">
                로그인이 안 되면 선생님께 여쭤보세요 😊
              </p>
            </div>
          )}

          {/* ── 학부모 로그인 ── */}
          {loginType === "parent" && (
            <div>
              {/* 모드 선택 */}
              <div className="flex gap-2 mb-5">
                {([
                  { mode: "id" as ParentMode,     label: "아이디로 로그인" },
                  { mode: "google" as ParentMode,  label: "Google로 로그인" },
                ]).map(({ mode, label }) => (
                  <button
                    key={mode}
                    onClick={() => { setParentMode(mode); setError("") }}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all duration-200 ${
                      parentMode === mode
                        ? "border-indigo-400 bg-indigo-50 text-indigo-600"
                        : "border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {parentMode === "id" && (
                <form onSubmit={handleIdLogin} className="flex flex-col gap-3">
                  <input type="text"     placeholder="아이디"   value={userId}   onChange={e => setUserId(e.target.value)}
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
                  <input type="password" placeholder="비밀번호" value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
                  {error && <p className="text-xs text-red-500 text-center">{error}</p>}
                  <button type="submit" className="w-full py-3.5 bg-indigo-500 text-white rounded-xl text-base font-bold hover:bg-indigo-600 active:scale-95 transition-all mt-1">
                    로그인
                  </button>
                  <p className="text-xs text-gray-400 text-center leading-relaxed">
                    학원에서 안내받은 아이디로 로그인해 주세요.
                  </p>
                </form>
              )}

              {parentMode === "google" && (
                <div>
                  <button
                    onClick={() => signIn("google", { callbackUrl: "/parent" })}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 active:scale-95 transition-all shadow-sm"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Google로 로그인
                  </button>
                  <p className="text-xs text-gray-400 text-center mt-4 leading-relaxed">
                    학원에서 안내받은 Google 계정으로<br />로그인해 주세요.
                  </p>
                </div>
              )}
            </div>
          )}

        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          제천코딩학원 Coding &amp; Play
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  )
}
