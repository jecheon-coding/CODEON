import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { supabaseServer } from "@/lib/supabaseServer"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [{ data: checks }, { data: users }] = await Promise.all([
    supabaseServer
      .from("comprehension_checks")
      .select("user_id, skipped, bonus_score"),
    supabaseServer
      .from("users")
      .select("id, name")
      .eq("role", "student")
      .eq("status", "active"),
  ])

  const userMap = new Map((users ?? []).map(u => [u.id, u.name as string]))

  type Stat = {
    userId: string
    name: string
    total: number
    answered: number
    skipped: number
    skipRate: number
    bonusTotal: number
  }

  // 모든 활성 학생을 0으로 초기화
  const statMap = new Map<string, Stat>(
    (users ?? []).map(u => [u.id, {
      userId: u.id, name: u.name,
      total: 0, answered: 0, skipped: 0, skipRate: 0, bonusTotal: 0,
    }])
  )

  for (const c of checks ?? []) {
    const cur = statMap.get(c.user_id)
    if (!cur) continue
    cur.total++
    if (c.skipped) {
      cur.skipped++
    } else {
      cur.answered++
      cur.bonusTotal = Math.round((cur.bonusTotal + Number(c.bonus_score)) * 10) / 10
    }
  }

  const result = [...statMap.values()]
    .map(s => ({ ...s, skipRate: s.total > 0 ? Math.round(s.skipped / s.total * 100) : 0 }))
    .sort((a, b) => a.skipRate - b.skipRate)

  return NextResponse.json(result)
}
