/**
 * Worker 기반 Python 실행 관리자.
 * - 싱글톤 Worker를 재사용해 Pyodide 재초기화 비용 제거
 * - timeoutMs 지정 시 초과하면 worker.terminate() → TIME_LIMIT_EXCEEDED
 */

let worker: Worker | null = null;
let msgId = 0;
const pending = new Map<
  number,
  { resolve: (v: string) => void; reject: (e: Error) => void }
>();

function createWorker(): Worker {
  const w = new Worker("/pyodide-worker.js");

  w.onmessage = (e) => {
    const { id, result, error } = e.data;
    const p = pending.get(id);
    if (!p) return;
    pending.delete(id);
    if (error) p.reject(new Error(error));
    else p.resolve(result ?? "");
  };

  w.onerror = (e) => {
    for (const [id, p] of pending) {
      pending.delete(id);
      p.reject(new Error(e.message ?? "Worker 오류"));
    }
  };

  return w;
}

function getWorker(): Worker {
  if (!worker) worker = createWorker();
  return worker;
}

/** 타임아웃 초과 시 Worker를 종료하고 새 인스턴스를 대기 */
function killWorker() {
  if (worker) { worker.terminate(); worker = null; }
  for (const [, p] of pending) p.reject(new Error("TIME_LIMIT_EXCEEDED"));
  pending.clear();
}

/** 사용자가 수동으로 실행을 중지할 때 호출 */
export function stopExecution() {
  if (worker) { worker.terminate(); worker = null; }
  for (const [, p] of pending) p.reject(new Error("EXECUTION_STOPPED"));
  pending.clear();
}

/** 페이지 진입 시 미리 Worker + Pyodide 로드 (첫 실행 지연 제거) */
export function preloadWorker(interactive = false) {
  if (typeof window === "undefined") return;
  getWorker();
  if (interactive) getInteractiveWorker();
}

// ── Interactive mode (가이드 에디터 전용) ─────────────────────────────────
let iWorker:  Worker | null = null;
let iCtrl:    Int32Array | null = null;
let iData:    Uint8Array | null = null;
let iResolve: (() => void) | null = null;
let iReject:  ((e: Error) => void) | null = null;
let iOnChunk: ((text: string) => void) | null = null;
let iOnInput: (() => void) | null = null;

function getInteractiveWorker(): Worker {
  if (!iWorker) {
    iWorker = new Worker("/pyodide-worker.js");
    iWorker.onmessage = (e) => {
      const { type, text, error } = e.data;
      if (type === "stdout")        { iOnChunk?.(text); }
      else if (type === "input_request") { iOnInput?.(); }
      else if (type === "done") {
        if (error) iReject?.(new Error(error));
        else       iResolve?.();
        iResolve = iReject = iOnChunk = iOnInput = null;
      }
    };
    iWorker.onerror = (e) => {
      iReject?.(new Error(e.message ?? "Worker 오류"));
      iResolve = iReject = iOnChunk = iOnInput = null;
    };
  }
  return iWorker;
}

/** 인터랙티브 실행 시작 */
export function runPythonInteractive(
  code: string,
  onChunk: (text: string) => void,
  onInputRequest: () => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    // 이전 실행이 아직 완료되지 않았으면 (다른 페이지의 무한루프 포함) Worker 재시작
    if (iResolve !== null) {
      iReject?.(new Error("EXECUTION_STOPPED"));
      if (iWorker) { iWorker.terminate(); iWorker = null; }
    }

    iResolve  = resolve;
    iReject   = reject;
    iOnChunk  = onChunk;
    iOnInput  = onInputRequest;

    const ctrlBuf = new SharedArrayBuffer(4);
    const dataBuf = new SharedArrayBuffer(4 + 65536); // 64KB max input
    iCtrl = new Int32Array(ctrlBuf);
    iData = new Uint8Array(dataBuf);
    Atomics.store(iCtrl, 0, 0);

    getInteractiveWorker().postMessage({ id: 1, code, sharedControlBuf: ctrlBuf, sharedDataBuf: dataBuf });
  });
}

/** input() 대기 중인 워커에 입력값 전달 */
export function sendInteractiveInput(text: string) {
  if (!iCtrl || !iData) return;
  const encoded = new TextEncoder().encode(text);
  new Int32Array(iData.buffer, 0, 1)[0] = encoded.length;
  iData.set(encoded, 4);
  Atomics.store(iCtrl, 0, 1);
  Atomics.notify(iCtrl, 0);
}

/** 인터랙티브 실행 강제 중지 */
export function stopInteractive() {
  if (iCtrl) { Atomics.store(iCtrl, 0, -1); Atomics.notify(iCtrl, 0); }
  iReject?.(new Error("EXECUTION_STOPPED"));
  iResolve = iReject = iOnChunk = iOnInput = null;
  iCtrl = iData = null;
  // 무한루프로 막힌 Worker 강제 종료 → 즉시 새 Worker 프리로드 (다음 실행 지연 최소화)
  if (iWorker) { iWorker.terminate(); iWorker = null; }
  if (typeof window !== "undefined") getInteractiveWorker();
}

/**
 * Worker에서 Python 코드를 실행합니다.
 * @param timeoutMs  지정하면 초과 시 Error("TIME_LIMIT_EXCEEDED") throw
 */
export function runPythonInWorker(
  code: string,
  stdin = "",
  timeoutMs?: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    let timer: ReturnType<typeof setTimeout> | null = null;

    pending.set(id, {
      resolve: (v) => { if (timer) clearTimeout(timer); resolve(v); },
      reject:  (e) => { if (timer) clearTimeout(timer); reject(e); },
    });

    if (timeoutMs) {
      timer = setTimeout(() => {
        if (!pending.has(id)) return;
        pending.delete(id);
        killWorker();
        reject(new Error("TIME_LIMIT_EXCEEDED"));
      }, timeoutMs);
    }

    getWorker().postMessage({ id, code, stdin });
  });
}
