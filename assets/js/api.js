(function () {
  "use strict";

  const config = window.SEEMAX_APP_CONFIG;
  const demo = window.SeemaxDemoStore;
  const FAST_MODE_KEY = "SEEMAX_MANAGEMENT_FAST_MODE_V1";
  const FAST_QUEUE_KEY = "SEEMAX_MANAGEMENT_FAST_QUEUE_V1";
  const LOCAL_ACTIVITIES_KEY = "SEEMAX_MANAGEMENT_LOCAL_ACTIVITIES_V1";
  let session = demo.getSession();
  let online = !!config.demoMode;

  function readLocal(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch (error) { return fallback; }
  }

  function writeLocal(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    return value;
  }

  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function isFastMode() { return localStorage.getItem(FAST_MODE_KEY) === "1"; }
  function setFastMode(active) {
    if (active) localStorage.setItem(FAST_MODE_KEY, "1");
    else localStorage.removeItem(FAST_MODE_KEY);
    return isFastMode();
  }
  function pendingOperations() { return readLocal(FAST_QUEUE_KEY, []); }
  function queueOperation(operation) {
    const queue = pendingOperations();
    if (operation.type === "upsert" && operation.record && operation.record.id) {
      const index = queue.findIndex((item) => item.type === "upsert" && item.entity === operation.entity && item.record && String(item.record.id) === String(operation.record.id));
      if (index >= 0) queue.splice(index, 1);
    }
    if (operation.type === "settings") {
      for (let index = queue.length - 1; index >= 0; index -= 1) if (queue[index].type === "settings") queue.splice(index, 1);
    }
    queue.push({ ...operation, queueId: uid("sync"), queuedAt: new Date().toISOString() });
    writeLocal(FAST_QUEUE_KEY, queue);
    return queue.length;
  }
  function localActivities() { return readLocal(LOCAL_ACTIVITIES_KEY, []); }
  function setLocalActivities(rows) { return writeLocal(LOCAL_ACTIVITIES_KEY, rows || []); }
  function upsertLocalActivity(record) {
    const rows = localActivities();
    const value = { ...record, id: record.id || uid("act"), aggiornatoIl: new Date().toISOString() };
    const index = rows.findIndex((row) => String(row.id) === String(value.id));
    if (index >= 0) rows[index] = { ...rows[index], ...value }; else rows.unshift(value);
    setLocalActivities(rows);
    return value;
  }
  function removeLocalActivity(id) {
    const before = localActivities();
    setLocalActivities(before.filter((row) => String(row.id) !== String(id)));
    return { ok: true };
  }

  function applyPending(data) {
    const copy = data || {};
    pendingOperations().forEach((op) => {
      if (op.type === "settings") copy.settings = { ...(copy.settings || {}), ...(op.values || {}) };
      if (!op.entity || !Array.isArray(copy[op.entity])) return;
      if (op.type === "remove") copy[op.entity] = copy[op.entity].filter((row) => String(row.id || row.username) !== String(op.id));
      if (op.type === "upsert") {
        const row = op.record || {};
        const index = copy[op.entity].findIndex((item) => String(item.id || item.username) === String(row.id || row.username));
        if (index >= 0) copy[op.entity][index] = { ...copy[op.entity][index], ...row }; else copy[op.entity].unshift(row);
      }
    });
    return copy;
  }

  function isConfigured() {
    return !config.demoMode && /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec/.test(config.appsScriptUrl || "");
  }

  function jsonp(action, params = {}, timeout = 15000) {
    return new Promise((resolve, reject) => {
      if (!isConfigured()) return reject(new Error("URL Apps Script non configurato."));
      const callback = "__SEEMAX_MGMT_CB_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
      const script = document.createElement("script");
      const query = new URLSearchParams({ action, callback, t: String(Date.now()) });
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) query.set(key, typeof value === "string" ? value : JSON.stringify(value));
      });
      const cleanup = () => {
        clearTimeout(timer);
        delete window[callback];
        script.remove();
      };
      const timer = setTimeout(() => { cleanup(); reject(new Error("Il database non ha risposto in tempo.")); }, timeout);
      window[callback] = (response) => {
        cleanup();
        if (response && response.ok !== false) { online = true; resolve(response); }
        else reject(new Error((response && response.error) || "Operazione non riuscita."));
      };
      script.onerror = () => { cleanup(); online = false; reject(new Error("Impossibile raggiungere Google Apps Script.")); };
      script.src = config.appsScriptUrl + "?" + query.toString();
      document.head.appendChild(script);
    });
  }

  function authParams() {
    return session ? { agent_username: session.username, agent_key: session.key } : {};
  }

  async function login(username, key) {
    let user;
    if (config.demoMode) user = demo.login(username, key);
    else {
      const response = await jsonp("management_login", { agent_username: username, agent_key: key });
      user = { ...response.user, username, key, authenticatedAt: new Date().toISOString() };
    }
    session = user;
    demo.setSession(user);
    return user;
  }

  function logout() {
    session = null;
    demo.setSession(null);
  }

  async function ping() {
    if (config.demoMode) return { ok: true, mode: "demo" };
    const response = await jsonp("ping");
    online = !!response.ok;
    return response;
  }

  async function bootstrap() {
    if (config.demoMode) {
      const data = demo.bootstrap();
      const local = localActivities();
      if (local.length) data.activities = local; else setLocalActivities(data.activities || []);
      return applyPending(data);
    }
    const response = await jsonp("management_bootstrap", authParams(), 20000);
    const data = response.data;
    const local = localActivities();
    data.activities = local.length ? local : [];
    return applyPending(data);
  }

  async function list(entity) {
    if (config.demoMode) return demo.list(entity);
    const response = await jsonp("management_list", { ...authParams(), entity });
    return response.rows || [];
  }

  async function upsert(entity, record) {
    if (entity === "activities") return upsertLocalActivity(record);
    const value = { ...record, id: record.id || uid(entity.slice(0, 3)), aggiornatoIl: new Date().toISOString() };
    if (isFastMode()) {
      queueOperation({ type: "upsert", entity, record: value });
      return value;
    }
    if (config.demoMode) return demo.upsert(entity, value);
    return remoteUpsert(entity, value);
  }

  async function remoteUpsert(entity, record) {
    if (config.demoMode) return demo.upsert(entity, record);
    let value = { ...record };
    if (entity === "documents" && value.file_base64) {
      const upload = await postForm("management_upload_document", {
        filename: value.file_name || value.nome || "documento",
        mimeType: value.file_type || "application/octet-stream",
        fileBase64: value.file_base64
      });
      const confirmedUpload = upload.pending ? await waitForUpload(upload.requestId) : upload;
      value.url = confirmedUpload.url;
      value.file_id = confirmedUpload.file_id;
      delete value.file_base64;
    }
    const response = await jsonp("management_upsert", { ...authParams(), entity, payload: JSON.stringify(value) }, 30000);
    const row = response.row || {};
    if (response.notifications) row.__notifications = response.notifications;
    return row;
  }

  async function remove(entity, id) {
    if (entity === "activities") return removeLocalActivity(id);
    if (isFastMode()) {
      queueOperation({ type: "remove", entity, id });
      return { ok: true, queued: true };
    }
    if (config.demoMode) return demo.remove(entity, id);
    return jsonp("management_remove", { ...authParams(), entity, id }, 20000);
  }

  async function getSettings() {
    if (config.demoMode) return demo.settings();
    const response = await jsonp("management_settings", authParams());
    return response.settings || {};
  }

  async function saveSettings(values) {
    if (isFastMode()) {
      queueOperation({ type: "settings", values });
      return values;
    }
    if (config.demoMode) return demo.settings(values);
    const response = await jsonp("management_save_settings", { ...authParams(), payload: JSON.stringify(values) });
    return response.settings;
  }

  function postForm(action, values) {
    return new Promise((resolve, reject) => {
      const requestId = uid("post");
      const iframe = document.createElement("iframe");
      const form = document.createElement("form");
      iframe.name = requestId;
      iframe.hidden = true;
      form.method = "POST";
      form.action = config.appsScriptUrl;
      form.target = requestId;
      form.hidden = true;
      const params = { action, requestId, ...authParams(), ...values };
      Object.entries(params).forEach(([name, value]) => {
        const input = document.createElement("input");
        input.type = "hidden"; input.name = name; input.value = value == null ? "" : String(value);
        form.appendChild(input);
      });
      let done = false;
      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        window.removeEventListener("message", onMessage);
        form.remove();
        /* Il POST può proseguire anche se Apps Script non riesce a fare
           postMessage verso GitHub Pages. Conserviamo l'iframe e verifichiamo
           il risultato tramite management_upload_status. */
        setTimeout(() => iframe.remove(), 120000);
        resolve({ ok: true, pending: true, requestId });
      }, 2500);
      function finish(error, result) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        window.removeEventListener("message", onMessage);
        form.remove(); iframe.remove();
        if (error) reject(error); else resolve(result);
      }
      function onMessage(event) {
        const data = event.data || {};
        if (data.requestId !== requestId) return;
        const payload = data.payload || {};
        if (payload.ok === false) finish(new Error(payload.error || "Caricamento non riuscito."));
        else finish(null, payload);
      }
      window.addEventListener("message", onMessage);
      document.body.append(iframe, form);
      form.submit();
    });
  }

  async function waitForUpload(requestId) {
    const started = Date.now();
    let lastError = null;
    while (Date.now() - started < 90000) {
      try {
        const response = await jsonp("management_upload_status", { ...authParams(), requestId }, 12000);
        if (response.completed) {
          if (response.upload && response.upload.ok !== false) return response.upload;
          throw new Error((response.upload && response.upload.error) || "Caricamento non riuscito.");
        }
      } catch (error) {
        lastError = error;
      }
      await new Promise((resolve) => setTimeout(resolve, 900));
    }
    throw new Error(lastError && lastError.message
      ? `Il file non è stato confermato dal database: ${lastError.message}`
      : "Il file non è stato confermato dal database entro 90 secondi.");
  }

  async function syncAll(onProgress) {
    const queue = pendingOperations();
    const results = [];
    for (let index = 0; index < queue.length; index += 1) {
      const op = queue[index];
      if (onProgress) onProgress({ index, total: queue.length, operation: op });
      let result;
      if (op.type === "upsert") result = await remoteUpsert(op.entity, op.record);
      else if (op.type === "remove") result = config.demoMode ? demo.remove(op.entity, op.id) : await jsonp("management_remove", { ...authParams(), entity: op.entity, id: op.id }, 30000);
      else if (op.type === "settings") result = config.demoMode ? demo.settings(op.values) : await jsonp("management_save_settings", { ...authParams(), payload: JSON.stringify(op.values) }, 30000);
      results.push(result);
      writeLocal(FAST_QUEUE_KEY, queue.slice(index + 1));
    }
    if (onProgress) onProgress({ index: queue.length, total: queue.length, done: true });
    return results;
  }

  async function markNotificationsRead() {
    if (config.demoMode) return [];
    const response = await jsonp("management_mark_notifications_read", authParams());
    return response.notifications || [];
  }

  function nextPracticeNumber() {
    return config.demoMode ? demo.nextPracticeNumber() : "AUTO";
  }

  function resetDemo() { return demo.reset(); }
  function exportDemo() { return demo.exportJson(); }
  function getSession() { return session; }
  function isAdmin() { return !!session && String(session.role || "").toUpperCase() === "ADMIN"; }
  function status() { return { demo: config.demoMode, configured: isConfigured(), online, fast: isFastMode(), pending: pendingOperations().length }; }

  window.SeemaxApi = { login, logout, ping, bootstrap, list, upsert, remove, getSettings, saveSettings, markNotificationsRead, nextPracticeNumber, resetDemo, exportDemo, getSession, isAdmin, status, isFastMode, setFastMode, pendingOperations, syncAll, localActivities };
})();
