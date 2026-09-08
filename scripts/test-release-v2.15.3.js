const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const planner = fs.readFileSync(path.join(root, 'quotation-planner/index.html'), 'utf8');
const api = fs.readFileSync(path.join(root, 'assets/js/api.js'), 'utf8');
const native = fs.readFileSync(path.join(root, 'assets/js/planner-native.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'assets/js/app.js'), 'utf8');
const backend = fs.readFileSync(path.join(root, 'apps-script/Code.gs'), 'utf8');

let checks = 0;
function check(condition, message) {
  checks += 1;
  if (!condition) throw new Error(`TEST FALLITO [${checks}]: ${message}`);
}

const saveAgentStart = planner.indexOf('async function saveQuoteOnlineAgent');
const saveAgentEnd = planner.indexOf('async function openAgentQuoteListModal', saveAgentStart);
const saveAgent = planner.slice(saveAgentStart, saveAgentEnd);
check(saveAgent.includes('startQuotationBackgroundProgress(progressRecord)'), 'il salvataggio agente avvia il pannello');
check(saveAgent.includes('hideCalcLoading();') && saveAgent.indexOf('hideCalcLoading();') < saveAgent.indexOf('await saveQuotationWithConfirmation'), 'il livello bloccante viene chiuso prima dell’attesa server');
check(!saveAgent.includes("postDatabaseForm('savequote'"), 'il percorso integrato non invia più direttamente il POST cieco');
check(!saveAgent.includes('waitForAgentOnlineArchiveRecord('), 'il percorso integrato non esegue più polling dell’archivio');
check(/postMutation\("savequote"/.test(api), 'la API usa una mutazione confermata');
check(/saveQuotation:\s*\(fields\).*SeemaxApi\.saveQuotation/.test(native), 'il ponte Planner inoltra il salvataggio alla API');
check(/kind === "quotation"/.test(app) && /kind === "upload"/.test(app), 'il pannello distingue preventivo e upload');

const filenameStart = planner.indexOf('    function quoteCode()');
const filenameEnd = planner.indexOf('    function printFinanceProvider()', filenameStart);
check(filenameStart >= 0 && filenameEnd > filenameStart, 'funzioni nome file individuate');
const filenameSource = planner.slice(filenameStart, filenameEnd);
const values = {
  quoteNumber: '151',
  clientCompany: 'Azienda Test Srl',
  clientName: 'Mario Rossi'
};
class FixedDate extends Date {
  constructor(...args) { super(...(args.length ? args : ['2026-09-07T10:30:00.000Z'])); }
  static now() { return new Date('2026-09-07T10:30:00.000Z').getTime(); }
}
const sandbox = {
  Date: FixedDate,
  val: (id) => values[id] || '',
  selectedLedQuotes: () => [{ nome: 'Ledwall Display P2.5', displayWidth: 200, displayHeight: 150, bifacciale: true }],
  canonicalProductName: (value) => String(value || '')
};
vm.createContext(sandbox);
vm.runInContext(filenameSource, sandbox);
const filename = sandbox.suggestedPrintFileName();
check(filename === 'Prev. n. 151-26 - del 07-09-2026 - Azienda Test Srl - Ledwall Display P2.5 - 2,00x1,50 - BIFACCIALE', `nome PDF inatteso: ${filename}`);

const titleStart = planner.indexOf('    function holdPrintDocumentTitle');
const titleEnd = planner.indexOf('    function waitForQuoteImagesThenPrint', titleStart);
check(titleStart >= 0 && titleEnd > titleStart, 'protezione del titolo di stampa individuata');
const hostDocument = { title: 'Seemax Management Suite' };
const scopedDocument = { title: 'Seemax Quotation Planner' };
const titleSandbox = { window: { top: { document: hostDocument }, parent: { document: hostDocument } }, document: scopedDocument };
vm.createContext(titleSandbox);
vm.runInContext(planner.slice(titleStart, titleEnd), titleSandbox);
const restoreTitle = titleSandbox.holdPrintDocumentTitle(filename);
check(hostDocument.title === filename && scopedDocument.title === filename, 'il nome PDF viene imposto anche al documento principale');
restoreTitle();
check(hostDocument.title === 'Seemax Management Suite' && scopedDocument.title === 'Seemax Quotation Planner', 'i titoli originali vengono ripristinati dopo la stampa');

const achievementStart = backend.indexOf('function practiceCompletionDate_');
const achievementEnd = backend.indexOf('/* ========================= QUOTATION PLANNER', achievementStart);
check(achievementStart >= 0 && achievementEnd > achievementStart, 'motore trofei individuato');
const achievementSandbox = { rowsToObjects_: () => [] , sheet_: () => ({}) };
vm.createContext(achievementSandbox);
vm.runInContext(backend.slice(achievementStart, achievementEnd), achievementSandbox);
const oldPractices = Array.from({ length: 5 }, (_, index) => ({ id: `old-${index}`, stato: index === 0 ? 'Completata' : 'Inserita', tipo_pratica: 'ACQUISTO', valore: index === 0 ? 100000 : 1000, agent_username: 'agente.test', creatoIl: '2026-01-01T10:00:00.000Z', completataIl: index === 0 ? '2026-01-10T10:00:00.000Z' : '' }));
const newPractice = { id: 'new-1', stato: 'Completata', tipo_pratica: 'ACQUISTO', valore: 1000, agent_username: 'agente.test', creatoIl: '2026-09-08T10:00:00.000Z', completataIl: '2026-09-08T11:00:00.000Z' };
const oldClients = Array.from({ length: 10 }, (_, index) => ({ id: `client-old-${index}`, creato_da_username: 'agente.test', creatoIl: '2026-01-01T10:00:00.000Z' }));
const newClient = { id: 'client-new', creato_da_username: 'agente.test', creatoIl: '2026-09-08T10:00:00.000Z' };
const achievementResult = achievementSandbox.agentOfMonth_([...oldPractices, newPractice], [...oldClients, newClient], { username: 'agente.test', trofei_reset_il: '2026-09-07T12:00:00.000Z' }, [{ username: 'agente.test', nome_visualizzato: 'Agente Test' }]);
const achievements = Object.fromEntries(achievementResult.achievements.map((item) => [item.id, item]));
check(achievements.purchase_5.current === 1 && achievements.purchase_5.unlocked === false, 'le pratiche precedenti al reset non sbloccano trofei');
check(achievements.clients_10.current === 1 && achievements.clients_10.unlocked === false, 'i clienti precedenti al reset non sbloccano trofei');
check(achievements.practice_50k.current === 1000 && achievements.practice_50k.unlocked === false, 'il valore storico precedente al reset non sblocca trofei');

const resetStart = backend.indexOf('function resetAgentProfilesForLaunchV2153_');
const resetEnd = backend.indexOf('/* ATTIVITA', resetStart);
check(resetStart >= 0 && resetEnd > resetStart, 'migrazione reset profili individuata');
const headers = ['username', 'ruolo', 'nome_profilo', 'descrizione_profilo', 'tema_profilo', 'colore_profilo', 'icona_profilo', 'bacheca_trofei_json', 'trofei_reset_il'];
const rows = [
  ['admin.test', 'ADMIN', 'Admin personalizzato', 'Profilo admin', 'spotlight', '#6D28D9', '🏆', '["month_1"]', ''],
  ['agente.test', 'AGENTE', 'Alias agente', 'Profilo agente', 'minimal', '#047857', '🚀', '["practice_50k"]', '']
];
let resetSettings = { beta_sblocca_trofei: 'SI' };
const mockSheet = {
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
  sheet_: () => mockSheet,
  sheetHeaders_: () => headers.slice(),
  invalidateTable_: () => {},
  upsertSettingsBatch_: (values) => { resetSettings = { ...resetSettings, ...values }; }
};
vm.createContext(resetSandbox);
vm.runInContext(backend.slice(resetStart, resetEnd), resetSandbox);
const resetResult = resetSandbox.resetAgentProfilesForLaunchV2153_();
check(resetResult.reset === true && resetResult.agents === 1, 'il reset seleziona soltanto gli account agente');
check(rows[0][2] === 'Admin personalizzato' && rows[0][7] === '["month_1"]', 'personalizzazione e bacheca ADMIN restano invariate');
check(rows[1][2] === '' && rows[1][3] === '' && rows[1][4] === 'gradient' && rows[1][5] === '#0B5EC4' && rows[1][6] === '' && rows[1][7] === '[]' && rows[1][8], 'profilo e bacheca agente vengono azzerati con un nuovo punto di partenza');
check(resetSettings.beta_sblocca_trofei === 'NO' && resetSettings.reset_profili_v2153_eseguito === 'SI', 'sblocco beta disattivato e migrazione resa idempotente');
check(resetSandbox.resetAgentProfilesForLaunchV2153_().reset === false, 'una seconda esecuzione non azzera nuovamente i profili');

console.log(`Test rilascio 2.15.3 OK: ${checks} controlli · ${filename}`);
