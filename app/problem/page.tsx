import { redirect } from "next/navigation";

// 이 경로는 사용되지 않음 — 실제 문제 화면: /problems/[id]
export default function LegacyProblemPage() {
  redirect("/courses");
}
