(function () {
  "use strict";

  const api = window.SeemaxApi;
  const config = window.SEEMAX_APP_CONFIG;
  const $ = (id) => document.getElementById(id);
  const state = { route: "dashboard", data: null, loading: false, search: "", filterStatus: "", practiceQuery: "", practiceSort: "numero", practiceDirection: "desc", practicePage: 1, documentFolderId: "" };
  let installPrompt = null;
  let heldDocumentId = "";
  let documentHoldTimer = null;
  let documentHoldStart = null;
  let pendingDocumentFolderId = "";
  let pendingDocumentFile = null;
  let clientToolsPromise = null;
  const uploadState = { batches: new Map(), expanded: false };
  const tutorialState = { active: false, index: 0, steps: [], previousRoute: "dashboard" };
  let pendingFirstAccessTutorial = false;

  const NAV = [
    { id: "dashboard", icon: "🏠", label: "Dashboard", sub: "Panoramica" },
    { id: "practices", icon: "📋", label: "Pratiche", sub: "Pipeline commerciale" },
    { id: "clients", icon: "👥", label: "Clienti", sub: "Anagrafiche e contatti" },
    { id: "catalog", icon: "🖥️", label: "Catalogo", sub: "Prodotti e listini" },
    { id: "planner", icon: "🧮", label: "Quotation Planner", sub: "Preventivi Ledwall" },
    { id: "documents", icon: "🗂️", label: "Documenti", sub: "PDF e allegati" },
    { id: "activities", icon: "✅", label: "Attività", sub: "Scadenze operative" },
    { id: "users", icon: "👤", label: "Agenti", sub: "Accessi e ruoli", adminOnly: true },
    { id: "settings", icon: "⚙️", label: "Impostazioni", sub: "Azienda e database", adminOnly: true }
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
  const PRACTICE_DOCUMENTS = {
    NOLEGGIO: [
      ["documento_identita", "Documento di Identità"],
      ["tessera_sanitaria", "Tessera Sanitaria"],
      ["visura", "Visura"],
      ["altra_documentazione", "Altra Documentazione"]
    ],
    LEASING: [
      ["documento_identita", "Documento di Identità"],
      ["tessera_sanitaria", "Tessera Sanitaria"],
      ["preventivo_seemax", "Preventivo Seemax"],
      ["preventivo_ifis", "Preventivo IFIS (interno)"],
      ["visura", "Visura"],
      ["altra_documentazione", "Altra Documentazione"]
    ]
  };
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
    if (tone === "danger") haptic("error");
    const item = document.createElement("div");
    item.className = `toast ${tone}`;
    item.innerHTML = `<span>${tone === "success" ? "✓" : tone === "danger" ? "!" : "i"}</span><strong>${esc(message)}</strong>`;
    $("toastRoot").appendChild(item);
    setTimeout(() => item.classList.add("show"), 20);
    setTimeout(() => { item.classList.remove("show"); setTimeout(() => item.remove(), 250); }, 3500);
  }

  function haptic(type = "tap") {
    if (!navigator.vibrate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const patterns = { tap: 7, select: 11, success: [18, 35, 24], error: [24, 38, 24] };
    try { navigator.vibrate(patterns[type] || patterns.tap); } catch (error) { /* dispositivo non compatibile */ }
  }

  function celebrateSuccess(icon, title, text) {
    const root = $("celebrationRoot");
    if (!root) return;
    haptic("success");
    root.innerHTML = `<section class="success-celebration"><div class="success-particles">${Array.from({ length: 10 }, (_, index) => `<i style="--particle:${index}"></i>`).join("")}</div><div class="success-icon"><span>${icon}</span><b>✓</b></div><small>OPERAZIONE COMPLETATA</small><h2>${esc(title)}</h2><p>${esc(text)}</p></section>`;
    const panel = root.firstElementChild;
    requestAnimationFrame(() => panel && panel.classList.add("visible"));
    setTimeout(() => { if (!panel) return; panel.classList.remove("visible"); setTimeout(() => { if (root.contains(panel)) panel.remove(); }, 300); }, 1900);
  }

  function celebrateSavedEntity(entity, saved, current) {
    const isNew = !current.id;
    if (entity === "clients" && isNew) {
      const shared = String(saved.condiviso || "NO").toUpperCase() === "SI";
      celebrateSuccess(shared ? "🤝" : "👤", shared ? "Cliente creato e condiviso" : "Cliente creato", shared ? `${saved.ragioneSociale || "Il cliente"} è ora disponibile agli utenti autorizzati.` : `${saved.ragioneSociale || "Il cliente"} è stato aggiunto alla tua anagrafica.`);
      return true;
    }
    if (entity === "clients" && String(current.condiviso || "NO").toUpperCase() !== "SI" && String(saved.condiviso || "NO").toUpperCase() === "SI") {
      celebrateSuccess("🤝", "Cliente condiviso", `${saved.ragioneSociale || "Il cliente"} è ora disponibile agli altri agenti.`);
      return true;
    }
    if (entity === "practices" && isNew) { celebrateSuccess("📋", "Pratica creata", `${saved.numero || "La nuova pratica"} è stata inserita correttamente.`); return true; }
    if (entity === "practices" && current.stato && current.stato !== saved.stato) { celebrateSuccess("🔄", "Stato aggiornato", `${saved.numero || "La pratica"} è ora ${saved.stato || "aggiornata"}.`); return true; }
    if (entity === "documents" && isNew) { celebrateSuccess("📎", "Documento archiviato", `${saved.nome || "Il documento"} è disponibile nell'archivio.`); return true; }
    if (entity === "users" && isNew) { celebrateSuccess("👤", "Agente attivato", `${saved.nome_visualizzato || saved.username || "Il nuovo agente"} può accedere al Management Suite.`); return true; }
    if (entity === "products" && isNew) { celebrateSuccess("🖥️", "Prodotto aggiunto", `${saved.nome || "Il prodotto"} è stato inserito nel catalogo.`); return true; }
    return false;
  }

  function hasActiveUploads() {
    return Array.from(uploadState.batches.values()).some((batch) => batch.status === "active");
  }

  function startUploadBatch(practice, attachments) {
    Array.from(uploadState.batches.entries()).forEach(([batchId, batch]) => { if (batch.status !== "active") uploadState.batches.delete(batchId); });
    const id = `upload-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    uploadState.batches.set(id, {
      id, status: "active", practice: practice.numero || practice.id || "Pratica", phase: "Preparazione documenti",
      files: attachments.map((item, index) => ({ id: `${item.key}-${index}`, key: item.key, name: item.file.name, status: "pending", label: item.label }))
    });
    renderUploadCenter();
    return id;
  }

  function updateUploadFile(batchId, key, status, detail = "") {
    const batch = uploadState.batches.get(batchId);
    if (!batch) return;
    const file = batch.files.find((item) => item.key === key && !["done", "failed"].includes(item.status)) || batch.files.find((item) => item.key === key);
    if (file) { file.status = status; file.detail = detail; }
    renderUploadCenter();
  }

  function setUploadPhase(batchId, phase) {
    const batch = uploadState.batches.get(batchId);
    if (batch) { batch.phase = phase; renderUploadCenter(); }
  }

  function finishUploadBatch(batchId) {
    const batch = uploadState.batches.get(batchId);
    if (!batch) return;
    batch.status = batch.files.some((file) => file.status === "failed") ? "failed" : "complete";
    batch.phase = batch.status === "complete" ? "Tutti i documenti sono stati caricati" : "Completato con alcuni errori";
    renderUploadCenter();
  }

  function renderUploadCenter() {
    const center = $("uploadCenter");
    if (!center) return;
    const batches = Array.from(uploadState.batches.values());
    center.classList.toggle("is-hidden", !batches.length);
    if (!batches.length) return;
    const files = batches.flatMap((batch) => batch.files.map((file) => ({ ...file, practice: batch.practice })));
    const completed = files.filter((file) => ["done", "failed"].includes(file.status)).length;
    const failed = files.filter((file) => file.status === "failed").length;
    const activeBatch = batches.find((batch) => batch.status === "active") || batches[batches.length - 1];
    const percent = files.length ? Math.round(completed / files.length * 100) : 100;
    center.classList.toggle("complete", !hasActiveUploads() && !failed);
    center.classList.toggle("failed", !hasActiveUploads() && failed > 0);
    $("uploadCenterIcon").textContent = hasActiveUploads() ? "⬆️" : failed ? "⚠️" : "✅";
    $("uploadCenterTitle").textContent = hasActiveUploads() ? `Upload documenti · ${activeBatch.practice}` : failed ? "Upload terminato con errori" : "Upload completato";
    $("uploadCenterSubtitle").textContent = hasActiveUploads() ? `${activeBatch.phase} · ${Math.max(0, files.length - completed)} rimanenti` : `${completed - failed} caricati${failed ? ` · ${failed} non riusciti` : ""}`;
    $("uploadCenterPercent").textContent = `${percent}%`;
    $("uploadCenterBar").style.width = `${percent}%`;
    $("uploadCenterSummary").setAttribute("aria-expanded", uploadState.expanded ? "true" : "false");
    $("uploadCenterDetails").classList.toggle("is-hidden", !uploadState.expanded);
    $("uploadCenterList").innerHTML = files.map((file) => {
      const icon = file.status === "done" ? "✅" : file.status === "failed" ? "❌" : file.status === "uploading" ? "⏳" : "🕓";
      const label = file.status === "done" ? "Caricato" : file.status === "failed" ? (file.detail || "Errore") : file.status === "uploading" ? "In caricamento" : "In attesa";
      return `<div class="upload-file-row"><span>${icon}</span><strong title="${esc(file.name)}">${esc(file.name)}</strong><small>${esc(label)}</small></div>`;
    }).join("");
  }

  window.addEventListener("beforeunload", (event) => {
    if (!hasActiveUploads()) return;
    event.preventDefault();
    event.returnValue = "";
  });

  function download(name, content, type = "application/json") {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([content], { type }));
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function loadScriptOnce(src, ready) {
    if (ready()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-lazy-src="${src}"]`);
      if (existing) { existing.addEventListener("load", resolve, { once: true }); existing.addEventListener("error", () => reject(new Error(`Risorsa non disponibile: ${src}`)), { once: true }); return; }
      const script = document.createElement("script");
      script.src = `${src}?v=${encodeURIComponent(config.version)}`;
      script.dataset.lazySrc = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Risorsa non disponibile: ${src}`));
      document.body.appendChild(script);
    });
  }

  function ensureClientTools() {
    if (window.SeemaxClientTools) return Promise.resolve();
    clientToolsPromise = clientToolsPromise || loadScriptOnce("assets/vendor/libphonenumber-min.js", () => !!window.libphonenumber)
      .then(() => loadScriptOnce("assets/js/client-tools.js", () => !!window.SeemaxClientTools));
    return clientToolsPromise;
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
    $("databaseLabel").textContent = status.fast ? `Modalità Rapida · ${status.pending} in attesa` : (status.demo ? "Modalità demo locale" : (status.online ? "Database online" : "Database non raggiungibile"));
    $("databaseDot").className = status.online ? "online" : "offline";
    updateModeControls();
    const banner = $("connectionBanner");
    if (status.demo) {
      banner.className = "connection-banner demo";
      banner.innerHTML = `<strong>Modalità demo attiva.</strong> I dati sono salvati soltanto in questo browser. Configura Apps Script per usare il database condiviso. <button data-route="settings">Configura</button>`;
    } else if (!status.online) {
      banner.className = "connection-banner danger";
      banner.innerHTML = `<strong>Database non disponibile.</strong> Controlla l’URL Apps Script e la pubblicazione della Web App.`;
    } else if (status.serverVersion && !String(status.serverVersion).includes(String(config.version))) {
      banner.className = "connection-banner danger";
      banner.innerHTML = `<strong>Backend non aggiornato.</strong> Il sito usa la versione ${esc(config.version)}, mentre Apps Script risponde con ${esc(status.serverVersion)}. Pubblica una nuova versione del deployment.`;
    } else banner.className = "connection-banner is-hidden";
  }

  async function loadAll(showLoader = true) {
    if (showLoader) setLoading(true, "Caricamento database…");
    try {
      state.data = await api.bootstrap();
      if (api.isFastMode()) updateLocalDashboard();
      applyChampionTheme();
      updateNotificationBell();
      setConnectionState();
    } catch (error) {
      setConnectionState();
      throw error;
    } finally { if (showLoader) setLoading(false); }
  }

  function setUser() {
    const user = api.getSession();
    if (!user) return;
    $("userName").textContent = user.displayName || user.nome_visualizzato || user.username;
    $("userRole").textContent = String(user.role || user.ruolo || "AGENTE").toUpperCase();
    $("userInitials").textContent = initials(user.displayName || user.nome_visualizzato || user.username);
  }

  function tutorialStorageKey() {
    const user = api.getSession() || {};
    return `SEEMAX_SUPER_TUTORIAL_${user.username || "utente"}`;
  }

  function tutorialSteps() {
    const steps = [
      { chapter: "Per iniziare", route: "dashboard", selector: ".topbar", title: "La barra principale", text: "Da qui puoi cercare informazioni, cambiare modalità di lavoro, creare una pratica, consultare le notifiche e aprire il tuo profilo." },
      { chapter: "Per iniziare", selector: ".global-search", title: "Ricerca globale", text: "Cerca rapidamente una pratica tramite identificativo o intestazione e trova i clienti senza cambiare pagina." },
      { chapter: "Per iniziare", selector: ".mode-controls", title: "Modalità Standard e Rapida", text: "La modalità Standard salva online ogni operazione. La modalità Rapida lavora localmente e ti permette di sincronizzare in seguito con SALVA TUTTO." },
      { chapter: "Per iniziare", selector: "#quickAddButton", title: "Nuova pratica", text: "Questo comando apre subito la scelta tra Acquisto, Noleggio e Leasing. Il modulo si adatta automaticamente alla tipologia selezionata." },
      { chapter: "Per iniziare", selector: "#notificationButton", title: "Centro notifiche", text: "Il pallino rosso segnala novità. Qui riceverai, tra le altre cose, gli aggiornamenti sullo stato delle pratiche di cui sei responsabile." },
      { chapter: "Per iniziare", selector: "#userMenuButton", title: "Profilo connesso", text: "Mostra l'utente attualmente connesso, il suo ruolo e l'eventuale emblema Agente del mese." },
      { chapter: "Navigazione", selector: ".main-nav", title: "Tutto in un unico menu", text: "Il menu laterale raccoglie ogni strumento del Management Suite. Le voci amministrative sono mostrate soltanto agli utenti autorizzati." },
      { chapter: "Dashboard", route: "dashboard", selector: ".welcome-panel", title: "Il tuo centro operativo", text: "La Dashboard riassume ciò che richiede attenzione e offre accesso immediato alla creazione delle pratiche e al Quotation Planner." },
      { chapter: "Dashboard", selector: ".kpi-grid", title: "Indicatori principali", text: "Controlla clienti registrati, pratiche aperte, valore della pipeline e attività ancora da completare." },
      { chapter: "Dashboard", selector: ".revenue-panel", title: "Obiettivi di fatturato", text: "Le barre confrontano il fatturato personale e aziendale con l'obiettivo impostato. Vengono considerate le pratiche in stato COMPLETATA." },
      { chapter: "Dashboard", selector: ".agent-month-dashboard", title: "Agente del mese e trofei", text: "Consulta il vincitore del mese di riferimento, le classifiche mensili e la tua bacheca degli obiettivi raggiunti." },
      { chapter: "Dashboard", selector: ".dashboard-grid", title: "Pipeline, agenda e aggiornamenti", text: "Questa zona riunisce lo stato delle pratiche, le prossime attività e le pratiche aggiornate più recentemente." },
      { chapter: "Pratiche", route: "practices", selector: ".view-toolbar", title: "Gestione delle pratiche", text: "Crea una nuova pratica e filtra immediatamente l'archivio per Inserita, Accettata, Sospesa, Bocciata o Completata." },
      { chapter: "Pratiche", selector: ".practice-controls", title: "Ricerca e ordinamento", text: "Cerca per ID o intestazione e ordina per esito, identificativo, cliente, tipologia, finanziaria, valore e, per gli amministratori, agente." },
      { chapter: "Pratiche", selector: ".practice-result-count", title: "Risultati e pagine", text: "Sono mostrati dieci elementi per pagina. Il contatore indica sempre quali risultati stai visualizzando." },
      { chapter: "Pratiche", selector: ".panel", title: "Archivio pratiche", text: "Il contorno comunica visivamente lo stato. Apri una pratica per consultarla; solo un amministratore può modificarne l'esito." },
      { chapter: "Clienti", route: "clients", selector: ".view-toolbar", title: "Anagrafiche clienti", text: "Crea un cliente completo di dati fiscali, contatti, IBAN e indirizzo. Puoi scegliere se condividerlo con gli altri agenti." },
      { chapter: "Clienti", selector: ".card-grid", title: "Clienti personali e condivisi", text: "Le schede indicano chi ha creato il cliente e quante pratiche personali sono collegate. Un cliente collegato a una pratica non può essere eliminato." },
      { chapter: "Catalogo", route: "catalog", selector: ".product-grid", title: "Catalogo e giacenze", text: "Consulta immagini, prezzi, promozioni, formati dei cabinet e disponibilità. Apri la scheda tecnica per tutti i dettagli del prodotto." },
      { chapter: "Quotation Planner", route: "planner", selector: ".planner-shell", title: "Preventivi completamente integrati", text: "Configura il Ledwall, verifica cabinet e giacenze, calcola Acquisto, Grenke o IFIS e inserisci la pratica senza uscire dal Management Suite." },
      { chapter: "Documenti", route: "documents", selector: ".document-toolbar", title: "Caricamento dei documenti", text: "Carica PDF, immagini e file Office. I trasferimenti avvengono in background e il centro upload mostra avanzamento e file rimanenti." },
      { chapter: "Documenti", selector: ".document-breadcrumb", title: "Cartelle locali", text: "Le cartelle organizzano visivamente i documenti su questo dispositivo senza modificare la loro posizione generale nell'archivio." },
      { chapter: "Documenti", selector: ".document-drop-zone", title: "Trascina e organizza", text: "Trascina un documento dentro una cartella con il mouse oppure tienilo premuto per due secondi sullo smartphone." },
      { chapter: "Attività", route: "activities", selector: ".view-toolbar", title: "Agenda operativa", text: "Crea telefonate, appuntamenti e promemoria. Questa sezione resta locale per offrire una risposta immediata." },
      { chapter: "Attività", selector: ".activity-columns", title: "Da fare e completate", text: "Spunta le attività concluse e consulta separatamente quelle ancora aperte e lo storico delle completate." }
    ];
    if (api.isAdmin()) steps.push(
      { chapter: "Amministrazione", route: "users", selector: ".view-toolbar", title: "Agenti e accessi", text: "Crea e gestisci gli account, assegna i ruoli e attiva o disattiva l'accesso degli utenti." },
      { chapter: "Amministrazione", selector: ".panel", title: "Elenco degli account", text: "Consulta username, contatti, ruolo e stato di ogni agente. Le modifiche sono riservate agli amministratori." },
      { chapter: "Amministrazione", route: "settings", selector: ".settings-grid", title: "Impostazioni generali", text: "Configura obiettivo di fatturato, parametri aziendali, collegamento e obbligatorietà dei campi delle diverse pratiche." }
    );
    steps.push({ chapter: "Hai concluso", route: "dashboard", selector: "#tutorialButton", title: "Il tutorial rimane sempre disponibile", text: "Puoi riaprire questa guida in qualsiasi momento tramite il piccolo pulsante Tutorial nella barra superiore. Buon lavoro con Seemax Management Suite!" });
    return steps;
  }

  function showTutorialWelcome() {
    const body = `<div class="tutorial-welcome"><div class="tutorial-welcome-icon">✨</div><span>IL TUO NUOVO CENTRO OPERATIVO</span><h3>BENVENUTO IN SEEMAX MANAGEMENT SUITE!</h3><p>Seemax Management Suite raccoglie tutto ciò che conoscevi di Seemax For You e lo porta a un livello completamente nuovo. Niente più reindirizzamenti esterni, navigazioni eccessive o perdite di tempo: ora hai tutto a portata di click o di tocco.</p><p>Crea preventivi, controlla le giacenze direttamente nel calcolatore, registra clienti e pratiche, gestisci i documenti e monitora il tuo lavoro da un unico ambiente.</p><div class="form-actions"><button class="btn ghost" data-action="disable-tutorial">Disattiva tutorial</button><button class="btn primary" data-action="start-tutorial">Spiegami tutto</button></div></div>`;
    openModal("Benvenuto!", body, { wide: true, kicker: "Seemax Management Suite" });
  }

  function scheduleFirstAccessExperience() {
    const tutorialRequired = !localStorage.getItem(tutorialStorageKey());
    setTimeout(() => {
      if (showMonthlyAwardIfNeeded()) {
        pendingFirstAccessTutorial = tutorialRequired;
        return;
      }
      if (tutorialRequired) showTutorialWelcome();
    }, 350);
  }

  function startTutorial() {
    closeModal();
    tutorialState.active = true;
    tutorialState.index = 0;
    tutorialState.steps = tutorialSteps();
    tutorialState.previousRoute = state.route;
    localStorage.setItem(tutorialStorageKey(), JSON.stringify({ status: "started", index: 0 }));
    showTutorialStep();
  }

  function stopTutorial(completed = false) {
    tutorialState.active = false;
    $("tutorialRoot").innerHTML = "";
    document.body.classList.remove("tutorial-active");
    $("sidebar").classList.remove("open");
    localStorage.setItem(tutorialStorageKey(), JSON.stringify({ status: completed ? "completed" : "interrupted", index: tutorialState.index }));
    if (completed) { go("dashboard"); toast("Super Tutorial completato. Potrai riaprirlo quando vuoi."); setTimeout(showMonthlyAwardIfNeeded, 500); }
  }

  function showTutorialStep() {
    if (!tutorialState.active) return;
    const step = tutorialState.steps[tutorialState.index];
    if (!step) { stopTutorial(true); return; }
    if (step.route && state.route !== step.route) go(step.route);
    const root = $("tutorialRoot");
    root.innerHTML = `<div class="tutorial-layer" role="dialog" aria-modal="true" aria-label="Super Tutorial"><div class="tutorial-spotlight"></div><section class="tutorial-card"><header><span>${esc(step.chapter)}</span><strong>${tutorialState.index + 1} / ${tutorialState.steps.length}</strong></header><div class="tutorial-progress"><i style="width:${Math.round((tutorialState.index + 1) / tutorialState.steps.length * 100)}%"></i></div><h2>${esc(step.title)}</h2><p>${esc(step.text)}</p><footer><button class="btn ghost" data-action="stop-tutorial">Interrompi</button><div><button class="btn soft" data-action="tutorial-previous" ${tutorialState.index === 0 ? "disabled" : ""}>← Indietro</button><button class="btn primary" data-action="tutorial-next">${tutorialState.index === tutorialState.steps.length - 1 ? "Concludi" : "Avanti →"}</button></div></footer></section></div>`;
    document.body.classList.add("tutorial-active");
    const mobileNav = window.matchMedia("(max-width: 800px)").matches && step.selector === ".main-nav";
    $("sidebar").classList.toggle("open", mobileNav);
    setTimeout(() => positionTutorialSpotlight(step.selector), step.route === "planner" ? 180 : 40);
  }

  function positionTutorialSpotlight(selector) {
    if (!tutorialState.active) return;
    const target = document.querySelector(selector);
    const spotlight = $("tutorialRoot").querySelector(".tutorial-spotlight");
    if (!target || !spotlight) { spotlight && spotlight.classList.add("is-hidden"); return; }
    target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    setTimeout(() => {
      if (!tutorialState.active || !spotlight) return;
      const rect = target.getBoundingClientRect();
      const pad = 8;
      spotlight.style.left = `${Math.max(6, rect.left - pad)}px`;
      spotlight.style.top = `${Math.max(6, rect.top - pad)}px`;
      spotlight.style.width = `${Math.min(innerWidth - 12, rect.width + pad * 2)}px`;
      spotlight.style.height = `${Math.min(innerHeight - 12, rect.height + pad * 2)}px`;
    }, 180);
  }

  function moveTutorial(direction) {
    const next = tutorialState.index + direction;
    if (next >= tutorialState.steps.length) { stopTutorial(true); return; }
    tutorialState.index = Math.max(0, next);
    localStorage.setItem(tutorialStorageKey(), JSON.stringify({ status: "started", index: tutorialState.index }));
    showTutorialStep();
  }

  async function showApp() {
    $("loginScreen").classList.add("is-hidden");
    $("app").classList.remove("is-hidden");
    setUser();
    renderNav();
    const cached = !config.demoMode && api.cachedBootstrap ? api.cachedBootstrap() : null;
    try {
      if (!cached) {
        await loadAll();
        go(location.hash.replace("#", "") || "dashboard", false);
      } else {
        state.data = cached;
        if (api.isFastMode()) updateLocalDashboard();
        applyChampionTheme(); updateNotificationBell(); setConnectionState();
        go(location.hash.replace("#", "") || "dashboard", false);
        try {
          await loadAll(false);
          renderRoute();
        } catch (refreshError) {
          setConnectionState();
          toast("Dati locali disponibili. Il database verrà aggiornato al prossimo collegamento.", "warning");
        }
      }
      scheduleFirstAccessExperience();
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
    const nextRoute = allowed ? route : "dashboard";
    const changed = state.route !== nextRoute;
    const applyRoute = () => {
      state.route = nextRoute;
      if (state.route !== "documents") heldDocumentId = "";
      if (updateHash) history.replaceState(null, "", "#" + state.route);
      const meta = ROUTE_META[state.route];
      $("pageTitle").textContent = meta[0];
      $("pageSubtitle").textContent = meta[1];
      $("pageEyebrow").textContent = state.route === "planner" ? "Strumento integrato" : "Seemax Management";
      renderNav();
      renderRoute(true);
      $("sidebar").classList.remove("open");
      $("viewContainer").focus({ preventScroll: true });
    };
    if (changed && document.startViewTransition && !tutorialState.active) document.startViewTransition(applyRoute);
    else applyRoute();
  }

  function renderRoute(animate = false) {
    if (!state.data && state.route !== "settings") return;
    const renders = { dashboard: renderDashboard, practices: renderPractices, clients: renderClients, catalog: renderCatalog, planner: renderPlanner, documents: renderDocuments, activities: renderActivities, users: renderUsers, settings: renderSettings };
    $("viewContainer").innerHTML = renders[state.route]();
    if (state.route === "planner" && window.SeemaxNativePlanner) {
      window.SeemaxNativePlanner.mount($("nativePlannerRoot"), {
        session: api.getSession(),
        clients: state.data.clients || [],
        products: state.data.products || [],
        settings: state.data.settings || {},
        version: config.version,
        fastMode: api.isFastMode()
      });
    }
    if (animate) {
      const view = $("viewContainer");
      view.classList.remove("route-enter");
      void view.offsetWidth;
      view.classList.add("route-enter");
      setTimeout(() => view.classList.remove("route-enter"), 360);
    }
  }

  function emptyState(title, text, button, action) {
    return `<div class="empty-state"><span>✨</span><h3>${esc(title)}</h3><p>${esc(text)}</p>${button ? `<button class="btn primary" data-action="${action}">${esc(button)}</button>` : ""}</div>`;
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
        ${kpi("Clienti registrati", totals.clients, "👥", "blue", "clients")}
        ${kpi("Pratiche aperte", totals.practices, "📋", "violet", "practices")}
        ${kpi("Valore pipeline", euros(totals.value), "💶", "green", "practices")}
        ${kpi("Attività aperte", totals.activities, "✅", "orange", "activities")}
      </div>
      <section class="revenue-panel">
        <div class="panel-head"><div><span class="section-kicker">Fatturato</span><h3>Avanzamento verso l’obiettivo</h3></div><span class="revenue-target">Obiettivo ${euros(revenue.target || 0)}</span></div>
        <div class="revenue-grid">
          ${revenueCard("Il tuo fatturato", revenue.personal, revenue.target, "Pratiche completate assegnate a te")}
          ${revenueCard("Fatturato complessivo Seemax", revenue.company, revenue.target, "Tutte le pratiche completate")}
        </div>
      </section>
      ${agentOfMonthDashboardCard(d.agentOfMonth)}
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

  function agentOfMonthDashboardCard(data) {
    const award = data && data.award;
    return `<section class="agent-month-dashboard ${data && data.isCurrentUserWinner ? "personal-win" : ""}"><div class="agent-month-medal">🏆</div><div><span class="section-kicker">Agente del mese</span><h3>${award ? esc(award.agent) : "Classifica mensile"}</h3><p>${award ? `${esc(award.label)} · ${euros(award.total)} di fatturato completato` : "Lo storico si popolerà con le pratiche completate."}</p></div><div class="agent-month-actions"><button class="btn ghost" data-action="trophy-board">Bacheca trofei</button><button class="btn soft" data-action="agent-month-details">Maggiori dettagli</button></div></section>`;
  }

  function applyChampionTheme() {
    const winner = !!(state.data && state.data.dashboard && state.data.dashboard.agentOfMonth && state.data.dashboard.agentOfMonth.isCurrentUserWinner);
    $("app").classList.toggle("agent-month-champion", winner);
    $("userMenuButton").classList.toggle("month-champion", winner);
    $("userMenuButton").title = winner ? "Agente del mese · Emblema Gold" : "Profilo utente";
  }

  function showMonthlyAwardIfNeeded() {
    const data = state.data && state.data.dashboard && state.data.dashboard.agentOfMonth;
    if (!data || !data.award) return false;
    const session = api.getSession() || {};
    const key = `SEEMAX_AGENT_MONTH_SEEN_${session.username || "user"}_${data.currentPeriod}`;
    if (localStorage.getItem(key) === "1") return false;
    localStorage.setItem(key, "1");
    openAgentMonthWelcome();
    return true;
  }

  function openAgentMonthWelcome() {
    const data = state.data && state.data.dashboard && state.data.dashboard.agentOfMonth;
    const award = data && data.award;
    if (!award) { openAgentMonthDetails(); return; }
    const top = award.topPractice || {};
    const body = `<div class="agent-month-welcome"><div class="agent-month-trophy">🏆</div><span class="agent-month-label">AGENTE DEL MESE</span><h3>${esc(award.agent)}</h3><p class="agent-month-period">Risultato di ${esc(award.label)}</p><div class="agent-month-winning-practice"><small>PRATICA DI MAGGIOR VALORE</small><strong>${esc(top.id || "—")} · ${esc(top.client || "—")}</strong><span>${euros(top.value || 0)}</span></div><div class="agent-month-total"><span>Fatturato totale completato</span><strong>${euros(award.total)}</strong><small>${award.count} ${award.count === 1 ? "pratica completata" : "pratiche completate"}</small></div><div class="form-actions"><button class="btn ghost" data-action="close-modal">Continua</button><button class="btn primary" data-action="agent-month-details">Maggiori dettagli</button></div></div>`;
    openModal("Benvenuto nel nuovo mese!", body, { wide: true, kicker: "Seemax celebra i risultati" });
  }

  function openAgentMonthDetails() {
    const data = state.data && state.data.dashboard && state.data.dashboard.agentOfMonth;
    if (!data) return;
    const leaderNames = { ACQUISTO: "Acquisto", NOLEGGIO: "Noleggio", LEASING: "Leasing", COMPLESSIVO: "Complessivo" };
    const leaders = Object.keys(leaderNames).map((type) => {
      const row = (data.leaders || {})[type];
      return `<article class="agent-leader-card ${type.toLowerCase()}"><span>${type === "ACQUISTO" ? "🛒" : type === "NOLEGGIO" ? "🔄" : type === "LEASING" ? "🏦" : "🏆"}</span><div><small>${leaderNames[type]}</small><strong>${row ? esc(row.agent) : "Nessun risultato"}</strong><em>${row ? euros(row.total) : "—"}</em>${row ? `<p>${row.count} pratiche completate${row.topPractice ? ` · Top ${esc(row.topPractice.id)} (${euros(row.topPractice.value)})` : ""}</p>` : ""}</div></article>`;
    }).join("");
    const history = (data.history || []).map((row) => `<tr><td><strong>${esc(row.label)}</strong></td><td>${esc(row.agent)}</td><td>${esc((row.topPractice || {}).id || "—")}<small>${esc((row.topPractice || {}).client || "")}</small></td><td>${row.count}</td><td><strong>${euros(row.total)}</strong></td></tr>`).join("");
    const referenceLabel = data.referenceLabel || (data.award && data.award.label) || "mese precedente";
    const body = `<div class="agent-month-details"><div class="agent-detail-actions"><button class="btn gold" data-action="trophy-board">🏅 Apri la mia bacheca trofei</button></div><section><span class="section-kicker">Mese di riferimento</span><h3>Risultati di ${esc(referenceLabel)}</h3><div class="agent-leaders-grid">${leaders}</div></section><section><span class="section-kicker">Storico mensile</span><h3>Agenti del mese</h3>${history ? `<div class="table-wrap"><table><thead><tr><th>Mese</th><th>Agente</th><th>Pratica principale</th><th>Pratiche</th><th>Fatturato</th></tr></thead><tbody>${history}</tbody></table></div>` : emptyState("Nessun mese disponibile", "Completa una pratica per iniziare la classifica.")}</section><p class="agent-month-note">Ogni risultato considera esclusivamente le pratiche COMPLETATE nel mese indicato. Le pratiche di mesi diversi e le provvigioni non vengono conteggiate.</p></div>`;
    openModal("Agente del mese", body, { wide: true, kicker: "Classifiche Seemax", subtitle: `Risultati di ${referenceLabel} e storico mensile` });
  }

  function openTrophyBoard() {
    const data = state.data && state.data.dashboard && state.data.dashboard.agentOfMonth;
    const achievements = (data && data.achievements) || [];
    const unlocked = achievements.filter((item) => item.unlocked).length;
    const cards = achievements.map((item) => {
      const percent = Math.min(100, Math.round(Number(item.current || 0) / Number(item.target || 1) * 100));
      const progress = item.currency ? `${euros(item.current)} / ${euros(item.target)}` : `${item.current} / ${item.target}`;
      return `<article class="trophy-slot ${item.unlocked ? "unlocked" : "locked"}"><div class="trophy-icon">${item.unlocked ? item.icon : "🔒"}</div><div><small>${item.unlocked ? "TROFEO SBLOCCATO" : "OBIETTIVO IN CORSO"}</small><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p><div class="trophy-progress"><i style="width:${percent}%"></i></div><strong>${progress}</strong></div></article>`;
    }).join("");
    const body = `<div class="trophy-board"><div class="trophy-board-head"><span>🏅</span><div><h3>${unlocked} trofei sbloccati su ${achievements.length}</h3><p>Ogni risultato viene aggiornato automaticamente dai dati delle tue pratiche e dei tuoi clienti.</p></div></div><div class="trophy-grid">${cards}</div></div>`;
    openModal("La mia bacheca trofei", body, { wide: true, kicker: "Obiettivi e riconoscimenti" });
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
    return `${api.isFastMode() ? `<div class="planner-fast-notice"><strong>Modalità Rapida attiva</strong><span>Il Planner resta utilizzabile. Salvataggio e caricamento dei preventivi online rimangono temporaneamente disabilitati.</span></div>` : ""}<div id="nativePlannerRoot" class="planner-shell planner-native-root" aria-label="Seemax Quotation Planner integrato"></div>`;
  }

  function documentLibraryKey() {
    const session = api.getSession() || {};
    return `SEEMAX_DOCUMENT_LIBRARY_V1_${session.username || "local"}`;
  }

  function documentLibrary() {
    try {
      const value = JSON.parse(localStorage.getItem(documentLibraryKey()) || "{}");
      return { folders: Array.isArray(value.folders) ? value.folders : [], placements: value.placements && typeof value.placements === "object" ? value.placements : {} };
    } catch (error) { return { folders: [], placements: {} }; }
  }

  function saveDocumentLibrary(value) {
    localStorage.setItem(documentLibraryKey(), JSON.stringify(value));
  }

  function moveDocumentLocal(documentId, folderId) {
    const library = documentLibrary();
    if (folderId) library.placements[documentId] = folderId;
    else delete library.placements[documentId];
    saveDocumentLibrary(library);
    heldDocumentId = "";
    renderRoute();
    toast(folderId ? "Documento spostato nella cartella." : "Documento spostato nell’archivio principale.");
  }

  function documentEmoji(document) {
    const value = String(document.file_type || document.nome || "").toLowerCase();
    if (value.includes("pdf")) return "📕";
    if (/\.(png|jpe?g|webp|gif)$/.test(value) || value.includes("image")) return "🖼️";
    if (/\.(xls|xlsx|csv)$/.test(value) || value.includes("sheet")) return "📊";
    if (/\.(doc|docx)$/.test(value) || value.includes("word")) return "📝";
    return "📄";
  }

  function openDocumentFolderModal() {
    openModal("Nuova cartella", `<form id="documentFolderForm" class="form-grid"><label class="full">Nome della cartella<input name="folder_name" maxlength="60" required autofocus placeholder="Es. Contratti 2026"></label><p class="field-help full">La cartella organizza visivamente i documenti soltanto su questo dispositivo. I file nel Drive non vengono spostati.</p><div class="form-actions full"><button class="btn ghost" type="button" data-action="close-modal">Annulla</button><button class="btn primary" type="submit">Crea cartella</button></div></form>`, { kicker: "Archivio locale" });
  }

  function renderDocuments() {
    const allRows = filterRows(state.data.documents, ["nome", "tipo", "pratica", "cliente", "note"]);
    const library = documentLibrary();
    const currentFolder = library.folders.find((folder) => folder.id === state.documentFolderId);
    if (state.documentFolderId && !currentFolder) state.documentFolderId = "";
    const rows = allRows.filter((document) => String(library.placements[document.id] || "") === String(state.documentFolderId || ""));
    const uploadNote = api.isFastMode() ? `<p class="toolbar-note fast-upload-note">Caricamento file non disponibile in Modalità Rapida. Passa alla Modalità Standard per aggiungere documenti.</p>` : `<p class="toolbar-note">Carica PDF, immagini o file Office direttamente nell’archivio Seemax</p>`;
    const toolbar = `<div class="view-toolbar document-toolbar"><div>${uploadNote}</div><div class="document-toolbar-actions"><button class="btn ghost" data-action="new-document-folder">📁 Nuova cartella</button>${api.isFastMode() ? "" : `<button class="btn primary" data-action="new-document" data-folder-id="${esc(state.documentFolderId)}">＋ Carica documento</button>`}</div></div>`;
    const breadcrumb = `<div class="document-breadcrumb"><button data-action="document-root" class="${state.documentFolderId ? "" : "active"}">🗂️ Documenti</button>${currentFolder ? `<span>›</span><strong>📁 ${esc(currentFolder.name)}</strong>` : ""}${heldDocumentId ? `<button class="cancel-document-move" data-action="cancel-document-move">✕ Annulla spostamento</button>` : `<small>Trascina con il mouse oppure premi per 2 secondi su smartphone.</small>`}</div>`;
    const folders = !state.documentFolderId ? `<div class="document-folder-grid">${library.folders.map((folder) => {
      const count = state.data.documents.filter((document) => library.placements[document.id] === folder.id).length;
      return `<article class="document-folder ${heldDocumentId ? "awaiting-drop" : ""}" data-action="open-document-folder" data-folder-id="${esc(folder.id)}" data-document-folder="${esc(folder.id)}"><span>📁</span><div><strong>${esc(folder.name)}</strong><small>${count} ${count === 1 ? "elemento" : "elementi"}</small></div><button class="folder-delete" data-action="delete-document-folder" data-folder-id="${esc(folder.id)}" aria-label="Elimina cartella">×</button></article>`;
    }).join("")}${library.folders.length ? "" : `<div class="folder-empty"><span>📂</span><p>Crea cartelle per organizzare visivamente i documenti.</p></div>`}</div>` : "";
    const rootDrop = currentFolder ? `<div class="current-folder-head"><button class="btn ghost" data-action="document-root">← Archivio principale</button><div><span>📁</span><strong>${esc(currentFolder.name)}</strong><small>Trascina qui file esterni oppure documenti già caricati.</small></div></div>` : "";
    const list = rows.length ? rows.map((d) => `<article class="document-row document-draggable ${heldDocumentId === d.id ? "picked-up" : ""}" draggable="true" data-document-drag="${esc(d.id)}"><span class="file-icon document-emoji">${documentEmoji(d)}</span><div><strong>${esc(d.nome)}</strong><span>${esc(d.tipo)} · Pratica ${esc(d.pratica || "—")} · ${esc(d.cliente || "—")}</span><small>${dateIt(d.data)}${d.file_size ? ` · ${Math.round(Number(d.file_size) / 1024)} KB` : ""}${d.note ? " · " + esc(d.note) : ""}</small></div><div class="document-actions">${d.url ? `<a class="btn soft" href="${esc(d.url)}" target="_blank" rel="noopener">Apri file ↗</a>` : `<span class="placeholder-pill">File non disponibile</span>`}<button class="btn ghost" data-action="edit-document" data-id="${esc(d.id)}">Modifica</button><button class="icon-btn danger" data-action="delete-document" data-id="${esc(d.id)}">×</button></div></article>`).join("") : emptyState("Cartella vuota", api.isFastMode() ? "Nessun documento presente." : "Carica o trascina qui il primo file.", api.isFastMode() ? "" : "Carica documento", "new-document");
    return `${toolbar}${breadcrumb}${folders}<section class="panel document-drop-zone" data-document-folder="${esc(state.documentFolderId)}">${rootDrop}<div class="document-list">${list}</div></section>`;
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
    const groups = {
      ACQUISTO: [["destinatario_ordine", "Destinatario ordine"], ["clientid", "Cliente (se Per Cliente)"], ["valore", "Valore pratica"], ["valore_provvigione", "Valore provvigione"], ["installazione_regione", "Regione installazione"], ["installazione_provincia", "Provincia installazione"], ["installazione_comune", "Comune installazione"], ["installazione_cap", "CAP installazione"], ["installazione_localita", "Località installazione"], ["installazione_indirizzo", "Indirizzo installazione"], ["installazione_civico", "Civico installazione"], ["gestione_ledwall", "Gestione Ledwall"], ["sim_richiesta", "SIM per traffico rete"], ["predisposizione_elettrica", "Predisposizione elettrica"], ["cloud_username", "Username Cloud"], ["cloud_password", "Password Cloud"], ["note", "Note installazione"]],
      NOLEGGIO: [["clientid", "Cliente"], ["valore", "Valore pratica"], ["valore_provvigione", "Valore provvigione"], ["numero_rate", "Numero rate"], ["periodicita_pagamento", "Mensilità"], ["indirizzo_installazione_tipo", "Scelta indirizzo installazione"], ["installazione_regione", "Regione alternativa"], ["installazione_provincia", "Provincia alternativa"], ["installazione_comune", "Comune alternativo"], ["installazione_cap", "CAP alternativo"], ["installazione_localita", "Località alternativa"], ["installazione_indirizzo", "Indirizzo alternativo"], ["installazione_civico", "Civico alternativo"], ["gestione_ledwall", "Gestione Ledwall"], ["sim_richiesta", "SIM per traffico rete"], ["predisposizione_elettrica", "Predisposizione elettrica"], ["cloud_username", "Username Cloud"], ["cloud_password", "Password Cloud"], ...PRACTICE_DOCUMENTS.NOLEGGIO],
      LEASING: [["clientid", "Cliente"], ["valore", "Valore pratica"], ["valore_provvigione", "Valore provvigione"], ["numero_rate", "Numero rate"], ["periodicita_pagamento", "Mensilità"], ["indirizzo_installazione_tipo", "Scelta indirizzo installazione"], ["installazione_regione", "Regione alternativa"], ["installazione_provincia", "Provincia alternativa"], ["installazione_comune", "Comune alternativo"], ["installazione_cap", "CAP alternativo"], ["installazione_localita", "Località alternativa"], ["installazione_indirizzo", "Indirizzo alternativo"], ["installazione_civico", "Civico alternativo"], ["gestione_ledwall", "Gestione Ledwall"], ["sim_richiesta", "SIM per traffico rete"], ["predisposizione_elettrica", "Predisposizione elettrica"], ["cloud_username", "Username Cloud"], ["cloud_password", "Password Cloud"], ...PRACTICE_DOCUMENTS.LEASING]
    };
    const requirements = Object.entries(groups).map(([type, fields]) => `<fieldset class="required-settings-group"><legend>${type}</legend><div class="required-settings-list">${fields.map(([key, label]) => {
      const settingKey = `req_${type.toLowerCase()}_${key}`;
      const checked = String(s[settingKey] || "NO").toUpperCase() === "SI";
      return `<label><input type="hidden" name="${esc(settingKey)}" value="NO"><input type="checkbox" name="${esc(settingKey)}" value="SI" ${checked ? "checked" : ""}><span><strong>${esc(label)}</strong><small>${checked ? "Attualmente obbligatorio" : "Attualmente facoltativo"}</small></span></label>`;
    }).join("")}</div></fieldset>`).join("");
    return `<form id="settingsForm"><div class="settings-grid"><section class="panel"><div class="panel-head"><div><span class="section-kicker">Azienda</span><h3>Dati generali</h3></div></div><div class="form-grid"><label>Ragione sociale<input name="legalName" value="${esc(config.company.legalName)}" disabled></label><label>Brand<input name="brand" value="${esc(config.company.brand)}" disabled></label><label class="full">Obiettivo fatturato aziendale (€)<input name="obiettivo_fatturato" type="number" min="0" step="1000" value="${esc(s.obiettivo_fatturato || 500000)}"><small>Usato dalle barre di avanzamento nella Dashboard.</small></label><label>Telefono commerciale<input name="telefono_commerciale" value="${esc(s.telefono_commerciale || "")}"></label><label>IVA (%)<input name="iva_percentuale" type="number" value="${esc(s.iva_percentuale || 22)}"></label><label>Acconto predefinito (%)<input name="acconto_percentuale" type="number" value="${esc(s.acconto_percentuale || 30)}"></label><label>Validità preventivo (giorni)<input name="validita_preventivo_giorni" type="number" value="${esc(s.validita_preventivo_giorni || 15)}"></label></div></section><section class="panel"><div class="panel-head"><div><span class="section-kicker">Collegamento</span><h3>Database condiviso</h3></div>${badge(status.fast ? "Modalità Rapida" : status.demo ? "Demo" : status.online ? "Online" : "Offline")}</div><div class="config-summary"><dl><div><dt>Modalità</dt><dd>${status.fast ? "Lavoro locale" : status.demo ? "Demo locale" : "Standard · Online"}</dd></div><div><dt>Elementi da salvare</dt><dd>${status.pending || 0}</dd></div><div><dt>Versione</dt><dd>${esc(config.version)}</dd></div></dl><p>Le Attività sono sempre memorizzate sul dispositivo e non rallentano il database. In Modalità Rapida le altre modifiche vengono accodate fino a “SALVA TUTTO”.</p><div class="stack-actions"><button class="btn soft" type="button" data-action="test-database">Verifica collegamento</button></div></div></section><section class="panel span-2"><div class="panel-head"><div><span class="section-kicker">Configurazione pratiche</span><h3>Campi obbligatori</h3><p>Le stesse impostazioni sono modificabili nella configurazione del database usando SI oppure NO.</p></div></div><div class="required-settings-grid">${requirements}</div><div class="form-actions"><button class="btn primary" type="submit">Salva tutte le impostazioni</button></div></section></div></form>`;
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

  function closeModal() {
    $("modalRoot").innerHTML = "";
    if (pendingFirstAccessTutorial) {
      pendingFirstAccessTutorial = false;
      setTimeout(showTutorialWelcome, 280);
    }
  }

  function field(label, name, value = "", options = {}) {
    const attrs = [options.required ? "required" : "", options.readonly ? "readonly" : "", options.min !== undefined ? `min="${options.min}"` : "", options.step ? `step="${options.step}"` : ""].filter(Boolean).join(" ");
    const cls = options.full ? "full" : "";
    const marker = options.required ? requiredMark(true) : "";
    if (options.type === "textarea") return `<label class="${cls}">${esc(label)}${marker}<textarea name="${name}" ${attrs}>${esc(value)}</textarea></label>`;
    if (options.options) return `<label class="${cls}">${esc(label)}${marker}<select name="${name}" ${attrs}>${options.options.map((opt) => `<option value="${esc(opt)}" ${String(opt) === String(value) ? "selected" : ""}>${esc(opt)}</option>`).join("")}</select></label>`;
    return `<label class="${cls}">${esc(label)}${marker}<input name="${name}" type="${options.type || "text"}" value="${esc(value)}" ${attrs}></label>`;
  }

  function newRequestToken() {
    return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function formShell(entity, id, fields, submitLabel = "Salva", recordVersion = 0) {
    return `<form class="entity-form form-grid" data-entity="${entity}" data-id="${esc(id || "")}" data-record-version="${Number(recordVersion || 0)}" data-request-token="${newRequestToken()}">${fields}<div class="form-actions full"><button class="btn ghost" type="button" data-action="close-modal">Annulla</button><button class="btn primary" type="submit">${esc(submitLabel)}</button></div></form>`;
  }

  function activateFormPanelFor(element) {
    const panel = element && element.closest("[data-form-panel]");
    if (!panel) return;
    const form = panel.closest("form");
    const name = panel.dataset.formPanel;
    form.querySelectorAll("[data-form-panel]").forEach((node) => node.classList.toggle("active", node.dataset.formPanel === name));
    form.querySelectorAll("[data-form-tab]").forEach((node) => node.classList.toggle("active", node.dataset.formTab === name));
  }

  function practiceRequired(type, field) {
    return String((state.data.settings || {})[`req_${String(type || "").toLowerCase()}_${String(field || "").toLowerCase()}`] || "NO").toUpperCase() === "SI";
  }

  function requiredMark(required) {
    return required ? `<em class="required-mark">Obbligatorio</em>` : `<em class="optional-mark">Facoltativo</em>`;
  }

  function openPracticeTypeChooser(clientId) {
    const body = `<div class="practice-type-intro"><p>Scegli la tipologia da inserire. Il modulo mostrerà soltanto i dati necessari per quella pratica.</p></div>
      <div class="practice-type-grid">
        <button type="button" class="practice-type-card purchase" data-action="choose-practice-type" data-type="ACQUISTO" data-client-id="${esc(clientId || "")}"><span>🛒</span><strong>Pratica di acquisto</strong><small>Ordine per il cliente oppure intestato all’agente.</small></button>
        <button type="button" class="practice-type-card rental" data-action="choose-practice-type" data-type="NOLEGGIO" data-client-id="${esc(clientId || "")}"><span>🔄</span><strong>Pratica di noleggio</strong><small>Contratto Grenke da 24 a 60 mesi.</small></button>
        <button type="button" class="practice-type-card leasing" data-action="choose-practice-type" data-type="LEASING" data-client-id="${esc(clientId || "")}"><span>🏦</span><strong>Pratica di leasing</strong><small>Leasing IFIS da 32 a 72 mesi.</small></button>
      </div>`;
    openModal("Nuova pratica", body, { wide: true, kicker: "Scegli la tipologia", subtitle: "Acquisto, Noleggio operativo o Leasing" });
  }

  function openPractice(id, clientId, selectedType) {
    const record = state.data.practices.find((p) => p.id === id) || {};
    const client = state.data.clients.find((c) => c.id === (clientId || record.clientId));
    const session = api.getSession() || {};
    const prefix = initials(session.displayName || session.nome_visualizzato || session.username).replace(/[^A-Z0-9]/g, "").slice(0, 2) || "SM";
    const existingNumbers = state.data.practices.map((p) => String(p.numero || "")).filter((number) => number.startsWith(prefix)).map((number) => Number(number.slice(prefix.length))).filter(Number.isFinite);
    const number = record.numero || prefix + String((existingNumbers.length ? Math.max(...existingNumbers) : 0) + 1).padStart(4, "0");
    const inferredType = record.finanziaria === "Grenke" ? "NOLEGGIO" : record.finanziaria === "IFIS" ? "LEASING" : "ACQUISTO";
    const practiceType = String(record.tipo_pratica || selectedType || inferredType).toUpperCase();
    const allowedStatuses = practiceType === "ACQUISTO" ? STATUSES.filter((status) => status !== "Bocciata") : STATUSES;
    const selectedClientId = record.clientId || clientId || "";
    const selectedClient = state.data.clients.find((c) => c.id === selectedClientId);
    const clientIsRequired = practiceRequired(practiceType, "clientid");
    const clientField = record.id
      ? `${field("Cliente", "cliente_display", record.cliente || (selectedClient && selectedClient.ragioneSociale) || "", { readonly: true })}<input type="hidden" name="clientId" value="${esc(selectedClientId)}">`
      : `<label>Cliente ${requiredMark(clientIsRequired)}<select name="clientId" ${clientIsRequired ? "required" : ""}><option value="">Seleziona cliente</option>${state.data.clients.map((c) => `<option value="${esc(c.id)}" ${c.id === selectedClientId ? "selected" : ""}>${esc(c.ragioneSociale)}</option>`).join("")}</select></label>`;
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
    const destination = String(record.destinatario_ordine || "PER CLIENTE").toUpperCase();
    const finance = practiceType === "NOLEGGIO" ? "Grenke" : practiceType === "LEASING" ? "IFIS" : "Acquisto diretto";
    const addressType = String(record.indirizzo_installazione_tipo || (practiceType === "ACQUISTO" ? "PRESSO ALTRO INDIRIZZO" : "COME INDIRIZZO CLIENTE")).toUpperCase();
    const management = record.gestione_ledwall || "";
    const req = (name) => practiceRequired(practiceType, name);
    const typeSummary = `<div class="practice-kind-banner ${practiceType.toLowerCase()} full"><span>${practiceType === "ACQUISTO" ? "🛒" : practiceType === "NOLEGGIO" ? "🔄" : "🏦"}</span><div><small>TIPOLOGIA PRATICA</small><strong>${esc(practiceType)}</strong></div>${record.id ? "" : `<button type="button" class="btn ghost" data-action="back-practice-types">Cambia tipologia</button>`}</div>
      <input type="hidden" name="tipo_pratica" value="${esc(practiceType)}"><input type="hidden" name="finanziaria" value="${esc(finance)}">`;
    const purchaseDestination = practiceType !== "ACQUISTO" ? "" : `<fieldset class="practice-section full"><legend>Destinatario ordine ${requiredMark(req("destinatario_ordine"))}</legend>
      <div class="destination-grid">
        <label class="choice-card"><input type="radio" name="destinatario_ordine" value="PER ME" ${destination === "PER ME" ? "checked" : ""} ${req("destinatario_ordine") ? "required" : ""}><span><strong>Per Me</strong><small>La fattura finale sarà intestata all’agente connesso.</small></span></label>
        <label class="choice-card"><input type="radio" name="destinatario_ordine" value="PER CLIENTE" ${destination !== "PER ME" ? "checked" : ""}><span><strong>Per Cliente</strong><small>L’ordine e la fattura saranno intestati al cliente selezionato.</small></span></label>
      </div>
    </fieldset>`;
    const personalData = `<div class="conditional-section full" data-visible-when-destination="PER ME"><fieldset class="practice-section"><legend>Dati personali</legend><div class="form-grid">
      ${field("Intestatario ordine", "intestatario_nome", record.intestatario_nome || session.displayName || session.nome_visualizzato || session.username, { readonly: true })}
      ${field("Email", "intestatario_email", record.intestatario_email || session.email || "", { readonly: true, type: "email" })}
      ${field("Telefono", "intestatario_telefono", record.intestatario_telefono || session.telefono || session.phone || "", { readonly: true })}
      <p class="field-help full">La pratica e la fattura finale saranno intestate all’utente collegato.</p>
    </div></fieldset></div>`;
    const customerData = `<div class="conditional-section full" data-visible-when-destination="PER CLIENTE"><fieldset class="practice-section"><legend>Dati del cliente</legend><div class="form-grid">${clientField}</div></fieldset></div>`;
    const clientCompletionFields = `<div class="client-practice-completion conditional-section full" data-visible-when-destination="PER CLIENTE"><div class="client-completion-alert" id="practiceClientCompletionAlert">Se l’anagrafica selezionata è incompleta, compila qui i dati mancanti: saranno registrati automaticamente nel cliente.</div><div class="form-grid">
      <label data-client-fill-field="codice_fiscale">Codice fiscale<input name="client_update_codice_fiscale" maxlength="16" value="${esc(selectedClient && selectedClient.codice_fiscale || "")}"></label>
      <label data-client-fill-field="piva">Partita IVA<input name="client_update_piva" inputmode="numeric" maxlength="11" value="${esc(selectedClient && selectedClient.piva || "")}"></label>
      <label data-client-fill-field="email">E-mail<input name="client_update_email" type="email" value="${esc(selectedClient && selectedClient.email || "")}"></label>
      ${practiceType === "ACQUISTO" ? "" : `<label data-client-fill-field="iban">IBAN<input name="client_update_iban" value="${esc(selectedClient && selectedClient.iban || "")}"></label>`}
    </div></div>`;
    const valueFields = `<fieldset class="practice-section full"><legend>Valori pratica</legend><div class="form-grid">
      ${field("Valore pratica (IVA esclusa)", "valore", record.valore || 0, { type: "number", min: 0, step: "0.01", required: req("valore") })}
      <label class="conditional-section" data-visible-when-commission="YES">Valore provvigione ${requiredMark(req("valore_provvigione"))}<input name="valore_provvigione" type="number" min="0" step="0.01" value="${esc(record.valore_provvigione || 0)}" ${req("valore_provvigione") ? "required" : ""}><small>Compilato automaticamente quando disponibile nel preventivo S.Q.P.</small></label>
    </div></fieldset>`;
    const standardRates = practiceType === "NOLEGGIO" ? ["24", "30", "36", "48", "60"] : ["32", "42", "48", "54", "60", "66", "72"];
    const currentRate = String(record.numero_rate || "");
    const rateOptions = currentRate && !standardRates.includes(currentRate) ? [currentRate, ...standardRates] : standardRates;
    const financeFields = practiceType === "ACQUISTO" ? "" : `<fieldset class="practice-section full"><legend>Condizioni ${practiceType === "NOLEGGIO" ? "Grenke" : "IFIS"}</legend><div class="form-grid">
      ${field("Numero di rate selezionate", "numero_rate", record.numero_rate || (practiceType === "NOLEGGIO" ? "36" : "60"), { options: rateOptions, required: req("numero_rate") })}
      ${field("Mensilità", "periodicita_pagamento", record.periodicita_pagamento || "Mensile", { options: practiceType === "NOLEGGIO" ? ["Mensile", "Trimestrale"] : ["Mensile", "Bimestrale", "Trimestrale"], required: req("periodicita_pagamento") })}
    </div></fieldset>`;
    const addressChoice = practiceType === "ACQUISTO" ? `<input type="hidden" name="indirizzo_installazione_tipo" value="PRESSO ALTRO INDIRIZZO">` : `<div class="address-choice full">
      <label class="choice-card compact"><input type="radio" name="indirizzo_installazione_tipo" value="COME INDIRIZZO CLIENTE" ${addressType === "COME INDIRIZZO CLIENTE" ? "checked" : ""} ${req("indirizzo_installazione_tipo") ? "required" : ""}><span><strong>Come indirizzo cliente</strong><small>Usa la sede registrata nell’anagrafica.</small></span></label>
      <label class="choice-card compact"><input type="radio" name="indirizzo_installazione_tipo" value="PRESSO ALTRO INDIRIZZO" ${addressType !== "COME INDIRIZZO CLIENTE" ? "checked" : ""}><span><strong>Presso altro indirizzo</strong><small>Inserisci una sede di installazione differente.</small></span></label>
    </div>`;
    const addressFields = `<fieldset class="practice-section full"><legend>Indirizzo di installazione</legend><div class="form-grid">${addressChoice}
      <div class="form-grid full conditional-section installation-address-fields" data-visible-when-address="PRESSO ALTRO INDIRIZZO">
        <label>Regione ${requiredMark(req("installazione_regione"))}<select name="installazione_regione" ${req("installazione_regione") ? "required" : ""}><option value="${esc(record.installazione_regione || "")}">${esc(record.installazione_regione || "Seleziona regione")}</option></select></label>
        <label>Provincia ${requiredMark(req("installazione_provincia"))}<select name="installazione_provincia" ${req("installazione_provincia") ? "required" : ""}><option value="${esc(record.installazione_provincia || "")}">${esc(record.installazione_provincia || "Seleziona provincia")}</option></select></label>
        <label>Comune / Città ${requiredMark(req("installazione_comune"))}<select name="installazione_comune" ${req("installazione_comune") ? "required" : ""}><option value="${esc(record.installazione_comune || "")}">${esc(record.installazione_comune || "Seleziona comune")}</option></select></label>
        <label>CAP ${requiredMark(req("installazione_cap"))}<select name="installazione_cap" ${req("installazione_cap") ? "required" : ""}><option value="${esc(record.installazione_cap || "")}">${esc(record.installazione_cap || "Seleziona CAP")}</option></select></label>
        ${field("Località / Frazione", "installazione_localita", record.installazione_localita || "", { required: req("installazione_localita") })}
        ${field("Indirizzo", "installazione_indirizzo", record.installazione_indirizzo || "", { required: req("installazione_indirizzo") })}
        ${field("Civico", "installazione_civico", record.installazione_civico || "", { required: req("installazione_civico") })}
      </div>
      <div class="installation-sync-question full ${practiceType === "ACQUISTO" ? "" : "is-hidden"}"><strong>L’indirizzo di installazione corrisponde alla sede legale del cliente?</strong><label><input type="radio" name="sync_installation_to_client" value="SI"> Sì, completa l’anagrafica se ancora vuota</label><label><input type="radio" name="sync_installation_to_client" value="NO" checked> No</label></div>
      <div id="missingClientAddressNotice" class="client-completion-alert full is-hidden">Non esiste un indirizzo nell’anagrafica cliente. Inseriscilo adesso: verrà registrato automaticamente anche nel cliente.</div>
    </div></fieldset>`;
    const technicalManagement = `<fieldset class="practice-section full"><legend>Dettagli tecnici</legend><div class="form-grid">
      ${field("Gestione del Ledwall", "gestione_ledwall", management, { options: ["", "In locale con cavo di rete", "In locale con Wi-Fi", "Via Smartphone", "In Cloud"], required: req("gestione_ledwall") })}
      ${field("SIM per traffico rete richiesta", "sim_richiesta", record.sim_richiesta || "NO", { options: ["NO", "SI"] })}
      ${field("Predisposizione elettrica presente", "predisposizione_elettrica", record.predisposizione_elettrica || "NO", { options: ["NO", "SI"] })}
      <div class="cloud-fields form-grid full conditional-section" data-visible-when-management="IN CLOUD">
        ${field("Username Cloud", "cloud_username", record.cloud_username || "", { required: req("cloud_username") })}
        ${field("Password Cloud", "cloud_password", record.cloud_password || "", { type: "password", required: req("cloud_password") })}
        <p class="field-help full">Non hai ancora registrato un account? <a href="https://www.led-cloud.com/#/Account/Login" target="_blank" rel="noopener">Fallo adesso.</a></p>
      </div>
    </div></fieldset>`;
    const existingDocuments = (state.data.documents || []).filter((doc) => String(doc.practiceId || "") === String(record.id || ""));
    const uploadFields = (PRACTICE_DOCUMENTS[practiceType] || []).map(([key, label]) => {
      const existing = existingDocuments.find((doc) => String(doc.tipo_pratica_documento || "") === key || String(doc.tipo || "").toLowerCase() === label.toLowerCase());
      const required = req(key) && !existing;
      return `<label class="practice-upload">${esc(label)} ${requiredMark(req(key))}${existing ? `<small class="uploaded-file">✓ Già caricato: ${esc(existing.nome || existing.file_name)}</small>` : ""}<input type="file" name="practice_file_${esc(key)}" data-practice-document="${esc(key)}" data-document-label="${esc(label)}" ${required ? "required" : ""} accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"></label>`;
    }).join("");
    const uploads = uploadFields ? `<fieldset class="practice-section full"><legend>Documentazione della pratica</legend>${api.isFastMode() ? `<div class="fast-upload-note">Per allegare documenti passa alla Modalità Standard.</div>` : `<div class="practice-upload-grid">${uploadFields}</div>`}</fieldset>` : "";
    const technicalFields = `<fieldset class="practice-configurator full"><legend>Configurazione display</legend><div class="form-grid">
      <label>Display di riferimento<select name="product_id" required>${logicalProducts.map((p) => `<option value="${esc(p.id)}" ${p.id === selectedProduct.id ? "selected" : ""}>${esc(p.nome)}${p.unifiedP391 ? " · composizione automatica 50×100 + 50×50 cm" : ` · cabinet ${esc(p.cabX)}×${esc(p.cabY)} cm`}</option>`).join("")}</select></label>
      ${field("Larghezza display (m)", "display_width", width, { type: "number", min: 0, step: "any" })}
      ${field("Altezza display (m)", "display_height", height, { type: "number", min: 0, step: "any" })}
      ${field("Bifacciale", "bifacciale", bifacial, { options: ["NO", "SI"] })}
      <label>Cabinet necessari<input name="cabinet_calculated" value="0" readonly><small id="cabinetAvailability" class="cabinet-availability"></small></label>
      <div id="measureValidation" class="measure-validation full"></div>
    </div></fieldset>`;
    const identityFields = `<fieldset class="practice-section full"><legend>Identificazione</legend><div class="form-grid">${field("Identificativo pratica", "numero", number, { required: true, readonly: true })}${statusField}</div></fieldset>`;
    const tabPanel = (name, content, active) => `<section class="form-tab-panel full ${active ? "active" : ""}" data-form-panel="${name}">${content}</section>`;
    const practiceTabs = practiceType === "ACQUISTO"
      ? [["recipient", "Destinatario Ordine"], ["product", "Prodotto della pratica"], ["value", "Valore della Pratica"], ["address", "Indirizzo di Installazione"], ["technical", "Dettagli Tecnici"]]
      : [["client", "Cliente"], ["product", "Prodotto della pratica"], ["value", "Valore della Pratica"], ["finance", "Condizioni Finanziaria"], ["address", "Indirizzo di Installazione"], ["technical", "Dettagli Tecnici"], ["documents", "Sezione Documenti"]];
    const tabNavigation = `<nav class="form-tabs practice-form-tabs full" aria-label="Sezioni pratica">${practiceTabs.map(([key, label], index) => `<button type="button" class="form-tab ${index === 0 ? "active" : ""}" data-form-tab="${key}"><i></i>${label}</button>`).join("")}</nav>`;
    const tabContent = practiceType === "ACQUISTO"
      ? tabPanel("recipient", purchaseDestination + identityFields + personalData + customerData + clientCompletionFields, true) + tabPanel("product", technicalFields) + tabPanel("value", valueFields) + tabPanel("address", addressFields) + tabPanel("technical", technicalManagement + field("Note / descrizione installazione", "note", record.note || "", { type: "textarea", full: true, required: req("note") }))
      : tabPanel("client", identityFields + customerData + clientCompletionFields, true) + tabPanel("product", technicalFields) + tabPanel("value", valueFields) + tabPanel("finance", financeFields) + tabPanel("address", addressFields) + tabPanel("technical", technicalManagement + field("Note / descrizione installazione", "note", record.note || "", { type: "textarea", full: true, required: req("note") })) + tabPanel("documents", uploads);
    const fields = typeSummary + tabNavigation + tabContent +
      (record.preventivo_id ? field("Preventivo S.Q.P.", "preventivo_id", record.preventivo_id, { readonly: true }) + field("Origine", "origine", record.origine || "S.Q.P.", { readonly: true }) : "") +
      `<input type="hidden" name="modelli_display" value="${esc(record.modelli_display || "")}"><input type="hidden" name="misure_display" value="${esc(record.misure_display || "")}"><input type="hidden" name="cabinet_da_sottrarre" value="${esc(record.cabinet_da_sottrarre || "")}"><input type="hidden" name="righe_magazzino_json" value="${esc(record.righe_magazzino_json || "[]")}"><input type="hidden" name="p391_unificato" value="${esc(record.p391_unificato || "NO")}"><input type="hidden" name="p391_cabinet_50100" value="${esc(record.p391_cabinet_50100 || "0")}"><input type="hidden" name="p391_cabinet_5050" value="${esc(record.p391_cabinet_5050 || "0")}">` +
      (record.righe_json ? `<input type="hidden" name="righe_json" value="${esc(record.righe_json)}">` : "");
    openModal(record.id ? `Pratica ${record.numero}` : "Nuova pratica", formShell("practices", record.id, fields, record.id ? "Aggiorna pratica" : "Crea pratica", record.record_version), { wide: true, kicker: record.id ? "Gestione pratica" : "Nuova opportunità", subtitle: client ? client.ragioneSociale : "Compila le informazioni principali" });
    bindPracticeConditionalFields(practiceType);
    bindPracticeCalculator(logicalProducts, productOptions);
    bindPracticeTabsAndClientCompletion(practiceType);
    window.SeemaxClientTools.bindLocationFields(document.querySelector(".entity-form[data-entity='practices']"), record, "installazione_").catch((error) => toast(error.message, "danger"));
  }

  function bindPracticeConditionalFields(practiceType) {
    const form = document.querySelector(".entity-form[data-entity='practices']");
    if (!form) return;
    const refresh = () => {
      const destination = form.querySelector("[name='destinatario_ordine']:checked")?.value || "PER CLIENTE";
      const address = form.querySelector("[name='indirizzo_installazione_tipo']:checked")?.value || form.elements.indirizzo_installazione_tipo?.value || "PRESSO ALTRO INDIRIZZO";
      const management = String(form.elements.gestione_ledwall?.value || "").toUpperCase();
      const selectedClient = state.data.clients.find((client) => String(client.id) === String(form.elements.clientId?.value || ""));
      const clientHasAddress = !!(selectedClient && selectedClient.regione && selectedClient.provincia && (selectedClient.comune || selectedClient.citta) && selectedClient.cap && selectedClient.indirizzo && selectedClient.civico);
      const needsClientAddress = address === "COME INDIRIZZO CLIENTE" && !clientHasAddress;
      form.querySelectorAll("[data-visible-when-destination]").forEach((node) => node.classList.toggle("is-hidden", practiceType === "ACQUISTO" && node.dataset.visibleWhenDestination !== destination));
      form.querySelectorAll("[data-visible-when-address]").forEach((node) => {
        const hidden = node.dataset.visibleWhenAddress !== address && !(node.classList.contains("installation-address-fields") && needsClientAddress);
        node.classList.toggle("is-hidden", hidden);
        node.querySelectorAll("input,select,textarea").forEach((input) => {
          if (hidden) { if (input.dataset.wasRequired === undefined) input.dataset.wasRequired = input.required ? "1" : "0"; input.required = false; }
          else if (input.dataset.wasRequired === "1") input.required = true;
        });
      });
      const addressNotice = form.querySelector("#missingClientAddressNotice");
      if (addressNotice) addressNotice.classList.toggle("is-hidden", !needsClientAddress);
      const syncQuestion = form.querySelector(".installation-sync-question");
      if (syncQuestion && practiceType === "ACQUISTO") syncQuestion.classList.toggle("is-hidden", !selectedClient || clientHasAddress || destination !== "PER CLIENTE");
      if (needsClientAddress) {
        const syncYes = form.querySelector("[name='sync_installation_to_client'][value='SI']");
        if (syncYes) syncYes.checked = true;
      }
      form.querySelectorAll("[data-visible-when-management]").forEach((node) => {
        const hidden = node.dataset.visibleWhenManagement !== management;
        node.classList.toggle("is-hidden", hidden);
        node.querySelectorAll("input,select,textarea").forEach((input) => {
          if (hidden) { if (input.dataset.wasRequired === undefined) input.dataset.wasRequired = input.required ? "1" : "0"; input.required = false; }
          else if (input.dataset.wasRequired === "1") input.required = true;
        });
      });
      form.querySelectorAll("[data-visible-when-commission]").forEach((node) => node.classList.toggle("is-hidden", practiceType === "ACQUISTO" && destination === "PER ME"));
      const clientSelect = form.elements.clientId;
      if (clientSelect && practiceType === "ACQUISTO") {
        const personal = destination === "PER ME";
        if (personal) { if (clientSelect.dataset.wasRequired === undefined) clientSelect.dataset.wasRequired = clientSelect.required ? "1" : "0"; clientSelect.required = false; }
        else if (clientSelect.dataset.wasRequired === "1") clientSelect.required = true;
      }
    };
    form.addEventListener("change", (event) => {
      if (["destinatario_ordine", "indirizzo_installazione_tipo", "gestione_ledwall", "clientId"].includes(event.target.name)) refresh();
    });
    refresh();
  }

  function bindPracticeTabsAndClientCompletion(practiceType) {
    const form = document.querySelector(".entity-form[data-entity='practices']");
    if (!form) return;
    const tabs = Array.from(form.querySelectorAll("[data-form-tab]"));
    const panels = Array.from(form.querySelectorAll("[data-form-panel]"));
    const activate = (name) => {
      tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.formTab === name));
      panels.forEach((panel) => panel.classList.toggle("active", panel.dataset.formPanel === name));
    };
    tabs.forEach((tab) => tab.addEventListener("click", () => activate(tab.dataset.formTab)));

    const completionRows = Array.from(form.querySelectorAll("[data-client-fill-field]"));
    function updateClientCompletion() {
      const client = state.data.clients.find((item) => String(item.id) === String(form.elements.clientId?.value || ""));
      completionRows.forEach((row) => {
        const key = row.dataset.clientFillField;
        const input = row.querySelector("input");
        const existing = client ? String(client[key] || "").trim() : "";
        if (existing) input.value = existing;
        const missing = !!client && !existing;
        row.classList.toggle("is-hidden", !missing);
        input.required = missing;
      });
      const alert = form.querySelector("#practiceClientCompletionAlert");
      if (alert) alert.classList.toggle("is-hidden", !client || !completionRows.some((row) => !row.classList.contains("is-hidden")));
      updateTabs();
    }
    function updateTabs() {
      tabs.forEach((tab) => {
        const panel = panels.find((item) => item.dataset.formPanel === tab.dataset.formTab);
        if (!panel) return;
        const required = Array.from(panel.querySelectorAll("[required]")).filter((input) => !input.closest(".is-hidden"));
        const complete = required.every((input) => String(input.value || "").trim());
        tab.classList.toggle("complete", complete);
        tab.classList.toggle("incomplete", !complete);
      });
    }
    form.elements.clientId?.addEventListener("change", updateClientCompletion);
    form.addEventListener("input", updateTabs);
    form.addEventListener("change", () => setTimeout(updateTabs, 0));
    updateClientCompletion();
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

  async function openClient(id) {
    setLoading(true, "Preparazione anagrafica cliente…");
    try { await ensureClientTools(); }
    catch (error) { toast(error.message, "danger"); return; }
    finally { setLoading(false); }
    const r = state.data.clients.find((c) => c.id === id) || {};
    const session = api.getSession() || {};
    const owner = String(r.creato_da_username || r.agent_username || "");
    const canEdit = !r.id || api.isAdmin() || String(r.puo_modificare || "NO").toUpperCase() === "SI" || owner === String(session.username || "");
    const fields = window.SeemaxClientTools.renderFields(r);
    openModal(r.id ? (canEdit ? "Modifica cliente" : "Anagrafica condivisa") : "Nuovo cliente", formShell("clients", r.id, fields, canEdit ? "Salva cliente" : "Consultazione", r.record_version), { wide: true, kicker: canEdit ? "Anagrafica cliente" : "Cliente condiviso", subtitle: !canEdit ? `Creato da ${r.creato_da_nome || "un altro utente"}. Puoi utilizzarlo nelle tue pratiche, ma non modificarlo.` : "" });
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
    openModal(r.id ? "Modifica prodotto" : "Nuovo prodotto", formShell("products", r.id, fields, "Salva", r.record_version), { wide: true, kicker: "Catalogo Ledwall" });
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

  function openDocument(id, folderId = state.documentFolderId, droppedFile = null) {
    const r = state.data.documents.find((d) => d.id === id) || {};
    if (!id && api.isFastMode()) { toast("Il caricamento dei file è disponibile soltanto in Modalità Standard.", "danger"); return; }
    if (!id) { pendingDocumentFolderId = folderId || ""; pendingDocumentFile = droppedFile || null; }
    const fileField = api.isFastMode()
      ? `<div class="full fast-upload-note">Il file non può essere sostituito mentre è attiva la Modalità Rapida.</div>`
      : `<label class="full upload-field">File dal dispositivo${r.url ? `<small>Il file attuale resta invariato se non ne selezioni uno nuovo.</small>` : `<small>Massimo 8 MB. Il file sarà archiviato nel Drive Seemax.</small>`}<input name="document_file" type="file" ${r.url ? "" : "required"} accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt"></label>`;
    const fields = field("Nome documento", "nome", r.nome, { required: true, full: true }) + field("Tipo", "tipo", r.tipo || "Preventivo", { options: ["Preventivo", "Contratto", "Documento cliente", "Documento finanziaria", "Installazione", "Altro"] }) + field("Pratica", "practiceId", r.practiceId || "", { options: ["", ...state.data.practices.map((p) => p.id)] }) + fileField + field("Data", "data", r.data || new Date().toISOString().slice(0, 10), { type: "date" }) + field("Note", "note", r.note, { type: "textarea", full: true });
    openModal(r.id ? "Modifica documento" : "Nuovo documento", formShell("documents", r.id, fields, "Salva", r.record_version), { wide: true, kicker: "Archivio documentale" });
    if (!id && pendingDocumentFile) requestAnimationFrame(() => {
      const form = document.querySelector(".entity-form[data-entity='documents']");
      const input = form && form.elements.document_file;
      if (!input) return;
      const transfer = new DataTransfer();
      transfer.items.add(pendingDocumentFile);
      input.files = transfer.files;
      if (!form.elements.nome.value) form.elements.nome.value = pendingDocumentFile.name;
    });
  }

  function openActivity(id) {
    const r = state.data.activities.find((a) => a.id === id) || {};
    const fields = field("Titolo attività", "titolo", r.titolo, { required: true, full: true }) + field("Tipo", "tipo", r.tipo || "Telefonata", { options: ["Telefonata", "Email", "Appuntamento", "Verifica", "Installazione", "Altro"] }) + field("Stato", "stato", r.stato || "Aperta", { options: ["Aperta", "In corso", "Completata"] }) + field("Scadenza", "scadenza", r.scadenza || new Date().toISOString().slice(0, 10), { type: "date" }) + field("Pratica collegata", "practiceId", r.practiceId || "", { options: ["", ...state.data.practices.map((p) => p.id)] }) + field("Assegnata a", "assegnatoA", r.assegnatoA || ((api.getSession() || {}).displayName || ""), { full: true });
    openModal(r.id ? "Modifica attività" : "Nuova attività", formShell("activities", r.id, fields), { wide: true, kicker: "Agenda operativa" });
  }

  function openUser(id) {
    const r = state.data.users.find((u) => (u.id || u.username) === id) || { ruolo: "AGENTE", stato: "ATTIVO" };
    const fields = field("Nome visualizzato", "nome_visualizzato", r.nome_visualizzato, { required: true }) + field("Username", "username", r.username, { required: true, readonly: !!r.username }) + field(r.id ? "Nuova Chiave ID (lascia vuoto per non cambiarla)" : "Chiave ID", "chiave_id_agente", "", { required: !r.id }) + field("Ruolo", "ruolo", r.ruolo, { options: ["AGENTE", "ADMIN"] }) + field("Email", "email", r.email, { type: "email" }) + field("Telefono", "telefono", r.telefono) + field("Stato", "stato", r.stato, { options: ["ATTIVO", "SOSPESO"] }) + field("Note", "note", r.note, { type: "textarea", full: true });
    openModal(r.id ? "Modifica agente" : "Nuovo agente", formShell("users", r.id, fields, "Salva", r.record_version), { wide: true, kicker: "Accessi S.Q.P." });
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
      pipeline: STATUSES.map((status) => ({ status, count: practices.filter((p) => p.stato === status).length, value: practices.filter((p) => p.stato === status).reduce((sum, p) => sum + Number(p.valore || 0), 0) })),
      agentOfMonth: state.data.dashboard && state.data.dashboard.agentOfMonth
    };
  }

  function replaceLocalEntity(entity, row) {
    const rows = state.data[entity] || (state.data[entity] = []);
    const index = rows.findIndex((item) => String(item.id || item.username) === String(row.id || row.username));
    if (index >= 0) rows[index] = { ...rows[index], ...row };
    else rows.unshift(row);
    updateLocalDashboard();
    scheduleBootstrapCache();
  }

  let bootstrapCacheTimer = 0;
  function scheduleBootstrapCache() {
    if (config.demoMode || !api.saveBootstrapCache) return;
    clearTimeout(bootstrapCacheTimer);
    bootstrapCacheTimer = setTimeout(() => api.saveBootstrapCache(state.data), 250);
  }

  async function saveEntity(form) {
    const entity = form.dataset.entity;
    const missing = Array.from(form.querySelectorAll("[required]")).find((element) => !String(element.value || "").trim());
    if (missing) {
      toast("Compila tutti i campi obbligatori prima di proseguire.", "danger");
      activateFormPanelFor(missing);
      missing.focus();
      return;
    }
    if (entity === "practices" && (Number(form.elements.display_width?.value || 0) <= 0 || Number(form.elements.display_height?.value || 0) <= 0)) {
      toast("Inserisci larghezza e altezza maggiori di zero.", "danger");
      return;
    }
    const practiceAttachments = entity === "practices"
      ? Array.from(form.querySelectorAll("[data-practice-document]")).filter((input) => input.files && input.files[0]).map((input) => ({
        key: input.dataset.practiceDocument,
        label: input.dataset.documentLabel,
        file: input.files[0],
        input
      }))
      : [];
    if (entity === "practices" && api.isFastMode()) {
      const type = String(form.elements.tipo_pratica?.value || "").toUpperCase();
      const existingTypes = (state.data.documents || []).filter((doc) => String(doc.practiceId || "") === String(form.dataset.id || "")).map((doc) => doc.tipo_pratica_documento);
      const missingRequiredDocument = (PRACTICE_DOCUMENTS[type] || []).find(([key]) => practiceRequired(type, key) && !existingTypes.includes(key));
      if (missingRequiredDocument) {
        toast("Questa pratica richiede documenti obbligatori. Passa alla Modalità Standard per allegarli.", "danger");
        return;
      }
    }
    const oversizedAttachment = practiceAttachments.find((item) => item.file.size > (item.file.type.startsWith("image/") ? 20 : 8) * 1024 * 1024);
    if (oversizedAttachment) {
      toast(`${oversizedAttachment.label}: il file supera il limite di 8 MB.`, "danger");
      return;
    }
    if (entity === "clients") {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const sdi = String(form.elements.sdi?.value || "").trim().toUpperCase();
      const pec = String(form.elements.pec?.value || "").trim().toLowerCase();
      if (!String(form.elements.sdi?.value || "").trim() && !String(form.elements.pec?.value || "").trim()) {
        activateFormPanelFor(form.elements.sdi);
        toast("Inserisci almeno uno tra Codice SDI e PEC.", "danger");
        form.elements.sdi.focus();
        return;
      }
      if (sdi && !/^[A-Z0-9]{7}$/.test(sdi)) {
        activateFormPanelFor(form.elements.sdi);
        toast("Il Codice SDI deve contenere esattamente 7 caratteri alfanumerici.", "danger");
        form.elements.sdi.focus();
        return;
      }
      if (pec && !emailPattern.test(pec)) {
        activateFormPanelFor(form.elements.pec);
        toast("Inserisci un indirizzo PEC valido.", "danger");
        form.elements.pec.focus();
        return;
      }
      if (form.elements.email?.value && !emailPattern.test(String(form.elements.email.value).trim())) {
        activateFormPanelFor(form.elements.email);
        toast("Inserisci un indirizzo e-mail valido.", "danger");
        form.elements.email.focus();
        return;
      }
      if (!form.elements.telefono_numero?.value || form.elements.telefono_valido?.value !== "SI") {
        activateFormPanelFor(form.elements.telefono_numero);
        toast("Il numero di cellulare è obbligatorio e deve essere valido.", "danger");
        form.elements.telefono_numero.focus();
        return;
      }
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
    record.expected_record_version = Number(form.dataset.recordVersion || 0);
    record.request_token = form.dataset.requestToken || newRequestToken();
    Object.keys(record).filter((key) => key.startsWith("practice_file_")).forEach((key) => delete record[key]);
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
      record.sdi = String(record.sdi || "").replace(/\s+/g, "").toUpperCase();
      record.pec = String(record.pec || "").trim().toLowerCase();
      record.iban = String(record.iban || "").replace(/\s+/g, "").toUpperCase();
      record.citta = record.comune || record.citta || "";
    }
    if (entity === "practices") {
      const client = state.data.clients.find((c) => c.id === record.clientId);
      const personalPurchase = record.tipo_pratica === "ACQUISTO" && record.destinatario_ordine === "PER ME";
      record.cliente = personalPurchase ? (record.intestatario_nome || (api.getSession() || {}).displayName || "") : (client ? client.ragioneSociale : record.cliente);
      if (personalPurchase) { record.clientId = ""; record.valore_provvigione = 0; }
      record.agente = record.agente || ((api.getSession() || {}).displayName || "");
      record.agent_username = record.agent_username || ((api.getSession() || {}).username || "");
      record.finanziaria = record.tipo_pratica === "NOLEGGIO" ? "Grenke" : record.tipo_pratica === "LEASING" ? "IFIS" : (record.finanziaria || "Da definire");
      if (!api.isAdmin() && !current.id) record.stato = "Inserita";
      record.aggiornatoIl = now;
      record.id = record.id || "PR-" + record.numero;
      if (!current.id) record.nuova_pratica = "SI";
      record.documenti_richiesti_json = JSON.stringify((PRACTICE_DOCUMENTS[record.tipo_pratica] || []).filter(([key]) => practiceRequired(record.tipo_pratica, key)).map(([key]) => key));
    }
    if (entity === "documents") {
      delete record.document_file;
      const practice = state.data.practices.find((p) => p.id === record.practiceId);
      record.pratica = practice ? practice.numero : "";
      record.cliente = practice ? practice.cliente : "";
      const file = form.elements.document_file && form.elements.document_file.files[0];
      if (file) {
        if (api.isFastMode()) { toast("Il caricamento dei file è disponibile soltanto in Modalità Standard.", "danger"); return; }
        if (file.size > (file.type.startsWith("image/") ? 20 : 8) * 1024 * 1024) { toast("Il file supera il limite consentito.", "danger"); return; }
        const preparedFile = await prepareFileForUpload(file);
        if (preparedFile.size > 8 * 1024 * 1024) { toast("Non è stato possibile ridurre il file sotto il limite di 8 MB.", "danger"); return; }
        record.file_base64 = preparedFile.dataUrl;
        record.file_name = preparedFile.name;
        record.file_type = preparedFile.type;
        record.file_size = preparedFile.size;
        if (!record.nome) record.nome = file.name;
      }
    }
    if (entity === "users") {
      record.id = record.id || record.username;
      if (!record.chiave_id_agente) delete record.chiave_id_agente;
    }
    setLoading(true, `Salvataggio ${ENTITY_LABELS[entity] || "dato"}…`);
    let activeUploadBatchId = "";
    let celebrationShown = false;
    try {
      const preparedAttachmentsPromise = entity === "practices" && practiceAttachments.length
        ? Promise.all(practiceAttachments.map(async (attachment) => ({
          ...attachment,
          preparedFile: await prepareFileForUpload(attachment.file)
        })))
        : Promise.resolve([]);
      let saved = await api.upsert(entity, record);
      if (entity === "practices" && practiceAttachments.length) {
        const uploadBatchId = startUploadBatch(saved, practiceAttachments);
        activeUploadBatchId = uploadBatchId;
        replaceLocalEntity(entity, saved);
        closeModal();
        renderRoute();
        setLoading(false);
        celebrationShown = celebrateSavedEntity(entity, saved, current);
        toast(`Pratica salvata. Caricamento di ${practiceAttachments.length} documenti in background: non chiudere la pagina.`, "info");
        const preparedAttachments = await preparedAttachmentsPromise;
        let completedUploads = 0;
        const uploadResults = await mapWithConcurrency(preparedAttachments, 3, async (attachment) => {
          updateUploadFile(uploadBatchId, attachment.key, "uploading");
          const documentRecord = {
            practiceId: saved.id,
            pratica: saved.numero,
            cliente: saved.cliente,
            nome: attachment.file.name,
            tipo: attachment.label,
            tipo_pratica_documento: attachment.key,
            data: new Date().toISOString().slice(0, 10),
            agent_username: saved.agent_username,
            file_base64: attachment.preparedFile.dataUrl,
            file_name: attachment.preparedFile.name,
            file_type: attachment.preparedFile.type,
            file_size: attachment.preparedFile.size,
            note: `Allegato ${saved.tipo_pratica || "pratica"}`
          };
          try {
            const uploadedDocument = await api.upsert("documents", documentRecord);
            attachment.input.value = "";
            replaceLocalEntity("documents", uploadedDocument);
            updateUploadFile(uploadBatchId, attachment.key, "done");
            return { ok: true, attachment, document: uploadedDocument };
          } catch (error) {
            updateUploadFile(uploadBatchId, attachment.key, "failed", error.message || "Errore");
            return { ok: false, attachment, error };
          } finally {
            completedUploads += 1;
            toast(`Documenti pratica: ${completedUploads} di ${preparedAttachments.length} completati.`, "info");
          }
        });
        const successfulUploads = uploadResults.filter((result) => result.ok);
        const failedUploads = uploadResults.filter((result) => !result.ok);
        const uploaded = successfulUploads.map(({ attachment, document }) => ({ tipo: attachment.key, document_id: document.id, nome: document.nome, url: document.url }));
        const previousUploaded = (() => { try { return JSON.parse(saved.documenti_caricati_json || "[]"); } catch (error) { return []; } })();
        const mergedUploads = previousUploaded.filter((previous) => !uploaded.some((currentUpload) => currentUpload.tipo === previous.tipo)).concat(uploaded);
        setUploadPhase(uploadBatchId, "Finalizzazione pratica");
        saved = await api.updatePracticeDocuments(saved.id, JSON.stringify(mergedUploads));
        finishUploadBatch(uploadBatchId);
        activeUploadBatchId = "";
        if (failedUploads.length) {
          replaceLocalEntity(entity, saved);
          setConnectionState();
          closeModal();
          renderRoute();
          toast(`Pratica salvata. Non è stato possibile caricare: ${failedUploads.map((result) => result.attachment.label).join(", ")}. Riapri la pratica per riprovare.`, "danger");
          return;
        }
      }
      if (saved.__notifications) { state.data.notifications = saved.__notifications; delete saved.__notifications; updateNotificationBell(); }
      if (entity === "documents" && !form.dataset.id) {
        const library = documentLibrary();
        if (pendingDocumentFolderId) library.placements[saved.id] = pendingDocumentFolderId;
        saveDocumentLibrary(library);
        pendingDocumentFolderId = "";
        pendingDocumentFile = null;
      }
      replaceLocalEntity(entity, saved);
      setConnectionState();
      closeModal();
      renderRoute();
      setLoading(false);
      if (!celebrationShown) celebrationShown = celebrateSavedEntity(entity, saved, current);
      if (!celebrationShown) toast(`${ENTITY_LABELS[entity] || "Elemento"} salvato correttamente.`);
    } catch (error) {
      if (activeUploadBatchId) {
        const failedBatch = uploadState.batches.get(activeUploadBatchId);
        if (failedBatch) failedBatch.files.forEach((file) => { if (!["done", "failed"].includes(file.status)) { file.status = "failed"; file.detail = "Trasferimento interrotto"; } });
        finishUploadBatch(activeUploadBatchId);
      }
      if (String(error.message || "").includes("CONFLICT_RECORD")) {
        toast("Questo elemento è stato modificato da un altro utente. I dati sono stati aggiornati: riaprilo e applica nuovamente la modifica.", "danger");
        closeModal();
        try { await loadAll(false); renderRoute(); } catch (refreshError) { /* conserva i dati già visibili */ }
      } else toast(error.message, "danger");
    }
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

  async function prepareFileForUpload(file) {
    const original = async () => ({ dataUrl: await readFileAsDataUrl(file), name: file.name, type: file.type || "application/octet-stream", size: file.size });
    if (!file.type.startsWith("image/") || file.type === "image/gif" || file.size < 900 * 1024 || !window.createImageBitmap) return original();
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d", { alpha: false });
      context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
      if (!blob || blob.size >= file.size || blob.size > 8 * 1024 * 1024) return original();
      const baseName = file.name.replace(/\.[^.]+$/, "");
      return { dataUrl: await readFileAsDataUrl(blob), name: `${baseName}.jpg`, type: "image/jpeg", size: blob.size };
    } catch (error) { return original(); }
  }

  async function mapWithConcurrency(items, concurrency, worker) {
    const results = new Array(items.length);
    let nextIndex = 0;
    const runners = Array.from({ length: Math.min(Math.max(1, concurrency), items.length) }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await worker(items[index], index);
      }
    });
    await Promise.all(runners);
    return results;
  }

  async function removeEntity(entity, id) {
    const label = ENTITY_LABELS[entity] || "elemento";
    if (!confirm(`Eliminare definitivamente questo ${label}?`)) return;
    setLoading(true, "Eliminazione…");
    try {
      const existing = (state.data[entity] || []).find((item) => String(item.id || item.username) === String(id));
      await api.remove(entity, id, Number(existing && existing.record_version || 0));
      state.data[entity] = (state.data[entity] || []).filter((item) => String(item.id || item.username) !== String(id));
      if (entity === "documents") { const library = documentLibrary(); delete library.placements[id]; saveDocumentLibrary(library); }
      updateLocalDashboard(); scheduleBootstrapCache(); renderRoute(); toast(`${label} eliminato.`);
    }
    catch (error) {
      if (String(error.message || "").includes("CONFLICT_RECORD")) {
        toast("L'elemento è cambiato prima dell'eliminazione. I dati sono stati aggiornati e nulla è stato cancellato.", "danger");
        try { await loadAll(false); renderRoute(); } catch (refreshError) { /* mantiene la vista corrente */ }
      } else toast(error.message, "danger");
    }
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
    openModal("Risultati ricerca", `<div class="search-results"><h3>Pratiche</h3>${practices.length ? practices.map((p) => `<button data-action="edit-practice" data-id="${esc(p.id)}"><span>📋</span><div><strong>${esc(p.numero)} · ${esc(p.cliente)}</strong><small>${esc(p.titolo)}</small></div>${badge(p.stato)}</button>`).join("") : `<p>Nessuna pratica trovata.</p>`}<h3>Clienti</h3>${clients.length ? clients.map((c) => `<button data-action="edit-client" data-id="${esc(c.id)}"><span>👥</span><div><strong>${esc(c.ragioneSociale)}</strong><small>${esc(c.referente || c.citta || "")}</small></div></button>`).join("") : `<p>Nessun cliente trovato.</p>`}</div>`, { wide: true, kicker: `Ricerca: ${query}` });
  }

  async function handleAction(action, id, data = {}) {
    const handlers = {
      "new-practice": () => openPracticeTypeChooser(), "edit-practice": () => openPractice(id), "delete-practice": () => removeEntity("practices", id),
      "new-client": () => openClient(), "edit-client": () => openClient(id), "delete-client": () => removeEntity("clients", id), "new-practice-client": () => openPracticeTypeChooser(id),
      "choose-practice-type": () => openPractice(null, data.clientId || "", data.type),
      "back-practice-types": () => openPracticeTypeChooser(),
      "new-product": () => openProduct(), "edit-product": () => openProduct(id), "product-tech": () => openProductTech(id), "delete-product": () => removeEntity("products", id),
      "new-document": () => openDocument(null, data.folderId || state.documentFolderId), "edit-document": () => openDocument(id), "delete-document": () => removeEntity("documents", id),
      "new-document-folder": openDocumentFolderModal,
      "open-document-folder": () => {
        if (heldDocumentId) moveDocumentLocal(heldDocumentId, data.folderId);
        else { state.documentFolderId = data.folderId || ""; renderRoute(); }
      },
      "document-root": () => {
        if (heldDocumentId) moveDocumentLocal(heldDocumentId, "");
        else { state.documentFolderId = ""; renderRoute(); }
      },
      "cancel-document-move": () => { heldDocumentId = ""; renderRoute(); },
      "delete-document-folder": () => {
        const library = documentLibrary();
        const folder = library.folders.find((item) => item.id === data.folderId);
        if (!folder || !confirm(`Eliminare la cartella “${folder.name}”? I documenti torneranno nell’archivio principale.`)) return;
        library.folders = library.folders.filter((item) => item.id !== data.folderId);
        Object.keys(library.placements).forEach((documentId) => { if (library.placements[documentId] === data.folderId) delete library.placements[documentId]; });
        saveDocumentLibrary(library); renderRoute(); toast("Cartella locale eliminata.");
      },
      "new-activity": () => openActivity(), "edit-activity": () => openActivity(id), "delete-activity": () => removeEntity("activities", id), "toggle-activity": () => toggleActivity(id),
      "new-user": () => openUser(), "edit-user": () => openUser(id), "delete-user": () => removeEntity("users", id),
      "close-modal": closeModal,
      "open-notifications": openNotifications,
      "agent-month-details": openAgentMonthDetails,
      "trophy-board": openTrophyBoard,
      "start-tutorial": startTutorial,
      "disable-tutorial": () => { localStorage.setItem(tutorialStorageKey(), JSON.stringify({ status: "disabled" })); closeModal(); setTimeout(showMonthlyAwardIfNeeded, 250); toast("Tutorial automatico disattivato. Puoi riaprirlo quando vuoi."); },
      "stop-tutorial": () => stopTutorial(false),
      "tutorial-previous": () => moveTutorial(-1),
      "tutorial-next": () => moveTutorial(1),
      "toggle-upload-center": () => { uploadState.expanded = !uploadState.expanded; renderUploadCenter(); },
      "dismiss-upload-center": () => {
        Array.from(uploadState.batches.entries()).forEach(([batchId, batch]) => { if (batch.status !== "active") uploadState.batches.delete(batchId); });
        uploadState.expanded = false; renderUploadCenter();
      },
      "enable-fast-mode": openFastModeWarning,
      "confirm-fast-mode": enableFastMode,
      "disable-fast-mode": disableFastMode,
      "sync-all": syncAll,
      "reload": async () => { await loadAll(); renderRoute(); },
      "reload-planner": () => { if (state.route === "planner") renderRoute(); },
      "test-database": async () => { setLoading(true, "Verifica database…"); try { const response = await api.health(); setConnectionState(); toast(response.ok ? `Database collegato · ${response.elapsed_ms || 0} ms.` : `Database incompleto: ${(response.missing_sheets || []).join(", ")}.`, response.ok ? "success" : "danger"); } catch (e) { toast(e.message, "danger"); } finally { setLoading(false); } },
      "export-demo": () => download(`seemax-demo-${new Date().toISOString().slice(0, 10)}.json`, api.exportDemo()),
      "reset-demo": async () => { if (confirm("Ripristinare tutti i dati dimostrativi?")) { api.resetDemo(); await loadAll(); renderRoute(); toast("Dati demo ripristinati."); } }
    };
    if (handlers[action]) await handlers[action]();
  }

  document.addEventListener("click", async (event) => {
    const interactive = event.target.closest("button:not(:disabled), a[href], [data-action], [data-route], .choice-card");
    if (interactive) haptic(interactive.matches("[data-route], .choice-card") ? "select" : "tap");
    const filterTarget = event.target.closest("[data-filter-status]");
    if (filterTarget) { state.filterStatus = filterTarget.dataset.filterStatus || ""; state.practicePage = 1; renderRoute(); return; }
    const practicePageTarget = event.target.closest("[data-practice-page]");
    if (practicePageTarget && !practicePageTarget.disabled) { state.practicePage = Number(practicePageTarget.dataset.practicePage || 1); renderRoute(); return; }
    const routeTarget = event.target.closest("[data-route]");
    if (routeTarget) { go(routeTarget.dataset.route); return; }
    const actionTarget = event.target.closest("[data-action]");
    if (actionTarget) { await handleAction(actionTarget.dataset.action, actionTarget.dataset.id, actionTarget.dataset); return; }
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
    if (event.target.matches("select,input[type='file']") || (event.target.matches("input[type='checkbox'],input[type='radio']") && !event.target.closest(".choice-card"))) haptic("select");
    if (event.target.id === "practiceSort") { state.practiceSort = event.target.value; state.practicePage = 1; renderRoute(); }
    if (event.target.id === "practiceDirection") { state.practiceDirection = event.target.value; state.practicePage = 1; renderRoute(); }
  });

  document.addEventListener("pointerdown", (event) => {
    const row = event.target.closest("[data-document-drag]");
    if (!row || event.target.closest("button,a,input,select,textarea")) return;
    if (event.pointerType === "mouse") return;
    clearTimeout(documentHoldTimer);
    documentHoldStart = { x: event.clientX, y: event.clientY };
    documentHoldTimer = setTimeout(() => {
      heldDocumentId = row.dataset.documentDrag;
      row.classList.add("picked-up");
      document.querySelectorAll("[data-document-folder]").forEach((folder) => folder.classList.add("awaiting-drop"));
      if (navigator.vibrate) navigator.vibrate(45);
      toast("Documento selezionato: trascinalo o tocca una cartella.", "info");
    }, 2000);
  });

  document.addEventListener("pointermove", (event) => {
    if (!documentHoldStart || heldDocumentId) return;
    if (Math.hypot(event.clientX - documentHoldStart.x, event.clientY - documentHoldStart.y) > 12) {
      clearTimeout(documentHoldTimer); documentHoldStart = null;
    }
  });

  ["pointerup", "pointercancel"].forEach((type) => document.addEventListener(type, () => {
    clearTimeout(documentHoldTimer); documentHoldTimer = null; documentHoldStart = null;
  }));

  document.addEventListener("dragstart", (event) => {
    const row = event.target.closest("[data-document-drag]");
    if (!row || event.target.closest("button,a,input,select,textarea")) { event.preventDefault(); return; }
    heldDocumentId = row.dataset.documentDrag;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/seemax-document", heldDocumentId);
    row.classList.add("dragging");
    document.querySelectorAll("[data-document-folder]").forEach((folder) => folder.classList.add("awaiting-drop"));
  });

  document.addEventListener("dragend", (event) => {
    const row = event.target.closest("[data-document-drag]");
    if (row) row.classList.remove("dragging");
    document.querySelectorAll("[data-document-folder]").forEach((folder) => folder.classList.remove("awaiting-drop", "drag-over"));
    heldDocumentId = "";
  });

  document.addEventListener("dragover", (event) => {
    const folder = event.target.closest("[data-document-folder]");
    if (!folder) return;
    event.preventDefault(); folder.classList.add("drag-over");
  });

  document.addEventListener("dragleave", (event) => {
    const folder = event.target.closest("[data-document-folder]");
    if (folder) folder.classList.remove("drag-over");
  });

  document.addEventListener("drop", (event) => {
    const folder = event.target.closest("[data-document-folder]");
    if (!folder) return;
    event.preventDefault();
    const folderId = folder.dataset.documentFolder || "";
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      heldDocumentId = "";
      openDocument(null, folderId, event.dataTransfer.files[0]);
      return;
    }
    const documentId = event.dataTransfer.getData("text/seemax-document") || heldDocumentId;
    if (documentId) moveDocumentLocal(documentId, folderId);
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
    if (event.target.id === "documentFolderForm") {
      event.preventDefault();
      const name = String(event.target.elements.folder_name.value || "").trim();
      if (!name) return;
      const library = documentLibrary();
      library.folders.push({ id: `folder-${Date.now().toString(36)}`, name, createdAt: new Date().toISOString() });
      saveDocumentLibrary(library);
      closeModal(); renderRoute(); toast("Cartella creata sul dispositivo.");
      return;
    }
    if (event.target.matches(".entity-form")) { event.preventDefault(); await saveEntity(event.target); return; }
    if (event.target.id === "settingsForm") {
      event.preventDefault();
      try {
        const values = serializeForm(event.target);
        values.expected_settings_revision = Number((state.data.settings || {}).settings_revision || 0);
        const savedSettings = await api.saveSettings(values);
        delete values.expected_settings_revision;
        state.data.settings = { ...(state.data.settings || {}), ...values, ...(savedSettings || {}) };
        updateLocalDashboard();
        scheduleBootstrapCache();
        renderRoute();
        setConnectionState();
        toast(api.isFastMode() ? "Impostazioni salvate localmente. Usa SALVA TUTTO." : "Impostazioni salvate.");
      }
      catch (error) {
        if (String(error.message || "").includes("CONFLICT_RECORD")) {
          toast("Le impostazioni sono state modificate da un altro amministratore. Dati aggiornati: verifica e salva nuovamente.", "danger");
          try { await loadAll(false); renderRoute(); } catch (refreshError) { /* mantiene la vista corrente */ }
        } else toast(error.message, "danger");
      }
    }
  });

  $("logoutButton").addEventListener("click", () => {
    if (hasActiveUploads()) { toast("Attendi il completamento dei documenti prima di uscire.", "danger"); uploadState.expanded = true; renderUploadCenter(); return; }
    api.logout(); state.data = null; showLogin();
  });
  $("quickAddButton").addEventListener("click", () => openPracticeTypeChooser());
  $("openSidebar").addEventListener("click", () => $("sidebar").classList.add("open"));
  $("closeSidebar").addEventListener("click", () => $("sidebar").classList.remove("open"));
  $("globalSearch").addEventListener("keydown", (event) => { if (event.key === "Enter") searchEverywhere(event.currentTarget.value); });
  $("globalSearch").addEventListener("input", (event) => {
    if (["practices", "clients", "catalog", "documents", "activities", "users"].includes(state.route)) { state.search = event.target.value; renderRoute(); }
  });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") { if (tutorialState.active) stopTutorial(false); else closeModal(); $("sidebar").classList.remove("open"); } if (tutorialState.active && event.key === "ArrowRight") moveTutorial(1); if (tutorialState.active && event.key === "ArrowLeft") moveTutorial(-1); });
  window.addEventListener("resize", () => { if (tutorialState.active) positionTutorialSpotlight(tutorialState.steps[tutorialState.index].selector); });
  window.addEventListener("hashchange", () => { if (api.getSession()) go(location.hash.replace("#", "") || "dashboard", false); });
  window.addEventListener("seemax:practice-created", async (event) => {
    await loadAll();
    state.practiceQuery = String((event.detail && event.detail.practice && event.detail.practice.numero) || "");
    state.practicePage = 1;
    go("practices");
    celebrateSuccess("📋", "Pratica creata dal Planner", `${state.practiceQuery || "La nuova pratica"} è stata inserita e collegata al preventivo.`);
    toast("Pratica inserita: elenco aggiornato automaticamente.");
  });
  window.addEventListener("beforeinstallprompt", (event) => { event.preventDefault(); installPrompt = event; $("installAppButton").classList.remove("is-hidden"); });
  $("installAppButton").addEventListener("click", async () => { if (!installPrompt) return; installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; $("installAppButton").classList.add("is-hidden"); });

  async function boot() {
    if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
    if (api.getSession()) await showApp(); else showLogin();
  }

  boot();
})();
