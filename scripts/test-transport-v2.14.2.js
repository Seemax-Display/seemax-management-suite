const fs = require("fs");
const vm = require("vm");
const path = require("path");

let source = fs.readFileSync(path.resolve(__dirname, "../assets/js/api.js"), "utf8")
  .replace("const MUTATION_POST_GRACE_MS = 700;", "const MUTATION_POST_GRACE_MS = 20;")
  .replace("const MUTATION_POLL_INTERVAL_MS = 500;", "const MUTATION_POLL_INTERVAL_MS = 5;")
  .replace("const MUTATION_STATUS_WAIT_MS = 2500;", "const MUTATION_STATUS_WAIT_MS = 20;")
  .replace("const LATE_POST_MESSAGE_WINDOW_MS = 30000;", "const LATE_POST_MESSAGE_WINDOW_MS = 500;");

function makeSandbox(mode) {
  const listeners = new Map();
  const local = new Map();
  let requestId = "";
  let iframe = null;
  let mutationCompleted = false;
  const result = {
    ok: true,
    row: { id: "cli-test", ragioneSociale: "Test", record_version: 1 },
    performance: { total_ms: 9, lock_wait_ms: 1, lock_hold_ms: 4, totals_ms: { write: 1 }, events: [] }
  };

  const window = {
    location: { origin: "https://example.github.io" },
    console,
    SEEMAX_APP_CONFIG: {
      demoMode: false,
      appsScriptUrl: "https://script.google.com/macros/s/test/exec",
      performanceDiagnostics: false,
      version: "2.14.2"
    },
    SeemaxDemoStore: {
      getSession: () => ({ username: "admin", key: "secret", role: "ADMIN" }),
      setSession: () => {}, login: () => {}, logout: () => {}, list: () => [], upsert: () => {}, remove: () => {},
      bootstrap: () => ({}), settings: () => ({}), reset: () => {}, exportJson: () => "{}", nextPracticeNumber: () => "X"
    },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener(type, fn) { if (listeners.has(type)) listeners.get(type).delete(fn); },
    dispatchMessage(data) {
      for (const fn of listeners.get("message") || []) fn({ data, origin: "https://script.googleusercontent.com" });
    }
  };

  function genericNode(tag) {
    const node = {
      tag, children: [], removed: false, hidden: false, name: "", src: "", onerror: null,
      appendChild(child) { this.children.push(child); return child; },
      remove() { this.removed = true; },
      setAttribute() {},
      addEventListener(type, fn) { this[`on_${type}`] = fn; }
    };
    if (tag === "form") {
      node.submit = function submit() {
        const params = Object.fromEntries(this.children.map((item) => [item.name, item.value]));
        requestId = params.requestId;
        setTimeout(() => { mutationCompleted = true; }, 8);
        setTimeout(() => { if (iframe && iframe.on_load) iframe.on_load(); }, 2);
        if (mode === "direct") {
          setTimeout(() => window.dispatchMessage({ requestId, payload: JSON.parse(JSON.stringify(result)) }), 5);
        } else if (mode === "late") {
          setTimeout(() => window.dispatchMessage({ requestId, payload: JSON.parse(JSON.stringify(result)) }), 125);
        }
      };
    }
    if (tag === "iframe") iframe = node;
    return node;
  }

  const document = {
    createElement: genericNode,
    body: { append() {}, appendChild() {} },
    head: {
      appendChild(script) {
        const url = new URL(script.src);
        const callback = url.searchParams.get("callback");
        const action = url.searchParams.get("action");
        if (action === "management_mutation_status") {
          const delay = mode === "late" ? 250 : 8;
          setTimeout(() => {
            window[callback]({
              ok: true,
              completed: mutationCompleted,
              result: mutationCompleted ? JSON.parse(JSON.stringify(result)) : null,
              waited_ms: mutationCompleted ? 0 : 20
            });
          }, delay);
        } else setTimeout(() => window[callback]({ ok: true }), 2);
        return script;
      }
    }
  };

  const sandbox = {
    window, document,
    localStorage: {
      getItem: (key) => local.has(key) ? local.get(key) : null,
      setItem: (key, value) => local.set(key, String(value)),
      removeItem: (key) => local.delete(key)
    },
    URL, URLSearchParams, console, setTimeout, clearTimeout, Promise, Date, JSON, Math, Error
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: "api.js" });
  return sandbox;
}

async function run(mode, expectedMode) {
  const sandbox = makeSandbox(mode);
  const row = await sandbox.window.SeemaxApi.upsert("clients", { id: "cli-test", ragioneSociale: "Test" });
  const perf = sandbox.window.SeemaxApi.getLastPerformance();
  if (!row || row.id !== "cli-test") throw new Error(`${mode}: record non restituito`);
  if (perf.transport_mode !== expectedMode) throw new Error(`${mode}: modalità inattesa ${JSON.stringify(perf)}`);
  if (expectedMode === "post_message" && perf.fallback_triggered) throw new Error(`${mode}: fallback inatteso`);
  if (expectedMode === "post_message_late" && (!perf.fallback_triggered || perf.late_message_ms < 100)) throw new Error(`${mode}: risposta tardiva non registrata ${JSON.stringify(perf)}`);
  if (expectedMode === "status_poll_race" && (!perf.fallback_triggered || perf.status_poll_count < 1)) throw new Error(`${mode}: controllo stato non registrato ${JSON.stringify(perf)}`);
  return perf;
}

(async () => {
  const direct = await run("direct", "post_message");
  const late = await run("late", "post_message_late");
  const status = await run("status", "status_poll_race");
  console.log("Transport test 2.14.2 OK", { direct, late, status });
})().catch((error) => { console.error(error.stack || error); process.exit(1); });
