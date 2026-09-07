const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const planner = fs.readFileSync(path.join(root, 'quotation-planner/index.html'), 'utf8');
const api = fs.readFileSync(path.join(root, 'assets/js/api.js'), 'utf8');
const native = fs.readFileSync(path.join(root, 'assets/js/planner-native.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'assets/js/app.js'), 'utf8');

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

console.log(`Test preventivi 2.15.2 OK: ${checks} controlli · ${filename}`);
