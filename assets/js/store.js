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
    const session = getSession() || {};
    const parts = String(session.displayName || session.nome_visualizzato || session.username || "SM").trim().split(/\s+/);
    const prefix = (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : String(parts[0] || "SM").slice(0, 2)).toUpperCase();
    const nums = list("practices").map((item) => String(item.numero || "")).filter((number) => number.startsWith(prefix)).map((number) => Number(number.slice(prefix.length))).filter(Number.isFinite);
    return prefix + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(4, "0");
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
      revenue: {
        personal: db.practices.filter((p) => p.stato === "Completata" && (!p.agent_username || p.agent_username === ((getSession() || {}).username))).reduce((sum, p) => sum + Number(p.valore || 0), 0),
        company: db.practices.filter((p) => p.stato === "Completata").reduce((sum, p) => sum + Number(p.valore || 0), 0),
        target: Number((db.settings || {}).obiettivo_fatturato || 0)
      },
      recentPractices: db.practices.slice().sort((a, b) => String(b.aggiornatoIl).localeCompare(String(a.aggiornatoIl))).slice(0, 5),
      nextActivities: due.slice().sort((a, b) => String(a.scadenza).localeCompare(String(b.scadenza))).slice(0, 6),
      pipeline,
      agentOfMonth: agentOfMonth(db.practices, db.users, db.clients, getSession())
    });
  }

  function agentOfMonth(practices, users, clients, currentUser) {
    const names = Object.fromEntries((users || []).map((user) => [String(user.username || ""), user.nome_visualizzato || user.username]));
    const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const monthLabel = (key) => {
      const [year, month] = key.split("-").map(Number);
      return new Date(year, month - 1, 1).toLocaleDateString("it-IT", { month: "long", year: "numeric" }).replace(/^./, (letter) => letter.toUpperCase());
    };
    const completed = (practices || []).filter((practice) => practice.stato === "Completata" && !Number.isNaN(new Date(practice.completataIl || practice.aggiornatoIl || practice.creatoIl).getTime()));
    const groups = {};
    completed.forEach((practice) => {
      const period = monthKey(new Date(practice.completataIl || practice.aggiornatoIl || practice.creatoIl));
      const username = String(practice.agent_username || practice.agente || "Non assegnato");
      const key = `${period}|${username}`;
      groups[key] ||= { period, agent_username: username, agent: names[username] || practice.agente || username, total: 0, count: 0, practices: [] };
      groups[key].total += Number(practice.valore || 0); groups[key].count += 1;
      groups[key].practices.push({ id: practice.numero || practice.id || "—", client: practice.cliente || "—", type: String(practice.tipo_pratica || "ACQUISTO").toUpperCase(), value: Number(practice.valore || 0) });
    });
    const months = {};
    Object.values(groups).forEach((group) => { group.practices.sort((a, b) => b.value - a.value); group.topPractice = group.practices[0] || null; (months[group.period] ||= []).push(group); });
    const history = Object.keys(months).sort().reverse().map((period) => {
      const winner = months[period].sort((a, b) => b.total - a.total || b.count - a.count)[0];
      return { period, label: monthLabel(period), agent: winner.agent, agent_username: winner.agent_username, total: winner.total, count: winner.count, topPractice: winner.topPractice };
    });
    const now = new Date(); const previousKey = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const leaders = {};
    ["ACQUISTO", "NOLEGGIO", "LEASING", "COMPLESSIVO"].forEach((type) => {
      const totals = {};
      completed.filter((practice) => type === "COMPLESSIVO" || String(practice.tipo_pratica || "ACQUISTO").toUpperCase() === type).forEach((practice) => {
        const username = String(practice.agent_username || practice.agente || "Non assegnato");
        totals[username] ||= { agent: names[username] || practice.agente || username, total: 0, count: 0 };
        totals[username].total += Number(practice.valore || 0); totals[username].count += 1;
      });
      leaders[type] = Object.entries(totals).map(([agent_username, value]) => ({ ...value, agent_username })).sort((a, b) => b.total - a.total || b.count - a.count)[0] || null;
      if (leaders[type]) {
        const practice = completed.filter((item) => String(item.agent_username || item.agente || "Non assegnato") === leaders[type].agent_username && (type === "COMPLESSIVO" || String(item.tipo_pratica || "ACQUISTO").toUpperCase() === type)).sort((a, b) => Number(b.valore || 0) - Number(a.valore || 0))[0];
        leaders[type].topPractice = practice ? { id: practice.numero || practice.id || "—", client: practice.cliente || "—", value: Number(practice.valore || 0) } : null;
      }
    });
    const award = history.find((row) => row.period === previousKey) || null;
    const username = String((currentUser || {}).username || "");
    const ownCompleted = completed.filter((practice) => String(practice.agent_username || "") === username);
    const ownPractices = (practices || []).filter((practice) => String(practice.agent_username || "") === username);
    const ownClients = (clients || []).filter((client) => String(client.creato_da_username || client.agent_username || "") === username);
    const winningPeriods = history.filter((row) => String(row.agent_username || "") === username).map((row) => row.period).sort();
    let maxStreak = 0, streak = 0, previousIndex = null;
    winningPeriods.forEach((period) => { const [year, month] = period.split("-").map(Number); const index = year * 12 + month; streak = previousIndex !== null && index === previousIndex + 1 ? streak + 1 : 1; maxStreak = Math.max(maxStreak, streak); previousIndex = index; });
    const countType = (type) => ownPractices.filter((practice) => String(practice.tipo_pratica || "ACQUISTO").toUpperCase() === type).length;
    const maxValue = ownCompleted.reduce((max, practice) => Math.max(max, Number(practice.valore || 0)), 0);
    const ownRevenue = ownCompleted.reduce((sum, practice) => sum + Number(practice.valore || 0), 0);
    const achievements = [
      ["month_1","🏆","Agente del mese","Conquista il primo posto in un mese.",winningPeriods.length,1],
      ["month_streak_3","👑","Tripletta d’oro","Agente del mese per 3 mesi consecutivi.",maxStreak,3],
      ["practice_50k","💎","Pratica Elite","Completa una pratica da almeno 50.000 €.",maxValue,50000,true],
      ["practice_100k","🚀","Pratica Legend","Completa una pratica da almeno 100.000 €.",maxValue,100000,true],
      ["clients_10","🤝","Network Builder","Crea 10 clienti.",ownClients.length,10],
      ["purchase_5","🛒","Specialista Acquisto","Inserisci 5 pratiche di acquisto.",countType("ACQUISTO"),5],
      ["rental_5","🔄","Specialista Noleggio","Inserisci 5 pratiche di noleggio.",countType("NOLEGGIO"),5],
      ["leasing_5","🏦","Specialista Leasing","Inserisci 5 pratiche di leasing.",countType("LEASING"),5],
      ["completed_10","✅","Closer","Completa 10 pratiche.",ownCompleted.length,10],
      ["revenue_250k","🌟","Quarto di milione","Raggiungi 250.000 € di fatturato completato.",ownRevenue,250000,true]
    ].map(([id,icon,title,description,current,target,currency=false]) => ({ id,icon,title,description,current,target,currency,unlocked:Number(current || 0) >= target }));
    return { currentPeriod: monthKey(now), awardPeriod: previousKey, award, history, leaders, isCurrentUserWinner: !!award && String(award.agent_username || "") === username, achievements };
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
