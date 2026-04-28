import type { Metadata } from "next";
import { Geist, Geist_Mono, Fira_Code, Noto_Sans_KR } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Providers from "@/components/Providers"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansKR = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
});

// 코딩 에디터 전용 폰트 — Monaco에 CSS 변수로 주입
const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Codeon",
  description: "AI 코딩 학습 플랫폼",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} ${firaCode.variable} ${notoSansKR.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-gray-100">
        
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}