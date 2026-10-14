import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy",   value: "same-origin" },
          // Safari(WebKit)는 "credentialless"를 지원하지 않아 crossOriginIsolated가
          // 거짓이 되고, 그 결과 SharedArrayBuffer가 전역에 아예 노출되지 않는다
          // (Pyodide 워커가 input()을 동기 처리하려고 SharedArrayBuffer를 쓰는데,
          // macOS Safari에서 "Can't find variable: SharedArrayBuffer" 오류로 나타남).
          // "require-corp"는 Safari 포함 모든 주요 브라우저가 지원하는 값이다.
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ]
  },
};

export default nextConfig;
