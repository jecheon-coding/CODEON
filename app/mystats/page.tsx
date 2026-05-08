import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/authOptions"
import MyStatsClient from "./MyStatsClient"

export const dynamic = "force-dynamic"

export default async function MyStatsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/login")
  return <MyStatsClient />
}
