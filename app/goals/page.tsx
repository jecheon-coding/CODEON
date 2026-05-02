import { Suspense } from "react"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/authOptions"
import GoalsClient from "./GoalsClient"

export default async function GoalsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/login")

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#F4F5F8]">
        <div className="w-8 h-8 border-2 border-[#534AB7] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <GoalsClient />
    </Suspense>
  )
}
