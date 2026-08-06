/**
 * Pyodide Web Worker
 *
 * Batch mode  : { id, code, stdin }            → { id, result, error }
 * Interactive : { id, code, sharedControlBuf, sharedDataBuf }
 *               stdout → { type:'stdout', id, text }
 *               input  → { type:'input_request', id }  (worker blocks via Atomics)
 *               done   → { type:'done', id, error }
 *
 * sharedControlBuf (Int32Array, 1 element)
 *   0 = waiting for input, 1 = input ready, -1 = stop
 * sharedDataBuf (Uint8Array)
 *   [0-3] Int32 byte length of input, [4+] UTF-8 encoded input string
 */

const PYODIDE_VERSION = "0.29.3";
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

importScripts(`${PYODIDE_CDN}pyodide.js`);

let pyodide = null;
const initPromise = loadPyodide({ indexURL: PYODIDE_CDN }).then(py => { pyodide = py; });

// ── Batch mode wrapper (original) ─────────────────────────────────────────
const BATCH_WRAPPER = `
import sys, builtins
from io import StringIO

_stdin_io  = StringIO(_stdin_data)
sys.stdin  = _stdin_io
_out       = StringIO()
sys.stdout = _out

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

// ── Interactive mode ──────────────────────────────────────────────────────
let _ctrl = null;   // Int32Array
let _data = null;   // Uint8Array
let _curId = null;

function _sendStdout(text) {
  self.postMessage({ type: "stdout", id: _curId, text: String(text) });
}

function _waitForInput() {
  // Reset flag → signal main thread → block until woken
  Atomics.store(_ctrl, 0, 0);
  self.postMessage({ type: "input_request", id: _curId });
  Atomics.wait(_ctrl, 0, 0);

  if (Atomics.load(_ctrl, 0) === -1) return null; // stop signal

  const len  = new Int32Array(_data.buffer, 0, 1)[0];
  const copy = new Uint8Array(_data.buffer, 4, len).slice(); // SharedArrayBuffer → 일반 ArrayBuffer 복사
  return new TextDecoder().decode(copy);
}

const INTERACTIVE_WRAPPER = `
import sys, builtins, traceback as _tb

class _Stdout:
    def write(self, text):
        _js_send_stdout(text)
        return len(str(text))
    def flush(self): pass

sys.stdout = _Stdout()
sys.stderr = _Stdout()

class _StopExecution(Exception): pass

def _input(prompt=''):
    if prompt:
        _js_send_stdout(str(prompt))
    result = _js_wait_for_input()
    if result is None:
        raise _StopExecution()
    return result.rstrip('\\n')

builtins.input = _input

class _Stdin:
    # 'input = sys.stdin.readline' 처럼 sys.stdin을 직접 읽는 코드(코딩테스트 관용구)도
    # 지원하기 위해 실제 파일의 readline()처럼 개행 문자를 포함해 반환한다.
    def readline(self, *args, **kwargs):
        result = _js_wait_for_input()
        if result is None:
            raise _StopExecution()
        return result if result.endswith('\\n') else result + '\\n'
    def __iter__(self):
        return self
    def __next__(self):
        return self.readline()

sys.stdin = _Stdin()

try:
    exec(_user_code, {"__builtins__": builtins, "sys": sys})
except SystemExit:
    pass
except _StopExecution:
    pass
except Exception:
    _js_send_stdout(_tb.format_exc())
`;

// ── Message handler ───────────────────────────────────────────────────────
self.onmessage = async (e) => {
  const { id, code, stdin, sharedControlBuf, sharedDataBuf } = e.data;

  try {
    await initPromise;

    if (sharedControlBuf) {
      // ── Interactive mode ──
      _curId = id;
      _ctrl  = new Int32Array(sharedControlBuf);
      _data  = new Uint8Array(sharedDataBuf);

      pyodide.globals.set("_js_send_stdout",    _sendStdout);
      pyodide.globals.set("_js_wait_for_input", _waitForInput);
      pyodide.globals.set("_user_code", code);

      pyodide.runPython(INTERACTIVE_WRAPPER);
      self.postMessage({ type: "done", id, error: null });

    } else {
      // ── Batch mode ──
      pyodide.globals.set("_stdin_data", stdin ?? "");
      pyodide.globals.set("_user_code",  code);
      pyodide.runPython(BATCH_WRAPPER);

      const result = String(pyodide.runPython("_result")).trimEnd();
      self.postMessage({ id, result, error: null });
    }
  } catch (err) {
    const msg = err.message ?? String(err);
    if (sharedControlBuf) {
      self.postMessage({ type: "done", id, error: msg });
    } else {
      self.postMessage({ id, result: null, error: msg });
    }
  }
};
