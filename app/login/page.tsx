"use client"

import { useState, Suspense } from "react"
import { signIn, getSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, AlertCircle, Smile } from "lucide-react"
import CodeOnLogo from "@/components/ui/CodeOnLogo"

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialRole = searchParams.get("role") // 'parent' or null

  // 1단계 탭: 수강생 vs 학부모
  const [userType, setUserType] = useState<"student" | "parent">(initialRole === "parent" ? "parent" : "student")
  
  // 2단계 탭 (수강생): 아이디 vs 학원코드
  const [studentLoginMode, setStudentLoginMode] = useState<"id" | "code">("id")
  // 2단계 탭 (학부모): 아이디 vs 구글
  const [parentLoginMode, setParentLoginMode]   = useState<"id" | "google">("google")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Form states
  const [studentCode, setStudentCode] = useState("")
  const [studentName, setStudentName] = useState("")
  const [loginId, setLoginId] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await signIn("credentials", {
        redirect: false,
        // 학생 코드 모드
        student_code: (userType === "student" && studentLoginMode === "code") ? studentCode : undefined,
        student_name: (userType === "student" && studentLoginMode === "code") ? studentName : undefined,
        // 아이디 모드 (학생 아이디 또는 학부모/관리자 아이디)
        login_id: (userType === "parent" || (userType === "student" && studentLoginMode === "id")) ? loginId : undefined,
        password: (userType === "parent" || (userType === "student" && studentLoginMode === "id")) ? password : undefined,
      })

      if (res?.error) {
        setError(res.error)
      } else {
        const session = await getSession()
        const role = (session?.user as any)?.role
        if (role === "admin")   router.push("/admin")
        else if (role === "parent") router.push("/parent")
        else                    router.push("/dashboard")
      }
    } catch (err) {
      setError("로그인 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-[440px] bg-white rounded-[32px] shadow-sm border border-gray-100 p-10 flex flex-col items-center">
      
      {/* 로고 */}
      <div className="mb-8">
        <CodeOnLogo />
      </div>

      {/* 제목 */}
      <div className="text-center mb-8">
        <h1 className="text-[28px] font-extrabold text-gray-900 mb-1">제천코딩학원</h1>
        <p className="text-sm font-medium text-gray-400">코딩앤플레이 AI 학습 플랫폼</p>
      </div>

      {/* 1단계 탭: 수강생 / 학부모 */}
      <div className="w-full bg-[#f1f5f9] p-1 rounded-2xl flex gap-1 mb-6">
        <button
          type="button"
          onClick={() => setUserType("student")}
          className={`flex-1 py-3 text-[15px] font-bold rounded-xl transition-all
            ${userType === "student" ? "bg-white text-[#6366f1] shadow-sm" : "text-gray-500"}`}
        >
          수강생 로그인
        </button>
        <button
          type="button"
          onClick={() => setUserType("parent")}
          className={`flex-1 py-3 text-[15px] font-bold rounded-xl transition-all
            ${userType === "parent" ? "bg-white text-[#6366f1] shadow-sm" : "text-gray-500"}`}
        >
          학부모 로그인
        </button>
      </div>

      {/* 2단계 탭 (수강생): 아이디로 / 학원코드로 */}
      {userType === "student" && (
        <div className="w-full flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setStudentLoginMode("id")}
            className={`flex-1 py-2.5 text-[13px] font-bold rounded-lg border transition-all
              ${studentLoginMode === "id" ? "border-[#6366f1] text-[#6366f1] bg-white" : "border-gray-200 text-gray-400 bg-white"}`}
          >
            아이디로 로그인
          </button>
          <button
            type="button"
            onClick={() => setStudentLoginMode("code")}
            className={`flex-1 py-2.5 text-[13px] font-bold rounded-lg border transition-all
              ${studentLoginMode === "code" ? "border-[#6366f1] text-[#6366f1] bg-white" : "border-gray-200 text-gray-400 bg-white"}`}
          >
            학원코드로 로그인
          </button>
        </div>
      )}

      {/* 2단계 탭 (학부모): 아이디 / Google */}
      {userType === "parent" && (
        <div className="w-full flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setParentLoginMode("google")}
            className={`flex-1 py-2.5 text-[13px] font-bold rounded-lg border transition-all
              ${parentLoginMode === "google" ? "border-[#6366f1] text-[#6366f1] bg-white" : "border-gray-200 text-gray-400 bg-white"}`}
          >
            Google 로그인
          </button>
          <button
            type="button"
            onClick={() => setParentLoginMode("id")}
            className={`flex-1 py-2.5 text-[13px] font-bold rounded-lg border transition-all
              ${parentLoginMode === "id" ? "border-[#6366f1] text-[#6366f1] bg-white" : "border-gray-200 text-gray-400 bg-white"}`}
          >
            아이디로 로그인
          </button>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="w-full mb-4 flex items-center gap-2 p-3 bg-red-50 text-red-600 text-xs font-medium rounded-xl border border-red-100">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* 폼 */}
      <form onSubmit={handleSubmit} className="w-full space-y-4">
        {userType === "parent" && parentLoginMode === "google" ? (
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/parent" })}
            className="w-full flex items-center justify-center gap-3 py-4 bg-white border border-gray-200 rounded-2xl text-[15px] font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
          >
            <GoogleIcon />
            Google로 시작하기
          </button>
        ) : userType === "parent" && parentLoginMode === "id" ? (
          <>
            <input
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="아이디"
              required
              className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-[15px] focus:outline-none focus:border-[#6366f1] transition-all placeholder:text-gray-300"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              required
              className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-[15px] focus:outline-none focus:border-[#6366f1] transition-all placeholder:text-gray-300"
            />
          </>
        ) : (userType === "student" && studentLoginMode === "id") ? (
          <>
            <input
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="아이디"
              required
              className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-[15px] focus:outline-none focus:border-[#6366f1] transition-all placeholder:text-gray-300"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              required
              className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-[15px] focus:outline-none focus:border-[#6366f1] transition-all placeholder:text-gray-300"
            />
          </>
        ) : (
          <>
            <input
              type="text"
              value={studentCode}
              onChange={(e) => setStudentCode(e.target.value)}
              placeholder="학원코드"
              required
              className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-[15px] focus:outline-none focus:border-[#6366f1] transition-all placeholder:text-gray-300"
            />
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="이름"
              required
              className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-[15px] focus:outline-none focus:border-[#6366f1] transition-all placeholder:text-gray-300"
            />
          </>
        )}

        {!(userType === "parent" && parentLoginMode === "google") && (
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#6366f1] hover:bg-[#5558e3] text-white text-[16px] font-bold rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4 shadow-sm"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "로그인"}
          </button>
        )}
      </form>

      {/* 푸터 문구 */}
      <div className="mt-6 flex items-center gap-1.5">
        <span className="text-[13px] text-gray-500">로그인이 안 되면 선생님께 여쭤보세요</span>
        <Smile className="w-4 h-4 text-gray-400" />
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6">
      <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin text-[#6366f1]" />}>
        <LoginForm />
      </Suspense>
      
      {/* 하단 텍스트 */}
      <div className="mt-8 text-center text-gray-400 text-[13px] font-medium">
        제천코딩학원 Coding & Play
      </div>
    </main>
  )
}
