(function () {
  "use strict";

  const api = window.SeemaxApi;
  const config = window.SEEMAX_APP_CONFIG;
  const $ = (id) => document.getElementById(id);
  const state = { route: "dashboard", data: null, loading: false, search: "", filterStatus: "", practiceQuery: "", practiceSort: "numero", practiceDirection: "desc", practicePage: 1 };
  let installPrompt = null;

  const NAV = [
    { id: "dashboard", icon: "⌂", label: "Dashboard", sub: "Panoramica" },
    { id: "practices", icon: "▣", label: "Pratiche", sub: "Pipeline commerciale" },
    { id: "clients", icon: "♙", label: "Clienti", sub: "Anagrafiche e contatti" },
    { id: "catalog", icon: "▦", label: "Catalogo", sub: "Prodotti e listini" },
    { id: "planner", icon: "▤", label: "Quotation Planner", sub: "Preventivi Ledwall" },
    { id: "documents", icon: "▱", label: "Documenti", sub: "PDF e allegati" },
    { id: "activities", icon: "✓", label: "Attività", sub: "Scadenze operative" },
    { id: "users", icon: "♟", label: "Agenti", sub: "Accessi e ruoli", adminOnly: true },
    { id: "settings", icon: "⚙", label: "Impostazioni", sub: "Azienda e database", adminOnly: true }
  ];

  const ROUTE_META = {
    dashboard: ["Dashboard", "Panoramica commerciale e operativa"],
    practices: ["Pratiche", "Gestisci il percorso dal contatto all’installazione"],
    clients: ["Clienti", "Anagrafiche, contatti e storico commerciale"],
    catalog: ["Catalogo prodotti", "Listini Ledwall, promozioni e specifiche"],
    planner: ["Seemax Quotation Planner", "Calcolatore Ledwall, Grenke e IFIS"],
    documents: ["Documenti", "Preventivi, contratti e allegati collegati"],
    activities: ["Attività", "Scadenze, telefonate e appuntamenti"],
    users: ["Agenti e accessi", "Profili, ruoli e stato degli account"],
    settings: ["Impostazioni", "Configurazione generale del gestionale"]
  };

  const STATUSES = ["Inserita", "Accettata", "Sospesa", "Bocciata", "Completata"];
  const FINANCE = ["Da definire", "Grenke", "IFIS", "Acquisto diretto", "Altro"];
  const ENTITY_LABELS = { practices: "pratica", clients: "cliente", products: "prodotto", documents: "documento", activities: "attività", users: "agente" };
  const TECH_SPECS = {
    "P2.5": ["Pixel pitch: 2.5", "Certificazione: CCC/CE/ROHS", "Modalità: Indoor / Outdoor", "Densità pixel: 160.000 pixel/m²", "LED: SMD1415", "Cabinet: Alluminio Rental", "Dimensioni cabinet: 0.64×0.64 m", "Peso cabinet: 4 kg / 6,3 kg", "Scala di grigi: 16384", "Temperatura: da -20° a +60°", "Protezione: IP65", "Consumo medio: 350 W/m²", "Consumo massimo: 700 W/m²", "Vita media: oltre 100.000 ore", "Visibilità: 2,5 m", "Luminosità: 4500–5000 cd/m²", "Refresh: 1920–3840 Hz"],
    "P3": ["Pixel pitch: 3", "Certificazione: CCC/CE/ROHS", "Modalità: Indoor / Outdoor", "Densità pixel: 110.592 pixel/m²", "LED: SMD1921", "Cabinet: Alluminio Rental", "Dimensioni cabinet: 0.57×0.57 m", "Peso cabinet: 9,5 kg", "Scala di grigi: 16384", "Temperatura: da -20° a +60°", "Protezione: IP65", "Consumo medio: 300 W/m²", "Consumo massimo: 700 W/m²", "Vita media: oltre 100.000 ore", "Visibilità: 3 m", "Luminosità: 5000–5500 cd/m²", "Refresh: 1920–3840 Hz"],
    "P3.91": ["Certificazione: CCC/CE/ROHS", "Modalità: Indoor / Outdoor", "Densità pixel: 65.536 pixel/m²", "LED: SMD1921", "Cabinet: Alluminio Rental", "Peso cabinet: 4 kg / 6,3 kg", "Scala di grigi: 16", "Temperatura: da -10° a +45°", "Protezione: IP65", "Consumo medio: 230 W/m²", "Consumo massimo: 800 W/m²", "Vita media: oltre 100.000 ore", "Visibilità: 3–4 m", "Luminosità: 4000–6000 cd/m²", "Refresh: 1920–3840 Hz"],
    "P4": ["Pixel pitch: 4", "Certificazione: CCC/CE/ROHS", "Modalità: Indoor / Outdoor", "Densità pixel: 62.500 pixel/m²", "LED: SMD1921", "Cabinet: Alluminio Rental", "Dimensioni cabinet: 0.96×0.96 m", "Peso cabinet: 9 kg / 11 kg", "Scala di grigi: 16", "Temperatura: da -20° a +60°", "Protezione: IP65", "Consumo medio: 280 W/m²", "Consumo massimo: 800 W/m²", "Vita media: oltre 100.000 ore", "Visibilità: 4 m", "Luminosità: 4500–5000 cd/m²", "Refresh: 1920–3840 Hz"]
  };

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  }

  function euros(value) {
    return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(value || 0));
  }

  function dateIt(value) {
    if (!value) return "—";
    const date = new Date(String(value).length === 10 ? value + "T12:00:00" : value);
    return Number.isNaN(date.getTime()) ? esc(value) : date.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
  }

  function initials(name) {
    return String(name || "S").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  }

  function slug(value) {
    return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function badge(value) {
    const cls = slug(value || "neutro");
    return `<span class="status-badge status-${cls}">${esc(value || "—")}</span>`;
  }

  function setLoading(active, text) {
    state.loading = active;
    $("loadingLayer").classList.toggle("is-hidden", !active);
    const label = $("loadingLayer").querySelector("strong");
    if (label && text) label.textContent = text;
  }

  function toast(message, tone = "success") {
    const item = document.createElement("div");
    item.className = `toast ${tone}`;
    item.innerHTML = `<span>${tone === "success" ? "✓" : tone === "danger" ? "!" : "i"}</span><strong>${esc(message)}</strong>`;
    $("toastRoot").appendChild(item);
    setTimeout(() => item.classList.add("show"), 20);
    setTimeout(() => { item.classList.remove("show"); setTimeout(() => item.remove(), 250); }, 3500);
  }

  function download(name, content, type = "application/json") {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([content], { type }));
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function visibleNav() { return NAV.filter((item) => !item.adminOnly || api.isAdmin()); }

  function renderNav() {
    $("mainNav").innerHTML = visibleNav().map((item) => `
      <button class="nav-item ${state.route === item.id ? "active" : ""}" data-route="${item.id}">
        <span class="nav-symbol">${item.icon}</span><span><strong>${item.label}</strong><small>${item.sub}</small></span>
      </button>`).join("");
  }

  function setConnectionState() {
    const status = api.status();
    $("databaseLabel").textContent = status.fast ? `Modalità Rapida · ${status.pending} in attesa` : (status.demo ? "Modalità demo locale" : (status.online ? "Google Sheets online" : "Database non raggiungibile"));
    $("databaseDot").className = status.online ? "online" : "offline";
    updateModeControls();
    const banner = $("connectionBanner");
    if (status.demo) {
      banner.className = "connection-banner demo";
      banner.innerHTML = `<strong>Modalità demo attiva.</strong> I dati sono salvati soltanto in questo browser. Configura Apps Script per usare il database condiviso. <button data-route="settings">Configura</button>`;
    } else if (!status.online) {
      banner.className = "connection-banner danger";
      banner.innerHTML = `<strong>Database non disponibile.</strong> Controlla l’URL Apps Script e la pubblicazione della Web App.`;
    } else banner.className = "connection-banner is-hidden";
  }

  async function loadAll() {
    setLoading(true, "Caricamento database…");
    try {
      state.data = await api.bootstrap();
      if (api.isFastMode()) updateLocalDashboard();
      updateNotificationBell();
      setConnectionState();
    } catch (error) {
      setConnectionState();
      throw error;
    } finally { setLoading(false); }
  }

  function setUser() {
    const user = api.getSession();
    if (!user) return;
    $("userName").textContent = user.displayName || user.nome_visualizzato || user.username;
    $("userRole").textContent = String(user.role || user.ruolo || "AGENTE").toUpperCase();
    $("userInitials").textContent = initials(user.displayName || user.nome_visualizzato || user.username);
  }

  async function showApp() {
    $("loginScreen").classList.add("is-hidden");
    $("app").classList.remove("is-hidden");
    setUser();
    renderNav();
    try {
      await loadAll();
      go(location.hash.replace("#", "") || "dashboard", false);
    } catch (error) {
      toast(error.message, "danger");
      $("viewContainer").innerHTML = emptyState("Database non disponibile", "Controlla la configurazione di Google Apps Script e riprova.", "Riprova", "reload");
    }
  }

  function showLogin() {
    $("app").classList.add("is-hidden");
    $("loginScreen").classList.remove("is-hidden");
    $("loginError").textContent = "";
    if (config.demoMode) {
      $("demoCredentials").innerHTML = `<strong>Accessi dimostrativi</strong><button type="button" data-demo-login="admin">ADMIN · admin.demo / DEMO-ADMIN</button><button type="button" data-demo-login="agent">AGENTE · agente.demo / DEMO-AGENTE</button>`;
    } else $("demoCredentials").innerHTML = "";
  }

  function go(route, updateHash = true) {
    const allowed = visibleNav().some((item) => item.id === route);
    state.route = allowed ? route : "dashboard";
    if (updateHash) history.replaceState(null, "", "#" + state.route);
    const meta = ROUTE_META[state.route];
    $("pageTitle").textContent = meta[0];
    $("pageSubtitle").textContent = meta[1];
    $("pageEyebrow").textContent = state.route === "planner" ? "Strumento integrato" : "Seemax Management";
    renderNav();
    renderRoute();
    $("sidebar").classList.remove("open");
    $("viewContainer").focus({ preventScroll: true });
  }

  function renderRoute() {
    if (!state.data && state.route !== "settings") return;
    const renders = { dashboard: renderDashboard, practices: renderPractices, clients: renderClients, catalog: renderCatalog, planner: renderPlanner, documents: renderDocuments, activities: renderActivities, users: renderUsers, settings: renderSettings };
    $("viewContainer").innerHTML = renders[state.route]();
  }

  function emptyState(title, text, button, action) {
    return `<div class="empty-state"><span>◇</span><h3>${esc(title)}</h3><p>${esc(text)}</p>${button ? `<button class="btn primary" data-action="${action}">${esc(button)}</button>` : ""}</div>`;
  }

  function viewToolbar(label, action, extra = "") {
    return `<div class="view-toolbar"><div>${extra}</div>${action ? `<button class="btn primary" data-action="${action}">＋ ${esc(label)}</button>` : ""}</div>`;
  }

  function renderDashboard() {
    const d = state.data.dashboard || {};
    const totals = d.totals || {};
    const revenue = d.revenue || {};
    const maxPipeline = Math.max(1, ...(d.pipeline || []).map((item) => item.count));
    return `
      <div class="welcome-panel">
        <div><span class="eyebrow light">Centro operativo</span><h2>Buon lavoro, ${esc((api.getSession() || {}).displayName || "Utente")}.</h2><p>Qui trovi ciò che richiede attenzione oggi e l’andamento delle pratiche commerciali.</p></div>
        <div class="welcome-actions"><button class="btn white" data-action="new-practice">＋ Nuova pratica</button><button class="btn glass" data-route="planner">Apri Quotation Planner</button></div>
      </div>
      <div class="kpi-grid">
        ${kpi("Clienti registrati", totals.clients, "♙", "blue", "clients")}
        ${kpi("Pratiche aperte", totals.practices, "▣", "violet", "practices")}
        ${kpi("Valore pipeline", euros(totals.value), "€", "green", "practices")}
        ${kpi("Attività aperte", totals.activities, "✓", "orange", "activities")}
      </div>
      <section class="revenue-panel">
        <div class="panel-head"><div><span class="section-kicker">Fatturato</span><h3>Avanzamento verso l’obiettivo</h3></div><span class="revenue-target">Obiettivo ${euros(revenue.target || 0)}</span></div>
        <div class="revenue-grid">
          ${revenueCard("Il tuo fatturato", revenue.personal, revenue.target, "Pratiche completate assegnate a te")}
          ${revenueCard("Fatturato complessivo Seemax", revenue.company, revenue.target, "Tutte le pratiche completate")}
        </div>
      </section>
      <div class="dashboard-grid">
        <section class="panel span-7">
          <div class="panel-head"><div><span class="section-kicker">Pipeline</span><h3>Stato delle pratiche</h3></div><button class="text-button" data-route="practices">Vedi tutte →</button></div>
          <div class="pipeline-chart">${(d.pipeline || []).map((item) => `<div class="pipeline-row"><span>${esc(item.status)}</span><div><i style="width:${Math.max(4, item.count / maxPipeline * 100)}%"></i></div><strong>${item.count}</strong></div>`).join("")}</div>
        </section>
        <section class="panel span-5">
          <div class="panel-head"><div><span class="section-kicker">Agenda</span><h3>Prossime attività</h3></div><button class="text-button" data-action="new-activity">＋ Aggiungi</button></div>
          <div class="activity-list">${(d.nextActivities || []).length ? d.nextActivities.map(activityItem).join("") : emptyState("Nessuna attività", "Non risultano attività aperte.")}</div>
        </section>
        <section class="panel span-12">
          <div class="panel-head"><div><span class="section-kicker">Aggiornamenti</span><h3>Pratiche recenti</h3></div><button class="text-button" data-route="practices">Archivio pratiche →</button></div>
          ${practiceTable(d.recentPractices || [], true)}
        </section>
      </div>`;
  }

  function revenueCard(label, value, target, note) {
    const amount = Number(value || 0);
    const goal = Number(target || 0);
    const ratio = goal > 0 ? Math.min(1, amount / goal) : 0;
    const percent = Math.round(ratio * 100);
    const hue = Math.round(ratio * 120);
    return `<article class="revenue-card" style="--revenue-hue:${hue};--revenue-progress:${percent}%"><div><span>${esc(label)}</span><strong>${euros(amount)}</strong><small>${esc(note)}</small></div><em>${percent}%</em><div class="revenue-progress"><i></i></div></article>`;
  }

  function kpi(label, value, icon, tone, route) {
    return `<button class="kpi-card" data-route="${route}"><span class="kpi-icon ${tone}">${icon}</span><div><small>${esc(label)}</small><strong>${esc(value)}</strong><em>Apri sezione →</em></div></button>`;
  }

  function activityItem(item) {
    const overdue = item.scadenza && item.scadenza < new Date().toISOString().slice(0, 10);
    return `<button class="activity-item" data-action="edit-activity" data-id="${esc(item.id)}"><i class="${overdue ? "overdue" : ""}"></i><div><strong>${esc(item.titolo)}</strong><span>${esc(item.tipo)} · ${dateIt(item.scadenza)}</span></div>${badge(item.stato)}</button>`;
  }

  function practiceTable(rows, compact = false, showAgent = false) {
    if (!rows.length) return emptyState("Nessuna pratica", "Crea la prima pratica per iniziare.", "Nuova pratica", "new-practice");
    return `<div class="table-wrap"><table class="practice-table"><thead><tr><th>Pratica</th><th>Cliente</th><th>Tipologia</th><th>Stato</th><th>Finanziaria</th><th>Valore</th>${showAgent ? "<th>Agente</th>" : ""}<th></th></tr></thead><tbody>${rows.map((p) => `<tr class="practice-row practice-${slug(p.stato)}"><td><strong>${esc(p.numero)}</strong><small>${dateIt(p.aggiornatoIl)}</small></td><td>${esc(p.cliente)}</td><td>${esc(p.tipo_pratica || "—")}</td><td>${badge(p.stato)}</td><td>${esc(p.finanziaria)}</td><td><strong>${euros(p.valore)}</strong></td>${showAgent ? `<td>${esc(p.agente || p.agent_username || "—")}</td>` : ""}<td><button class="table-action" data-action="edit-practice" data-id="${esc(p.id)}">Apri</button>${compact || p.stato === "Completata" ? "" : `<button class="more-action" data-action="delete-practice" data-id="${esc(p.id)}" aria-label="Elimina">⋮</button>`}</td></tr>`).join("")}</tbody></table></div>`;
  }

  function renderPractices() {
    let rows = (state.data.practices || []).slice();
    const query = String(state.practiceQuery || "").trim().toLowerCase();
    const searchableFields = api.isAdmin() ? ["numero", "id", "cliente", "titolo", "agente", "agent_username"] : ["numero", "id", "cliente", "titolo"];
    if (query) rows = rows.filter((row) => searchableFields.some((key) => String(row[key] || "").toLowerCase().includes(query)));
    if (state.filterStatus) rows = rows.filter((p) => p.stato === state.filterStatus);
    const sortKey = state.practiceSort || "numero";
    const direction = state.practiceDirection === "asc" ? 1 : -1;
    const statusOrder = Object.fromEntries(STATUSES.map((status, index) => [status, index]));
    rows.sort((left, right) => {
      if (sortKey === "valore") return (Number(left.valore || 0) - Number(right.valore || 0)) * direction;
      if (sortKey === "stato") return ((statusOrder[left.stato] ?? 99) - (statusOrder[right.stato] ?? 99)) * direction;
      const value = (record) => sortKey === "numero" ? record.numero : sortKey === "cliente" ? record.cliente : sortKey === "tipo" ? record.tipo_pratica : sortKey === "finanziaria" ? record.finanziaria : record.agente || record.agent_username;
      return String(value(left) || "").localeCompare(String(value(right) || ""), "it", { numeric: true, sensitivity: "base" }) * direction;
    });
    const pageSize = 10;
    const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
    state.practicePage = Math.min(Math.max(1, Number(state.practicePage || 1)), pageCount);
    const start = (state.practicePage - 1) * pageSize;
    const visibleRows = rows.slice(start, start + pageSize);
    const chips = STATUSES.map((s) => `<button class="filter-chip ${state.filterStatus === s ? "active" : ""}" data-filter-status="${esc(s)}">${esc(s)} <strong>${state.data.practices.filter((p) => p.stato === s).length}</strong></button>`).join("");
    const sortOptions = [
      ["stato", "Esito / stato"], ["numero", "ID pratica"], ["cliente", "Nome cliente"],
      ["tipo", "Tipologia"], ["finanziaria", "Finanziaria"], ["valore", "Valore"]
    ].concat(api.isAdmin() ? [["agente", "Agente"]] : []);
    const controls = `<div class="practice-controls">
      <label class="practice-search"><span>⌕</span><input id="practiceSearch" value="${esc(state.practiceQuery || "")}" placeholder="${api.isAdmin() ? "Cerca per ID, intestazione o agente…" : "Cerca per ID o intestazione…"}" aria-label="Cerca pratiche"></label>
      <label>Ordina per<select id="practiceSort">${sortOptions.map(([value, label]) => `<option value="${value}" ${state.practiceSort === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>
      <label>Ordine<select id="practiceDirection"><option value="asc" ${state.practiceDirection === "asc" ? "selected" : ""}>Crescente</option><option value="desc" ${state.practiceDirection === "desc" ? "selected" : ""}>Decrescente</option></select></label>
    </div>`;
    const pagination = rows.length > pageSize ? `<nav class="practice-pagination" aria-label="Pagine pratiche">
      <button class="btn ghost" data-practice-page="${state.practicePage - 1}" ${state.practicePage === 1 ? "disabled" : ""}>← Precedente</button>
      <div>${Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => `<button class="${page === state.practicePage ? "active" : ""}" data-practice-page="${page}" aria-label="Pagina ${page}">${page}</button>`).join("")}</div>
      <button class="btn ghost" data-practice-page="${state.practicePage + 1}" ${state.practicePage === pageCount ? "disabled" : ""}>Successiva →</button>
    </nav>` : "";
    const range = rows.length ? `${start + 1}–${Math.min(start + pageSize, rows.length)} di ${rows.length} pratiche` : "0 pratiche";
    return `${viewToolbar("Nuova pratica", "new-practice", `<div class="filter-strip"><button class="filter-chip ${state.filterStatus ? "" : "active"}" data-filter-status="">Tutte <strong>${state.data.practices.length}</strong></button>${chips}</div>`)}${controls}<section class="panel"><div class="practice-result-count">${range}</div>${visibleRows.length ? practiceTable(visibleRows, false, api.isAdmin()) : emptyState("Nessuna pratica trovata", "Modifica ricerca, filtro o ordinamento.", "", "")}${pagination}</section>`;
  }

  function renderClients() {
    const rows = filterRows(state.data.clients, ["ragioneSociale", "referente", "piva", "email", "telefono", "citta"]);
    return `${viewToolbar("Nuovo cliente", "new-client", `<p class="toolbar-note">${rows.length} clienti visualizzati</p>`)}<div class="card-grid">${rows.length ? rows.map((c) => {
      const count = state.data.practices.filter((p) => p.clientId === c.id).length;
      const locked = String(c.ha_pratiche_collegate || "NO").toUpperCase() === "SI" || state.data.practices.some((p) => p.clientId === c.id);
      const canEdit = api.isAdmin() || String(c.puo_modificare || "NO").toUpperCase() === "SI";
      const shared = String(c.condiviso || "NO").toUpperCase() === "SI";
      return `<article class="client-card ${shared ? "shared-client" : ""}"><div class="client-top"><span class="avatar">${initials(c.ragioneSociale)}</span><div><h3>${esc(c.ragioneSociale)} ${shared ? `<span class="shared-client-badge">CONDIVISO</span>` : ""}</h3><p>${esc(c.referente || "Referente non indicato")}</p>${shared ? `<small>Creato da: ${esc(c.creato_da_nome || "Utente Seemax")}</small>` : ""}</div>${locked ? `<span class="locked-record" title="Cliente collegato a una pratica: eliminazione disabilitata">🔒</span>` : canEdit ? `<button class="more-action" data-action="delete-client" data-id="${esc(c.id)}">⋮</button>` : `<span class="locked-record" title="Cliente consultabile ma modificabile soltanto dal creatore">◉</span>`}</div><dl><div><dt>Località</dt><dd>${esc(c.citta || "—")}</dd></div><div><dt>Telefono</dt><dd>${esc(c.telefono || "—")}</dd></div><div><dt>Email</dt><dd>${esc(c.email || "—")}</dd></div><div><dt>Pratiche personali</dt><dd>${count}</dd></div></dl><div class="card-actions"><button class="btn soft" data-action="edit-client" data-id="${esc(c.id)}">${canEdit ? "Apri anagrafica" : "Consulta anagrafica"}</button><button class="btn ghost" data-action="new-practice-client" data-id="${esc(c.id)}">＋ Pratica</button></div></article>`;
    }).join("") : emptyState("Nessun cliente", "Aggiungi la prima anagrafica.", "Nuovo cliente", "new-client")}</div>`;
  }

  function renderCatalog() {
    const rows = filterRows(state.data.products, ["nome", "categoria", "descrizione"]);
    return `${viewToolbar("Nuovo prodotto", api.isAdmin() ? "new-product" : "", `<p class="toolbar-note">Listino ${api.isAdmin() ? "amministrativo" : "agente"} · ${rows.length} configurazioni</p>`)}<div class="product-grid">${rows.map((p) => {
      const promo = Number(p.prezzoPromoAgenti || 0);
      const price = promo || Number(p.prezzoAgente || 0);
      const promoActive = promo || String(p.promo_attiva || "NO").toUpperCase() === "SI";
      const stock = Number(p.giacenza_attuale || 0);
      const stockLabel = p.stato_giacenza || (stock > 0 ? "DISPONIBILE" : "NON DISPONIBILE");
      const image = p.immagine_url ? `<img src="${esc(p.immagine_url)}" alt="${esc(p.nome)}" loading="lazy">` : `<div class="pixel-pattern"></div>`;
      return `<article class="product-card"><div class="product-visual">${image}<span>${esc(p.nome)}</span>${promoActive ? `<em>PROMO</em>` : ""}</div><div class="product-body"><div class="product-title"><div><span>${esc(p.categoria || "Ledwall")}</span><h3>${esc(p.nome)} · ${p.cabX}×${p.cabY} cm</h3></div>${badge(p.attivo === "SI" ? "Attivo" : "Non attivo")}</div><div class="stock-summary"><div><small>${esc(stockLabel)}</small><strong>${stock} pz</strong></div><span>${esc(p.sku || p.id || "")}</span></div><p>${esc(p.descrizione || p.infoAgenti || "Scheda tecnica disponibile nel Quotation Planner.")}</p><div class="price-grid"><div><small>Prezzo agente</small><strong>${price ? euros(price) : "Da definire"}</strong>${promo ? `<del>${euros(p.prezzoAgente)}</del>` : ""}</div>${api.isAdmin() ? `<div><small>Prezzo cliente</small><strong>${Number(p.prezzoPromoClienti || p.prezzoCliente || 0) ? euros(p.prezzoPromoClienti || p.prezzoCliente) : "Da definire"}</strong></div><div><small>Costo base</small><strong>${Number(p.prezzoCina || 0) ? euros(p.prezzoCina) : "—"}</strong></div>` : ""}</div><div class="card-actions"><button class="btn soft" data-action="product-tech" data-id="${esc(p.id)}">Scheda tecnica</button>${api.isAdmin() ? `<button class="btn ghost" data-action="edit-product" data-id="${esc(p.id)}">Modifica</button>` : ""}</div></div></article>`;
    }).join("")}</div>`;
  }

  function renderPlanner() {
    const fast = api.isFastMode() ? "&fast=1" : "";
    return `${api.isFastMode() ? `<div class="planner-fast-notice"><strong>Modalità Rapida attiva</strong><span>Il Planner è utilizzabile normalmente. Sono disabilitati soltanto il salvataggio e il caricamento dei preventivi dall’archivio online.</span></div>` : ""}<div class="planner-shell planner-native"><iframe id="plannerFrame" title="Seemax Quotation Planner integrato" src="${esc(config.quotationPlannerPath)}?integrated=1${fast}"></iframe></div>`;
  }

  function renderDocuments() {
    const rows = filterRows(state.data.documents, ["nome", "tipo", "pratica", "cliente", "note"]);
    const uploadNote = api.isFastMode() ? `<p class="toolbar-note fast-upload-note">Caricamento file non disponibile in Modalità Rapida. Passa alla Modalità Standard per aggiungere documenti.</p>` : `<p class="toolbar-note">Carica PDF, immagini o file Office direttamente nell’archivio Seemax</p>`;
    return `${viewToolbar("Carica documento", api.isFastMode() ? "" : "new-document", uploadNote)}<section class="panel"><div class="document-list">${rows.length ? rows.map((d) => `<article class="document-row"><span class="file-icon">${esc(String(d.file_type || d.nome || "FILE").includes("pdf") ? "PDF" : "FILE")}</span><div><strong>${esc(d.nome)}</strong><span>${esc(d.tipo)} · Pratica ${esc(d.pratica || "—")} · ${esc(d.cliente || "—")}</span><small>${dateIt(d.data)}${d.file_size ? ` · ${Math.round(Number(d.file_size) / 1024)} KB` : ""}${d.note ? " · " + esc(d.note) : ""}</small></div><div class="document-actions">${d.url ? `<a class="btn soft" href="${esc(d.url)}" target="_blank" rel="noopener">Apri file ↗</a>` : `<span class="placeholder-pill">File non disponibile</span>`}<button class="btn ghost" data-action="edit-document" data-id="${esc(d.id)}">Modifica</button><button class="icon-btn danger" data-action="delete-document" data-id="${esc(d.id)}">×</button></div></article>`).join("") : emptyState("Nessun documento", api.isFastMode() ? "Passa alla Modalità Standard per caricare il primo file." : "Carica il primo file dal tuo dispositivo.", api.isFastMode() ? "" : "Carica documento", "new-document")}</div></section>`;
  }

  function renderActivities() {
    const rows = filterRows(state.data.activities, ["titolo", "tipo", "stato", "assegnatoA"]);
    const open = rows.filter((a) => a.stato !== "Completata");
    const done = rows.filter((a) => a.stato === "Completata");
    return `${viewToolbar("Nuova attività", "new-activity", `<p class="toolbar-note">${open.length} attività ancora aperte</p>`)}<div class="activity-columns"><section class="panel"><div class="panel-head"><div><span class="section-kicker">Da fare</span><h3>Attività aperte</h3></div></div><div class="task-list">${open.length ? open.map(taskCard).join("") : emptyState("Tutto completato", "Non ci sono attività aperte.")}</div></section><section class="panel"><div class="panel-head"><div><span class="section-kicker">Archivio</span><h3>Completate</h3></div></div><div class="task-list">${done.length ? done.map(taskCard).join("") : emptyState("Nessuna attività", "Le attività completate appariranno qui.")}</div></section></div>`;
  }

  function taskCard(a) {
    return `<article class="task-card ${a.stato === "Completata" ? "done" : ""}"><button class="task-check" data-action="toggle-activity" data-id="${esc(a.id)}">${a.stato === "Completata" ? "✓" : ""}</button><div><strong>${esc(a.titolo)}</strong><span>${esc(a.tipo)} · ${dateIt(a.scadenza)}</span><small>${esc(a.assegnatoA || "Non assegnata")}</small></div><button class="more-action" data-action="edit-activity" data-id="${esc(a.id)}">⋮</button></article>`;
  }

  function renderUsers() {
    const rows = filterRows(state.data.users, ["username", "nome_visualizzato", "email", "telefono", "ruolo", "stato"]);
    return `${viewToolbar("Nuovo agente", "new-user", `<p class="toolbar-note">${rows.filter((u) => u.stato === "ATTIVO").length} account attivi</p>`)}<section class="panel"><div class="table-wrap"><table><thead><tr><th>Agente</th><th>Username</th><th>Contatti</th><th>Ruolo</th><th>Stato</th><th></th></tr></thead><tbody>${rows.map((u) => `<tr><td><div class="agent-cell"><span class="avatar small">${initials(u.nome_visualizzato)}</span><strong>${esc(u.nome_visualizzato)}</strong></div></td><td>${esc(u.username)}</td><td>${esc(u.email || "—")}<small>${esc(u.telefono || "")}</small></td><td>${badge(String(u.ruolo).toUpperCase())}</td><td>${badge(u.stato)}</td><td><button class="table-action" data-action="edit-user" data-id="${esc(u.id || u.username)}">Modifica</button></td></tr>`).join("")}</tbody></table></div></section>`;
  }

  function renderSettings() {
    const s = state.data ? state.data.settings : {};
    const status = api.status();
    return `<div class="settings-grid"><section class="panel"><div class="panel-head"><div><span class="section-kicker">Azienda</span><h3>Dati generali</h3></div></div><form id="settingsForm" class="form-grid"><label>Ragione sociale<input name="legalName" value="${esc(config.company.legalName)}" disabled></label><label>Brand<input name="brand" value="${esc(config.company.brand)}" disabled></label><label class="full">Obiettivo fatturato aziendale (€)<input name="obiettivo_fatturato" type="number" min="0" step="1000" value="${esc(s.obiettivo_fatturato || 500000)}"><small>Usato dalle barre di avanzamento nella Dashboard.</small></label><label>Telefono commerciale<input name="telefono_commerciale" value="${esc(s.telefono_commerciale || "")}"></label><label>IVA (%)<input name="iva_percentuale" type="number" value="${esc(s.iva_percentuale || 22)}"></label><label>Acconto predefinito (%)<input name="acconto_percentuale" type="number" value="${esc(s.acconto_percentuale || 30)}"></label><label>Validità preventivo (giorni)<input name="validita_preventivo_giorni" type="number" value="${esc(s.validita_preventivo_giorni || 15)}"></label><div class="form-actions full"><button class="btn primary" type="submit">Salva impostazioni</button></div></form></section><section class="panel"><div class="panel-head"><div><span class="section-kicker">Collegamento</span><h3>Google Sheets</h3></div>${badge(status.fast ? "Modalità Rapida" : status.demo ? "Demo" : status.online ? "Online" : "Offline")}</div><div class="config-summary"><dl><div><dt>Modalità</dt><dd>${status.fast ? "Lavoro locale" : status.demo ? "Demo locale" : "Standard · Google Sheets"}</dd></div><div><dt>Elementi da salvare</dt><dd>${status.pending || 0}</dd></div><div><dt>Versione</dt><dd>${esc(config.version)}</dd></div></dl><p>Le Attività sono sempre memorizzate sul dispositivo e non rallentano il database. In Modalità Rapida le altre modifiche vengono accodate fino a “SALVA TUTTO”.</p><div class="stack-actions"><button class="btn soft" data-action="test-database">Verifica collegamento</button>${status.demo ? `<button class="btn ghost" data-action="export-demo">Esporta dati demo</button><button class="btn danger-outline" data-action="reset-demo">Ripristina demo</button>` : ""}</div></div></section><section class="panel span-2"><div class="panel-head"><div><span class="section-kicker">Placeholder da completare</span><h3>Controllo prima della pubblicazione</h3></div></div><div class="checklist"><label><input type="checkbox"> Inserire URL Apps Script in <code>config.js</code></label><label><input type="checkbox"> Sostituire telefono, email e sede aziendale</label><label><input type="checkbox"> Inserire loghi e immagini prodotto definitive</label><label><input type="checkbox"> Verificare account agenti nel foglio AGENTI</label><label><input type="checkbox"> Pubblicare il repository con GitHub Pages</label></div></section></div>`;
  }

  function filterRows(rows, fields) {
    const query = state.search.trim().toLowerCase();
    if (!query) return rows || [];
    return (rows || []).filter((row) => fields.some((field) => String(row[field] || "").toLowerCase().includes(query)));
  }

  function openModal(title, body, options = {}) {
    $("modalRoot").innerHTML = `<div class="modal-layer"><section class="modal-panel ${options.wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><header><div><span class="section-kicker">${esc(options.kicker || "Seemax Management")}</span><h2 id="modalTitle">${esc(title)}</h2>${options.subtitle ? `<p>${esc(options.subtitle)}</p>` : ""}</div><button class="icon-btn" data-action="close-modal" aria-label="Chiudi">×</button></header><div class="modal-body">${body}</div></section></div>`;
    setTimeout(() => $("modalRoot").querySelector("input,select,textarea,button")?.focus(), 30);
  }

  function closeModal() { $("modalRoot").innerHTML = ""; }

  function field(label, name, value = "", options = {}) {
    const attrs = [options.required ? "required" : "", options.readonly ? "readonly" : "", options.min !== undefined ? `min="${options.min}"` : "", options.step ? `step="${options.step}"` : ""].filter(Boolean).join(" ");
    const cls = options.full ? "full" : "";
    if (options.type === "textarea") return `<label class="${cls}">${esc(label)}<textarea name="${name}" ${attrs}>${esc(value)}</textarea></label>`;
    if (options.options) return `<label class="${cls}">${esc(label)}<select name="${name}" ${attrs}>${options.options.map((opt) => `<option value="${esc(opt)}" ${String(opt) === String(value) ? "selected" : ""}>${esc(opt)}</option>`).join("")}</select></label>`;
    return `<label class="${cls}">${esc(label)}<input name="${name}" type="${options.type || "text"}" value="${esc(value)}" ${attrs}></label>`;
  }

  function formShell(entity, id, fields, submitLabel = "Salva") {
    return `<form class="entity-form form-grid" data-entity="${entity}" data-id="${esc(id || "")}">${fields}<div class="form-actions full"><button class="btn ghost" type="button" data-action="close-modal">Annulla</button><button class="btn primary" type="submit">${esc(submitLabel)}</button></div></form>`;
  }

  function openPractice(id, clientId) {
    const record = state.data.practices.find((p) => p.id === id) || {};
    const client = state.data.clients.find((c) => c.id === (clientId || record.clientId));
    const session = api.getSession() || {};
    const prefix = initials(session.displayName || session.nome_visualizzato || session.username).replace(/[^A-Z0-9]/g, "").slice(0, 2) || "SM";
    const existingNumbers = state.data.practices.map((p) => String(p.numero || "")).filter((number) => number.startsWith(prefix)).map((number) => Number(number.slice(prefix.length))).filter(Number.isFinite);
    const number = record.numero || prefix + String((existingNumbers.length ? Math.max(...existingNumbers) : 0) + 1).padStart(4, "0");
    const inferredType = record.finanziaria === "Grenke" ? "NOLEGGIO" : record.finanziaria === "IFIS" ? "LEASING" : "ACQUISTO";
    const practiceType = String(record.tipo_pratica || inferredType).toUpperCase();
    const allowedStatuses = practiceType === "ACQUISTO" ? STATUSES.filter((status) => status !== "Bocciata") : STATUSES;
    const selectedClientId = record.clientId || clientId || "";
    const selectedClient = state.data.clients.find((c) => c.id === selectedClientId);
    const clientField = record.id
      ? `${field("Cliente", "cliente_display", record.cliente || (selectedClient && selectedClient.ragioneSociale) || "", { readonly: true })}<input type="hidden" name="clientId" value="${esc(selectedClientId)}">`
      : `<label>Cliente<select name="clientId" required><option value="">Seleziona cliente</option>${state.data.clients.map((c) => `<option value="${esc(c.id)}" ${c.id === selectedClientId ? "selected" : ""}>${esc(c.ragioneSociale)}</option>`).join("")}</select></label>`;
    let inventoryRows = [];
    try { inventoryRows = JSON.parse(record.righe_magazzino_json || "[]"); } catch (error) { inventoryRows = []; }
    const selectedProductId = (inventoryRows[0] && inventoryRows[0].product_id) || "";
    const productOptions = state.data.products.filter((p) => String(p.attivo || "SI").toUpperCase() === "SI");
    const isP391Id = (value) => ["p391-50100", "p391-5050"].includes(String(value || "").toLowerCase());
    const logicalProducts = productOptions.filter((p) => !isP391Id(p.id));
    if (productOptions.some((p) => isP391Id(p.id))) {
      logicalProducts.splice(Math.min(3, logicalProducts.length), 0, { id: "P391_UNIFIED", nome: "P3.91", cabX: 50, cabY: 50, unifiedP391: true });
    }
    const selectedProduct = isP391Id(selectedProductId)
      ? logicalProducts.find((p) => p.id === "P391_UNIFIED")
      : logicalProducts.find((p) => p.id === selectedProductId) || logicalProducts[0] || {};
    const measure = String(record.misure_display || "").match(/([\d.,]+)\s*[x×]\s*([\d.,]+)/i);
    const width = measure ? Number(measure[1].replace(",", ".")) : Number(selectedProduct.cabX || 50) / 100;
    const height = measure ? Number(measure[2].replace(",", ".")) : Number(selectedProduct.cabY || 50) / 100;
    const bifacial = String(record.bifacciale || "NO").toUpperCase();
    const statusField = !api.isAdmin()
      ? `<input type="hidden" name="stato" value="${esc(record.stato || "Inserita")}">`
      : field("Stato", "stato", record.stato || "Inserita", { options: allowedStatuses });
    const technicalFields = `<fieldset class="practice-configurator full"><legend>Configurazione display</legend><div class="form-grid">
      <label>Display di riferimento<select name="product_id" required>${logicalProducts.map((p) => `<option value="${esc(p.id)}" ${p.id === selectedProduct.id ? "selected" : ""}>${esc(p.nome)}${p.unifiedP391 ? " · composizione automatica 50×100 + 50×50 cm" : ` · cabinet ${esc(p.cabX)}×${esc(p.cabY)} cm`}</option>`).join("")}</select></label>
      ${field("Larghezza display (m)", "display_width", width, { type: "number", min: 0, step: "any" })}
      ${field("Altezza display (m)", "display_height", height, { type: "number", min: 0, step: "any" })}
      ${field("Bifacciale", "bifacciale", bifacial, { options: ["NO", "SI"] })}
      <label>Cabinet necessari<input name="cabinet_calculated" value="0" readonly><small id="cabinetAvailability" class="cabinet-availability"></small></label>
      <div id="measureValidation" class="measure-validation full"></div>
    </div></fieldset>`;
    const fields = field("Identificativo pratica", "numero", number, { required: true, readonly: true }) + clientField +
      field("Tipo pratica", "tipo_pratica", practiceType, { options: ["ACQUISTO", "NOLEGGIO", "LEASING"] }) +
      statusField + field("Finanziaria", "finanziaria", record.finanziaria || (practiceType === "NOLEGGIO" ? "Grenke" : practiceType === "LEASING" ? "IFIS" : "Da definire"), { options: FINANCE, readonly: practiceType !== "ACQUISTO" }) +
      field("Valore IVA esclusa", "valore", record.valore || 0, { type: "number", min: 0, step: "0.01" }) +
      technicalFields +
      (record.preventivo_id ? field("Preventivo S.Q.P.", "preventivo_id", record.preventivo_id, { readonly: true }) + field("Origine", "origine", record.origine || "S.Q.P.", { readonly: true }) : "") +
      `<input type="hidden" name="modelli_display" value="${esc(record.modelli_display || "")}"><input type="hidden" name="misure_display" value="${esc(record.misure_display || "")}"><input type="hidden" name="cabinet_da_sottrarre" value="${esc(record.cabinet_da_sottrarre || "")}"><input type="hidden" name="righe_magazzino_json" value="${esc(record.righe_magazzino_json || "[]")}"><input type="hidden" name="p391_unificato" value="${esc(record.p391_unificato || "NO")}"><input type="hidden" name="p391_cabinet_50100" value="${esc(record.p391_cabinet_50100 || "0")}"><input type="hidden" name="p391_cabinet_5050" value="${esc(record.p391_cabinet_5050 || "0")}">` +
      (record.righe_json ? `<input type="hidden" name="righe_json" value="${esc(record.righe_json)}">` : "") +
      field("Note", "note", record.note || "", { type: "textarea", full: true });
    openModal(record.id ? `Pratica ${record.numero}` : "Nuova pratica", formShell("practices", record.id, fields, record.id ? "Aggiorna pratica" : "Crea pratica"), { wide: true, kicker: record.id ? "Gestione pratica" : "Nuova opportunità", subtitle: client ? client.ragioneSociale : "Compila le informazioni principali" });
    const typeSelect = document.querySelector('.entity-form select[name="tipo_pratica"]');
    const statusSelect = document.querySelector('.entity-form select[name="stato"]');
    const financeSelect = document.querySelector('.entity-form select[name="finanziaria"]');
    const updatePracticeType = () => {
      if (financeSelect) {
        financeSelect.value = typeSelect.value === "NOLEGGIO" ? "Grenke" : typeSelect.value === "LEASING" ? "IFIS" : "Da definire";
        financeSelect.disabled = typeSelect.value !== "ACQUISTO";
      }
      if (statusSelect) {
        const current = statusSelect.value;
        const options = typeSelect.value === "ACQUISTO" ? STATUSES.filter((status) => status !== "Bocciata") : STATUSES;
        statusSelect.innerHTML = options.map((status) => `<option value="${status}" ${status === current ? "selected" : ""}>${status}</option>`).join("");
        if (!options.includes(current)) statusSelect.value = "Sospesa";
      }
    };
    if (typeSelect) {
      typeSelect.addEventListener("change", updatePracticeType);
      if (!record.id) updatePracticeType();
    }
    bindPracticeCalculator(logicalProducts, productOptions);
  }

  function bindPracticeCalculator(products, inventoryProducts) {
    const form = document.querySelector(".entity-form[data-entity='practices']");
    if (!form) return;
    form.noValidate = true;
    const product = form.elements.product_id;
    const width = form.elements.display_width;
    const height = form.elements.display_height;
    const bifacial = form.elements.bifacciale;
    const cabinets = form.elements.cabinet_calculated;
    const validation = $("measureValidation");
    const availability = $("cabinetAvailability");
    function calculate() {
      const p = products.find((item) => item.id === product.value) || {};
      const isUnifiedP391 = p.id === "P391_UNIFIED";
      const stepX = Number(p.cabX || 50) / 100;
      const stepY = Number(p.cabY || 50) / 100;
      width.step = String(stepX); height.step = String(stepY);
      width.min = String(stepX); height.min = String(stepY);
      const x = Math.max(1, Math.ceil((Number(width.value || 0) - 1e-8) / stepX));
      const y = Math.max(1, Math.ceil((Number(height.value || 0) - 1e-8) / stepY));
      const faces = bifacial.value === "SI" ? 2 : 1;
      let count = x * y * faces;
      const exactX = Math.abs(Number(width.value || 0) / stepX - Math.round(Number(width.value || 0) / stepX)) < 0.001;
      const exactY = Math.abs(Number(height.value || 0) / stepY - Math.round(Number(height.value || 0) / stepY)) < 0.001;
      cabinets.value = count;
      if (isUnifiedP391) {
        const cellsWide = Math.max(1, Math.ceil((Number(width.value || 0) - 1e-8) / 0.5));
        const cellsHigh = Math.max(1, Math.ceil((Number(height.value || 0) - 1e-8) / 0.5));
        const rectangularCount = cellsWide * Math.floor(cellsHigh / 2) * faces;
        const squareCount = cellsWide * (cellsHigh % 2) * faces;
        const rectangular = inventoryProducts.find((item) => String(item.id).toLowerCase() === "p391-50100") || {};
        const square = inventoryProducts.find((item) => String(item.id).toLowerCase() === "p391-5050") || {};
        const rectangularStock = Number(rectangular.giacenza_attuale || 0);
        const squareStock = Number(square.giacenza_attuale || 0);
        const missingRectangular = Math.max(0, rectangularCount - rectangularStock);
        const missingSquare = Math.max(0, squareCount - squareStock);
        count = rectangularCount + squareCount;
        cabinets.value = count;
        availability.textContent = `50×100: ${rectangularCount}/${rectangularStock} · 50×50: ${squareCount}/${squareStock}`;
        availability.className = `cabinet-availability ${missingRectangular || missingSquare ? "insufficient" : "available"}`;
        const exactWidth = Math.abs(Number(width.value || 0) / 0.5 - Math.round(Number(width.value || 0) / 0.5)) < 0.001;
        const exactHeight = Math.abs(Number(height.value || 0) / 0.5 - Math.round(Number(height.value || 0) / 0.5)) < 0.001;
        const realizedWidth = cellsWide * 0.5;
        const realizedHeight = cellsHigh * 0.5;
        validation.innerHTML = missingRectangular || missingSquare
          ? `<strong>Giacenza insufficiente:</strong> ${missingRectangular ? `mancano ${missingRectangular} cabinet 50×100` : ""}${missingRectangular && missingSquare ? " e " : ""}${missingSquare ? `mancano ${missingSquare} cabinet 50×50` : ""}. Puoi comunque inserire la pratica.`
          : (!exactWidth || !exactHeight)
            ? `<strong>Misura adattata:</strong> configurazione reale ${realizedWidth.toFixed(2)}×${realizedHeight.toFixed(2)} m. Composizione: ${rectangularCount} cabinet 50×100 e ${squareCount} cabinet 50×50${faces === 2 ? " (bifacciale)" : ""}.`
            : `P3.91 unificato: ${rectangularCount} cabinet 50×100 e ${squareCount} cabinet 50×50${faces === 2 ? " (bifacciale)" : ""}.`;
        const rows = [];
        if (rectangularCount) rows.push({ product_id: rectangular.id || "p391-50100", quantita: rectangularCount, descrizione: "P3.91 · cabinet 50×100 cm" });
        if (squareCount) rows.push({ product_id: square.id || "p391-5050", quantita: squareCount, descrizione: "P3.91 · cabinet 50×50 cm" });
        form.elements.modelli_display.value = "P3.91";
        form.elements.misure_display.value = `${Number(width.value || 0).toFixed(2)}x${Number(height.value || 0).toFixed(2)}`;
        form.elements.cabinet_da_sottrarre.value = `P3.91 50×100: ${rectangularCount}; P3.91 50×50: ${squareCount}`;
        form.elements.righe_magazzino_json.value = JSON.stringify(rows);
        form.elements.p391_unificato.value = "SI";
        form.elements.p391_cabinet_50100.value = String(rectangularCount);
        form.elements.p391_cabinet_5050.value = String(squareCount);
        return;
      }
      const stock = Number(p.giacenza_attuale || 0);
      availability.textContent = `${stock} disponibili · ${count} necessari`;
      availability.className = `cabinet-availability ${count > stock ? "insufficient" : "available"}`;
      validation.innerHTML = count > stock ? `<strong>Giacenza insufficiente:</strong> mancano ${count - stock} cabinet. Puoi comunque inserire la pratica.` : (!exactX || !exactY) ? `<strong>Misura non multipla:</strong> la configurazione reale sarà ${x * stepX}×${y * stepY} m (${count} cabinet${faces === 2 ? ", bifacciale" : ""}).` : `Misura realizzabile esattamente con ${count} cabinet.`;
      form.elements.modelli_display.value = String(p.nome || "").split(" - ")[0];
      form.elements.misure_display.value = `${Number(width.value || 0).toFixed(2)}x${Number(height.value || 0).toFixed(2)}`;
      form.elements.cabinet_da_sottrarre.value = `${p.nome}: ${count}`;
      form.elements.righe_magazzino_json.value = JSON.stringify([{ product_id: p.id, quantita: count, descrizione: p.nome }]);
      form.elements.p391_unificato.value = "NO";
      form.elements.p391_cabinet_50100.value = "0";
      form.elements.p391_cabinet_5050.value = "0";
    }
    [product, width, height, bifacial].forEach((element) => element && element.addEventListener("change", calculate));
    [width, height].forEach((element) => element && element.addEventListener("input", calculate));
    calculate();
  }

  function updateNotificationBell() {
    const unread = ((state.data && state.data.notifications) || []).filter((item) => String(item.letta || "NO").toUpperCase() !== "SI").length;
    const dot = $("notificationDot");
    if (dot) { dot.classList.toggle("visible", unread > 0); dot.textContent = unread > 9 ? "9+" : (unread || ""); }
  }

  async function openNotifications() {
    const notes = (state.data.notifications || []).slice(0, 30);
    const body = `<div class="notification-list">${notes.length ? notes.map((note) => `<article class="notification-item ${String(note.letta || "NO").toUpperCase() === "SI" ? "" : "unread"}"><span>${badge(note.nuovo_stato)}</span><div><strong>${esc(note.titolo)}</strong><p>${esc(note.messaggio)}</p><small>${dateIt(note.data)}</small></div></article>`).join("") : `<div class="empty-state"><span>♢</span><h3>Nessuna notifica</h3><p>Le variazioni delle tue pratiche appariranno qui.</p></div>`}</div>`;
    openModal("Notifiche", body, { kicker: "Aggiornamenti pratiche" });
    if (notes.some((note) => String(note.letta || "NO").toUpperCase() !== "SI")) {
      try { state.data.notifications = await api.markNotificationsRead(); updateNotificationBell(); } catch (error) { toast(error.message, "danger"); }
    }
  }

  function openClient(id) {
    const r = state.data.clients.find((c) => c.id === id) || {};
    const session = api.getSession() || {};
    const owner = String(r.creato_da_username || r.agent_username || "");
    const canEdit = !r.id || api.isAdmin() || String(r.puo_modificare || "NO").toUpperCase() === "SI" || owner === String(session.username || "");
    const fields = field("Ragione sociale", "ragioneSociale", r.ragioneSociale, { required: true, full: true }) +
      field("Referente", "referente", r.referente) +
      field("Email", "email", r.email, { type: "email" }) +
      window.SeemaxClientTools.renderFields(r) +
      field("Note commerciali", "note", r.note, { type: "textarea", full: true });
    openModal(r.id ? (canEdit ? "Modifica cliente" : "Anagrafica condivisa") : "Nuovo cliente", formShell("clients", r.id, fields, canEdit ? "Salva cliente" : "Consultazione"), { wide: true, kicker: canEdit ? "Anagrafica cliente" : "Cliente condiviso", subtitle: !canEdit ? `Creato da ${r.creato_da_nome || "un altro utente"}. Puoi utilizzarlo nelle tue pratiche, ma non modificarlo.` : "" });
    const form = document.querySelector(".entity-form[data-entity='clients']");
    if (form) window.SeemaxClientTools.bind(form, r, state.data.clients, api, toast, !canEdit);
  }

  function openProduct(id) {
    const r = state.data.products.find((p) => p.id === id) || { attivo: "SI", categoria: "Ledwall Outdoor" };
    const canonical = String(r.nome || "").startsWith("P3.91") ? "P3.91" : String(r.nome || "").startsWith("P4") ? "P4" : r.nome;
    const specs = TECH_SPECS[canonical] || [];
    const spec = (key, prefix) => r[key] || ((specs.find((line) => line.toLowerCase().startsWith(prefix.toLowerCase())) || "").split(":").slice(1).join(":").trim());
    const section = (title, content) => `<fieldset class="product-form-section full"><legend>${esc(title)}</legend><div class="form-grid">${content}</div></fieldset>`;
    const fields =
      section("Dettagli", field("Nome / Pixel Pitch", "nome", r.nome, { required: true }) + field("SKU", "sku", r.sku) + field("Categoria", "categoria", r.categoria) + field("Descrizione", "descrizione", r.descrizione, { type: "textarea", full: true }) + field("Larghezza cabinet (cm)", "cabX", r.cabX || 50, { type: "number" }) + field("Altezza cabinet (cm)", "cabY", r.cabY || 50, { type: "number" })) +
      section("Costi", field("Prezzo agente", "prezzoAgente", r.prezzoAgente || 0, { type: "number", step: "0.01" }) + field("Prezzo cliente", "prezzoCliente", r.prezzoCliente || 0, { type: "number", step: "0.01" }) + field("Costo base", "prezzoCina", r.prezzoCina || 0, { type: "number", step: "0.01" }) + field("Promo agente", "prezzoPromoAgenti", r.prezzoPromoAgenti || "", { type: "number", step: "0.01" }) + field("Promo cliente", "prezzoPromoClienti", r.prezzoPromoClienti || "", { type: "number", step: "0.01" }) + field("Promo attiva", "promo_attiva", r.promo_attiva || "NO", { options: ["SI", "NO"] })) +
      section("Giacenze", field("Giacenza iniziale", "giacenza_iniziale", r.giacenza_iniziale || 0, { type: "number", min: 0 }) + field("Giacenza attuale", "giacenza_attuale", r.giacenza_attuale || 0, { type: "number", min: 0 }) + field("Stato giacenza", "stato_giacenza", r.stato_giacenza || "DISPONIBILE", { options: ["DISPONIBILE", "IN ARRIVO", "SOLO SU ORDINAZIONE", "NON DISPONIBILE"] })) +
      section("Scheda tecnica", field("Pixel pitch", "tech_pixel_pitch", spec("tech_pixel_pitch", "Pixel pitch")) + field("Certificazione", "tech_certificazione", spec("tech_certificazione", "Certificazione")) + field("Modalità di utilizzo", "tech_utilizzo", spec("tech_utilizzo", "Modalità")) + field("Densità pixel", "tech_densita_pixel", spec("tech_densita_pixel", "Densità pixel")) + field("LED standard", "tech_led_standard", spec("tech_led_standard", "LED")) + field("Materiale cabinet", "tech_materiale_cabinet", spec("tech_materiale_cabinet", "Cabinet")) + field("Peso cabinet", "tech_peso_cabinet", spec("tech_peso_cabinet", "Peso cabinet")) + field("Scala di grigi", "tech_scala_grigi", spec("tech_scala_grigi", "Scala di grigi")) + field("Temperatura operativa", "tech_temperatura", spec("tech_temperatura", "Temperatura")) + field("Valore IP", "tech_ip", spec("tech_ip", "Protezione")) + field("Consumo medio", "tech_consumo_medio", spec("tech_consumo_medio", "Consumo medio")) + field("Consumo massimo", "tech_consumo_massimo", spec("tech_consumo_massimo", "Consumo massimo")) + field("Vita media", "tech_vita_media", spec("tech_vita_media", "Vita media")) + field("Visibilità", "tech_visibilita", spec("tech_visibilita", "Visibilità")) + field("Luminosità", "tech_luminosita", spec("tech_luminosita", "Luminosità")) + field("Frequenza aggiornamento", "tech_refresh", spec("tech_refresh", "Refresh"))) +
      section("Altro", field("Immagine prodotto", "immagine_url", r.immagine_url, { full: true }) + field("Link scheda tecnica", "scheda_url", r.scheda_url, { full: true }) + field("Informazioni agenti", "infoAgenti", r.infoAgenti, { type: "textarea", full: true }) + field("Informazioni amministrative", "infoAdmin", r.infoAdmin, { type: "textarea", full: true }) + field("Prodotto attivo", "attivo", r.attivo || "SI", { options: ["SI", "NO"] }));
    openModal(r.id ? "Modifica prodotto" : "Nuovo prodotto", formShell("products", r.id, fields), { wide: true, kicker: "Catalogo Ledwall" });
  }

  function openProductTech(id) {
    const p = state.data.products.find((product) => product.id === id);
    if (!p) return;
    const canonical = String(p.nome || "").startsWith("P3.91") ? "P3.91" : String(p.nome || "").startsWith("P4") ? "P4" : p.nome;
    const summary = String(p.infoAgenti || p.descrizione || "").split("|").map((line) => line.trim()).filter(Boolean);
    const editableSpecs = [["Pixel pitch",p.tech_pixel_pitch],["Certificazione",p.tech_certificazione],["Modalità",p.tech_utilizzo],["Densità pixel",p.tech_densita_pixel],["LED",p.tech_led_standard],["Cabinet",p.tech_materiale_cabinet],["Peso cabinet",p.tech_peso_cabinet],["Scala di grigi",p.tech_scala_grigi],["Temperatura",p.tech_temperatura],["Protezione",p.tech_ip],["Consumo medio",p.tech_consumo_medio],["Consumo massimo",p.tech_consumo_massimo],["Vita media",p.tech_vita_media],["Visibilità",p.tech_visibilita],["Luminosità",p.tech_luminosita],["Refresh",p.tech_refresh]].filter((entry) => entry[1]).map((entry) => `${entry[0]}: ${entry[1]}`);
    const details = [...summary, ...(editableSpecs.length ? editableSpecs : (TECH_SPECS[canonical] || []))].filter((line, index, all) => all.indexOf(line) === index);
    const stock = Number(p.giacenza_attuale || 0);
    const body = `<div class="tech-sheet"><div class="tech-sheet-image">${p.immagine_url ? `<img src="${esc(p.immagine_url)}" alt="${esc(p.nome)}">` : `<div class="pixel-pattern"></div>`}</div><div><span class="section-kicker">${esc(p.sku || p.id || "Ledwall")}</span><h3>${esc(p.nome)} · ${esc(p.cabX)}×${esc(p.cabY)} cm</h3><div class="tech-spec-grid">${details.length ? details.map((line) => { const parts = line.split(":"); return `<div><small>${esc(parts.length > 1 ? parts.shift() : "SPECIFICA")}</small><strong>${esc(parts.join(":").trim() || line)}</strong></div>`; }).join("") : `<p>Scheda tecnica da completare.</p>`}</div><div class="stock-summary"><div><small>${esc(p.stato_giacenza || (stock ? "DISPONIBILE" : "NON DISPONIBILE"))}</small><strong>${stock} pz</strong></div><span>${String(p.promo_attiva || "NO").toUpperCase() === "SI" ? "PROMO ATTIVA" : "LISTINO ORDINARIO"}</span></div></div></div>`;
    openModal(`Scheda tecnica ${p.nome}`, body, { wide: true, kicker: "Catalogo Seemax" });
  }

  function openDocument(id) {
    const r = state.data.documents.find((d) => d.id === id) || {};
    if (!id && api.isFastMode()) { toast("Il caricamento dei file è disponibile soltanto in Modalità Standard.", "danger"); return; }
    const fileField = api.isFastMode()
      ? `<div class="full fast-upload-note">Il file non può essere sostituito mentre è attiva la Modalità Rapida.</div>`
      : `<label class="full upload-field">File dal dispositivo${r.url ? `<small>Il file attuale resta invariato se non ne selezioni uno nuovo.</small>` : `<small>Massimo 8 MB. Il file sarà archiviato nel Drive Seemax.</small>`}<input name="document_file" type="file" ${r.url ? "" : "required"} accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt"></label>`;
    const fields = field("Nome documento", "nome", r.nome, { required: true, full: true }) + field("Tipo", "tipo", r.tipo || "Preventivo", { options: ["Preventivo", "Contratto", "Documento cliente", "Documento finanziaria", "Installazione", "Altro"] }) + field("Pratica", "practiceId", r.practiceId || "", { options: ["", ...state.data.practices.map((p) => p.id)] }) + fileField + field("Data", "data", r.data || new Date().toISOString().slice(0, 10), { type: "date" }) + field("Note", "note", r.note, { type: "textarea", full: true });
    openModal(r.id ? "Modifica documento" : "Nuovo documento", formShell("documents", r.id, fields), { wide: true, kicker: "Archivio documentale" });
  }

  function openActivity(id) {
    const r = state.data.activities.find((a) => a.id === id) || {};
    const fields = field("Titolo attività", "titolo", r.titolo, { required: true, full: true }) + field("Tipo", "tipo", r.tipo || "Telefonata", { options: ["Telefonata", "Email", "Appuntamento", "Verifica", "Installazione", "Altro"] }) + field("Stato", "stato", r.stato || "Aperta", { options: ["Aperta", "In corso", "Completata"] }) + field("Scadenza", "scadenza", r.scadenza || new Date().toISOString().slice(0, 10), { type: "date" }) + field("Pratica collegata", "practiceId", r.practiceId || "", { options: ["", ...state.data.practices.map((p) => p.id)] }) + field("Assegnata a", "assegnatoA", r.assegnatoA || ((api.getSession() || {}).displayName || ""), { full: true });
    openModal(r.id ? "Modifica attività" : "Nuova attività", formShell("activities", r.id, fields), { wide: true, kicker: "Agenda operativa" });
  }

  function openUser(id) {
    const r = state.data.users.find((u) => (u.id || u.username) === id) || { ruolo: "AGENTE", stato: "ATTIVO" };
    const fields = field("Nome visualizzato", "nome_visualizzato", r.nome_visualizzato, { required: true }) + field("Username", "username", r.username, { required: true, readonly: !!r.username }) + field(r.id ? "Nuova Chiave ID (lascia vuoto per non cambiarla)" : "Chiave ID", "chiave_id_agente", "", { required: !r.id }) + field("Ruolo", "ruolo", r.ruolo, { options: ["AGENTE", "ADMIN"] }) + field("Email", "email", r.email, { type: "email" }) + field("Telefono", "telefono", r.telefono) + field("Stato", "stato", r.stato, { options: ["ATTIVO", "SOSPESO"] }) + field("Note", "note", r.note, { type: "textarea", full: true });
    openModal(r.id ? "Modifica agente" : "Nuovo agente", formShell("users", r.id, fields), { wide: true, kicker: "Accessi S.Q.P." });
  }

  function serializeForm(form) {
    const record = {};
    new FormData(form).forEach((value, key) => { record[key] = value; });
    form.querySelectorAll('input[type="number"]').forEach((input) => { record[input.name] = input.value === "" ? "" : Number(input.value); });
    return record;
  }

  function updateLocalDashboard() {
    const practices = state.data.practices || [];
    const activities = state.data.activities || [];
    const open = practices.filter((p) => !["Completata", "Bocciata"].includes(p.stato));
    const session = api.getSession() || {};
    const completed = practices.filter((p) => p.stato === "Completata");
    const previousRevenue = (state.data.dashboard && state.data.dashboard.revenue) || {};
    state.data.dashboard = {
      totals: { clients: (state.data.clients || []).length, practices: open.length, value: open.reduce((sum, p) => sum + Number(p.valore || 0), 0), activities: activities.filter((a) => a.stato !== "Completata").length },
      revenue: {
        personal: completed.filter((p) => String(p.agent_username || "") === String(session.username || "") || (!p.agent_username && p.agente === (session.displayName || session.nome_visualizzato))).reduce((sum, p) => sum + Number(p.valore || 0), 0),
        company: api.isAdmin() ? completed.reduce((sum, p) => sum + Number(p.valore || 0), 0) : Number(previousRevenue.company || 0),
        target: Number((state.data.settings || {}).obiettivo_fatturato || previousRevenue.target || 0)
      },
      recentPractices: practices.slice().sort((a, b) => String(b.aggiornatoIl || "").localeCompare(String(a.aggiornatoIl || ""))).slice(0, 5),
      nextActivities: activities.filter((a) => a.stato !== "Completata").sort((a, b) => String(a.scadenza || "").localeCompare(String(b.scadenza || ""))).slice(0, 6),
      pipeline: STATUSES.map((status) => ({ status, count: practices.filter((p) => p.stato === status).length, value: practices.filter((p) => p.stato === status).reduce((sum, p) => sum + Number(p.valore || 0), 0) }))
    };
  }

  function replaceLocalEntity(entity, row) {
    const rows = state.data[entity] || (state.data[entity] = []);
    const index = rows.findIndex((item) => String(item.id || item.username) === String(row.id || row.username));
    if (index >= 0) rows[index] = { ...rows[index], ...row };
    else rows.unshift(row);
    updateLocalDashboard();
  }

  async function saveEntity(form) {
    const entity = form.dataset.entity;
    const missing = Array.from(form.querySelectorAll("[required]")).find((element) => !String(element.value || "").trim());
    if (missing) {
      toast("Compila tutti i campi obbligatori prima di proseguire.", "danger");
      missing.focus();
      return;
    }
    if (entity === "practices" && (Number(form.elements.display_width?.value || 0) <= 0 || Number(form.elements.display_height?.value || 0) <= 0)) {
      toast("Inserisci larghezza e altezza maggiori di zero.", "danger");
      return;
    }
    if (entity === "clients") {
      if (form.elements.piva?.value && (form.elements.piva_formalmente_valida?.value !== "SI" || form.elements.piva_duplicata?.value === "SI")) {
        toast("La Partita IVA non è formalmente valida oppure è già presente nel gestionale.", "danger");
        form.elements.piva.focus();
        return;
      }
      if (form.elements.iban?.value && form.elements.iban_valido?.value !== "SI") {
        toast("Controlla l’IBAN: il codice inserito non supera la verifica MOD-97.", "danger");
        form.elements.iban.focus();
        return;
      }
      if (form.elements.telefono_numero?.value && form.elements.telefono_valido?.value !== "SI") {
        toast("Controlla il numero di cellulare e il prefisso internazionale.", "danger");
        form.elements.telefono_numero.focus();
        return;
      }
    }
    const current = (state.data[entity] || []).find((item) => String(item.id) === String(form.dataset.id)) || {};
    const record = { ...current, ...serializeForm(form) };
    delete record.cabinet_calculated;
    delete record.display_width;
    delete record.display_height;
    delete record.product_id;
    delete record.stato_display;
    if (form.dataset.id) record.id = form.dataset.id;
    const now = new Date().toISOString().slice(0, 10);
    if (entity === "clients") record.creatoIl = record.creatoIl || now;
    if (entity === "clients") {
      delete record.telefono_numero;
      delete record.piva_duplicata;
      record.piva = String(record.piva || "").replace(/\D/g, "");
      record.codice_fiscale = String(record.codice_fiscale || "").replace(/\s+/g, "").toUpperCase();
      record.iban = String(record.iban || "").replace(/\s+/g, "").toUpperCase();
      record.citta = record.comune || record.citta || "";
    }
    if (entity === "practices") {
      const client = state.data.clients.find((c) => c.id === record.clientId);
      record.cliente = client ? client.ragioneSociale : record.cliente;
      record.agente = record.agente || ((api.getSession() || {}).displayName || "");
      record.agent_username = record.agent_username || ((api.getSession() || {}).username || "");
      record.finanziaria = record.tipo_pratica === "NOLEGGIO" ? "Grenke" : record.tipo_pratica === "LEASING" ? "IFIS" : (record.finanziaria || "Da definire");
      if (!api.isAdmin() && !current.id) record.stato = "Inserita";
      record.aggiornatoIl = now;
      record.id = record.id || "PR-" + record.numero;
      if (!current.id) record.nuova_pratica = "SI";
    }
    if (entity === "documents") {
      delete record.document_file;
      const practice = state.data.practices.find((p) => p.id === record.practiceId);
      record.pratica = practice ? practice.numero : "";
      record.cliente = practice ? practice.cliente : "";
      const file = form.elements.document_file && form.elements.document_file.files[0];
      if (file) {
        if (api.isFastMode()) { toast("Il caricamento dei file è disponibile soltanto in Modalità Standard.", "danger"); return; }
        if (file.size > 8 * 1024 * 1024) { toast("Il file supera il limite di 8 MB.", "danger"); return; }
        record.file_base64 = await readFileAsDataUrl(file);
        record.file_name = file.name;
        record.file_type = file.type || "application/octet-stream";
        record.file_size = file.size;
        if (!record.nome) record.nome = file.name;
      }
    }
    if (entity === "users") {
      record.id = record.id || record.username;
      if (!record.chiave_id_agente) delete record.chiave_id_agente;
    }
    setLoading(true, `Salvataggio ${ENTITY_LABELS[entity] || "dato"}…`);
    try {
      const saved = await api.upsert(entity, record);
      if (saved.__notifications) { state.data.notifications = saved.__notifications; delete saved.__notifications; updateNotificationBell(); }
      replaceLocalEntity(entity, saved);
      setConnectionState();
      closeModal();
      renderRoute();
      toast(`${ENTITY_LABELS[entity] || "Elemento"} salvato correttamente.`);
    } catch (error) { toast(error.message, "danger"); }
    finally { setLoading(false); }
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Impossibile leggere il file selezionato."));
      reader.readAsDataURL(file);
    });
  }

  async function removeEntity(entity, id) {
    const label = ENTITY_LABELS[entity] || "elemento";
    if (!confirm(`Eliminare definitivamente questo ${label}?`)) return;
    setLoading(true, "Eliminazione…");
    try { await api.remove(entity, id); state.data[entity] = (state.data[entity] || []).filter((item) => String(item.id || item.username) !== String(id)); updateLocalDashboard(); renderRoute(); toast(`${label} eliminato.`); }
    catch (error) { toast(error.message, "danger"); }
    finally { setLoading(false); }
  }

  async function toggleActivity(id) {
    const record = state.data.activities.find((a) => a.id === id);
    if (!record) return;
    const saved = await api.upsert("activities", { ...record, stato: record.stato === "Completata" ? "Aperta" : "Completata" });
    replaceLocalEntity("activities", saved); renderRoute(); toast("Attività aggiornata.");
  }

  function updateModeControls() {
    const fast = api.isFastMode();
    const count = api.pendingOperations().length;
    const label = $("workModeLabel");
    const switchButton = $("modeSwitchButton");
    const saveButton = $("saveAllButton");
    if (!label || !switchButton || !saveButton) return;
    label.textContent = fast ? "MODALITÀ: RAPIDA" : "MODALITÀ: STANDARD";
    label.className = `mode-indicator ${fast ? "fast" : "standard"}`;
    switchButton.textContent = fast ? "Modalità Standard" : "Modalità Rapida";
    switchButton.dataset.action = fast ? "disable-fast-mode" : "enable-fast-mode";
    saveButton.classList.toggle("is-hidden", !fast);
    $("pendingCount").textContent = count;
    saveButton.disabled = count === 0;
    const mobileLabel = $("mobileWorkModeLabel");
    const mobileButton = $("mobileModeSwitchButton");
    if (mobileLabel) mobileLabel.textContent = fast ? `⚡ Modalità Rapida${count ? ` · ${count} da salvare` : ""}` : "● Modalità Standard";
    if (mobileButton) {
      mobileButton.textContent = fast ? "Passa a Standard" : "Passa a Rapida";
      mobileButton.dataset.action = fast ? "disable-fast-mode" : "enable-fast-mode";
    }
  }

  function openFastModeWarning() {
    const body = `<div class="fast-mode-warning"><span class="fast-bolt">⚡</span><h3>Lavoro locale ad alta velocità</h3><p>Il Management Suite non comunicherà costantemente con il Database. Tutti i dati saranno salvati localmente su questo dispositivo e dovranno essere caricati manualmente tramite <strong>SALVA TUTTO</strong>.</p><div class="warning-callout"><strong>Quotation Planner disponibile con archivio limitato</strong><span>Il calcolatore resterà utilizzabile, ma non sarà possibile salvare o caricare preventivi dall’archivio online. Anche il caricamento di documenti nel gestionale sarà temporaneamente disabilitato.</span></div><ul><li>Le modifiche restano su questo browser fino alla sincronizzazione.</li><li>Non cancellare dati del browser prima di usare SALVA TUTTO.</li><li>Le Attività restano locali in entrambe le modalità.</li></ul><div class="form-actions"><button class="btn ghost" data-action="close-modal">Annulla</button><button class="btn primary" data-action="confirm-fast-mode">Attiva Modalità Rapida</button></div></div>`;
    openModal("Attivare la Modalità Rapida?", body, { kicker: "Avviso operativo" });
  }

  function enableFastMode() {
    api.setFastMode(true);
    closeModal();
    updateModeControls();
    setConnectionState();
    renderRoute();
    toast("Modalità Rapida attiva.");
  }

  function disableFastMode() {
    const pending = api.pendingOperations().length;
    if (pending) {
      toast(`Prima usa SALVA TUTTO: ci sono ${pending} elementi da trasferire.`, "danger");
      return;
    }
    api.setFastMode(false);
    updateModeControls();
    setConnectionState();
    renderRoute();
    toast("Modalità Standard attiva.");
  }

  function operationLabel(operation) {
    if (!operation) return "Completamento sincronizzazione";
    if (operation.type === "settings") return "Impostazioni generali";
    const labels = { practices: "Pratica", clients: "Cliente", products: "Prodotto", documents: "Documento", users: "Agente" };
    const record = operation.record || {};
    return `${operation.type === "remove" ? "Eliminazione" : labels[operation.entity] || operation.entity}: ${record.numero || record.nome || record.ragioneSociale || record.username || operation.id || "elemento"}`;
  }

  async function syncAll() {
    const total = api.pendingOperations().length;
    if (!total) { toast("Non ci sono elementi da salvare."); return; }
    const layer = $("syncLayer");
    layer.classList.remove("is-hidden");
    try {
      await api.syncAll(({ index, total: count, operation, done }) => {
        const percent = count ? Math.round((index / count) * 100) : 100;
        $("syncProgressBar").style.width = `${done ? 100 : percent}%`;
        $("syncProgressText").textContent = done ? `${count} elementi salvati` : `${index + 1} di ${count}`;
        $("syncCurrentItem").textContent = done ? "Sincronizzazione completata." : operationLabel(operation);
      });
      await loadAll();
      renderRoute();
      toast("Tutto il lavoro locale è stato salvato nel database.");
    } catch (error) {
      toast(`Sincronizzazione interrotta: ${error.message}`, "danger");
    } finally {
      setTimeout(() => layer.classList.add("is-hidden"), 500);
      updateModeControls();
      setConnectionState();
    }
  }

  function searchEverywhere(query) {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return;
    const clients = state.data.clients.filter((c) => [c.ragioneSociale, c.referente, c.piva].some((v) => String(v || "").toLowerCase().includes(q))).slice(0, 6);
    const practices = state.data.practices.filter((p) => [p.numero, p.cliente, p.titolo].some((v) => String(v || "").toLowerCase().includes(q))).slice(0, 8);
    openModal("Risultati ricerca", `<div class="search-results"><h3>Pratiche</h3>${practices.length ? practices.map((p) => `<button data-action="edit-practice" data-id="${esc(p.id)}"><span>▣</span><div><strong>${esc(p.numero)} · ${esc(p.cliente)}</strong><small>${esc(p.titolo)}</small></div>${badge(p.stato)}</button>`).join("") : `<p>Nessuna pratica trovata.</p>`}<h3>Clienti</h3>${clients.length ? clients.map((c) => `<button data-action="edit-client" data-id="${esc(c.id)}"><span>♙</span><div><strong>${esc(c.ragioneSociale)}</strong><small>${esc(c.referente || c.citta || "")}</small></div></button>`).join("") : `<p>Nessun cliente trovato.</p>`}</div>`, { wide: true, kicker: `Ricerca: ${query}` });
  }

  async function handleAction(action, id) {
    const handlers = {
      "new-practice": () => openPractice(), "edit-practice": () => openPractice(id), "delete-practice": () => removeEntity("practices", id),
      "new-client": () => openClient(), "edit-client": () => openClient(id), "delete-client": () => removeEntity("clients", id), "new-practice-client": () => openPractice(null, id),
      "new-product": () => openProduct(), "edit-product": () => openProduct(id), "product-tech": () => openProductTech(id), "delete-product": () => removeEntity("products", id),
      "new-document": () => openDocument(), "edit-document": () => openDocument(id), "delete-document": () => removeEntity("documents", id),
      "new-activity": () => openActivity(), "edit-activity": () => openActivity(id), "delete-activity": () => removeEntity("activities", id), "toggle-activity": () => toggleActivity(id),
      "new-user": () => openUser(), "edit-user": () => openUser(id), "delete-user": () => removeEntity("users", id),
      "close-modal": closeModal,
      "open-notifications": openNotifications,
      "enable-fast-mode": openFastModeWarning,
      "confirm-fast-mode": enableFastMode,
      "disable-fast-mode": disableFastMode,
      "sync-all": syncAll,
      "reload": async () => { await loadAll(); renderRoute(); },
      "test-database": async () => { setLoading(true, "Verifica database…"); try { const response = await api.ping(); setConnectionState(); toast(response.ok ? "Collegamento funzionante." : "Collegamento non disponibile.", response.ok ? "success" : "danger"); } catch (e) { toast(e.message, "danger"); } finally { setLoading(false); } },
      "export-demo": () => download(`seemax-demo-${new Date().toISOString().slice(0, 10)}.json`, api.exportDemo()),
      "reset-demo": async () => { if (confirm("Ripristinare tutti i dati dimostrativi?")) { api.resetDemo(); await loadAll(); renderRoute(); toast("Dati demo ripristinati."); } }
    };
    if (handlers[action]) await handlers[action]();
  }

  document.addEventListener("click", async (event) => {
    const filterTarget = event.target.closest("[data-filter-status]");
    if (filterTarget) { state.filterStatus = filterTarget.dataset.filterStatus || ""; state.practicePage = 1; renderRoute(); return; }
    const practicePageTarget = event.target.closest("[data-practice-page]");
    if (practicePageTarget && !practicePageTarget.disabled) { state.practicePage = Number(practicePageTarget.dataset.practicePage || 1); renderRoute(); return; }
    const routeTarget = event.target.closest("[data-route]");
    if (routeTarget) { go(routeTarget.dataset.route); return; }
    const actionTarget = event.target.closest("[data-action]");
    if (actionTarget) { await handleAction(actionTarget.dataset.action, actionTarget.dataset.id); return; }
    const demoTarget = event.target.closest("[data-demo-login]");
    if (demoTarget) {
      const account = config.demoAccounts[demoTarget.dataset.demoLogin === "admin" ? 0 : 1];
      $("loginUsername").value = account.username; $("loginKey").value = account.key; $("loginForm").requestSubmit();
    }
  });

  document.addEventListener("input", (event) => {
    if (event.target.id !== "practiceSearch") return;
    state.practiceQuery = event.target.value;
    state.practicePage = 1;
    renderRoute();
    requestAnimationFrame(() => {
      const input = $("practiceSearch");
      if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
    });
  });

  document.addEventListener("change", (event) => {
    if (event.target.id === "practiceSort") { state.practiceSort = event.target.value; state.practicePage = 1; renderRoute(); }
    if (event.target.id === "practiceDirection") { state.practiceDirection = event.target.value; state.practicePage = 1; renderRoute(); }
  });

  document.addEventListener("submit", async (event) => {
    if (event.target.id === "loginForm") {
      event.preventDefault();
      $("loginError").textContent = "";
      setLoading(true, "Verifica accesso…");
      try { await api.login($("loginUsername").value, $("loginKey").value); await showApp(); }
      catch (error) { $("loginError").textContent = error.message; }
      finally { setLoading(false); }
      return;
    }
    if (event.target.matches(".entity-form")) { event.preventDefault(); await saveEntity(event.target); return; }
    if (event.target.id === "settingsForm") {
      event.preventDefault();
      try {
        const values = serializeForm(event.target);
        await api.saveSettings(values);
        state.data.settings = { ...(state.data.settings || {}), ...values };
        updateLocalDashboard();
        if (!api.isFastMode()) await loadAll();
        renderRoute();
        setConnectionState();
        toast(api.isFastMode() ? "Impostazioni salvate localmente. Usa SALVA TUTTO." : "Impostazioni salvate.");
      }
      catch (error) { toast(error.message, "danger"); }
    }
  });

  $("logoutButton").addEventListener("click", () => { api.logout(); state.data = null; showLogin(); });
  $("quickAddButton").addEventListener("click", () => openPractice());
  $("openSidebar").addEventListener("click", () => $("sidebar").classList.add("open"));
  $("closeSidebar").addEventListener("click", () => $("sidebar").classList.remove("open"));
  $("globalSearch").addEventListener("keydown", (event) => { if (event.key === "Enter") searchEverywhere(event.currentTarget.value); });
  $("globalSearch").addEventListener("input", (event) => {
    if (["practices", "clients", "catalog", "documents", "activities", "users"].includes(state.route)) { state.search = event.target.value; renderRoute(); }
  });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") { closeModal(); $("sidebar").classList.remove("open"); } });
  window.addEventListener("hashchange", () => { if (api.getSession()) go(location.hash.replace("#", "") || "dashboard", false); });
  window.addEventListener("beforeinstallprompt", (event) => { event.preventDefault(); installPrompt = event; $("installAppButton").classList.remove("is-hidden"); });
  $("installAppButton").addEventListener("click", async () => { if (!installPrompt) return; installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; $("installAppButton").classList.add("is-hidden"); });

  async function boot() {
    if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
    if (api.getSession()) await showApp(); else showLogin();
  }

  boot();
})();
