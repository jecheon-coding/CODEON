"use client"

import { signIn, signOut, useSession } from "next-auth/react"

export default function LoginButton() {
  const { data: session } = useSession()

  if (session) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm">{session.user?.name}</span>
        <button
          onClick={() => signOut()}
          className="px-3 py-1 bg-gray-200 rounded"
        >
          로그아웃
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => signIn("google")}
      className="px-4 py-2 bg-indigo-500 text-white rounded-lg"
    >
      Google 로그인
    </button>
  )
}