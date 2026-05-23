"use client";

import { useState, useCallback, useRef } from "react";
import {
  runPythonInteractive,
  sendInteractiveInput,
  stopInteractive,
} from "@/lib/pyodideWorker";

type State = "idle" | "running" | "waiting_input" | "done";

export function useInteractiveExecution() {
  const [output, setOutput]   = useState("");
  const [state,  setState]    = useState<State>("idle");
  const runningRef            = useRef(false);

  const run = useCallback(async (code: string) => {
    if (runningRef.current) stopInteractive();

    setOutput("");
    setState("running");
    runningRef.current = true;

    try {
      await runPythonInteractive(
        code,
        (chunk) => setOutput(prev => prev + chunk),
        ()      => setState("waiting_input"),
      );
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      if (msg !== "EXECUTION_STOPPED") {
        setOutput(prev => prev + "\n⛔ " + msg);
      }
    } finally {
      runningRef.current = false;
      setState("done");
    }
  }, []);

  const submitInput = useCallback((text: string) => {
    setOutput(prev => prev + text + "\n");
    setState("running");
    sendInteractiveInput(text);
  }, []);

  const stop = useCallback(() => {
    stopInteractive();
    runningRef.current = false;
    setState("done");
  }, []);

  const reset = useCallback(() => {
    setOutput("");
    setState("idle");
  }, []);

  return {
    output,
    running:      state === "running",
    waitingInput: state === "waiting_input",
    run,
    submitInput,
    stop,
    reset,
  };
}
