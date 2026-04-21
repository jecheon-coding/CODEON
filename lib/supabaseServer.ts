import { createClient } from "@supabase/supabase-js"

/**
 * 서버 전용 Supabase 클라이언트 (service_role key 사용)
 * API Route / Server Action 에서만 import 할 것.
 * 클라이언트 컴포넌트에서 절대 사용 금지.
 */
export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)
