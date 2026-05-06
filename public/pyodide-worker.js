/**
 * Pyodide Web Worker
 * 메인 스레드 블로킹 없이 Python 코드 실행.
 * 부모에서 worker.terminate() 호출 시 즉시 중단 → TLE 구현에 활용.
 */

const PYODIDE_VERSION = "0.29.3";
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

importScripts(`${PYODIDE_CDN}pyodide.js`);

let pyodide = null;

const initPromise = loadPyodide({ indexURL: PYODIDE_CDN }).then((py) => {
  pyodide = py;
});

const WRAPPER = `
import sys, builtins
from io import StringIO

_stdin_io  = StringIO(_stdin_data)
sys.stdin  = _stdin_io
_out       = StringIO()
sys.stdout = _out

# sys.stdin.readline 패턴 지원:
# Pyodide exec 환경에서 import sys 후 sys.stdin이 재초기화되는 문제를
# builtins.input 패치 + exec globals에 sys 주입으로 해결
_orig_input = builtins.input
builtins.input = lambda prompt='': _stdin_io.readline().rstrip('\\n')

try:
    exec(_user_code, {"__builtins__": builtins, "sys": sys})
except SystemExit:
    pass
except Exception:
    sys.stdout = sys.__stdout__
    raise
finally:
    builtins.input = _orig_input

_result = _out.getvalue()
`;

self.onmessage = async (e) => {
  const { id, code, stdin } = e.data;

  try {
    await initPromise;

    pyodide.globals.set("_stdin_data", stdin ?? "");
    pyodide.globals.set("_user_code", code);
    pyodide.runPython(WRAPPER);

    const result = String(pyodide.runPython("_result")).trimEnd();
    self.postMessage({ id, result, error: null });
  } catch (err) {
    self.postMessage({ id, result: null, error: err.message ?? String(err) });
  }
};
