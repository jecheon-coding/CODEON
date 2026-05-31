import { createClient } from "@supabase/supabase-js"

/**
 * 서버 전용 Supabase 클라이언트 팩토리 (service_role key 사용)
 * - 요청마다 새 인스턴스를 생성해 동시 쓰기 충돌 방지
 * - Next.js fetch 캐시를 우회해 "Compaction failed" 오류 방지
 * API Route / Server Action 에서만 import 할 것.
 * 클라이언트 컴포넌트에서 절대 사용 금지.
 */
export function createSupabaseServer() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
      global: {
        fetch: (url: RequestInfo | URL, options?: RequestInit) =>
          fetch(url, { ...options, cache: "no-store" }),
      },
    }
  )
}

// 단순 읽기 전용 싱글톤 (쓰기에는 createSupabaseServer() 사용)
export const supabaseServer = createSupabaseServer()
