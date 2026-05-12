import { Suspense } from "react"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/authOptions"
import QuestionThreadClient from "./QuestionThreadClient"

export const dynamic = "force-dynamic"

interface Props { params: Promise<{ id: string }> }

export default async function QuestionThreadPage({ params }: Props) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/login")
  const { id } = await params
  return (
    <Suspense fallback={null}>
      <QuestionThreadClient questionId={id} />
    </Suspense>
  )
}
