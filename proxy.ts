import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const STUDENT_PATHS = [
  "/problems",
  "/dashboard",
  "/course",
  "/courses",
  "/goals",
  "/history",
  "/leaderboard",
  "/mystats",
  "/onboarding",
  "/questions",
]

export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  const { pathname } = request.nextUrl

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!token || (token as any).role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url))
    }
  }

  if (pathname.startsWith("/parent")) {
    if (!token || (token as any).role !== "parent") {
      return NextResponse.redirect(new URL("/login?role=parent", request.url))
    }
    if ((token as any).must_change_password && pathname !== "/parent/change-password") {
      return NextResponse.redirect(new URL("/parent/change-password", request.url))
    }
    if (!(token as any).must_change_password && pathname === "/parent/change-password") {
      return NextResponse.redirect(new URL("/parent", request.url))
    }
  }

  const isStudentPath = STUDENT_PATHS.some(
    p => pathname === p || pathname.startsWith(p + "/")
  )
  if (isStudentPath && !token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/parent/:path*",
    "/problems",
    "/problems/:path*",
    "/dashboard",
    "/dashboard/:path*",
    "/course",
    "/course/:path*",
    "/courses",
    "/courses/:path*",
    "/goals",
    "/goals/:path*",
    "/history",
    "/history/:path*",
    "/leaderboard",
    "/leaderboard/:path*",
    "/mystats",
    "/mystats/:path*",
    "/onboarding",
    "/onboarding/:path*",
    "/questions",
    "/questions/:path*",
  ],
}
