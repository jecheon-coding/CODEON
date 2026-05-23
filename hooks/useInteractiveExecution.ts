"use client";

import { useState, useCallback, useRef } from "react";
import {
  runPythonInteractive,
  sendInteractiveInput,
  stopInteractive,
} from "@/lib/pyodideWorker";

type State = "idle" | "running" | "waiting_input" | "done";
export type OutputChunk = { text: string; kind: "stdout" | "input" };

export function useInteractiveExecution() {
  const [chunks, setChunks] = useState<OutputChunk[]>([]);
  const [state,  setState]  = useState<State>("idle");
  const runningRef          = useRef(false);

  const run = useCallback(async (code: string) => {
    if (runningRef.current) stopInteractive();

    setChunks([]);
    setState("running");
    runningRef.current = true;

    try {
      await runPythonInteractive(
        code,
        (text) => setChunks(prev => {
          // 마지막 stdout 청크와 병합해 리렌더링 최소화
          const last = prev[prev.length - 1];
          if (last?.kind === "stdout") {
            return [...prev.slice(0, -1), { kind: "stdout", text: last.text + text }];
          }
          return [...prev, { kind: "stdout", text }];
        }),
        () => setState("waiting_input"),
      );
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      if (msg !== "EXECUTION_STOPPED") {
        setChunks(prev => [...prev, { kind: "stdout", text: "\n⛔ " + msg }]);
      }
    } finally {
      runningRef.current = false;
      setState("done");
    }
  }, []);

  const submitInput = useCallback((text: string) => {
    setChunks(prev => [...prev, { kind: "input", text: text + "\n" }]);
    setState("running");
    sendInteractiveInput(text);
  }, []);

  const stop = useCallback(() => {
    stopInteractive();
    runningRef.current = false;
    setState("done");
  }, []);

  const reset = useCallback(() => {
    setChunks([]);
    setState("idle");
  }, []);

  return {
    chunks,
    running:      state === "running",
    waitingInput: state === "waiting_input",
    run,
    submitInput,
    stop,
    reset,
  };
}
