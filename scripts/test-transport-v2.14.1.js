const fs = require('fs');
const vm = require('vm');
const path = require('path');

let source = fs.readFileSync(path.resolve(__dirname, '../assets/js/api.js'), 'utf8')
  .replace('const POST_MESSAGE_GRACE_MS = 2600;', 'const POST_MESSAGE_GRACE_MS = 20;')
  .replace('const MUTATION_POLL_INTERVAL_MS = 700;', 'const MUTATION_POLL_INTERVAL_MS = 5;');

function makeSandbox(mode) {
  const listeners = new Map();
  const local = new Map();
  let lastRequestId = '';
  const backendResult = {
    ok: true,
    row: { id: 'cli-test', ragioneSociale: 'Test', record_version: 1 },
    performance: { total_ms: 7, lock_wait_ms: 1, lock_hold_ms: 3, totals_ms: { write: 1 }, events: [] }
  };

  const window = {
    location: { origin: 'https://example.github.io' },
    console,
    SEEMAX_APP_CONFIG: {
      demoMode: false,
      appsScriptUrl: 'https://script.google.com/macros/s/test/exec',
      performanceDiagnostics: false,
      version: '2.14.1'
    },
    SeemaxDemoStore: {
      getSession: () => ({ username: 'admin', key: 'secret', role: 'ADMIN' }),
      setSession: () => {},
      login: () => {}, logout: () => {}, list: () => [], upsert: () => {}, remove: () => {},
      bootstrap: () => ({}), settings: () => ({}), reset: () => {}, exportJson: () => '{}', nextPracticeNumber: () => 'X'
    },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener(type, fn) { if (listeners.has(type)) listeners.get(type).delete(fn); },
    dispatchMessage(data) {
      for (const fn of listeners.get('message') || []) fn({ data, origin: 'https://script.googleusercontent.com' });
    }
  };

  function node(tag) {
    return {
      tag,
      children: [],
      appendChild(child) { this.children.push(child); },
      remove() { this.removed = true; },
      submit() {
        const params = Object.fromEntries(this.children.map((item) => [item.name, item.value]));
        lastRequestId = params.requestId;
        if (mode === 'post_message') {
          setTimeout(() => window.dispatchMessage({ requestId: lastRequestId, payload: JSON.parse(JSON.stringify(backendResult)) }), 2);
        }
      }
    };
  }

  const document = {
    createElement: node,
    body: { append() {}, appendChild() {} },
    head: {
      appendChild(script) {
        const url = new URL(script.src);
        const callback = url.searchParams.get('callback');
        const action = url.searchParams.get('action');
        setTimeout(() => {
          if (action === 'management_mutation_status') {
            window[callback]({ ok: true, completed: true, result: JSON.parse(JSON.stringify(backendResult)) });
          } else {
            window[callback]({ ok: true });
          }
        }, 1);
      }
    }
  };

  const sandbox = {
    window,
    document,
    localStorage: {
      getItem: (key) => local.has(key) ? local.get(key) : null,
      setItem: (key, value) => local.set(key, String(value)),
      removeItem: (key) => local.delete(key)
    },
    URL, URLSearchParams, console, setTimeout, clearTimeout, Promise, Date, JSON, Math, Error
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'api.js' });
  return sandbox;
}

(async () => {
  const direct = makeSandbox('post_message');
  const directRow = await direct.window.SeemaxApi.upsert('clients', { id: 'cli-test', ragioneSociale: 'Test' });
  const directPerf = direct.window.SeemaxApi.getLastPerformance();
  if (!directRow || directPerf.transport_mode !== 'post_message' || directPerf.fallback_triggered) {
    throw new Error('Direct postMessage transport failed: ' + JSON.stringify(directPerf));
  }

  const fallback = makeSandbox('status_poll');
  const fallbackRow = await fallback.window.SeemaxApi.upsert('clients', { id: 'cli-test', ragioneSociale: 'Test' });
  const fallbackPerf = fallback.window.SeemaxApi.getLastPerformance();
  if (!fallbackRow || fallbackPerf.transport_mode !== 'status_poll' || !fallbackPerf.fallback_triggered || fallbackPerf.status_poll_count !== 1) {
    throw new Error('Status polling transport failed: ' + JSON.stringify(fallbackPerf));
  }

  console.log('Transport test OK', { direct: directPerf, fallback: fallbackPerf });
  process.exit(0);
})().catch((error) => { console.error(error); process.exit(1); });
