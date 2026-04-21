import type { Session } from "next-auth"

export type SessionKind = "loading" | "student" | "parent" | "admin" | "none"

/** useSession 결과를 단일 기준으로 판별 */
export function deriveSessionKind(
  status: "loading" | "authenticated" | "unauthenticated",
  session: Session | null,
): SessionKind {
  if (status === "loading")       return "loading"
  if (status !== "authenticated") return "none"
  if (!session?.user)             return "none"
  const role = session.user.role
  if (role === "student") return "student"
  if (role === "parent")  return "parent"
  if (role === "admin")   return "admin"
  return "none"
}

/** 서버 컴포넌트용 role 판별 */
export function getRole(session: Session | null): string | null {
  return session?.user?.role ?? null
}
