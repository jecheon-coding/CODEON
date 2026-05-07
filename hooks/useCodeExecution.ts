"use client";

import { useState } from "react";
import { runPythonInWorker, stopExecution } from "@/lib/pyodideWorker";

export type PyodideStatus = "idle" | "loading" | "ready" | "failed";

export function useCodeExecution() {
  const [output,  setOutput]  = useState("");
  const [error,   setError]   = useState("");
  const [running, setRunning] = useState(false);

  // Worker가 자체적으로 Pyodide를 로드하므로 상태는 항상 ready
  const pyodideStatus: PyodideStatus = "ready";

  const run = async (code: string, stdin = "") => {
    setRunning(true);
    setOutput("");
    setError("");
    try {
      const result = await runPythonInWorker(code, stdin);
      setOutput(result || "(출력 없음)");
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      if (msg === "EXECUTION_STOPPED") {
        setError("⛔ 실행이 중지되었습니다.");
      } else {
        setError(msg);
      }
    } finally {
      setRunning(false);
    }
  };

  const stop = () => stopExecution();

  const reset = () => { setOutput(""); setError(""); };

  return { output, error, running, pyodideStatus, run, stop, reset };
}
