import Landing from "@/components/Landing"

// useSession()은 SessionProvider 컨텍스트가 필요하므로
// Vercel SSG(정적 사전 렌더링)를 비활성화하고 항상 동적 렌더링을 강제합니다.
export const dynamic = "force-dynamic"

export default function HomePage() {
  return <Landing />
}