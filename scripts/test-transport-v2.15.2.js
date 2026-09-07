const fs = require("fs");
const vm = require("vm");
const path = require("path");

let source = fs.readFileSync(path.resolve(__dirname, "../assets/js/api.js"), "utf8")
  .replace("const MUTATION_POST_GRACE_MS = 700;", "const MUTATION_POST_GRACE_MS = 20;")
  .replace("const MUTATION_POLL_INTERVAL_MS = 500;", "const MUTATION_POLL_INTERVAL_MS = 5;")
  .replace("const MUTATION_STATUS_WAIT_MS = 2500;", "const MUTATION_STATUS_WAIT_MS = 20;")
  .replace("const LATE_POST_MESSAGE_WINDOW_MS = 30000;", "const LATE_POST_MESSAGE_WINDOW_MS = 500;")
  .replace("const MANAGEMENT_BRIDGE_READY_TIMEOUT_MS = 8000;", "const MANAGEMENT_BRIDGE_READY_TIMEOUT_MS = 20;")
  .replace("const MANAGEMENT_BRIDGE_RETRY_DELAY_MS = 60000;", "const MANAGEMENT_BRIDGE_RETRY_DELAY_MS = 50;");

function makeSandbox(mode) {
  const listeners = new Map();
  const local = new Map();
  let requestId = "";
  let iframe = null;
  let bridgeFrame = null;
  let mutationCompleted = false;
  const result = {
    ok: true,
    row: { id: "cli-test", ragioneSociale: "Test", record_version: 1 },
    performance: { total_ms: 9, lock_wait_ms: 1, lock_hold_ms: 4, totals_ms: { write: 1 }, events: [] }
  };

  const window = {
    location: { origin: "https://seemax-display.github.io" },
    console,
    SEEMAX_APP_CONFIG: {
      demoMode: false,
      appsScriptUrl: "https://script.google.com/macros/s/test/exec",
      performanceDiagnostics: false,
      version: "2.15.2"
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
    dispatchMessage(data, source = null, origin = "https://script.googleusercontent.com") {
      for (const fn of listeners.get("message") || []) fn({ data, source, origin });
    }
  };

  function genericNode(tag) {
    const node = {
      tag, children: [], removed: false, hidden: false, name: "", src: "", onerror: null,
      appendChild(child) { this.children.push(child); return child; },
      isConnected: false,
      remove() { this.removed = true; this.isConnected = false; },
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
    if (tag === "iframe") {
      iframe = node;
      node.contentWindow = {
        postMessage(message) {
          if (mode !== "bridge" || node !== bridgeFrame || message.type !== "request") return;
          requestId = message.request && message.request.requestId || "";
          mutationCompleted = true;
          const bridgeResult = message.request.action === "savequote" ? {
            ok: true,
            id_preventivo: message.request.params.id_preventivo,
            save_request_token: message.request.params.save_request_token
          } : result;
          setTimeout(() => window.dispatchMessage({
            channel: message.channel,
            nonce: message.nonce,
            type: "response",
            id: message.id,
            payload: JSON.parse(JSON.stringify(bridgeResult))
          }, node.contentWindow), 5);
        }
      };
    }
    return node;
  }

  const document = {
    createElement: genericNode,
    body: {
      append(...nodes) { nodes.forEach((node) => { node.isConnected = true; }); },
      appendChild(node) {
        node.isConnected = true;
        if (mode === "bridge" && node.tag === "iframe" && /[?&]action=management_bridge(?:&|$)/.test(node.src)) {
          bridgeFrame = node;
          const url = new URL(node.src);
          const nonce = url.searchParams.get("bridge_nonce");
          setTimeout(() => window.dispatchMessage({
            channel: "seemax-management-rpc-v1",
            nonce,
            type: "ready",
            version: "seemax-management-suite-2.15.2"
          }, node.contentWindow), 2);
        }
        return node;
      }
    },
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
  if (expectedMode === "native_bridge" && (perf.fallback_triggered || perf.bridge_fallback)) throw new Error(`${mode}: fallback inatteso`);
  if (expectedMode !== "native_bridge" && !perf.bridge_fallback) throw new Error(`${mode}: fallback del ponte non registrato`);
  if (expectedMode === "post_message_late" && (!perf.fallback_triggered || perf.late_message_ms < 100)) throw new Error(`${mode}: risposta tardiva non registrata ${JSON.stringify(perf)}`);
  if (expectedMode === "status_poll_race" && (!perf.fallback_triggered || perf.status_poll_count < 1)) throw new Error(`${mode}: controllo stato non registrato ${JSON.stringify(perf)}`);
  return perf;
}

async function runQuotation(){
  const sandbox = makeSandbox("bridge");
  const response = await sandbox.window.SeemaxApi.saveQuotation({
    id_preventivo: "151-26",
    save_request_token: "quote-transport-test"
  });
  if(!response || response.id_preventivo !== "151-26") throw new Error("savequote: preventivo non confermato");
  if(response.save_request_token !== "quote-transport-test") throw new Error("savequote: token idempotente non conservato");
  return sandbox.window.SeemaxApi.getLastPerformance();
}

(async () => {
  const bridge = await run("bridge", "native_bridge");
  const direct = await run("direct", "post_message");
  const late = await run("late", "post_message_late");
  const status = await run("status", "status_poll_race");
  const quotation = await runQuotation();
  console.log("Transport test 2.15.2 OK", { bridge, direct, late, status, quotation });
})().catch((error) => { console.error(error.stack || error); process.exit(1); });
