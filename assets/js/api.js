(function () {
  "use strict";

  const config = window.SEEMAX_APP_CONFIG;
  const demo = window.SeemaxDemoStore;
  let session = demo.getSession();
  let online = !!config.demoMode;

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
    if (config.demoMode) return demo.bootstrap();
    const response = await jsonp("management_bootstrap", authParams(), 20000);
    return response.data;
  }

  async function list(entity) {
    if (config.demoMode) return demo.list(entity);
    const response = await jsonp("management_list", { ...authParams(), entity });
    return response.rows || [];
  }

  async function upsert(entity, record) {
    if (config.demoMode) return demo.upsert(entity, record);
    const response = await jsonp("management_upsert", { ...authParams(), entity, payload: JSON.stringify(record) }, 20000);
    return response.row;
  }

  async function remove(entity, id) {
    if (config.demoMode) return demo.remove(entity, id);
    return jsonp("management_remove", { ...authParams(), entity, id }, 20000);
  }

  async function getSettings() {
    if (config.demoMode) return demo.settings();
    const response = await jsonp("management_settings", authParams());
    return response.settings || {};
  }

  async function saveSettings(values) {
    if (config.demoMode) return demo.settings(values);
    const response = await jsonp("management_save_settings", { ...authParams(), payload: JSON.stringify(values) });
    return response.settings;
  }

  function nextPracticeNumber() {
    return config.demoMode ? demo.nextPracticeNumber() : "AUTO";
  }

  function resetDemo() { return demo.reset(); }
  function exportDemo() { return demo.exportJson(); }
  function getSession() { return session; }
  function isAdmin() { return !!session && String(session.role || "").toUpperCase() === "ADMIN"; }
  function status() { return { demo: config.demoMode, configured: isConfigured(), online }; }

  window.SeemaxApi = { login, logout, ping, bootstrap, list, upsert, remove, getSettings, saveSettings, nextPracticeNumber, resetDemo, exportDemo, getSession, isAdmin, status };
})();
