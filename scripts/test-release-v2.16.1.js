const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const app = read('assets/js/app.js');
const api = read('assets/js/api.js');
const config = read('assets/js/config.js');
const backend = read('apps-script/Code.gs');
const sw = read('sw.js');

let checks = 0;
function check(condition, message) {
  checks += 1;
  if (!condition) throw new Error(`TEST FALLITO [${checks}]: ${message}`);
}

// Versione e microcopy del rilascio.
check(/version:\s*["']2\.16\.1["']/.test(config), 'frontend 2.16.1');
check(/SEEMAX_VERSION\s*=\s*["']seemax-management-suite-2\.16\.1["']/.test(backend), 'backend 2.16.1');
check(/seemax-management-v2-16-1-quotation-admin/.test(sw), 'cache PWA 2.16.1');
check(app.includes('☷ IN DETTAGLIO'), 'modalità pratiche IN DETTAGLIO');
check(app.includes('▦ PER TIPOLOGIA'), 'modalità pratiche PER TIPOLOGIA');
check(!/Referente non (?:indicato|assegnato)/i.test(app), 'placeholder referente non assegnato eliminato');
check(/const contact = String\(c\.referente \|\| ["']{2}\)\.trim\(\)/.test(app), 'referente mostrato solo quando valorizzato');

// Rendering lineare dei contatori, senza scansioni complete per ogni scheda.
check(/const statusCounts = Object\.fromEntries/.test(app), 'conteggi stato preparati in un solo passaggio');
check(/const typeCounts = \{ ACQUISTO: 0, NOLEGGIO: 0, LEASING: 0 \}/.test(app), 'conteggi tipologia preparati in un solo passaggio');
check(/const practiceCountByClient = new Map\(\)/.test(app), 'indice locale pratiche per cliente presente');
const clientsBody = app.slice(app.indexOf('function renderClients()'), app.indexOf('function renderCatalog()'));
check(!/state\.data\.practices\.filter/.test(clientsBody), 'nessuna scansione pratiche per ogni cliente');
check(!/state\.data\.practices\.some/.test(clientsBody), 'nessuna seconda scansione pratiche per il blocco cliente');
check(/BOOTSTRAP_CACHE_PREFIX \+ String\(config\.version/.test(api), 'cache bootstrap separata per versione applicativa');
check(/function settingsCacheKey_\(\) \{ return ["']SEEMAX_SETTINGS_["'] \+ SEEMAX_VERSION; \}/.test(backend), 'cache impostazioni backend separata per versione');

// Reset definitivo: solo agenti, profilo vuoto, baseline nuova, metadati versionati.
const resetStart = backend.indexOf('function resetAgentProfilesForLaunchV2153_');
const resetEnd = backend.indexOf('/* Crea una copia integrale', resetStart);
check(resetStart >= 0 && resetEnd > resetStart, 'motore reset profili individuato');
const headers = [
  'username', 'ruolo', 'nome_profilo', 'descrizione_profilo', 'tema_profilo', 'colore_profilo',
  'icona_profilo', 'bacheca_trofei_json', 'trofei_reset_il', 'aggiornatoIl', 'aggiornato_da',
  'request_token', 'record_version'
];
const rows = [
  ['admin.test', 'ADMIN', 'Admin', 'Profilo admin', 'spotlight', '#6D28D9', '🏆', '["month_1"]', '', 'old', 'admin', 'old-admin', 8],
  ['agente.test', 'AGENTE', 'Agente', 'Profilo agente', 'minimal', '#047857', '🚀', '["practice_50k"]', '', 'old', 'agent', 'old-agent', 3],
  ['agente.inattivo', 'AGENTE', 'Altro', 'Profilo inattivo', 'classic', '#B42318', '🎯', '["clients_10"]', '', 'old', 'agent', 'old-inactive', 1]
];
let resetSettings = { beta_sblocca_trofei: 'SI' };
const resetSheet = {
  getLastRow: () => rows.length + 1,
  getRange: (row, column, count) => ({
    getDisplayValues: () => rows.slice(row - 2, row - 2 + count).map((entry) => [String(entry[column - 1] || '')]),
    getValues: () => rows.slice(row - 2, row - 2 + count).map((entry) => [entry[column - 1]]),
    setValues: (values) => values.forEach((value, index) => { rows[row - 2 + index][column - 1] = value[0]; })
  })
};
const resetSandbox = {
  getSettings_: () => ({ ...resetSettings }),
  normalizeYesNo_: (value, fallback) => String(value === undefined || value === '' ? fallback : value).toUpperCase() === 'NO' ? 'NO' : 'SI',
  sheet_: () => resetSheet,
  sheetHeaders_: () => headers.slice(),
  invalidateTable_: () => {},
  upsertSettingsBatch_: (values) => { resetSettings = { ...resetSettings, ...values }; }
};
vm.createContext(resetSandbox);
vm.runInContext(backend.slice(resetStart, resetEnd), resetSandbox);
const resetResult = resetSandbox.resetAgentProfilesForOfficialReleaseV2160_();
check(resetResult.reset === true && resetResult.agents === 2, 'tutti e soli i non-admin vengono selezionati');
check(rows[0][2] === 'Admin' && rows[0][7] === '["month_1"]' && rows[0][12] === 8, 'profilo ADMIN invariato');
for (const index of [1, 2]) {
  check(rows[index][2] === '' && rows[index][3] === '' && rows[index][4] === 'gradient', `profilo agente ${index} azzerato`);
  check(rows[index][5] === '#0B5EC4' && rows[index][6] === '' && rows[index][7] === '[]', `personalizzazione agente ${index} azzerata`);
  check(Boolean(rows[index][8]) && rows[index][10] === 'SYSTEM_V2160', `baseline e autore agente ${index} aggiornati`);
}
check(rows[1][12] === 4 && rows[2][12] === 2, 'record_version incrementata per ogni agente');
check(rows[1][11] !== rows[2][11] && rows[1][11].includes('agente.test'), 'token tecnico del reset univoco per utente');
check(resetSettings.beta_sblocca_trofei === 'NO' && resetSettings.reset_profili_v2160_eseguito === 'SI', 'trofei beta disattivati e reset idempotente');
check(resetSandbox.resetAgentProfilesForOfficialReleaseV2160_().reset === false, 'seconda esecuzione non cancella nuovi progressi');

// Pulizia fogli: backup completo prima di qualsiasi cancellazione e allowlist unica.
const cleanupStart = backend.indexOf('function cleanupUnusedSheetsForReleaseV2160_');
const cleanupEnd = backend.indexOf('/* ATTIVITA', cleanupStart);
check(cleanupStart >= 0 && cleanupEnd > cleanupStart, 'migrazione fogli individuata');
const activeNames = [
  'AGENTI', 'PRODOTTI_LED', 'CLIENTI', 'PRATICHE', 'DOCUMENTI', 'IMPOSTAZIONI', 'PATCH_NOTES',
  'PATCH_ITEMS', 'ARCHIVIO_PREVENTIVI', 'MOVIMENTI_MAGAZZINO', 'NOTIFICHE', 'EMAIL_CODA', 'LOG'
];
const visibleNames = ['AGENTI', 'PRODOTTI_LED', 'CLIENTI', 'PRATICHE', 'DOCUMENTI', 'IMPOSTAZIONI', 'MOVIMENTI_MAGAZZINO'];
const makeSheet = (name) => ({
  name,
  hidden: false,
  getName() { return this.name; },
  isSheetHidden() { return this.hidden; },
  hideSheet() { this.hidden = true; },
  showSheet() { this.hidden = false; }
});
let sheets = [...activeNames, 'ATTIVITA', 'VECCHIO_EXPORT'].map(makeSheet);
const events = [];
let sheetSettings = {};
const spreadsheet = {
  getId: () => 'database-id',
  getName: () => 'Database Seemax',
  getSheets: () => sheets.slice(),
  getSheetByName: (name) => sheets.find((sheet) => sheet.name === name) || null,
  deleteSheet: (sheet) => { events.push(`delete:${sheet.name}`); sheets = sheets.filter((entry) => entry !== sheet); }
};
const cleanupSandbox = {
  SHEET_SCHEMAS: Object.fromEntries(activeNames.map((name) => [name, []])),
  SEEMAX_VISIBLE_SHEETS_V2160_: Object.fromEntries(visibleNames.map((name) => [name, true])),
  SEEMAX_VERSION: 'seemax-management-suite-2.16.1',
  RUNTIME_SHEET_CACHE_: {},
  RUNTIME_HEADER_CACHE_: {},
  db_: () => spreadsheet,
  getSettings_: () => ({ ...sheetSettings }),
  SpreadsheetApp: { flush: () => events.push('flush') },
  DriveApp: { getFileById: () => ({ makeCopy: () => { events.push('backup'); return { getId: () => 'backup-id' }; } }) },
  Utilities: { formatDate: () => '2026-09-08_15-00-00' },
  Session: { getScriptTimeZone: () => 'Europe/Rome' },
  upsertSettingsBatch_: (values) => { sheetSettings = { ...sheetSettings, ...values }; events.push('settings'); },
  resetRequestDataCaches_: () => events.push('cache-reset')
};
vm.createContext(cleanupSandbox);
vm.runInContext(backend.slice(cleanupStart, cleanupEnd), cleanupSandbox);
const cleanupResult = cleanupSandbox.cleanupUnusedSheetsForReleaseV2160_();
check(cleanupResult.removed.join('|') === 'ATTIVITA|VECCHIO_EXPORT', 'solo i fogli fuori schema vengono rimossi');
check(events.indexOf('backup') >= 0 && events.indexOf('backup') < events.indexOf('delete:ATTIVITA'), 'backup creato prima della prima eliminazione');
check(activeNames.every((name) => sheets.some((sheet) => sheet.name === name)), 'tutte le tabelle attive vengono conservate');
check(sheetSettings.backup_pre_rilascio_v2160_id === 'backup-id' && /backup-id/.test(sheetSettings.pulizia_fogli_v2160_backup_url), 'riferimento al backup registrato');
cleanupSandbox.organizeActiveSheetsForReleaseV2160_();
check(visibleNames.every((name) => !spreadsheet.getSheetByName(name).hidden), 'tabelle operative visibili');
check(activeNames.filter((name) => !visibleNames.includes(name)).every((name) => spreadsheet.getSheetByName(name).hidden), 'tabelle tecniche attive nascoste');
const audit = cleanupSandbox.auditSheetStructureV2160();
check(audit.unused.length === 0 && audit.hidden_technical.length === activeNames.length - visibleNames.length, 'audit struttura coerente dopo la pulizia');
const backupsBeforeRetry = events.filter((event) => event === 'backup').length;
const retry = cleanupSandbox.cleanupUnusedSheetsForReleaseV2160_();
check(retry.removed.length === 0 && events.filter((event) => event === 'backup').length === backupsBeforeRetry, 'ripetizione idempotente senza nuovi backup o cancellazioni');
sheets.push(makeSheet('NUOVO_FOGLIO_ESTRANEO'));
const laterCleanup = cleanupSandbox.cleanupUnusedSheetsForReleaseV2160_();
check(laterCleanup.removed.join('|') === 'NUOVO_FOGLIO_ESTRANEO', 'una scheda estranea aggiunta in seguito viene rilevata');
check(events.filter((event) => event === 'backup').length === backupsBeforeRetry + 1, 'una nuova copia protegge anche le schede estranee create dopo il rilascio');

// La migrazione viene eseguita sotto lo stesso lock globale delle mutazioni.
const upgradeBody = backend.slice(backend.indexOf('function upgradeSeemaxV2160'), backend.indexOf('/* Azzeramento di lancio', backend.indexOf('function upgradeSeemaxV2160')));
check(/upgradeSeemaxV2160\(\)[\s\S]*withMutationLock_/.test(upgradeBody), 'upgrade protetto da ScriptLock');
check(upgradeBody.indexOf('cleanupUnusedSheetsForReleaseV2160_()') < upgradeBody.indexOf('resetAgentProfilesForOfficialReleaseV2160_()'), 'backup e pulizia precedono il reset definitivo');
check(/rebuildPracticeCountersV2140_\(\)/.test(upgradeBody) && /rebuildQuoteCountersV2151_\(\)/.test(upgradeBody), 'contatori atomici riallineati nel rilascio');
check(/function betaTrophiesUnlocked\(\)\s*\{\s*return api\.isAdmin\(\)/.test(app), 'sblocco completo riservato agli ADMIN');
check(/getScriptLock\(\)/.test(backend) && /record_version/.test(backend) && /request_token/.test(backend), 'protezioni multiutente conservate');

check(/authorized_payload_json/.test(backend), 'caricamento ADMIN dei preventivi agente autorizzato dal backend');
check(/function clearArchivedQuoteKeysV2161_/.test(backend), 'chiavi account storiche rimosse dall’archivio');
check(/Preventivo protetto da account/.test(backend), 'preventivi autenticati bloccati sul percorso pubblico');
check(/adminQuoteAgentFilter/.test(read('quotation-planner/index.html')), 'filtro preventivi per agente disponibile');
check(/adminQuoteSortBy/.test(read('quotation-planner/index.html')), 'ordinamento preventivi per agente o data disponibile');
check(/Creato da:/.test(read('quotation-planner/index.html')), 'autore visibile nella scheda preventivo ADMIN');
check(/async function listQuotations\(/.test(api) && /async function loadQuotation\(/.test(api), 'archivio preventivi usa il collegamento nativo');
check(/listquotes:\s*true/.test(backend) && /loadquote_agent:\s*true/.test(backend), 'backend abilita le letture sul ponte persistente');

console.log(`Test rilascio 2.16.1 OK: ${checks} controlli.`);
