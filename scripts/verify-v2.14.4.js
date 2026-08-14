const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const files = {
  app: read('assets/js/app.js'),
  api: read('assets/js/api.js'),
  config: read('assets/js/config.js'),
  seed: read('assets/js/seed.js'),
  css: read('assets/css/app.css'),
  backend: read('apps-script/Code.gs'),
  planner: read('quotation-planner/index.html'),
  sw: read('sw.js'),
  readme: read('README.md')
};

let checks = 0;
function check(condition, message) {
  checks += 1;
  if (!condition) throw new Error(`VERIFICA FALLITA [${checks}]: ${message}`);
}
function equal(actual, expected, message) {
  check(JSON.stringify(actual) === JSON.stringify(expected), `${message}\nAtteso: ${JSON.stringify(expected)}\nOttenuto: ${JSON.stringify(actual)}`);
}
function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

// Versioni e sintassi dichiarativa.
check(/version:\s*["']2\.14\.4["']/.test(files.config), 'config frontend 2.14.4');
check(/SEEMAX_VERSION\s*=\s*["']seemax-management-suite-2\.14\.4["']/.test(files.backend), 'backend 2.14.4');
check(/seemax-management-v2-14-4/.test(files.sw), 'cache PWA 2.14.4');
check(/upgradeSeemaxV2144\s*\(/.test(files.backend), 'funzione upgradeSeemaxV2144 presente');
check(/prepareCommunicationsV2144_\s*\(/.test(files.backend), 'migrazione comunicazioni 2.14.4 presente');
check(/auditCommunicationsV2144\s*\(/.test(files.backend), 'audit comunicazioni presente');
check(/setupSeemaxDatabase\(\).*upgradeSeemaxV2144/s.test(files.backend.slice(0, 1000)), 'istruzioni distinguono nuovo database e upgrade');

// Un solo Benvenuto: quello ricco della Beta.
check(/function\s+betaWelcomeMessageMarkup\s*\(/.test(files.app), 'markup Benvenuto Beta dinamico presente');
check(/function\s+showWelcomeMessage\s*\(/.test(files.app), 'funzione di apertura Benvenuto presente');
check(/showWelcomeMessage[\s\S]*betaWelcomeMessageMarkup/.test(files.app), 'apertura usa il markup ricco Beta');
check(/previewWelcomeMessage[\s\S]*betaWelcomeMessageMarkup/.test(files.app), 'anteprima usa lo stesso markup ricco');
check(!/function\s+showBetaWelcome\s*\(/.test(files.app), 'vecchia apertura statica showBetaWelcome rimossa');
check(!/pendingBetaWelcome/.test(files.app), 'seconda coda Benvenuto rimossa');
check(!/tutorial-welcome/.test(files.app), 'vecchio popup generico tutorial-welcome rimosso dal frontend');
check(!/\.tutorial-welcome/.test(files.css), 'stili del popup generico rimossi');
check(count(files.app, 'pendingWelcomeMessage = messageShouldDisplay("WELCOME"') === 1, 'una sola pianificazione del Benvenuto');
check(/Benvenuto Beta/.test(files.app), 'tab Benvenuto Beta visibile');
check(/Modifica la finestra grafica “Benvenuto nella Beta”/.test(files.app), 'editor descrive la finestra corretta');
check(/Non viene più creato un secondo messaggio di benvenuto/.test(files.app), 'editor esplicita la rimozione del duplicato');

// Tab organizzative.
for (const tab of ['Generali', 'Pratiche', 'Benvenuto Beta', 'Patch notes', 'Sistema']) {
  check(files.app.includes(`"${tab}"`), `tab ${tab} presente`);
}
check(/admin-settings-shell/.test(files.app) && /admin-settings-tabs/.test(files.css), 'layout schede Admin presente');
check(/welcome-editor-sections/.test(files.app) && /welcome-editor-section/.test(files.css), 'editor Benvenuto organizzato per sezioni');
check(/welcome-editor-two-columns/.test(files.app) && /welcome-editor-card/.test(files.css), 'schede informative organizzate a colonne');

// Campi completi del messaggio ricco.
const welcomeFormFields = [
  'welcome_modal_title', 'welcome_modal_subtitle', 'welcome_badge', 'welcome_title', 'welcome_message',
  'welcome_feature_one_title', 'welcome_feature_one_message', 'welcome_feature_two_title', 'welcome_feature_two_message',
  'welcome_warning_title', 'welcome_warning_message', 'welcome_feedback_message', 'welcome_primary_button'
];
for (const field of welcomeFormFields) check(files.app.includes(`name="${field}"`), `campo editor ${field}`);
for (const key of [
  'welcome_message_modal_title', 'welcome_message_modal_subtitle', 'welcome_message_badge', 'welcome_message_title',
  'welcome_message_body', 'welcome_message_feature_1_title', 'welcome_message_feature_1_body',
  'welcome_message_feature_2_title', 'welcome_message_feature_2_body', 'welcome_message_warning_title',
  'welcome_message_warning_body', 'welcome_message_feedback_body', 'welcome_message_button'
]) {
  check(files.backend.includes(key), `chiave canonica backend ${key}`);
  check(files.seed.includes(key), `chiave canonica demo ${key}`);
}

// Politiche Una volta / Sempre e ripubblicazione indipendente.
check(/Solo una volta/.test(files.app) && /Sempre/.test(files.app), 'scelte Solo una volta e Sempre presenti');
check(/value="ONCE"/.test(files.app) && /value="ALWAYS"/.test(files.app), 'valori ONCE e ALWAYS presenti');
check(/Salva e ripubblica/.test(files.app), 'azione ripubblica presente');
check(/welcome_seen_revision/.test(files.app) && /patch_seen_revision/.test(files.app), 'frontend distingue le revisioni viste');
check(/welcome_seen_revision/.test(files.backend) && /patch_seen_revision/.test(files.backend), 'backend registra le revisioni per account');
check(/managementMarkMessageSeenLocked_/.test(files.backend), 'endpoint registrazione visualizzazione presente');
check(/requestedKey[\s\S]*publication\.publication_key/.test(files.backend), 'finestra obsoleta non marca nuova pubblicazione');
check(/if \(alreadySeen < publication\.revision\)/.test(files.backend), 'registrazione visualizzazione idempotente');
check(/updateWelcome[\s\S]*updatePatch/.test(files.backend), 'salvataggio distingue le due sezioni');
check(/republish \? currentWelcomeRevision \+ 1 : currentWelcomeRevision/.test(files.backend), 'ripubblicazione Benvenuto incrementa solo la propria revisione');
check(/republish \? currentPatchRevision \+ 1 : currentPatchRevision/.test(files.backend), 'ripubblicazione patch incrementa solo la propria revisione');

// Sorgenti canoniche e pulizia.
check(/PATCH_NOTES è l'unica sorgente runtime/.test(files.backend), 'backend dichiara PATCH_NOTES come sorgente runtime');
check(/PATCH_NOTES e PATCH_ITEMS diventano le sole sorgenti/.test(files.backend), 'migrazione canonica patch documentata nel codice');
check(!/function\s+updatePatchNotesV\d+_\s*\(/.test(files.backend), 'funzioni storiche hardcoded delle patch rimosse');
check(!/function\s+seedPatchNotes_\s*\(/.test(files.backend), 'seed hardcoded patch rimosso');
check(!/beta_test_attiva\s*:/.test(files.seed), 'flag demo duplicato beta_test_attiva rimosso dal seed');
check(!/enabled\s*:\s*true[\s\S]*unlockAllTrophies/.test(files.config), 'config non attiva più un popup Beta separato');
check(/betaTest:\s*\{\s*unlockAllTrophies/.test(files.config), 'fallback trofei Beta conservato');
check(/"beta_test_attiva"/.test(files.backend), 'migrazione elimina beta_test_attiva dal Foglio');
for (const obsolete of [
  'welcome_enabled', 'welcome_kicker', 'welcome_title', 'welcome_message', 'welcome_primary_button',
  'patch_notes_enabled', 'patch_notes_frequency', 'patch_notes_revision', 'patch_notes_label',
  'patch_notes_title', 'patch_notes_intro', 'patch_notes_items', 'patch_notes_footer', 'versione_patch_notes'
]) {
  check(files.backend.includes(`"${obsolete}"`), `chiave obsoleta ${obsolete} inclusa nella pulizia/migrazione`);
}
check(/function\s+deleteSettingKeysV2144_/.test(files.backend), 'rimozione fisica righe IMPOSTAZIONI presente');
check(/obsolete_settings_still_present/.test(files.backend), 'audit rileva eventuali chiavi obsolete residue');
check(/items:\s*\[\]/.test(files.planner), 'Quotation Planner non contiene voci patch hardcoded');
check(/patchNotesSource\s*=\s*['"]none['"]/.test(files.planner), 'Planner parte senza sorgente locale patch');
check(/patchNotesSource\s*!==\s*['"]database['"]/.test(files.planner), 'Planner mostra patch solo dal database');
check(!/patch_notes_enabled/.test(files.planner), 'Planner non legge più chiavi patch duplicate da IMPOSTAZIONI');
check(!/versione_patch_notes/.test(files.planner), 'Planner non usa più il fallback runtime versione_patch_notes');
check(/enabled:\s*["']NO["']/.test(files.api), 'demo API non pubblica patch hardcoded');

// Concorrenza e trasporto preservati.
const flushIndex = files.backend.indexOf('SpreadsheetApp.flush();');
const releaseIndex = files.backend.indexOf('lock.releaseLock();', flushIndex);
check(flushIndex >= 0 && releaseIndex > flushIndex, 'flush prima del rilascio lock');
check(/getScriptLock\(\)/.test(files.backend), 'ScriptLock presente');
check(/record_version/.test(files.backend) && /request_token/.test(files.backend), 'versionamento e idempotenza conservati');
check(/MUTATION_POST_GRACE_MS\s*=\s*700/.test(files.api), 'race trasporto 700 ms conservata');
check(/status_poll_race/.test(files.api) && /post_message_late/.test(files.api), 'diagnostica trasporto conservata');
check(/management_mutation_status/.test(files.api), 'conferma stato mutazione conservata');

// Carica il backend reale in VM per collaudare migrazione e salvataggi.
const sandbox = { console, Date, JSON, Math, Error, Object, Array, String, Number, Boolean, RegExp, isNaN, parseInt, parseFloat };
vm.createContext(sandbox);
vm.runInContext(files.backend, sandbox, { filename: 'Code.gs' });

// Migrazione basata sullo scenario reale 2.14.3: valori corretti + popup duplicato.
let migrationSettings = {
  versione_config: 'seemax-management-suite-2.14.3',
  beta_test_attiva: 'SI',
  beta_sblocca_trofei: 'SI',
  welcome_message_enabled: 'SI',
  welcome_message_frequency: 'ALWAYS',
  welcome_message_revision: 2,
  welcome_message_title: 'BENVENUTO NELLA FASE DI TEST 🔧',
  welcome_message_body: 'TESTO CORRETTO DEL BENVENUTO BETA',
  welcome_message_button: '🚀 Inizia a esplorare',
  patch_notes_enabled: 'SI',
  patch_notes_frequency: 'ONCE',
  patch_notes_revision: 2,
  patch_notes_title: 'VECCHIO TITOLO DUPLICATO',
  patch_notes_items: '📣|Voce legacy|Testo legacy',
  welcome_enabled: 'SI',
  welcome_kicker: 'SOVRATITOLO DUPLICATO',
  welcome_title: 'TITOLO DEL SECONDO POPUP',
  welcome_message: 'TESTO DEL SECONDO POPUP',
  welcome_primary_button: 'PULSANTE DEL SECONDO POPUP',
  welcome_display_mode: 'ONCE',
  welcome_publication_key: 'welcome-legacy-2',
  admin_content_revision: 8
};
let migrationNotes = {
  version: 'Seemax Management Suite 14.0.5',
  label: 'SEEMAX MANAGEMENT SUITE',
  title: 'PATCH NOTES TITLE',
  intro: 'Introduction',
  footer: 'Final Text',
  enabled: 'SI',
  display_mode: 'ONCE',
  publication_key: 'patch-legacy-2',
  publication_revision: 2
};
let migrationItems = [
  { emoji: '👤', title: 'PATCH NOTE 1', text: 'Testo 1', attivo: 'SI' },
  { emoji: '🔤', title: 'PATCH NOTE 2', text: 'Testo 2', attivo: 'SI' }
];
let capturedSettings = null;
let capturedPatch = null;
let removedSettings = [];
sandbox.getSettings_ = () => clone(migrationSettings);
sandbox.upsertSettingsBatch_ = (values) => {
  capturedSettings = { ...(capturedSettings || {}), ...clone(values) };
  migrationSettings = { ...migrationSettings, ...clone(values) };
  return clone(migrationSettings);
};
sandbox.getKeyValueSheet_ = (name) => name === 'PATCH_NOTES' ? clone(migrationNotes) : {};
sandbox.sheet_ = (name) => ({ name });
sandbox.rowsToObjects_ = (sheet) => sheet && sheet.name === 'PATCH_ITEMS' ? clone(migrationItems) : [];
sandbox.writePatchContentBatch_ = (notes, items) => {
  capturedPatch = { notes: clone(notes), items: clone(items) };
  migrationNotes = clone(notes);
  migrationItems = clone(items);
};
sandbox.deleteSettingKeysV2144_ = (keys) => {
  removedSettings = clone(keys);
  const removed = [];
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(migrationSettings, key)) removed.push(key);
    delete migrationSettings[key];
  }
  return removed;
};
sandbox.resetRequestDataCaches_ = () => {};
const migrationResult = sandbox.prepareCommunicationsV2144_();

equal(capturedSettings.welcome_message_title, 'BENVENUTO NELLA FASE DI TEST 🔧', 'migrazione conserva il titolo del Benvenuto originario');
equal(capturedSettings.welcome_message_body, 'TESTO CORRETTO DEL BENVENUTO BETA', 'migrazione conserva il corpo del Benvenuto originario');
equal(capturedSettings.welcome_message_button, '🚀 Inizia a esplorare', 'migrazione conserva il pulsante originario');
equal(capturedSettings.welcome_message_frequency, 'ALWAYS', 'modalità originaria prevale sul popup duplicato');
equal(capturedSettings.welcome_message_publication_key, 'welcome-legacy-2', 'chiave pubblicazione 2.14.3 viene preservata');
check(capturedSettings.welcome_message_modal_title === 'Benvenuto nella Beta', 'testata ricca inizializzata');
check(capturedSettings.welcome_message_feature_1_title === 'Esplora il tuo nuovo spazio di lavoro', 'prima scheda ricca inizializzata');
check(capturedSettings.welcome_message_warning_title === 'Ambiente di prova', 'riquadro avviso inizializzato');
equal(capturedPatch.notes.title, 'PATCH NOTES TITLE', 'PATCH_NOTES prevale sulle chiavi duplicate IMPOSTAZIONI');
equal(capturedPatch.items.map((item) => item.title), ['PATCH NOTE 1', 'PATCH NOTE 2'], 'PATCH_ITEMS prevale sul testo legacy');
check(removedSettings.includes('welcome_title') && removedSettings.includes('patch_notes_title') && removedSettings.includes('beta_test_attiva'), 'chiavi duplicate programmate per la rimozione');
check(!removedSettings.includes('beta_sblocca_trofei'), 'impostazione trofei non viene rimossa');
check(!Object.prototype.hasOwnProperty.call(migrationSettings, 'welcome_title'), 'titolo del secondo popup eliminato');
check(!Object.prototype.hasOwnProperty.call(migrationSettings, 'patch_notes_title'), 'duplicato patch in IMPOSTAZIONI eliminato');
check(migrationSettings.beta_sblocca_trofei === 'SI', 'trofei Beta conservati');
check(migrationResult.welcome_revision === 2 && migrationResult.patch_revision === 2, 'revisioni migrazione corrette');

// Fallback legacy: usato solo quando i fogli canonici sono vuoti.
let fallbackSettings = {
  welcome_title: 'Solo titolo generico disponibile',
  welcome_message: 'Solo testo generico disponibile',
  welcome_primary_button: 'Continua',
  patch_notes_enabled: 'SI',
  patch_notes_frequency: 'ALWAYS',
  patch_notes_revision: 4,
  patch_notes_title: 'Patch legacy',
  patch_notes_items: '✨|Prima|Testo prima\n✅|Seconda|Testo seconda'
};
let fallbackPatch = null;
sandbox.getSettings_ = () => clone(fallbackSettings);
sandbox.upsertSettingsBatch_ = (values) => { fallbackSettings = { ...fallbackSettings, ...clone(values) }; return clone(fallbackSettings); };
sandbox.getKeyValueSheet_ = () => ({});
sandbox.rowsToObjects_ = () => [];
sandbox.writePatchContentBatch_ = (notes, items) => { fallbackPatch = { notes: clone(notes), items: clone(items) }; };
sandbox.deleteSettingKeysV2144_ = () => [];
sandbox.prepareCommunicationsV2144_();
equal(fallbackSettings.welcome_message_title, 'Solo titolo generico disponibile', 'fallback importa il secondo popup solo se il Benvenuto originario manca');
equal(fallbackPatch.notes.title, 'Patch legacy', 'fallback importa intestazione patch legacy se foglio canonico vuoto');
equal(fallbackPatch.items.length, 2, 'fallback converte le righe patch legacy');
equal(fallbackPatch.notes.display_mode, 'ALWAYS', 'fallback conserva modalità patch legacy');

// Salvataggio e ripubblicazione indipendenti usando le funzioni backend reali.
let runtimeSettings = {
  admin_content_revision: 5,
  welcome_message_enabled: 'SI',
  welcome_message_frequency: 'ONCE',
  welcome_message_publication_key: 'welcome-old',
  welcome_message_revision: 2,
  welcome_message_published_at: '2026-01-01T00:00:00.000Z',
  welcome_message_published_by: 'admin.old',
  welcome_message_title: 'Titolo iniziale',
  welcome_message_body: 'Corpo iniziale',
  welcome_message_button: 'Continua'
};
let runtimeNotes = {
  enabled: 'SI', display_mode: 'ONCE', publication_key: 'patch-old', publication_revision: 7,
  published_at: '2026-01-02T00:00:00.000Z', published_by: 'admin.old', version: '7',
  label: 'SEEMAX', title: 'Patch iniziale', intro: '', footer: ''
};
let runtimeItems = [{ emoji: '✨', title: 'Uno', text: 'Testo', attivo: 'SI' }];
let uidCounter = 0;
sandbox.getSettings_ = () => clone(runtimeSettings);
sandbox.upsertSettingsBatch_ = (values) => { runtimeSettings = { ...runtimeSettings, ...clone(values) }; return clone(runtimeSettings); };
sandbox.getKeyValueSheet_ = () => clone(runtimeNotes);
sandbox.sheet_ = (name) => ({ name });
sandbox.rowsToObjects_ = (sheet) => sheet && sheet.name === 'PATCH_ITEMS' ? clone(runtimeItems) : [];
sandbox.writePatchContentBatch_ = (notes, items) => { runtimeNotes = clone(notes); runtimeItems = clone(items); };
sandbox.uid_ = (prefix) => `${prefix}-test-${++uidCounter}`;
sandbox.log_ = () => {};

let saved = sandbox.managementSaveAdminContentLocked_({ username: 'admin.test' }, {
  expected_revision: 5, section: 'WELCOME', republish: 'NO',
  welcome: { enabled: 'SI', display_mode: 'ONCE', title: 'Titolo modificato', message: 'Nuovo corpo', primary_button: 'Vai' }
});
check(saved.ok === true, 'salvataggio Benvenuto riuscito');
equal(runtimeSettings.admin_content_revision, 6, 'revisione editor incrementata');
equal(runtimeSettings.welcome_message_publication_key, 'welcome-old', 'Salva non cambia la pubblicazione Benvenuto');
equal(runtimeSettings.welcome_message_revision, 2, 'Salva non incrementa la revisione pubblica Benvenuto');
equal(runtimeNotes.publication_key, 'patch-old', 'salvataggio Benvenuto non modifica patch');
equal(runtimeNotes.publication_revision, 7, 'salvataggio Benvenuto non incrementa patch');
equal(runtimeSettings.welcome_message_title, 'Titolo modificato', 'testo Benvenuto aggiornato');

saved = sandbox.managementSaveAdminContentLocked_({ username: 'admin.test' }, {
  expected_revision: 6, section: 'WELCOME', republish: 'SI',
  welcome: { enabled: 'SI', display_mode: 'ALWAYS', title: 'Titolo ripubblicato', message: 'Corpo ripubblicato', primary_button: 'Apri' }
});
equal(runtimeSettings.admin_content_revision, 7, 'revisione editor dopo ripubblicazione Benvenuto');
equal(runtimeSettings.welcome_message_revision, 3, 'ripubblicazione incrementa revisione Benvenuto');
check(runtimeSettings.welcome_message_publication_key !== 'welcome-old', 'ripubblicazione cambia chiave Benvenuto');
equal(runtimeNotes.publication_revision, 7, 'ripubblicazione Benvenuto lascia invariata revisione patch');
equal(runtimeNotes.publication_key, 'patch-old', 'ripubblicazione Benvenuto lascia invariata chiave patch');

saved = sandbox.managementSaveAdminContentLocked_({ username: 'admin.test' }, {
  expected_revision: 7, section: 'PATCH_NOTES', republish: 'NO',
  patchNotes: { enabled: 'SI', display_mode: 'ONCE', version: '8', label: 'SEEMAX', title: 'Patch modificata', intro: 'Intro', footer: 'Fine', items: runtimeItems }
});
equal(runtimeSettings.admin_content_revision, 8, 'revisione editor dopo salvataggio patch');
equal(runtimeNotes.publication_revision, 7, 'Salva patch non incrementa revisione pubblica');
equal(runtimeNotes.publication_key, 'patch-old', 'Salva patch non cambia chiave pubblica');
equal(runtimeSettings.welcome_message_revision, 3, 'Salva patch non modifica revisione Benvenuto');
equal(runtimeNotes.title, 'Patch modificata', 'contenuto patch aggiornato');

saved = sandbox.managementSaveAdminContentLocked_({ username: 'admin.test' }, {
  expected_revision: 8, section: 'PATCH_NOTES', republish: 'SI',
  patchNotes: { enabled: 'SI', display_mode: 'ALWAYS', version: '9', label: 'SEEMAX', title: 'Patch ripubblicata', intro: '', footer: '', items: runtimeItems }
});
equal(runtimeSettings.admin_content_revision, 9, 'revisione editor dopo ripubblicazione patch');
equal(runtimeNotes.publication_revision, 8, 'ripubblicazione incrementa revisione patch');
check(runtimeNotes.publication_key !== 'patch-old', 'ripubblicazione cambia chiave patch');
equal(runtimeSettings.welcome_message_revision, 3, 'ripubblicazione patch non modifica revisione Benvenuto');

let conflictDetected = false;
try {
  sandbox.managementSaveAdminContentLocked_({ username: 'admin.test' }, {
    expected_revision: 8, section: 'WELCOME', republish: 'NO', welcome: { title: 'Obsoleto' }
  });
} catch (error) {
  conflictDetected = /CONFLICT_RECORD/.test(String(error.message || error));
}
check(conflictDetected, 'conflitto tra due amministratori rilevato');

// Registrazione per account e protezione da finestra obsoleta.
let runtimeUser = { username: 'agente.test', welcome_seen_revision: 1, patch_seen_revision: 2 };
sandbox.findRowObject_ = () => clone(runtimeUser);
sandbox.upsertObject_ = (sheetName, keyField, keyValue, update) => { runtimeUser = { ...runtimeUser, ...clone(update) }; return clone(runtimeUser); };
sandbox.getSettings_ = () => ({ welcome_message_revision: 3, welcome_message_publication_key: 'welcome-current' });
sandbox.getKeyValueSheet_ = () => ({ publication_revision: 8, publication_key: runtimeNotes.publication_key, version: '9' });
let seen = sandbox.managementMarkMessageSeenLocked_(runtimeUser, {
  message_type: 'WELCOME', publication_revision: 2, publication_key: 'welcome-old-window'
});
check(seen.stale === true, 'finestra Benvenuto obsoleta ignorata');
equal(runtimeUser.welcome_seen_revision, 1, 'finestra obsoleta non aggiorna la revisione vista');
seen = sandbox.managementMarkMessageSeenLocked_(runtimeUser, {
  message_type: 'WELCOME', publication_revision: 3, publication_key: 'welcome-current'
});
check(seen.stale === false, 'pubblicazione Benvenuto corrente accettata');
equal(runtimeUser.welcome_seen_revision, 3, 'Benvenuto visto registrato per account');
seen = sandbox.managementMarkMessageSeenLocked_(runtimeUser, {
  message_type: 'WELCOME', publication_revision: 3, publication_key: 'welcome-current'
});
equal(runtimeUser.welcome_seen_revision, 3, 'seconda registrazione Benvenuto idempotente');

// Sicurezza rendering: testo editabile sempre sottoposto a escaping.
check(/formatCommunicationText\(welcome\.message\)/.test(files.app), 'testo principale passa dal formatter sicuro');
check(/function\s+formatCommunicationText[\s\S]*esc\(/.test(files.app), 'formatter applica escaping HTML');
check(/esc\(patch\.title/.test(files.app) && /esc\(item\.text/.test(files.app), 'patch notes sottoposte a escaping HTML');

console.log(`Verifica statica e funzionale 2.14.4 completata senza errori: ${checks} controlli.`);
