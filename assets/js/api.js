(function () {
  "use strict";

  const config = window.SEEMAX_APP_CONFIG;
  const demo = window.SeemaxDemoStore;
  const FAST_MODE_KEY = "SEEMAX_MANAGEMENT_FAST_MODE_V1";
  const FAST_QUEUE_KEY = "SEEMAX_MANAGEMENT_FAST_QUEUE_V1";
  const LOCAL_ACTIVITIES_KEY = "SEEMAX_MANAGEMENT_LOCAL_ACTIVITIES_V1";
  const BOOTSTRAP_CACHE_PREFIX = "SEEMAX_MANAGEMENT_BOOTSTRAP_V1_";
  const DEMO_FIRST_ACCESS_PREFIX = "SEEMAX_MANAGEMENT_DEMO_ACCESSED_V1_";
  const POST_MESSAGE_GRACE_MS = 2600;
  const MUTATION_POST_GRACE_MS = 700;
  const MUTATION_POLL_INTERVAL_MS = 500;
  const MUTATION_STATUS_WAIT_MS = 2500;
  const LATE_POST_MESSAGE_WINDOW_MS = 30000;
  let session = demo.getSession();
  let online = !!config.demoMode;
  let serverVersion = "";
  let bootstrapPromise = null;
  let lastPerformance = null;

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

  function transportError(message, code) {
    const error = new Error(message);
    error.code = code || "NETWORK_ERROR";
    error.transient = true;
    return error;
  }

  function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

  function captureMutationPerformance(action, result, clientStarted, error = null, transport = {}) {
    const backend = result && result.performance ? result.performance : null;
    const clientTotalMs = Math.max(0, Date.now() - Number(clientStarted || Date.now()));
    const backendTotalMs = Number(backend && backend.total_ms || 0);
    lastPerformance = {
      action: String(action || "mutation"),
      observedAt: new Date().toISOString(),
      ok: !error,
      client_total_ms: clientTotalMs,
      backend_total_ms: backendTotalMs,
      transport_overhead_ms: Math.max(0, clientTotalMs - backendTotalMs),
      transport_mode: String(transport.mode || (error ? "error" : "unknown")),
      post_wait_ms: Number(transport.post_wait_ms || 0),
      iframe_load_ms: Number(transport.iframe_load_ms || 0),
      late_message_ms: Number(transport.late_message_ms || 0),
      status_poll_count: Number(transport.status_poll_count || 0),
      status_poll_ms: Number(transport.status_poll_ms || 0),
      status_server_wait_ms: Number(transport.status_server_wait_ms || 0),
      fallback_triggered: transport.fallback_triggered === true,
      retry_post: transport.retry_post === true,
      lock_wait_ms: Number(backend && backend.lock_wait_ms || 0),
      lock_hold_ms: Number(backend && backend.lock_hold_ms || 0),
      totals_ms: backend && backend.totals_ms || {},
      events: backend && Array.isArray(backend.events) ? backend.events : [],
      error: error ? String(error.message || error) : ""
    };
    if (config.performanceDiagnostics && window.console && typeof console.info === "function") {
      console.info("[SEEMAX PERFORMANCE]", {
        action: lastPerformance.action,
        client_total_ms: lastPerformance.client_total_ms,
        backend_total_ms: lastPerformance.backend_total_ms,
        transport_overhead_ms: lastPerformance.transport_overhead_ms,
        transport_mode: lastPerformance.transport_mode,
        post_wait_ms: lastPerformance.post_wait_ms,
        iframe_load_ms: lastPerformance.iframe_load_ms,
        late_message_ms: lastPerformance.late_message_ms,
        status_poll_count: lastPerformance.status_poll_count,
        status_poll_ms: lastPerformance.status_poll_ms,
        status_server_wait_ms: lastPerformance.status_server_wait_ms,
        fallback_triggered: lastPerformance.fallback_triggered,
        lock_wait_ms: lastPerformance.lock_wait_ms,
        lock_hold_ms: lastPerformance.lock_hold_ms,
        totals_ms: lastPerformance.totals_ms,
        ok: lastPerformance.ok
      });
      if (lastPerformance.events.length && typeof console.table === "function") console.table(lastPerformance.events);
    }
    return lastPerformance;
  }

  function getLastPerformance() {
    return lastPerformance ? JSON.parse(JSON.stringify(lastPerformance)) : null;
  }

  async function retryRead(operation, attempts = 2) {
    let lastError = null;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try { return await operation(attempt); }
      catch (error) {
        lastError = error;
        if (!error || error.transient !== true || attempt === attempts - 1) throw error;
        await wait(500 + attempt * 900);
      }
    }
    throw lastError;
  }

  function jsonp(action, params = {}, timeout = 45000) {
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
      const timer = setTimeout(() => { cleanup(); online = false; reject(transportError("Il database non ha risposto in tempo.", "TIMEOUT")); }, timeout);
      window[callback] = (response) => {
        cleanup();
        if (response && response.ok !== false) { online = true; resolve(response); }
        else reject(new Error((response && response.error) || "Operazione non riuscita."));
      };
      script.onerror = () => { cleanup(); online = false; reject(transportError("Impossibile raggiungere Google Apps Script.", "NETWORK_ERROR")); };
      script.src = config.appsScriptUrl + "?" + query.toString();
      document.head.appendChild(script);
    });
  }

  function authParams() {
    return session ? { agent_username: session.username, agent_key: session.key } : {};
  }

  function bootstrapCacheKey() { return BOOTSTRAP_CACHE_PREFIX + String((session || {}).username || "anonymous"); }
  function cachedBootstrap(maxAgeMs = 12 * 60 * 60 * 1000) {
    const cached = readLocal(bootstrapCacheKey(), null);
    if (!cached || !cached.data || Date.now() - Number(cached.savedAt || 0) > maxAgeMs) return null;
    return applyPending(cached.data);
  }
  function saveBootstrapCache(data) {
    try { writeLocal(bootstrapCacheKey(), { savedAt: Date.now(), data }); } catch (error) { /* cache opzionale */ }
    return data;
  }

  async function login(username, key) {
    let user;
    if (config.demoMode) {
      user = demo.login(username, key);
      const marker = DEMO_FIRST_ACCESS_PREFIX + String(user.username || username || "");
      user = { ...user, firstAccess: localStorage.getItem(marker) !== "1", primo_accesso: localStorage.getItem(marker) !== "1" };
      localStorage.setItem(marker, "1");
    }
    else {
      const response = await retryRead((attempt) => jsonp("management_login", { agent_username: username, agent_key: key }, attempt ? 75000 : 45000), 2);
      serverVersion = String(response.version || serverVersion || "");
      const firstAccess = response.first_access === true || response.user && response.user.primo_accesso === true;
      user = { ...response.user, username, key, firstAccess, primo_accesso: firstAccess, authenticatedAt: new Date().toISOString() };
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
    const response = await retryRead((attempt) => jsonp("ping", {}, attempt ? 60000 : 30000), 2);
    serverVersion = String(response.version || serverVersion || "");
    online = !!response.ok;
    return response;
  }

  async function health() {
    if (config.demoMode) return { ok: true, mode: "demo", version: config.version, elapsed_ms: 0 };
    const response = await retryRead((attempt) => jsonp("management_health", authParams(), attempt ? 90000 : 55000), 2);
    serverVersion = String(response.version || serverVersion || "");
    online = !!response.ok;
    return response;
  }

  async function bootstrap(options = {}) {
    if (config.demoMode) {
      const data = demo.bootstrap();
      const communications = demoAdminContent();
      data.database_meta = { loaded_at: new Date().toISOString(), inventory_source: "DEMO_LOCALE", products_count: (data.products || []).length };
      data.patchNotes = communications.patchNotes;
      if (isAdmin()) data.adminContent = communications;
      const local = localActivities();
      if (local.length) data.activities = local; else setLocalActivities(data.activities || []);
      return applyPending(data);
    }
    if (bootstrapPromise && !options.force) return bootstrapPromise;
    const request = (async () => {
      const response = await retryRead((attempt) => jsonp("management_bootstrap", authParams(), attempt ? 90000 : 55000), 2);
      serverVersion = String(response.version || serverVersion || "");
      if (serverVersion && !serverVersion.includes(String(config.version))) {
        const versionError = new Error(`Backend non aggiornato: atteso ${config.version}, ricevuto ${serverVersion}.`);
        versionError.code = "BACKEND_VERSION_MISMATCH";
        throw versionError;
      }
      const data = response.data;
      if (response.user && session) {
        session = { ...session, ...response.user, key: session.key };
        demo.setSession(session);
      }
      data.database_meta = response.database_meta || {};
      const local = localActivities();
      data.activities = local.length ? local : [];
      saveBootstrapCache(data);
      return applyPending(data);
    })();
    bootstrapPromise = request;
    try { return await request; }
    finally { if (bootstrapPromise === request) bootstrapPromise = null; }
  }

  async function list(entity) {
    if (config.demoMode) return demo.list(entity);
    const response = await retryRead((attempt) => jsonp("management_list", { ...authParams(), entity }, attempt ? 65000 : 40000), 2);
    return response.rows || [];
  }

  async function upsert(entity, record) {
    if (entity === "activities") return upsertLocalActivity(record);
    const value = { ...record, id: record.id || uid(entity.slice(0, 3)), request_token: record.request_token || uid("save-req"), aggiornatoIl: new Date().toISOString() };
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
    const response = await postMutation("management_upsert", { entity, payload: JSON.stringify(value) }, {
      entity,
      requestToken: value.request_token,
      maxWait: ["clients", "practices"].includes(entity) ? 150000 : 120000
    });
    const row = response.row || {};
    if (response.notifications) row.__notifications = response.notifications;
    return row;
  }

  async function remove(entity, id, expectedRecordVersion = 0) {
    if (entity === "activities") return removeLocalActivity(id);
    if (isFastMode()) {
      queueOperation({ type: "remove", entity, id, expectedRecordVersion });
      return { ok: true, queued: true };
    }
    if (config.demoMode) return demo.remove(entity, id);
    return jsonp("management_remove", { ...authParams(), entity, id, expected_record_version: expectedRecordVersion }, 60000);
  }

  async function getSettings() {
    if (config.demoMode) return demo.settings();
    const response = await jsonp("management_settings", authParams());
    return response.settings || {};
  }

  async function verifyVat(vatNumber) {
    if (config.demoMode) return { ok: true, valid: false, name: "", demo: true };
    return jsonp("management_verify_vat", { ...authParams(), vatNumber: String(vatNumber || "").replace(/\D/g, "") }, 30000);
  }

  async function updatePracticeDocuments(practiceId, documentsJson) {
    if (config.demoMode) {
      const current = demo.list("practices").find((row) => String(row.id) === String(practiceId)) || { id: practiceId };
      return demo.upsert("practices", { ...current, documenti_caricati_json: documentsJson, aggiornatoIl: new Date().toISOString() });
    }
    const requestToken = uid("practice-docs");
    const response = await postMutation("management_update_practice_documents", {
      practice_id: practiceId,
      documenti_caricati_json: documentsJson,
      request_token: requestToken
    }, { entity: "practices", requestToken });
    return response.row || {};
  }

  async function saveSettings(values) {
    if (isFastMode()) {
      queueOperation({ type: "settings", values });
      return values;
    }
    if (config.demoMode) return demo.settings(values);
    const response = await jsonp("management_save_settings", { ...authParams(), payload: JSON.stringify(values) }, 60000);
    return response.settings;
  }

  function demoAdminContent() {
    const settings = demo.settings();
    return {
      revision: Number(settings.admin_content_revision || 0),
      welcome: {
        enabled: settings.welcome_enabled || "SI",
        display_mode: settings.welcome_display_mode || "ONCE",
        publication_key: settings.welcome_publication_key || `welcome-${config.version}`,
        publication_revision: Math.max(1, Number(settings.welcome_message_revision || 1)),
        published_at: settings.welcome_published_at || "",
        published_by: settings.welcome_published_by || "",
        kicker: settings.welcome_kicker || "IL TUO NUOVO CENTRO OPERATIVO",
        title: settings.welcome_title || "BENVENUTO IN SEEMAX MANAGEMENT SUITE!",
        message: settings.welcome_message || "Seemax Management Suite raccoglie clienti, pratiche, preventivi e documenti in un unico ambiente.",
        primary_button: settings.welcome_primary_button || "Spiegami tutto"
      },
      patchNotes: {
        enabled: "SI",
        display_mode: "ONCE",
        publication_key: `patch-${config.version}`,
        publication_revision: Math.max(1, Number(settings.patch_notes_revision || 1)),
        published_at: "",
        published_by: "",
        version: config.version,
        label: `SEEMAX MANAGEMENT SUITE ${config.version}`,
        title: "Aggiornamento",
        intro: "Personalizza qui le novità mostrate dal Management Suite e dal Quotation Planner.",
        footer: "",
        items: []
      }
    };
  }

  async function getAdminContent() {
    if (!isAdmin()) throw new Error("Funzione riservata all'amministratore.");
    if (config.demoMode) return demoAdminContent();
    const response = await jsonp("management_admin_content", authParams(), 60000);
    return response.content || {};
  }

  async function saveAdminContent(content) {
    if (!isAdmin()) throw new Error("Funzione riservata all'amministratore.");
    if (isFastMode()) throw new Error("Salva le comunicazioni in Modalità Standard.");
    if (config.demoMode) {
      const current = demoAdminContent();
      const source = content || {};
      const section = String(source.section || "ALL").toUpperCase();
      const republish = source.republish === true || String(source.republish || "NO").toUpperCase() === "SI";
      const next = { ...current, revision: Number(source.expected_revision || current.revision || 0) + 1 };
      if (["ALL", "WELCOME", "BENVENUTO"].includes(section)) {
        next.welcome = { ...current.welcome, ...(source.welcome || {}) };
        if (republish) {
          next.welcome.publication_key = uid("welcome-pub");
          next.welcome.publication_revision = Math.max(1, Number(current.welcome.publication_revision || 1)) + 1;
          next.welcome.published_at = new Date().toISOString();
          next.welcome.published_by = String((session || {}).username || "demo");
        }
      }
      if (["ALL", "PATCH", "PATCHNOTES", "PATCH_NOTES"].includes(section)) {
        next.patchNotes = { ...current.patchNotes, ...(source.patchNotes || {}) };
        if (republish) {
          next.patchNotes.publication_key = uid("patch-pub");
          next.patchNotes.publication_revision = Math.max(1, Number(current.patchNotes.publication_revision || 1)) + 1;
          next.patchNotes.published_at = new Date().toISOString();
          next.patchNotes.published_by = String((session || {}).username || "demo");
        }
      }
      return next;
    }
    const requestToken = uid("admin-content");
    const response = await postMutation("management_save_admin_content", {
      payload: JSON.stringify(content || {}),
      request_token: requestToken
    }, { requestToken, maxWait: 120000 });
    return response.content || content || {};
  }


  async function markMessageSeen(messageType, content = {}) {
    const normalized = String(messageType || "").toUpperCase() === "WELCOME" ? "WELCOME" : "PATCH_NOTES";
    const field = normalized === "WELCOME" ? "welcome_seen_revision" : "patch_seen_revision";
    const revision = Math.max(1, Number(content.publicationRevision || content.publication_revision || 1));
    if (!session) return { ok: false, offline: true };
    if (config.demoMode) {
      session = { ...session, [field]: Math.max(revision, Number(session[field] || 0)) };
      demo.setSession(session);
      return { ok: true, message_state: { [field]: session[field] }, user: session };
    }
    const response = await jsonp("management_mark_message_seen", {
      ...authParams(),
      message_type: normalized,
      publication_key: String(content.publicationKey || content.publication_key || ""),
      publication_revision: revision
    }, 45000);
    if (response.user) {
      session = { ...session, ...response.user, key: session.key };
      demo.setSession(session);
    } else if (!response.stale) {
      session = { ...session, [field]: Math.max(revision, Number(session[field] || 0)) };
      demo.setSession(session);
    }
    return response;
  }

  async function saveProfile(values) {
    const source = values || {};
    const payload = {};
    const owns = (field) => Object.prototype.hasOwnProperty.call(source, field);
    if (owns("nome_profilo")) payload.nome_profilo = String(source.nome_profilo || "").slice(0, 80);
    if (owns("descrizione_profilo")) payload.descrizione_profilo = String(source.descrizione_profilo || "").slice(0, 420);
    if (owns("tema_profilo")) payload.tema_profilo = String(source.tema_profilo || "");
    if (owns("colore_profilo")) payload.colore_profilo = String(source.colore_profilo || "");
    if (owns("icona_profilo")) payload.icona_profilo = String(source.icona_profilo || "");
    if (owns("bacheca_trofei_json")) payload.bacheca_trofei_json = String(source.bacheca_trofei_json || "[]");
    if (config.demoMode) {
      const current = demo.list("users").find((user) => String(user.username || "") === String((session || {}).username || "")) || { username: session.username, id: session.username };
      const saved = demo.upsert("users", { ...current, ...payload });
      session = { ...session, ...saved }; demo.setSession(session);
      return saved;
    }
    const response = await jsonp("management_save_profile", { ...authParams(), payload: JSON.stringify(payload) }, 60000);
    session = { ...session, ...(response.user || {}) }; demo.setSession(session);
    return response.user || payload;
  }

  function postForm(action, values, options = {}) {
    return new Promise((resolve, reject) => {
      const started = Date.now();
      const requestId = String(values && values.requestId || uid("post"));
      const iframe = document.createElement("iframe");
      const form = document.createElement("form");
      const frameTarget = `${requestId}-${uid("frame")}`;
      const keepLateResponse = options.keepLateResponse === true;
      const graceMs = Math.max(100, Number(options.graceMs || POST_MESSAGE_GRACE_MS));
      const stats = { iframe_load_ms: 0, late_message_ms: 0, message_origin: "" };
      let submitted = false;
      let initialSettled = false;
      let finalSettled = false;
      let lateResolve = null;
      let lateReject = null;
      let expiryTimer = 0;
      const lateMessagePromise = keepLateResponse ? new Promise((lateOk, lateFail) => {
        lateResolve = lateOk;
        lateReject = lateFail;
      }) : null;

      iframe.name = frameTarget;
      iframe.hidden = true;
      iframe.setAttribute("aria-hidden", "true");
      iframe.addEventListener("load", () => {
        if (submitted && !stats.iframe_load_ms) stats.iframe_load_ms = Date.now() - started;
      });
      form.method = "POST";
      form.action = config.appsScriptUrl;
      form.target = frameTarget;
      form.hidden = true;
      const params = {
        action,
        ...authParams(),
        ...values,
        requestId,
        response_origin: String(window.location.origin || "")
      };
      Object.entries(params).forEach(([name, value]) => {
        const input = document.createElement("input");
        input.type = "hidden"; input.name = name; input.value = value == null ? "" : String(value);
        form.appendChild(input);
      });

      const cleanup = (resolveLate = false) => {
        clearTimeout(timer);
        clearTimeout(expiryTimer);
        window.removeEventListener("message", onMessage);
        form.remove(); iframe.remove();
        if (resolveLate && lateResolve) { lateResolve(null); lateResolve = null; lateReject = null; }
      };

      const cancelTransport = () => cleanup(true);

      function finish(error, result, eventOrigin = "") {
        if (finalSettled) return;
        finalSettled = true;
        stats.message_origin = String(eventOrigin || "");
        const elapsed = Date.now() - started;
        if (initialSettled) stats.late_message_ms = elapsed;
        const payload = result && typeof result === "object" ? result : { ok: true, value: result };
        payload.__seemax_transport = {
          mode: initialSettled ? "post_message_late" : "post_message",
          post_wait_ms: elapsed,
          iframe_load_ms: Number(stats.iframe_load_ms || 0),
          late_message_ms: initialSettled ? elapsed : 0,
          fallback_triggered: initialSettled,
          message_origin: stats.message_origin
        };
        if (!initialSettled) {
          initialSettled = true;
          cleanup(false);
          if (error) reject(error); else resolve(payload);
          return;
        }
        window.removeEventListener("message", onMessage);
        form.remove(); iframe.remove();
        clearTimeout(expiryTimer);
        if (error) { if (lateReject) lateReject(error); }
        else if (lateResolve) lateResolve(payload);
        lateResolve = null; lateReject = null;
      }

      function onMessage(event) {
        const data = event.data || {};
        if (data.requestId !== requestId) return;
        const payload = data.payload || {};
        if (payload.ok === false) finish(new Error(payload.error || "Caricamento non riuscito."), null, event.origin);
        else finish(null, payload, event.origin);
      }

      const timer = setTimeout(() => {
        if (finalSettled || initialSettled) return;
        initialSettled = true;
        form.remove();
        if (!keepLateResponse) {
          window.removeEventListener("message", onMessage);
          setTimeout(() => iframe.remove(), 120000);
        } else {
          expiryTimer = setTimeout(() => cleanup(true), LATE_POST_MESSAGE_WINDOW_MS);
        }
        resolve({
          ok: true,
          pending: true,
          requestId,
          __lateMessagePromise: lateMessagePromise,
          __cancelTransport: cancelTransport,
          __transportStats: stats,
          __seemax_transport: {
            mode: "status_poll_pending",
            post_wait_ms: Date.now() - started,
            iframe_load_ms: Number(stats.iframe_load_ms || 0),
            fallback_triggered: true
          }
        });
      }, graceMs);

      window.addEventListener("message", onMessage);
      document.body.append(iframe, form);
      submitted = true;
      form.submit();
    });
  }

  async function waitForMutation(requestId, options = {}) {
    const started = Date.now();
    let lastError = null;
    let statusPollCount = 0;
    let statusPollMs = 0;
    let statusServerWaitMs = 0;
    while (Date.now() - started < Number(options.maxWait || 120000)) {
      const pollStarted = Date.now();
      statusPollCount += 1;
      let response;
      try {
        response = await jsonp("management_mutation_status", {
          ...authParams(),
          requestId,
          wait_ms: Math.min(MUTATION_STATUS_WAIT_MS, Math.max(0, Number(options.maxWait || 120000) - (Date.now() - started)))
        }, 30000);
      } catch (error) {
        statusPollMs += Date.now() - pollStarted;
        if (!error.transient) throw error;
        lastError = error;
        await wait(MUTATION_POLL_INTERVAL_MS);
        continue;
      }
      statusPollMs += Date.now() - pollStarted;
      statusServerWaitMs += Number(response.waited_ms || 0);
      if (response.completed) {
        const result = response.result || {};
        if (result.ok === false) throw new Error(result.error || "Salvataggio non riuscito.");
        return {
          result,
          transport: {
            mode: "status_poll_race",
            status_poll_count: statusPollCount,
            status_poll_ms: statusPollMs,
            status_server_wait_ms: statusServerWaitMs,
            confirmation_ms: Date.now() - started,
            fallback_triggered: true
          }
        };
      }
      await wait(MUTATION_POLL_INTERVAL_MS);
    }
    if (!options.skipFallback && options.entity && options.requestToken) {
      try {
        const rows = await list(options.entity);
        const existing = rows.find((row) => String(row.request_token || "") === String(options.requestToken));
        if (existing) {
          return {
            result: { ok: true, row: existing, recovered: true },
            transport: {
              mode: "record_recovery",
              status_poll_count: statusPollCount,
              status_poll_ms: statusPollMs,
              status_server_wait_ms: statusServerWaitMs,
              confirmation_ms: Date.now() - started,
              fallback_triggered: true
            }
          };
        }
      } catch (error) { lastError = error; }
    }
    const confirmationError = new Error(lastError && lastError.message
      ? `Il salvataggio non è stato confermato: ${lastError.message}`
      : "Il salvataggio non è stato confermato dal database.");
    confirmationError.code = "MUTATION_UNCONFIRMED";
    confirmationError.transient = true;
    confirmationError.transport = {
      mode: "status_poll_timeout",
      status_poll_count: statusPollCount,
      status_poll_ms: statusPollMs,
      status_server_wait_ms: statusServerWaitMs,
      confirmation_ms: Date.now() - started,
      fallback_triggered: true
    };
    throw confirmationError;
  }

  function extractPostHandle(response) {
    const transport = { ...((response && response.__seemax_transport) || {}) };
    const lateMessagePromise = response && response.__lateMessagePromise || null;
    const cancelTransport = response && response.__cancelTransport || (() => {});
    const transportStats = response && response.__transportStats || {};
    if (response) {
      delete response.__seemax_transport;
      delete response.__lateMessagePromise;
      delete response.__cancelTransport;
      delete response.__transportStats;
    }
    return { transport, lateMessagePromise, cancelTransport, transportStats };
  }

  async function confirmPostedMutation(response, options = {}) {
    const handle = extractPostHandle(response);
    if (!response.pending) return { result: response, transport: handle.transport };
    const statusPromise = waitForMutation(response.requestId, options).then((confirmation) => ({ source: "status", confirmation }));
    const candidates = [statusPromise];
    if (handle.lateMessagePromise) {
      candidates.push(handle.lateMessagePromise.then((payload) => {
        if (!payload) return new Promise(() => {});
        const lateTransport = { ...(payload.__seemax_transport || {}) };
        delete payload.__seemax_transport;
        return { source: "message", confirmation: { result: payload, transport: lateTransport } };
      }));
    }
    try {
      const winner = await Promise.race(candidates);
      const liveStats = handle.transportStats || {};
      return {
        result: winner.confirmation.result,
        transport: {
          ...handle.transport,
          ...winner.confirmation.transport,
          mode: winner.source === "message" ? "post_message_late" : winner.confirmation.transport.mode,
          iframe_load_ms: Number(winner.confirmation.transport.iframe_load_ms || liveStats.iframe_load_ms || handle.transport.iframe_load_ms || 0),
          late_message_ms: Number(winner.confirmation.transport.late_message_ms || liveStats.late_message_ms || 0)
        }
      };
    } finally {
      handle.cancelTransport();
    }
  }

  async function postMutation(action, values, options = {}) {
    const clientStarted = Date.now();
    const mutationRequestId = options.requestToken ? `mutation-${String(options.requestToken).replace(/[^A-Za-z0-9_-]/g, "-")}` : uid("mutation");
    const requestValues = { ...values, requestId: mutationRequestId };
    let transport = {};
    try {
      let response = await postForm(action, requestValues, { keepLateResponse: true, graceMs: MUTATION_POST_GRACE_MS });
      let result;
      try {
        const confirmation = await confirmPostedMutation(response, { ...options, maxWait: Math.min(Number(options.maxWait || 120000), 18000), skipFallback: true });
        result = confirmation.result;
        transport = { ...transport, ...confirmation.transport };
      } catch (error) {
        if (!error || error.code !== "MUTATION_UNCONFIRMED") throw error;
        transport = { ...transport, ...((error && error.transport) || {}) };
        response = await postForm(action, requestValues, { keepLateResponse: true, graceMs: MUTATION_POST_GRACE_MS });
        const previousPollCount = Number(transport.status_poll_count || 0);
        const previousPollMs = Number(transport.status_poll_ms || 0);
        const previousServerWaitMs = Number(transport.status_server_wait_ms || 0);
        const confirmation = await confirmPostedMutation(response, options);
        result = confirmation.result;
        transport = {
          ...transport,
          ...confirmation.transport,
          retry_post: true,
          status_poll_count: previousPollCount + Number(confirmation.transport.status_poll_count || 0),
          status_poll_ms: previousPollMs + Number(confirmation.transport.status_poll_ms || 0),
          status_server_wait_ms: previousServerWaitMs + Number(confirmation.transport.status_server_wait_ms || 0)
        };
      }
      online = true;
      captureMutationPerformance(action, result, clientStarted, null, transport);
      return result;
    } catch (error) {
      transport = { ...transport, ...((error && error.transport) || {}) };
      captureMutationPerformance(action, null, clientStarted, error, transport);
      throw error;
    }
  }

  async function waitForUpload(requestId) {
    const started = Date.now();
    let lastError = null;
    while (Date.now() - started < 180000) {
      try {
        const response = await jsonp("management_upload_status", { ...authParams(), requestId }, 45000);
        if (response.completed) {
          if (response.upload && response.upload.ok !== false) return response.upload;
          throw new Error((response.upload && response.upload.error) || "Caricamento non riuscito.");
        }
      } catch (error) {
        lastError = error;
      }
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }
    throw new Error(lastError && lastError.message
      ? `Il file non è stato confermato dal database: ${lastError.message}`
      : "Il file non è stato confermato dal database entro 180 secondi.");
  }

  async function syncAll(onProgress) {
    const queue = pendingOperations();
    const results = [];
    for (let index = 0; index < queue.length; index += 1) {
      const op = queue[index];
      if (onProgress) onProgress({ index, total: queue.length, operation: op });
      let result;
      if (op.type === "upsert") result = await remoteUpsert(op.entity, op.record);
      else if (op.type === "remove") result = config.demoMode ? demo.remove(op.entity, op.id) : await jsonp("management_remove", { ...authParams(), entity: op.entity, id: op.id, expected_record_version: op.expectedRecordVersion || 0 }, 60000);
      else if (op.type === "settings") result = config.demoMode ? demo.settings(op.values) : await jsonp("management_save_settings", { ...authParams(), payload: JSON.stringify(op.values) }, 60000);
      results.push(result);
      writeLocal(FAST_QUEUE_KEY, queue.slice(index + 1));
    }
    if (onProgress) onProgress({ index: queue.length, total: queue.length, done: true });
    return results;
  }

  async function adjustInventory(values) {
    if (!isAdmin()) throw new Error("Funzione riservata all'amministratore.");
    if (isFastMode()) throw new Error("Il magazzino condiviso richiede la Modalità Standard per evitare conflitti tra utenti.");
    const payload = { ...(values || {}), request_token: (values && values.request_token) || uid("stock-req") };
    if (config.demoMode) {
      const previousMovement = demo.list("movements").find((row) => String(row.request_token || "") === String(payload.request_token));
      if (previousMovement) {
        return {
          product: demo.list("products").find((row) => String(row.id) === String(previousMovement.product_id)) || {},
          movement: previousMovement,
          duplicate: true
        };
      }
      const product = demo.list("products").find((row) => String(row.id) === String(payload.product_id));
      if (!product) throw new Error("Prodotto magazzino non trovato.");
      const operation = String(payload.operazione || "").toUpperCase();
      const quantity = Number(payload.quantita || 0);
      const before = Number(product.giacenza_attuale || 0);
      const after = before + (operation === "CARICO" ? quantity : -quantity);
      if (!["CARICO", "SCARICO"].includes(operation) || !Number.isInteger(quantity) || quantity <= 0) throw new Error("Movimento non valido.");
      if (after < 0) throw new Error(`Lo scarico supera la giacenza disponibile: ${before} cabinet.`);
      const savedProduct = demo.upsert("products", { ...product, giacenza_attuale: after, aggiornatoIl: new Date().toISOString() });
      const movement = demo.upsert("movements", {
        id: uid("mov"), data: new Date().toISOString(), product_id: product.id, sku: product.sku || product.id,
        prodotto: `${product.nome || product.id} ${product.cabX || ""}x${product.cabY || ""}`,
        quantita: operation === "CARICO" ? quantity : -quantity, tipo_movimento: `${operation}_MANUALE`,
        giacenza_prima: before, giacenza_dopo: after, username: (session || {}).username || "demo", note: payload.descrizione || "",
        request_token: payload.request_token
      });
      return { product: savedProduct, movement };
    }
    const response = await postMutation("management_inventory_adjust", { payload: JSON.stringify(payload) }, {
      entity: "movements",
      requestToken: payload.request_token
    });
    /* La risposta e poi verificata rileggendo PRODOTTI_LED, la stessa fonte
       mostrata nel Catalogo. */
    const products = await list("products");
    const confirmed = products.find((row) => String(row.id) === String(response.product && response.product.id || payload.product_id));
    return { product: confirmed || response.product, products, movement: response.movement, duplicate: response.duplicate === true };
  }

  async function setPracticeStockWarning(practice, visible) {
    if (!isAdmin()) throw new Error("Funzione riservata all'amministratore.");
    const requestToken = uid("stock-warning");
    const response = await postMutation("management_set_practice_stock_warning", {
      practice_id: practice.id,
      visible: visible ? "SI" : "NO",
      expected_record_version: Number(practice.record_version || 0),
      request_token: requestToken
    }, { entity: "practices", requestToken });
    return response.row || {};
  }

  async function createPracticeFromQuote(sourcePayload) {
    const payload = { ...(sourcePayload || {}), request_token: (sourcePayload && sourcePayload.request_token) || uid("quote-practice") };
    if (config.demoMode) {
      const sessionUser = session || {};
      const clientId = String(payload.cliente_id_gestionale || "") || uid("cli");
      let client = demo.list("clients").find((row) => String(row.id) === clientId);
      if (!client) client = demo.upsert("clients", {
        id: clientId,
        ragioneSociale: payload.cliente_azienda || payload.cliente_referente || "Cliente S.Q.P.",
        referente: payload.cliente_referente || "",
        piva: payload.cliente_piva_cf || "",
        email: payload.cliente_email || "",
        telefono: payload.cliente_telefono || "",
        comune: payload.cliente_localita || "",
        citta: payload.cliente_localita || "",
        agent_username: sessionUser.username || "",
        creato_da_username: sessionUser.username || "",
        creato_da_nome: sessionUser.displayName || sessionUser.nome_visualizzato || sessionUser.username || "",
        condiviso: "NO",
        creatoIl: new Date().toISOString()
      });
      const existing = demo.list("practices").find((row) => String(row.preventivo_id || "") === String(payload.preventivo_id || "") && String(row.agent_username || "") === String(sessionUser.username || ""));
      if (existing) return { ok: true, existing: true, practice: existing, client };
      const items = Array.isArray(payload.righe) ? payload.righe : [];
      const numero = demo.nextPracticeNumber();
      const practice = demo.upsert("practices", {
        id: `PR-${numero}`,
        numero,
        clientId: client.id,
        cliente: client.ragioneSociale,
        titolo: items.map((item) => `${item.prodotto || "Ledwall"} ${item.misura_m || item.misura_cm || ""}`).join(" + "),
        stato: "Inserita",
        tipo_pratica: payload.tipo_pratica,
        finanziaria: payload.tipo_pratica === "NOLEGGIO" ? "Grenke" : payload.tipo_pratica === "LEASING" ? "IFIS" : "Acquisto diretto",
        valore: Number(payload.valore || 0),
        valore_provvigione: Number(payload.valore_provvigione || 0),
        preventivo_id: payload.preventivo_id || "",
        origine: "SEEMAX QUOTATION PLANNER",
        agent_username: sessionUser.username || "",
        agente: sessionUser.displayName || sessionUser.nome_visualizzato || sessionUser.username || "",
        righe_json: JSON.stringify(items),
        request_token: payload.request_token,
        creatoIl: new Date().toISOString(),
        aggiornatoIl: new Date().toISOString()
      });
      return { ok: true, practice, client };
    }
    const response = await postMutation("management_create_from_quote", {
      payload: JSON.stringify(payload)
    }, { entity: "practices", requestToken: payload.request_token, maxWait: 150000 });
    /* Se la cache temporanea dell'esito e gia scaduta, postMutation puo
       recuperare la pratica dal relativo request_token. Uniformiamo tale
       risposta a quella restituita direttamente dal backend, cosi il
       Quotation Planner non deve conoscere il percorso di ripristino. */
    if (!response.practice && response.row) response.practice = response.row;
    return response;
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
  function isFirstAccess() { return !!session && (session.firstAccess === true || session.primo_accesso === true); }
  function consumeFirstAccess() {
    const shouldShow = isFirstAccess();
    if (session && shouldShow) {
      session = { ...session, firstAccess: false, primo_accesso: false };
      demo.setSession(session);
    }
    return shouldShow;
  }
  function isAdmin() { return !!session && String(session.role || "").toUpperCase() === "ADMIN"; }
  function status() {
    return {
      demo: config.demoMode,
      configured: isConfigured(),
      online,
      fast: isFastMode(),
      pending: pendingOperations().length,
      serverVersion,
      lastPerformance: getLastPerformance()
    };
  }

  window.SeemaxApi = { login, logout, ping, health, bootstrap, cachedBootstrap, saveBootstrapCache, list, upsert, remove, getSettings, saveSettings, getAdminContent, saveAdminContent, markMessageSeen, saveProfile, verifyVat, updatePracticeDocuments, adjustInventory, setPracticeStockWarning, createPracticeFromQuote, markNotificationsRead, nextPracticeNumber, resetDemo, exportDemo, getSession, isFirstAccess, consumeFirstAccess, isAdmin, status, getLastPerformance, isFastMode, setFastMode, pendingOperations, syncAll, localActivities };
})();
