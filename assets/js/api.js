(function () {
  "use strict";

  const config = window.SEEMAX_APP_CONFIG;
  const demo = window.SeemaxDemoStore;
  const FAST_MODE_KEY = "SEEMAX_MANAGEMENT_FAST_MODE_V1";
  const FAST_QUEUE_KEY = "SEEMAX_MANAGEMENT_FAST_QUEUE_V1";
  const LOCAL_ACTIVITIES_KEY = "SEEMAX_MANAGEMENT_LOCAL_ACTIVITIES_V1";
  const BOOTSTRAP_CACHE_PREFIX = "SEEMAX_MANAGEMENT_BOOTSTRAP_V1_";
  const DEMO_FIRST_ACCESS_PREFIX = "SEEMAX_MANAGEMENT_DEMO_ACCESSED_V1_";
  let session = demo.getSession();
  let online = !!config.demoMode;
  let serverVersion = "";
  let bootstrapPromise = null;

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
      data.database_meta = { loaded_at: new Date().toISOString(), inventory_source: "DEMO_LOCALE", products_count: (data.products || []).length };
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

  function postForm(action, values) {
    return new Promise((resolve, reject) => {
      const requestId = String(values && values.requestId || uid("post"));
      const iframe = document.createElement("iframe");
      const form = document.createElement("form");
      const frameTarget = `${requestId}-${uid("frame")}`;
      iframe.name = frameTarget;
      iframe.hidden = true;
      form.method = "POST";
      form.action = config.appsScriptUrl;
      form.target = frameTarget;
      form.hidden = true;
      const params = { action, ...authParams(), ...values, requestId };
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
           il risultato tramite il relativo endpoint di stato. */
        setTimeout(() => iframe.remove(), 120000);
        resolve({ ok: true, pending: true, requestId });
      }, 22000);
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

  async function waitForMutation(requestId, options = {}) {
    const started = Date.now();
    let lastError = null;
    while (Date.now() - started < Number(options.maxWait || 120000)) {
      try {
        const response = await jsonp("management_mutation_status", { ...authParams(), requestId }, 30000);
        if (response.completed) {
          const result = response.result || {};
          if (result.ok === false) throw new Error(result.error || "Salvataggio non riuscito.");
          return result;
        }
      } catch (error) {
        if (!error.transient) throw error;
        lastError = error;
      }
      await wait(1800);
    }
    /* Il POST potrebbe essere terminato dopo la scadenza della cache. La
       verifica per token interroga il record senza ripetere alla cieca. */
    if (!options.skipFallback && options.entity && options.requestToken) {
      try {
        const rows = await list(options.entity);
        const existing = rows.find((row) => String(row.request_token || "") === String(options.requestToken));
        if (existing) return { ok: true, row: existing, recovered: true };
      } catch (error) { lastError = error; }
    }
    const confirmationError = new Error(lastError && lastError.message
      ? `Il salvataggio non è stato confermato: ${lastError.message}`
      : "Il salvataggio non è stato confermato dal database.");
    confirmationError.code = "MUTATION_UNCONFIRMED";
    confirmationError.transient = true;
    throw confirmationError;
  }

  async function postMutation(action, values, options = {}) {
    const mutationRequestId = options.requestToken ? `mutation-${String(options.requestToken).replace(/[^A-Za-z0-9_-]/g, "-")}` : uid("mutation");
    const requestValues = { ...values, requestId: mutationRequestId };
    let response = await postForm(action, requestValues);
    let result;
    if (!response.pending) result = response;
    else {
      try {
        result = await waitForMutation(response.requestId, { ...options, maxWait: Math.min(Number(options.maxWait || 120000), 18000), skipFallback: true });
      } catch (error) {
        if (!error || error.code !== "MUTATION_UNCONFIRMED") throw error;
        /* Un solo reinvio con lo stesso token. Il backend riconosce la
           richiesta già applicata, quindi questa ripresa non può creare un
           secondo cliente, pratica o movimento di magazzino. */
        response = await postForm(action, requestValues);
        result = response.pending ? await waitForMutation(response.requestId, options) : response;
      }
    }
    online = true;
    return result;
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
  function status() { return { demo: config.demoMode, configured: isConfigured(), online, fast: isFastMode(), pending: pendingOperations().length, serverVersion };
  }

  window.SeemaxApi = { login, logout, ping, health, bootstrap, cachedBootstrap, saveBootstrapCache, list, upsert, remove, getSettings, saveSettings, saveProfile, verifyVat, updatePracticeDocuments, adjustInventory, setPracticeStockWarning, createPracticeFromQuote, markNotificationsRead, nextPracticeNumber, resetDemo, exportDemo, getSession, isFirstAccess, consumeFirstAccess, isAdmin, status, isFastMode, setFastMode, pendingOperations, syncAll, localActivities };
})();
