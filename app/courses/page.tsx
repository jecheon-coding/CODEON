import { redirect } from "next/navigation"

// /courses 경로는 /course 로 통합되어 있습니다.
export default function CoursesPage() {
  redirect("/course")
}
