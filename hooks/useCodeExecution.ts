"use client";

import { useState, useEffect } from "react";
import { getPyodide, runPythonCode } from "@/lib/pyodide";

export type PyodideStatus = "idle" | "loading" | "ready" | "failed";

export function useCodeExecution() {
  const [output,        setOutput]        = useState("");
  const [error,         setError]         = useState("");
  const [running,       setRunning]       = useState(false);
  const [pyodideStatus, setPyodideStatus] = useState<PyodideStatus>("idle");

  // ── 마운트 시 Pyodide 사전 로드 (첫 실행 지연 제거) ────────────────
  useEffect(() => {
    setPyodideStatus("loading");
    getPyodide()
      .then(() => {
        setPyodideStatus("ready");
        console.log("[useCodeExecution] Pyodide ready");
      })
      .catch((err) => {
        setPyodideStatus("failed");
        console.error("[useCodeExecution] Pyodide 로드 실패:", err?.message ?? err);
      });
  }, []);

  // ── 실행: 에디터 코드 + stdin ────────────────────────────────────
  const run = async (code: string, stdin = "") => {
    if (pyodideStatus === "failed") {
      setError("Python 실행 엔진을 불러오지 못했습니다. 페이지를 새로고침해주세요.");
      return;
    }

    setRunning(true);
    setOutput("");
    setError("");

    console.log("[실행] code 길이:", code.length, "/ stdin:", JSON.stringify(stdin));

    try {
      const result = await runPythonCode(code, stdin);
      setOutput(result || "(출력 없음)");
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      console.error("[실행] 오류:", msg);
      setError(msg);
    } finally {
      setRunning(false);
    }
  };

  const reset = () => { setOutput(""); setError(""); };

  return { output, error, running, pyodideStatus, run, reset };
}
