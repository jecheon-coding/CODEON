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

/** 문제 페이지 진입 시 미리 Worker + Pyodide 로드 (첫 제출 지연 제거) */
export function preloadWorker() {
  if (typeof window === "undefined") return;
  getWorker();
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
