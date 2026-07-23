(function () {
  "use strict";

  const DB_KEY = "SEEMAX_MANAGEMENT_DEMO_DB_V1";
  const SESSION_KEY = "SEEMAX_MANAGEMENT_SESSION_V1";
  const clone = (value) => JSON.parse(JSON.stringify(value));

  function loadDatabase() {
    try {
      const stored = localStorage.getItem(DB_KEY);
      if (stored) return JSON.parse(stored);
    } catch (error) { /* fallback sotto */ }
    const seeded = clone(window.SEEMAX_DEMO_SEED);
    saveDatabase(seeded);
    return seeded;
  }

  function saveDatabase(database) {
    localStorage.setItem(DB_KEY, JSON.stringify(database));
    return database;
  }

  function entityKey(entity) {
    const allowed = ["products", "clients", "practices", "documents", "activities", "users"];
    if (!allowed.includes(entity)) throw new Error("Entità non supportata: " + entity);
    return entity;
  }

  function uid(prefix) {
    if (window.crypto && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function list(entity) {
    const db = loadDatabase();
    return clone(db[entityKey(entity)] || []);
  }

  function upsert(entity, record) {
    const key = entityKey(entity);
    const db = loadDatabase();
    const value = clone(record || {});
    value.id = value.id || uid(key.slice(0, 3));
    const index = db[key].findIndex((item) => String(item.id) === String(value.id));
    if (index >= 0) db[key][index] = { ...db[key][index], ...value };
    else db[key].unshift(value);
    saveDatabase(db);
    return clone(index >= 0 ? db[key][index] : db[key][0]);
  }

  function remove(entity, id) {
    const key = entityKey(entity);
    const db = loadDatabase();
    const before = db[key].length;
    db[key] = db[key].filter((item) => String(item.id) !== String(id));
    saveDatabase(db);
    return { ok: db[key].length < before };
  }

  function settings(next) {
    const db = loadDatabase();
    if (next) {
      db.settings = { ...(db.settings || {}), ...clone(next) };
      saveDatabase(db);
    }
    return clone(db.settings || {});
  }

  function login(username, key) {
    const account = (window.SEEMAX_APP_CONFIG.demoAccounts || []).find((item) =>
      item.username.toLowerCase() === String(username || "").trim().toLowerCase() && item.key === String(key || "").trim()
    );
    if (!account) throw new Error("Nome utente o Chiave ID non corretti.");
    return clone({ ...account, authenticatedAt: new Date().toISOString() });
  }

  function nextPracticeNumber() {
    const year = String(new Date().getFullYear()).slice(-2);
    const nums = list("practices").map((item) => Number(String(item.numero || "").split("-")[0])).filter(Number.isFinite);
    return String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, "0") + "-" + year;
  }

  function dashboard() {
    const db = loadDatabase();
    const open = db.practices.filter((p) => !["Completata", "Bocciata"].includes(p.stato));
    const value = open.reduce((sum, p) => sum + Number(p.valore || 0), 0);
    const due = db.activities.filter((a) => a.stato !== "Completata");
    const pipeline = ["Inserita", "Accettata", "Sospesa", "Bocciata", "Completata"].map((status) => ({
      status,
      count: db.practices.filter((p) => p.stato === status).length,
      value: db.practices.filter((p) => p.stato === status).reduce((sum, p) => sum + Number(p.valore || 0), 0)
    }));
    return clone({
      totals: { clients: db.clients.length, practices: open.length, value, activities: due.length },
      recentPractices: db.practices.slice().sort((a, b) => String(b.aggiornatoIl).localeCompare(String(a.aggiornatoIl))).slice(0, 5),
      nextActivities: due.slice().sort((a, b) => String(a.scadenza).localeCompare(String(b.scadenza))).slice(0, 6),
      pipeline
    });
  }

  function bootstrap() {
    const db = loadDatabase();
    return clone({ ...db, dashboard: dashboard() });
  }

  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
    catch (error) { return null; }
  }

  function setSession(session) {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  }

  function reset() {
    localStorage.removeItem(DB_KEY);
    return loadDatabase();
  }

  function exportJson() {
    return JSON.stringify(loadDatabase(), null, 2);
  }

  window.SeemaxDemoStore = { list, upsert, remove, settings, login, nextPracticeNumber, dashboard, bootstrap, getSession, setSession, reset, exportJson };
})();
