(function () {
  "use strict";

  const api = window.SeemaxApi;
  const config = window.SEEMAX_APP_CONFIG;
  const $ = (id) => document.getElementById(id);
  const state = { route: "dashboard", data: null, loading: false, search: "", filterStatus: "" };
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

  const STATUSES = ["Nuova", "Preventivo", "Documenti", "Istruttoria", "Delibera", "Contratto", "Installazione", "Chiusa", "Rifiutata"];
  const FINANCE = ["Da definire", "Grenke", "IFIS", "Acquisto diretto", "Altro"];
  const ENTITY_LABELS = { practices: "pratica", clients: "cliente", products: "prodotto", documents: "documento", activities: "attività", users: "agente" };

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
    $("databaseLabel").textContent = status.demo ? "Modalità demo locale" : (status.online ? "Google Sheets online" : "Database non raggiungibile");
    $("databaseDot").className = status.online ? "online" : "offline";
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

  function kpi(label, value, icon, tone, route) {
    return `<button class="kpi-card" data-route="${route}"><span class="kpi-icon ${tone}">${icon}</span><div><small>${esc(label)}</small><strong>${esc(value)}</strong><em>Apri sezione →</em></div></button>`;
  }

  function activityItem(item) {
    const overdue = item.scadenza && item.scadenza < new Date().toISOString().slice(0, 10);
    return `<button class="activity-item" data-action="edit-activity" data-id="${esc(item.id)}"><i class="${overdue ? "overdue" : ""}"></i><div><strong>${esc(item.titolo)}</strong><span>${esc(item.tipo)} · ${dateIt(item.scadenza)}</span></div>${badge(item.stato)}</button>`;
  }

  function practiceTable(rows, compact = false) {
    if (!rows.length) return emptyState("Nessuna pratica", "Crea la prima pratica per iniziare.", "Nuova pratica", "new-practice");
    return `<div class="table-wrap"><table><thead><tr><th>Pratica</th><th>Cliente</th><th>Oggetto</th><th>Stato</th><th>Finanziaria</th><th>Valore</th><th>Scadenza</th><th></th></tr></thead><tbody>${rows.map((p) => `<tr><td><strong>${esc(p.numero)}</strong><small>${dateIt(p.aggiornatoIl)}</small></td><td>${esc(p.cliente)}</td><td>${esc(p.titolo)}</td><td>${badge(p.stato)}</td><td>${esc(p.finanziaria)}</td><td><strong>${euros(p.valore)}</strong></td><td>${dateIt(p.scadenza)}</td><td><button class="table-action" data-action="edit-practice" data-id="${esc(p.id)}">Apri</button>${compact ? "" : `<button class="more-action" data-action="delete-practice" data-id="${esc(p.id)}" aria-label="Elimina">⋮</button>`}</td></tr>`).join("")}</tbody></table></div>`;
  }

  function renderPractices() {
    let rows = filterRows(state.data.practices, ["numero", "cliente", "titolo", "stato", "finanziaria", "agente"]);
    if (state.filterStatus) rows = rows.filter((p) => p.stato === state.filterStatus);
    const chips = STATUSES.map((s) => `<button class="filter-chip ${state.filterStatus === s ? "active" : ""}" data-filter-status="${esc(s)}">${esc(s)} <strong>${state.data.practices.filter((p) => p.stato === s).length}</strong></button>`).join("");
    return `${viewToolbar("Nuova pratica", "new-practice", `<div class="filter-strip"><button class="filter-chip ${state.filterStatus ? "" : "active"}" data-filter-status="">Tutte <strong>${state.data.practices.length}</strong></button>${chips}</div>`)}<section class="panel">${practiceTable(rows)}</section>`;
  }

  function renderClients() {
    const rows = filterRows(state.data.clients, ["ragioneSociale", "referente", "piva", "email", "telefono", "citta"]);
    return `${viewToolbar("Nuovo cliente", "new-client", `<p class="toolbar-note">${rows.length} clienti visualizzati</p>`)}<div class="card-grid">${rows.length ? rows.map((c) => {
      const count = state.data.practices.filter((p) => p.clientId === c.id).length;
      return `<article class="client-card"><div class="client-top"><span class="avatar">${initials(c.ragioneSociale)}</span><div><h3>${esc(c.ragioneSociale)}</h3><p>${esc(c.referente || "Referente non indicato")}</p></div><button class="more-action" data-action="delete-client" data-id="${esc(c.id)}">⋮</button></div><dl><div><dt>Località</dt><dd>${esc(c.citta || "—")}</dd></div><div><dt>Telefono</dt><dd>${esc(c.telefono || "—")}</dd></div><div><dt>Email</dt><dd>${esc(c.email || "—")}</dd></div><div><dt>Pratiche</dt><dd>${count}</dd></div></dl><div class="card-actions"><button class="btn soft" data-action="edit-client" data-id="${esc(c.id)}">Apri anagrafica</button><button class="btn ghost" data-action="new-practice-client" data-id="${esc(c.id)}">＋ Pratica</button></div></article>`;
    }).join("") : emptyState("Nessun cliente", "Aggiungi la prima anagrafica.", "Nuovo cliente", "new-client")}</div>`;
  }

  function renderCatalog() {
    const rows = filterRows(state.data.products, ["nome", "categoria", "descrizione"]);
    return `${viewToolbar("Nuovo prodotto", api.isAdmin() ? "new-product" : "", `<p class="toolbar-note">Listino ${api.isAdmin() ? "amministrativo" : "agente"} · ${rows.length} configurazioni</p>`)}<div class="product-grid">${rows.map((p) => {
      const promo = Number(p.prezzoPromoAgenti || 0);
      const price = promo || Number(p.prezzoAgente || 0);
      return `<article class="product-card"><div class="product-visual"><div class="pixel-pattern"></div><span>${esc(p.nome)}</span>${promo ? `<em>PROMO</em>` : ""}</div><div class="product-body"><div class="product-title"><div><span>${esc(p.categoria || "Ledwall")}</span><h3>${esc(p.nome)} · ${p.cabX}×${p.cabY} cm</h3></div>${badge(p.attivo === "SI" ? "Attivo" : "Non attivo")}</div><p>${esc(p.descrizione || "Descrizione prodotto da completare.")}</p><div class="price-grid"><div><small>Prezzo agente</small><strong>${euros(price)}</strong>${promo ? `<del>${euros(p.prezzoAgente)}</del>` : ""}</div>${api.isAdmin() ? `<div><small>Prezzo cliente</small><strong>${euros(p.prezzoPromoClienti || p.prezzoCliente)}</strong></div><div><small>Costo base</small><strong>${euros(p.prezzoCina)}</strong></div>` : ""}</div><div class="card-actions"><button class="btn soft" data-route="planner">Usa nel Planner</button>${api.isAdmin() ? `<button class="btn ghost" data-action="edit-product" data-id="${esc(p.id)}">Modifica</button>` : ""}</div></div></article>`;
    }).join("")}</div>`;
  }

  function renderPlanner() {
    return `<div class="planner-shell"><div class="planner-info"><div><strong>Quotation Planner integrato</strong><span>Il calcolatore originale è incorporato senza alterarne le logiche.</span></div><button class="btn ghost" data-action="open-planner-window">Apri a schermo intero ↗</button></div><iframe id="plannerFrame" title="Seemax Quotation Planner" src="${esc(config.quotationPlannerPath)}"></iframe></div>`;
  }

  function renderDocuments() {
    const rows = filterRows(state.data.documents, ["nome", "tipo", "pratica", "cliente", "note"]);
    return `${viewToolbar("Nuovo documento", "new-document", `<p class="toolbar-note">Inserisci un link Google Drive o un collegamento esterno</p>`)}<section class="panel"><div class="document-list">${rows.length ? rows.map((d) => `<article class="document-row"><span class="file-icon">PDF</span><div><strong>${esc(d.nome)}</strong><span>${esc(d.tipo)} · Pratica ${esc(d.pratica || "—")} · ${esc(d.cliente || "—")}</span><small>${dateIt(d.data)}${d.note ? " · " + esc(d.note) : ""}</small></div><div class="document-actions">${d.url ? `<a class="btn soft" href="${esc(d.url)}" target="_blank" rel="noopener">Apri ↗</a>` : `<span class="placeholder-pill">Link da inserire</span>`}<button class="btn ghost" data-action="edit-document" data-id="${esc(d.id)}">Modifica</button><button class="icon-btn danger" data-action="delete-document" data-id="${esc(d.id)}">×</button></div></article>`).join("") : emptyState("Nessun documento", "Collega preventivi, contratti e documenti cliente.", "Nuovo documento", "new-document")}</div></section>`;
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
    return `<div class="settings-grid"><section class="panel"><div class="panel-head"><div><span class="section-kicker">Azienda</span><h3>Dati generali</h3></div></div><form id="settingsForm" class="form-grid"><label>Ragione sociale<input name="legalName" value="${esc(config.company.legalName)}" disabled></label><label>Brand<input name="brand" value="${esc(config.company.brand)}" disabled></label><label>Telefono commerciale<input name="telefono_commerciale" value="${esc(s.telefono_commerciale || "")}"></label><label>IVA (%)<input name="iva_percentuale" type="number" value="${esc(s.iva_percentuale || 22)}"></label><label>Acconto predefinito (%)<input name="acconto_percentuale" type="number" value="${esc(s.acconto_percentuale || 30)}"></label><label>Validità preventivo (giorni)<input name="validita_preventivo_giorni" type="number" value="${esc(s.validita_preventivo_giorni || 15)}"></label><div class="form-actions full"><button class="btn primary" type="submit">Salva impostazioni</button></div></form></section><section class="panel"><div class="panel-head"><div><span class="section-kicker">Collegamento</span><h3>Google Sheets</h3></div>${badge(status.demo ? "Demo" : status.online ? "Online" : "Offline")}</div><div class="config-summary"><dl><div><dt>Modalità</dt><dd>${status.demo ? "Demo locale" : "Database Google Sheets"}</dd></div><div><dt>Endpoint</dt><dd>${status.configured ? "Configurato" : "Placeholder da sostituire"}</dd></div><div><dt>Versione</dt><dd>${esc(config.version)}</dd></div></dl><p>Per modificare il collegamento apri <code>assets/js/config.js</code>. Le istruzioni complete sono nella cartella <code>docs</code>.</p><div class="stack-actions"><button class="btn soft" data-action="test-database">Verifica collegamento</button>${status.demo ? `<button class="btn ghost" data-action="export-demo">Esporta dati demo</button><button class="btn danger-outline" data-action="reset-demo">Ripristina demo</button>` : ""}</div></div></section><section class="panel span-2"><div class="panel-head"><div><span class="section-kicker">Placeholder da completare</span><h3>Controllo prima della pubblicazione</h3></div></div><div class="checklist"><label><input type="checkbox"> Inserire URL Apps Script in <code>config.js</code></label><label><input type="checkbox"> Sostituire telefono, email e sede aziendale</label><label><input type="checkbox"> Inserire loghi e immagini prodotto definitive</label><label><input type="checkbox"> Verificare account agenti nel foglio AGENTI</label><label><input type="checkbox"> Pubblicare il repository con GitHub Pages</label></div></section></div>`;
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
    const number = record.numero || api.nextPracticeNumber();
    const fields = field("Numero pratica", "numero", number, { required: true, readonly: number !== "AUTO" }) +
      field("Cliente", "clientId", record.clientId || clientId || "", { required: true, options: ["", ...state.data.clients.map((c) => c.id)] }).replace(/>(cli-[^<]+)</g, (m, value) => `>${esc((state.data.clients.find((c) => c.id === value) || {}).ragioneSociale || value)}<`) +
      field("Oggetto della pratica", "titolo", record.titolo || "", { required: true, full: true }) +
      field("Stato", "stato", record.stato || "Nuova", { options: STATUSES }) + field("Finanziaria", "finanziaria", record.finanziaria || "Da definire", { options: FINANCE }) +
      field("Valore IVA esclusa", "valore", record.valore || 0, { type: "number", min: 0, step: "0.01" }) + field("Scadenza / richiamo", "scadenza", record.scadenza || "", { type: "date" }) +
      field("Prossimo passo", "prossimoPasso", record.prossimoPasso || "", { full: true }) + field("Note", "note", record.note || "", { type: "textarea", full: true });
    openModal(record.id ? `Pratica ${record.numero}` : "Nuova pratica", formShell("practices", record.id, fields, record.id ? "Aggiorna pratica" : "Crea pratica"), { wide: true, kicker: record.id ? "Gestione pratica" : "Nuova opportunità", subtitle: client ? client.ragioneSociale : "Compila le informazioni principali" });
  }

  function openClient(id) {
    const r = state.data.clients.find((c) => c.id === id) || {};
    const fields = field("Ragione sociale", "ragioneSociale", r.ragioneSociale, { required: true, full: true }) + field("Referente", "referente", r.referente) + field("P.IVA / C.F.", "piva", r.piva) + field("Email", "email", r.email, { type: "email" }) + field("Telefono", "telefono", r.telefono) + field("Comune / località", "citta", r.citta) + field("Indirizzo", "indirizzo", r.indirizzo) + field("Note commerciali", "note", r.note, { type: "textarea", full: true });
    openModal(r.id ? "Modifica cliente" : "Nuovo cliente", formShell("clients", r.id, fields), { wide: true, kicker: "Anagrafica cliente" });
  }

  function openProduct(id) {
    const r = state.data.products.find((p) => p.id === id) || { attivo: "SI", categoria: "Ledwall Outdoor" };
    const fields = field("Nome / Pixel Pitch", "nome", r.nome, { required: true }) + field("Categoria", "categoria", r.categoria) + field("Larghezza cabinet (cm)", "cabX", r.cabX || 50, { type: "number" }) + field("Altezza cabinet (cm)", "cabY", r.cabY || 50, { type: "number" }) + field("Prezzo agente", "prezzoAgente", r.prezzoAgente || 0, { type: "number", step: "0.01" }) + field("Prezzo cliente", "prezzoCliente", r.prezzoCliente || 0, { type: "number", step: "0.01" }) + field("Costo base", "prezzoCina", r.prezzoCina || 0, { type: "number", step: "0.01" }) + field("Promo agente", "prezzoPromoAgenti", r.prezzoPromoAgenti || "", { type: "number", step: "0.01" }) + field("Promo cliente", "prezzoPromoClienti", r.prezzoPromoClienti || "", { type: "number", step: "0.01" }) + field("Stato", "attivo", r.attivo, { options: ["SI", "NO"] }) + field("Descrizione", "descrizione", r.descrizione, { type: "textarea", full: true });
    openModal(r.id ? "Modifica prodotto" : "Nuovo prodotto", formShell("products", r.id, fields), { wide: true, kicker: "Catalogo Ledwall" });
  }

  function openDocument(id) {
    const r = state.data.documents.find((d) => d.id === id) || {};
    const fields = field("Nome documento", "nome", r.nome, { required: true, full: true }) + field("Tipo", "tipo", r.tipo || "Preventivo", { options: ["Preventivo", "Contratto", "Documento cliente", "Documento finanziaria", "Installazione", "Altro"] }) + field("Pratica", "practiceId", r.practiceId || "", { options: ["", ...state.data.practices.map((p) => p.id)] }) + field("Link Google Drive / URL", "url", r.url, { type: "url", full: true }) + field("Data", "data", r.data || new Date().toISOString().slice(0, 10), { type: "date" }) + field("Note", "note", r.note, { type: "textarea", full: true });
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

  async function saveEntity(form) {
    const entity = form.dataset.entity;
    const current = (state.data[entity] || []).find((item) => String(item.id) === String(form.dataset.id)) || {};
    const record = { ...current, ...serializeForm(form) };
    if (form.dataset.id) record.id = form.dataset.id;
    const now = new Date().toISOString().slice(0, 10);
    if (entity === "clients") record.creatoIl = record.creatoIl || now;
    if (entity === "practices") {
      const client = state.data.clients.find((c) => c.id === record.clientId);
      record.cliente = client ? client.ragioneSociale : record.cliente;
      record.agente = record.agente || ((api.getSession() || {}).displayName || "");
      record.aggiornatoIl = now;
      record.id = record.id || "PR-" + record.numero;
    }
    if (entity === "documents") {
      const practice = state.data.practices.find((p) => p.id === record.practiceId);
      record.pratica = practice ? practice.numero : "";
      record.cliente = practice ? practice.cliente : "";
    }
    if (entity === "users") {
      record.id = record.id || record.username;
      if (!record.chiave_id_agente) delete record.chiave_id_agente;
    }
    setLoading(true, `Salvataggio ${ENTITY_LABELS[entity] || "dato"}…`);
    try {
      await api.upsert(entity, record);
      await loadAll();
      closeModal();
      renderRoute();
      toast(`${ENTITY_LABELS[entity] || "Elemento"} salvato correttamente.`);
    } catch (error) { toast(error.message, "danger"); }
    finally { setLoading(false); }
  }

  async function removeEntity(entity, id) {
    const label = ENTITY_LABELS[entity] || "elemento";
    if (!confirm(`Eliminare definitivamente questo ${label}?`)) return;
    setLoading(true, "Eliminazione…");
    try { await api.remove(entity, id); await loadAll(); renderRoute(); toast(`${label} eliminato.`); }
    catch (error) { toast(error.message, "danger"); }
    finally { setLoading(false); }
  }

  async function toggleActivity(id) {
    const record = state.data.activities.find((a) => a.id === id);
    if (!record) return;
    await api.upsert("activities", { ...record, stato: record.stato === "Completata" ? "Aperta" : "Completata" });
    await loadAll(); renderRoute(); toast("Attività aggiornata.");
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
      "new-product": () => openProduct(), "edit-product": () => openProduct(id), "delete-product": () => removeEntity("products", id),
      "new-document": () => openDocument(), "edit-document": () => openDocument(id), "delete-document": () => removeEntity("documents", id),
      "new-activity": () => openActivity(), "edit-activity": () => openActivity(id), "delete-activity": () => removeEntity("activities", id), "toggle-activity": () => toggleActivity(id),
      "new-user": () => openUser(), "edit-user": () => openUser(id), "delete-user": () => removeEntity("users", id),
      "close-modal": closeModal,
      "reload": async () => { await loadAll(); renderRoute(); },
      "open-planner-window": () => window.open(config.quotationPlannerPath, "_blank", "noopener"),
      "test-database": async () => { setLoading(true, "Verifica database…"); try { const response = await api.ping(); setConnectionState(); toast(response.ok ? "Collegamento funzionante." : "Collegamento non disponibile.", response.ok ? "success" : "danger"); } catch (e) { toast(e.message, "danger"); } finally { setLoading(false); } },
      "export-demo": () => download(`seemax-demo-${new Date().toISOString().slice(0, 10)}.json`, api.exportDemo()),
      "reset-demo": async () => { if (confirm("Ripristinare tutti i dati dimostrativi?")) { api.resetDemo(); await loadAll(); renderRoute(); toast("Dati demo ripristinati."); } }
    };
    if (handlers[action]) await handlers[action]();
  }

  document.addEventListener("click", async (event) => {
    const filterTarget = event.target.closest("[data-filter-status]");
    if (filterTarget) { state.filterStatus = filterTarget.dataset.filterStatus || ""; renderRoute(); return; }
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
      try { await api.saveSettings(serializeForm(event.target)); await loadAll(); renderRoute(); toast("Impostazioni salvate."); }
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
