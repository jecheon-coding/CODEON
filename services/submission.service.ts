import { Submission } from "@/types/problem";

export async function saveSubmission(submission: Submission): Promise<void> {
  const res = await fetch("/api/submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      problem_id:  submission.problem_id,
      code:        submission.code,
      output:      submission.output,
      result:      submission.result,
      is_correct:  submission.is_correct,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error("[submission] 저장 실패:", body.error ?? res.status);
  }
}
