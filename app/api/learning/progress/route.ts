import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { createSupabaseServer } from "@/lib/supabaseServer"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as any).id as string
  const db = createSupabaseServer()

  const { data, error } = await db
    .from("learning_progress")
    .select("chapter_id, completed_at")
    .eq("user_id", userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { chapter_id } = body
    if (!chapter_id) return NextResponse.json({ error: "chapter_id 필요" }, { status: 400 })

    const userId = (session.user as any).id as string

    console.log("[progress POST] userId:", userId, "chapter_id:", chapter_id)

    const db = createSupabaseServer()
    const { error } = await db
      .from("learning_progress")
      .upsert(
        { user_id: userId, chapter_id, completed_at: new Date().toISOString() },
        { onConflict: "user_id,chapter_id" }
      )

    if (error) {
      console.error("[progress POST] Supabase error:", JSON.stringify(error, null, 2))
      return NextResponse.json({ error: error.message, details: error }, { status: 500 })
    }

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err: any) {
    console.error("[progress POST] Unhandled exception:", err?.message, err?.stack)
    return NextResponse.json({ error: err?.message ?? "Internal error" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { chapter_id } = await req.json()
    if (!chapter_id) return NextResponse.json({ error: "chapter_id 필요" }, { status: 400 })

    const userId = (session.user as any).id as string
    const db = createSupabaseServer()

    const { error } = await db
      .from("learning_progress")
      .delete()
      .eq("user_id", userId)
      .eq("chapter_id", chapter_id)

    if (error) {
      console.error("[progress DELETE] Supabase error:", JSON.stringify(error, null, 2))
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("[progress DELETE] Unhandled exception:", err?.message)
    return NextResponse.json({ error: err?.message ?? "Internal error" }, { status: 500 })
  }
}
