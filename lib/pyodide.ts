/**
 * Pyodide 실행 엔진
 *
 * 문제: layout.tsx 에 script 태그가 없어 window.loadPyodide 가 undefined.
 * 해결: 스크립트를 직접 DOM 에 주입한 뒤 load 완료를 기다려 초기화.
 *
 * - 싱글톤 패턴 → 중복 로드 없음
 * - 실패 시 재시도 가능 (_initPromise 초기화)
 */

const PYODIDE_VERSION = "0.29.3";
const PYODIDE_CDN     = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let _instance:    any = null;
let _initPromise: Promise<any> | null = null;

// ── 스크립트 DOM 주입 ────────────────────────────────────────────────
function injectScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector("[data-pyodide-script]")) {
      // 이미 주입됨 (window.loadPyodide 가 있으면 바로 resolve)
      if (typeof (window as any).loadPyodide === "function") {
        resolve();
      } else {
        // 스크립트는 있지만 아직 실행 전 — load 이벤트 대기
        document
          .querySelector("[data-pyodide-script]")!
          .addEventListener("load", () => resolve(), { once: true });
      }
      return;
    }
    const s  = document.createElement("script");
    s.src    = `${PYODIDE_CDN}pyodide.js`;
    s.setAttribute("data-pyodide-script", "true");
    s.onload  = () => {
      console.log("[Pyodide] 스크립트 로드 완료");
      resolve();
    };
    s.onerror = () => {
      const msg = `Pyodide CDN 스크립트 로드 실패 (${s.src})`;
      console.error("[Pyodide]", msg);
      reject(new Error(msg));
    };
    document.head.appendChild(s);
    console.log("[Pyodide] 스크립트 주입 →", s.src);
  });
}

// ── 싱글톤 인스턴스 반환 ─────────────────────────────────────────────
export async function getPyodide(): Promise<any> {
  if (_instance) return _instance;

  if (!_initPromise) {
    _initPromise = (async () => {
      await injectScript();

      console.log("[Pyodide] loadPyodide() 호출...");
      const py = await (window as any).loadPyodide({ indexURL: PYODIDE_CDN });
      _instance = py;
      console.log("[Pyodide] 초기화 완료 ✓");
      return py;
    })().catch((err) => {
      _initPromise = null; // 실패 시 다음 호출에서 재시도 가능
      throw err;
    });
  }

  return _initPromise;
}

// ── Python 코드 실행 ─────────────────────────────────────────────────
/**
 * @param code  실행할 Python 코드
 * @param stdin 표준 입력 (input() 에 전달). 여러 줄 \n 구분 가능.
 * @throws 실행 실패 시 Python 트레이스백 포함 Error
 */
export async function runPythonCode(code: string, stdin = ""): Promise<string> {
  let pyodide: any;
  try {
    pyodide = await getPyodide();
  } catch (err: any) {
    throw new Error(`Python 엔진 로드 실패: ${err?.message ?? err}`);
  }

  // stdin 을 Pyodide globals 에 직접 주입 (문자열 이스케이프 불필요)
  pyodide.globals.set("_stdin_data", stdin);
  pyodide.globals.set("_user_code",  code);

  // ① stdout/stdin 리디렉션  ② 사용자 코드 exec  ③ 결과 수집
  const wrapper = `
import sys, traceback
from io import StringIO

sys.stdin  = StringIO(_stdin_data)
_out       = StringIO()
sys.stdout = _out

try:
    exec(_user_code, {})
except SystemExit:
    pass          # sys.exit() 허용
except Exception:
    sys.stdout = sys.__stdout__   # 에러는 기존 stdout 으로
    raise         # JS 로 전파 → catch 블록에서 처리

_result = _out.getvalue()
`;

  try {
    pyodide.runPython(wrapper);
  } catch (err: any) {
    // Python 트레이스백을 그대로 에러로 전달
    const msg = err?.message ?? String(err);
    console.error("[Pyodide] 실행 에러:", msg);
    throw new Error(msg);
  }

  const result = (pyodide.runPython("_result") as string).trim();
  console.log("[Pyodide] 실행 완료 — 출력 길이:", result.length);
  return result;
}
