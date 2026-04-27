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
import sys
from io import StringIO

sys.stdin  = StringIO(_stdin_data)
_out       = StringIO()
sys.stdout = _out

try:
    exec(_user_code, {})
except SystemExit:
    pass
except Exception:
    sys.stdout = sys.__stdout__
    raise

_result = _out.getvalue()
`;

self.onmessage = async (e) => {
  const { id, code, stdin } = e.data;

  try {
    await initPromise;

    pyodide.globals.set("_stdin_data", stdin ?? "");
    pyodide.globals.set("_user_code", code);
    pyodide.runPython(WRAPPER);

    const result = String(pyodide.runPython("_result")).trim();
    self.postMessage({ id, result, error: null });
  } catch (err) {
    self.postMessage({ id, result: null, error: err.message ?? String(err) });
  }
};
