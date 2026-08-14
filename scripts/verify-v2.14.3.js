const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
  else process.stdout.write(`✓ ${message}\n`);
}

const backend = read("apps-script/Code.gs");
const api = read("assets/js/api.js");
const app = read("assets/js/app.js");
const config = read("assets/js/config.js");
const worker = read("sw.js");
const nativePlanner = read("assets/js/planner-native.js");
const planner = read("quotation-planner/index.html");
const css = read("assets/css/app.css");

for (const [name, source] of [
  ["Code.gs", backend],
  ["api.js", api],
  ["app.js", app],
  ["config.js", config],
  ["sw.js", worker],
  ["planner-native.js", nativePlanner]
]) {
  try {
    new vm.Script(source, { filename: name });
    check(true, `${name}: sintassi JavaScript valida`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
}

const inlinePlannerScripts = [...planner.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
try {
  new vm.Script(inlinePlannerScripts.join("\n;\n"), { filename: "quotation-planner/index.html:inline" });
  check(inlinePlannerScripts.length > 0, "Quotation Planner: JavaScript inline valido");
} catch (error) {
  failures.push(`Quotation Planner inline: ${error.message}`);
}

for (const [name, source] of [["Code.gs", backend], ["api.js", api], ["app.js", app], ["planner-native.js", nativePlanner]]) {
  const names = [...source.matchAll(/(?:^|\n)\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map((match) => match[1]);
  const counts = names.reduce((result, functionName) => {
    result[functionName] = (result[functionName] || 0) + 1;
    return result;
  }, {});
  const duplicates = Object.entries(counts).filter(([, count]) => count > 1).map(([functionName]) => functionName);
  check(duplicates.length === 0, `${name}: nessuna funzione top-level duplicata`);
}

check(/SEEMAX_VERSION\s*=\s*"seemax-management-suite-2\.14\.3"/.test(backend), "Backend versione 2.14.3");
check(/version:\s*"2\.14\.3"/.test(config), "Frontend versione 2.14.3");
check(/seemax-management-v2-14-3/.test(worker), "Cache PWA versione 2.14.3");
check(/function\s+upgradeSeemaxV2143\s*\(/.test(backend), "Funzione upgradeSeemaxV2143 presente");
check(/ensureMessagePublicationFieldsV2143_\(\)/.test(backend), "Upgrade inizializza le sole chiavi di pubblicazione mancanti");
check(/IMPOSTAZIONI:\s*\["chiave",\s*"valore",\s*"note"\]/.test(backend), "IMPOSTAZIONI mantiene la struttura chiave/valore esistente");
check(/PATCH_NOTES:\s*\["chiave",\s*"valore"\]/.test(backend), "PATCH_NOTES mantiene la struttura chiave/valore esistente");
check(/PATCH_ITEMS:\s*\["emoji",\s*"title",\s*"text",\s*"attivo"\]/.test(backend), "PATCH_ITEMS non richiede nuove colonne");
check(/AGENTI:[\s\S]*?"welcome_seen_revision"[\s\S]*?"patch_seen_revision"/.test(backend), "Le revisioni viste usano le colonne AGENTI già presenti nel Foglio allegato");
check(/case "management_mark_message_seen"/.test(backend) && /function\s+managementMarkMessageSeen_/.test(backend), "Endpoint per registrare la visualizzazione per account presente");
check(/messageStateForUser_/.test(backend) && /data\.messageState/.test(backend), "Bootstrap restituisce lo stato messaggi dell’account corrente");

check(/class="admin-settings-tabs"/.test(app) && /function\s+settingsTabsMarkup/.test(app), "Navigazione a schede presente nelle Impostazioni Admin");
for (const label of ["Generali", "Pratiche", "Benvenuto", "Patch notes", "Sistema"]) {
  check(app.includes(`"${label}"`), `Scheda Admin “${label}” presente`);
}
check(/id="welcomeMessageForm"/.test(app) && /id="patchNotesForm"/.test(app), "Benvenuto e patch notes hanno editor separati");
check(/name="\$\{esc\(prefix\)\}_display_mode" value="ONCE"/.test(app) && /value="ALWAYS"/.test(app), "Ogni editor offre modalità Solo una volta e Sempre");
check(/value="republish"/.test(app) && /Salva e ripubblica/.test(app), "Comando Salva e ripubblica presente");
check(/section:\s*"WELCOME"/.test(app) && /section:\s*"PATCH_NOTES"/.test(app), "Le due comunicazioni vengono salvate in modo indipendente");
check(/MESSAGE_SEEN_STORAGE_PREFIX\s*=\s*"SEEMAX_MESSAGE_SEEN_V1_"/.test(app), "Memoria messaggi unica e versionata nel Management Suite");
check(/encodeURIComponent\(user\.username\s*\|\|\s*"anonymous"\)/.test(app), "Memoria Solo una volta distinta per username");
check(/normalizeMessageDisplayMode\(content\.displayMode\)\s*===\s*"ALWAYS"/.test(app), "Modalità Sempre ignora la memoria di visualizzazione");
check(/publicationKey/.test(app) && /markMessageSeen/.test(app), "Modalità Solo una volta usa la chiave di pubblicazione");
check(/messageSeenRevision/.test(app) && /welcome_seen_revision/.test(app) && /patch_seen_revision/.test(app), "Frontend confronta le revisioni viste salvate per account");
check(/async function markMessageSeen/.test(api) && /management_mark_message_seen/.test(api), "API sincronizza la visualizzazione con il Foglio AGENTI");
check(/data\.patchNotes\s*=\s*patchNotesContent_\(false(?:,\s*settings)?\)/.test(backend), "Patch notes caricate nella shell principale per tutti gli utenti");
check(/pendingWelcomeMessage/.test(app) && /pendingPatchNotesMessage/.test(app) && /showNextStartupMessage/.test(app), "Coda iniziale gestisce benvenuto e patch notes separatamente");

check(/welcome_display_mode/.test(backend) && /welcome_publication_key/.test(backend), "Backend salva modalità e pubblicazione del benvenuto");
check(/display_mode/.test(backend) && /publication_key/.test(backend), "Backend salva modalità e pubblicazione delle patch notes");
check(/var\s+section\s*=/.test(backend) && /updateWelcome/.test(backend) && /updatePatch/.test(backend), "Backend supporta salvataggi parziali per sezione");
check(/republish\s*\|\|\s*!existingWelcomeKey/.test(backend) && /republish\s*\|\|\s*!existingPatchKey/.test(backend), "Ripubblica genera una nuova chiave indipendente");
check(/admin_content_revision/.test(backend) && /CONFLICT_RECORD/.test(backend), "Editor comunicazioni protetto da revisioni concorrenti");
check(/SpreadsheetApp\.flush\(\);[\s\S]*?lock\.releaseLock\(\)/.test(backend), "Scritture consolidate prima del rilascio del lock multiutente");

check(/MESSAGE_SEEN_STORAGE_PREFIX\s*=\s*'SEEMAX_MESSAGE_SEEN_V1_'/.test(planner), "Quotation Planner usa la stessa memoria del Management Suite");
check(/patchNotesViewerUsername/.test(planner) && /encodeURIComponent\(patchNotesViewerUsername\(\)\)/.test(planner), "Quotation Planner distingue la visualizzazione per username");
check(/PATCH_NOTES\.displayMode/.test(planner) && /normalizePatchNotesMode/.test(planner), "Quotation Planner rispetta Solo una volta/Sempre");
check(/PATCH_NOTES\.publicationKey/.test(planner) && /publication_key/.test(planner), "Quotation Planner usa la chiave Ripubblica del database");
check(/if\(!force && !PATCH_NOTES\.enabled\) return/.test(planner), "Disattivazione patch notes rispettata dal Planner");
check(/patchNotes:nativeContext\.patchNotes/.test(planner), "Contesto Planner integrato riceve le patch notes correnti");
check(/patch_seen_revision/.test(planner) && /management_mark_message_seen/.test(planner), "Quotation Planner usa anche la revisione vista salvata nell’account");

for (const className of ["admin-settings-shell", "admin-settings-tab", "message-policy-grid", "message-mode-card", "publication-status", "message-editor-actions", "suite-patch-message"]) {
  check(css.includes(`.${className}`), `Stile responsive “${className}” presente`);
}
check(/@media\(max-width:820px\)/.test(css) && /overflow-x:auto/.test(css), "Schede Admin navigabili su smartphone");

check(/MUTATION_POST_GRACE_MS\s*=\s*700/.test(api), "Conferma mutazioni anticipata a 700 ms conservata");
check(/Promise\.race\(candidates\)/.test(api), "Risposta iframe e conferma stato restano in competizione");
check(/postMutation\("management_upsert"/.test(api), "Upsert principali restano POST idempotenti");
check(/setXFrameOptionsMode\(HtmlService\.XFrameOptionsMode\.ALLOWALL\)/.test(backend), "Risposta iframe compatibile con GitHub Pages");
check(/createTextFinder\(String\(keyValue\)\)/.test(backend), "Lookup puntuali su Google Fogli conservati");
check(/function\s+rebuildPracticeCountersV2140_/.test(backend), "Contatori pratica ottimizzati conservati");

// Test reale delle funzioni di memoria estratte dal frontend.
try {
  const start = app.indexOf('const MESSAGE_SEEN_STORAGE_PREFIX');
  const end = app.indexOf('function welcomeMessageMarkup', start);
  if (start < 0 || end < 0) throw new Error('Blocco funzioni messaggi non trovato');
  const storage = new Map();
  let currentUser = { username: 'agente.a' };
  const sandbox = {
    api: { getSession: () => currentUser, markMessageSeen: async () => ({ ok: true }) },
    state: { data: { settings: {}, adminContent: {}, patchNotes: {}, messageState: {} } },
    config: { version: '2.14.3' },
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, String(value)); }
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(app.slice(start, end), sandbox, { filename: 'app.js:message-policy-test' });
  const onceA = { enabled: true, displayMode: 'ONCE', publicationKey: 'pub-a', publicationRevision: 1 };
  check(sandbox.messageShouldDisplay('WELCOME', onceA) === true, 'Solo una volta: prima pubblicazione visibile');
  sandbox.markMessageSeen('WELCOME', onceA);
  check(sandbox.messageShouldDisplay('WELCOME', onceA) === false, 'Solo una volta: messaggio già visto non riaperto');
  check(sandbox.messageShouldDisplay('WELCOME', { ...onceA, publicationKey: 'pub-b', publicationRevision: 2 }) === true, 'Ripubblica: nuova revisione rende nuovamente visibile il messaggio');
  check(sandbox.messageShouldDisplay('WELCOME', { ...onceA, displayMode: 'ALWAYS' }) === true, 'Sempre: messaggio visibile anche dopo la memorizzazione');
  check(sandbox.messageShouldDisplay('WELCOME', { ...onceA, enabled: false }) === false, 'Messaggio disattivato non visualizzato');
  currentUser = { username: 'agente.b', welcome_seen_revision: 0 };
  sandbox.state.data.messageState = {};
  check(sandbox.messageShouldDisplay('WELCOME', onceA) === true, 'Solo una volta: memoria separata tra due agenti');
} catch (error) {
  failures.push(`Test politica messaggi frontend: ${error.stack || error.message}`);
}

// Test funzionale del salvataggio parziale e della ripubblicazione backend.
try {
  const sandbox = { console };
  vm.createContext(sandbox);
  vm.runInContext(backend, sandbox, { filename: 'Code.gs:admin-content-v2143-test' });
  let settings = {
    admin_content_revision: 4,
    welcome_enabled: 'SI',
    welcome_display_mode: 'ONCE',
    welcome_publication_key: 'welcome-old',
    welcome_published_at: '2026-08-01T10:00:00.000Z',
    welcome_published_by: 'admin.old',
    welcome_kicker: 'Vecchio kicker',
    welcome_title: 'Vecchio titolo',
    welcome_message: 'Vecchio messaggio',
    welcome_primary_button: 'Continua'
  };
  let notes = {
    enabled: 'SI',
    display_mode: 'ONCE',
    publication_key: 'patch-old',
    published_at: '2026-08-01T10:00:00.000Z',
    published_by: 'admin.old',
    version: '2.14.2',
    label: 'Label precedente',
    title: 'Patch precedente',
    intro: 'Intro precedente',
    footer: 'Footer precedente'
  };
  let items = [{ emoji: '✨', title: 'Voce precedente', text: 'Testo', attivo: 'SI' }];
  let patchWrites = 0;
  sandbox.getSettings_ = () => ({ ...settings });
  sandbox.getKeyValueSheet_ = () => ({ ...notes });
  sandbox.upsertSettingsBatch_ = (values) => { settings = { ...settings, ...values }; return { ...settings }; };
  sandbox.writePatchContentBatch_ = (values, nextItems) => { notes = { ...values }; items = nextItems.map((item) => ({ ...item })); patchWrites += 1; };
  sandbox.log_ = () => {};
  sandbox.adminContent_ = () => ({
    revision: Number(settings.admin_content_revision || 0),
    welcome: {
      enabled: settings.welcome_enabled,
      display_mode: settings.welcome_display_mode,
      publication_key: settings.welcome_publication_key,
      published_at: settings.welcome_published_at,
      published_by: settings.welcome_published_by,
      kicker: settings.welcome_kicker,
      title: settings.welcome_title,
      message: settings.welcome_message,
      primary_button: settings.welcome_primary_button
    },
    patchNotes: { ...notes, items: items.map((item) => ({ ...item })) }
  });

  sandbox.managementSaveAdminContentLocked_({ username: 'admin', ruolo: 'ADMIN' }, {
    expected_revision: 4,
    section: 'WELCOME',
    republish: 'NO',
    welcome: { enabled: 'SI', display_mode: 'ONCE', kicker: 'Nuovo kicker', title: 'Nuovo titolo', message: 'Nuovo messaggio', primary_button: 'Apri tutorial' }
  });
  check(settings.admin_content_revision === 5 && settings.welcome_title === 'Nuovo titolo', 'Salvataggio Benvenuto incrementa la revisione e aggiorna il testo');
  check(settings.welcome_publication_key === 'welcome-old', 'Salva Benvenuto conserva la chiave se non si ripubblica');
  check(patchWrites === 0 && notes.title === 'Patch precedente', 'Salva Benvenuto non modifica le patch notes');

  sandbox.managementSaveAdminContentLocked_({ username: 'admin', ruolo: 'ADMIN' }, {
    expected_revision: 5,
    section: 'PATCH_NOTES',
    republish: 'NO',
    patchNotes: { enabled: 'SI', display_mode: 'ALWAYS', version: '2.14.3', label: 'Label nuova', title: 'Patch nuova', intro: 'Intro nuova', footer: 'Footer nuovo', items: [{ emoji: '🚀', title: 'Novità', text: 'Dettaglio', attivo: 'SI' }] }
  });
  check(settings.admin_content_revision === 6 && notes.title === 'Patch nuova', 'Salvataggio Patch notes incrementa la revisione e aggiorna il contenuto');
  check(notes.publication_key === 'patch-old', 'Salva Patch notes conserva la chiave se non si ripubblica');
  check(settings.welcome_title === 'Nuovo titolo', 'Salva Patch notes non modifica il Benvenuto');

  sandbox.managementSaveAdminContentLocked_({ username: 'admin', ruolo: 'ADMIN' }, {
    expected_revision: 6,
    section: 'PATCH_NOTES',
    republish: 'SI',
    patchNotes: { ...notes, items }
  });
  check(settings.admin_content_revision === 7 && notes.publication_key !== 'patch-old', 'Ripubblica Patch notes genera una nuova chiave');
  check(notes.published_by === 'admin' && !!notes.published_at, 'Ripubblica Patch notes registra autore e data');

  const oldWelcomeKey = settings.welcome_publication_key;
  sandbox.managementSaveAdminContentLocked_({ username: 'admin', ruolo: 'ADMIN' }, {
    expected_revision: 7,
    section: 'WELCOME',
    republish: 'SI',
    welcome: {
      enabled: settings.welcome_enabled,
      display_mode: 'ALWAYS',
      kicker: settings.welcome_kicker,
      title: settings.welcome_title,
      message: settings.welcome_message,
      primary_button: settings.welcome_primary_button
    }
  });
  check(settings.admin_content_revision === 8 && settings.welcome_publication_key !== oldWelcomeKey, 'Ripubblica Benvenuto genera una chiave indipendente');
  check(settings.welcome_display_mode === 'ALWAYS', 'Modalità Sempre del Benvenuto salvata dal backend');

  let conflict = false;
  try {
    sandbox.managementSaveAdminContentLocked_({ username: 'admin', ruolo: 'ADMIN' }, { expected_revision: 7, section: 'WELCOME' });
  } catch (error) {
    conflict = String(error.message || error).includes('CONFLICT_RECORD');
  }
  check(conflict, 'Salvataggi Admin concorrenti vengono fermati come conflitto');
} catch (error) {
  failures.push(`Test backend comunicazioni 2.14.3: ${error.stack || error.message}`);
}


// Test funzionale della memoria durevole per account già predisposta nel Foglio AGENTI.
try {
  const sandbox = { console };
  vm.createContext(sandbox);
  vm.runInContext(backend, sandbox, { filename: 'Code.gs:message-seen-v2143-test' });
  let settings = {
    welcome_message_revision: 3,
    welcome_publication_key: 'welcome-pub-3',
    patch_notes_revision: 5
  };
  let notes = {
    publication_revision: 5,
    publication_key: 'patch-pub-5',
    version: '2.14.3'
  };
  let user = {
    username: 'agente.test',
    nome_visualizzato: 'Agente Test',
    ruolo: 'AGENTE',
    stato: 'ATTIVO',
    welcome_seen_revision: 0,
    patch_seen_revision: 0
  };
  sandbox.authenticate_ = () => ({ ...user });
  sandbox.withMutationLock_ = (callback) => callback();
  sandbox.findRowObject_ = () => ({ ...user });
  sandbox.getSettings_ = () => ({ ...settings });
  sandbox.getKeyValueSheet_ = () => ({ ...notes });
  sandbox.upsertObject_ = (_sheet, _keyField, _keyValue, update) => {
    user = { ...user, ...update };
    return { ...user };
  };

  const welcomeResult = sandbox.managementMarkMessageSeen_({
    agent_username: 'agente.test', agent_key: 'x', message_type: 'WELCOME',
    publication_key: 'welcome-pub-3', publication_revision: 3
  });
  check(welcomeResult.ok && !welcomeResult.stale && user.welcome_seen_revision === 3, 'Visualizzazione Benvenuto registrata nella riga AGENTI');
  check(user.patch_seen_revision === 0, 'Visualizzazione Benvenuto non modifica lo stato Patch notes');

  const staleResult = sandbox.managementMarkMessageSeen_({
    agent_username: 'agente.test', agent_key: 'x', message_type: 'WELCOME',
    publication_key: 'welcome-pub-2', publication_revision: 2
  });
  check(staleResult.stale === true && user.welcome_seen_revision === 3, 'Una finestra vecchia non marca come vista una ripubblicazione nuova');

  const patchResult = sandbox.managementMarkMessageSeen_({
    agent_username: 'agente.test', agent_key: 'x', message_type: 'PATCH_NOTES',
    publication_key: 'patch-pub-5', publication_revision: 5
  });
  check(patchResult.ok && !patchResult.stale && user.patch_seen_revision === 5, 'Visualizzazione Patch notes registrata nella riga AGENTI');
  const repeated = sandbox.managementMarkMessageSeen_({
    agent_username: 'agente.test', agent_key: 'x', message_type: 'PATCH_NOTES',
    publication_key: 'patch-pub-5', publication_revision: 5
  });
  check(repeated.ok && user.patch_seen_revision === 5, 'Registrazione visualizzazione idempotente');
} catch (error) {
  failures.push(`Test memoria messaggi per account: ${error.stack || error.message}`);
}


// Test funzionale della migrazione dalle chiavi rilevate nel Foglio Excel fornito.
try {
  const sandbox = { console };
  vm.createContext(sandbox);
  vm.runInContext(backend, sandbox, { filename: 'Code.gs:migration-v2143-test' });
  let settings = {
    welcome_message_enabled: 'SI',
    welcome_message_frequency: 'ALWAYS',
    welcome_message_revision: 2,
    welcome_enabled: 'SI',
    welcome_title: 'Titolo personalizzato esistente',
    welcome_message: 'Testo personalizzato esistente',
    welcome_primary_button: 'Continua',
    patch_notes_enabled: 'SI',
    patch_notes_frequency: 'ONCE',
    patch_notes_revision: 2,
    admin_content_revision: 1
  };
  let notes = {
    version: '2.14.2-personalizzata',
    label: 'Release personalizzata',
    title: 'Titolo patch esistente',
    intro: 'Introduzione esistente',
    footer: 'Testo finale esistente'
  };
  const items = [{ emoji: '✨', title: 'Voce esistente', text: 'Dettaglio', attivo: 'SI' }];
  sandbox.getSettings_ = () => ({ ...settings });
  sandbox.upsertSettingsBatch_ = (values) => { settings = { ...settings, ...values }; return { ...settings }; };
  sandbox.getKeyValueSheet_ = () => ({ ...notes });
  sandbox.upsertObject_ = (sheetName, _keyField, keyValue, record) => {
    if (sheetName === 'PATCH_NOTES') notes = { ...notes, [keyValue]: record.valore };
    return record;
  };
  sandbox.rowsToObjects_ = () => items.map((item) => ({ ...item }));
  sandbox.sheet_ = (name) => ({ name });
  sandbox.invalidateTable_ = () => {};

  sandbox.migrateLegacyMessageSettingsV2143_();
  sandbox.ensureMessagePublicationFieldsV2143_();

  check(settings.welcome_display_mode === 'ALWAYS', 'Migrazione Foglio: frequenza Benvenuto legacy convertita in ALWAYS');
  check(settings.welcome_publication_key === 'welcome-legacy-2', 'Migrazione Foglio: revisione Benvenuto 2 diventa chiave stabile');
  check(settings.welcome_title === 'Titolo personalizzato esistente', 'Migrazione Foglio: testo Benvenuto esistente preservato');
  check(notes.display_mode === 'ONCE' && Number(notes.publication_revision) === 2, 'Migrazione Foglio: Patch notes ONCE e revisione 2 preservate');
  check(notes.publication_key === 'patch-legacy-2', 'Migrazione Foglio: chiave Patch notes derivata dalla revisione esistente');
  check(notes.title === 'Titolo patch esistente', 'Migrazione Foglio: contenuto PATCH_NOTES esistente preservato');
  check(notes.published_at !== undefined && notes.published_by !== undefined, 'Migrazione Foglio: campi tecnici mancanti inizializzati');
} catch (error) {
  failures.push(`Test migrazione Foglio 2.14.3: ${error.stack || error.message}`);
}

if (failures.length) {
  process.stderr.write(`\nVerifica fallita (${failures.length}):\n- ${failures.join("\n- ")}\n`);
  process.exit(1);
}

process.stdout.write("\nVerifica statica e funzionale 2.14.3 completata senza errori.\n");
