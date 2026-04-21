import { supabase } from "@/lib/supabase";
import { Submission } from "@/types/problem";

export async function saveSubmission(submission: Submission): Promise<void> {
  const { error } = await supabase.from("submissions").insert(submission);
  if (error) console.error("[submission] 저장 실패:", error.message);
}
