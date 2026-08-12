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

try {
  const sandbox = { console };
  vm.createContext(sandbox);
  vm.runInContext(backend, sandbox, { filename: "Code.gs:self-test" });
  const inventoryTest = sandbox.selfTestInventoryMergeV2130();
  check(inventoryTest && inventoryTest.ok === true && Number(inventoryTest.merged_stock) === 60, "Self-test P2.5: la giacenza operativa 60 prevale sul seed 0");
} catch (error) {
  failures.push(`Self-test giacenza P2.5: ${error.message}`);
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

check(/SEEMAX_VERSION\s*=\s*"seemax-management-suite-2\.13\.0"/.test(backend), "Backend versione 2.13.0");
check(/version:\s*"2\.13\.0"/.test(config), "Frontend versione 2.13.0");
check(/seemax-management-v2-13-0/.test(worker), "Cache PWA versione 2.13.0");
check(/case\s+"management_mutation_status"/.test(backend), "Endpoint di conferma mutazioni presente");
check(/case\s+"management_set_practice_stock_warning"/.test(backend), "Endpoint ADMIN avviso giacenza presente");
check(/function\s+inventoryProductsForRead_/.test(backend), "Resolver unico delle giacenze presente");
check(/function\s+selfTestInventoryMergeV2130/.test(backend), "Self-test merge giacenza P2.5 presente");
check(/inventory_source:\s*"PRODOTTI_LED\.giacenza_attuale"/.test(backend), "Bootstrap dichiara PRODOTTI_LED come fonte");
check(!/activities\s*:\s*"ATTIVITA"/.test(backend), "ATTIVITA escluso dalle entità condivise");
check(/NOTIFICHE:\s*\[/.test(backend), "NOTIFICHE mantenuto come foglio attivo");
check(/postMutation\("management_upsert"/.test(api), "Upsert clienti/pratiche usa POST idempotente");
check(!/jsonp\("management_upsert"/.test(api), "Nessun upsert ordinario via URL JSONP");
check(/postMutation\("management_create_from_quote"/.test(api), "Pratica S.Q.P. integrata usa POST");
check(/RUNTIME_DEFERRED_LOGS_/.test(backend) && /flushDeferredLogs_/.test(backend), "Log operativi scritti in blocco fuori dal lock principale");
check(/RUNTIME_MUTATION_LOCK_HELD_/.test(backend) && /if\s*\(RUNTIME_MUTATION_LOCK_HELD_\)\s*RUNTIME_DEFERRED_LOGS_/.test(backend), "Accodamento log collegato esplicitamente al lock della mutazione");
check(/touchLoginBestEffort_/.test(backend) && /tryLock\(2500\)/.test(backend), "Login non bloccato dall'aggiornamento secondario dell'ultimo accesso");
check(/createPracticeFromQuote:\s*\(payload\)/.test(nativePlanner), "Bridge nativo S.Q.P. collegato alla API");
check(/nativeApi\.createPracticeFromQuote/.test(planner), "Riepilogo S.Q.P. preferisce il bridge nativo");
check(/forceFresh:\s*manualReload/.test(app), "Refresh manuale forza una nuova lettura");
check(/toggle-practice-stock-warning/.test(app), "Controllo ADMIN avviso visibile nel frontend");
check(/BACKEND_VERSION_MISMATCH/.test(api) && /BACKEND_VERSION_MISMATCH/.test(app), "Frontend blocca backend non allineato");

if (failures.length) {
  process.stderr.write(`\nVerifica fallita (${failures.length}):\n- ${failures.join("\n- ")}\n`);
  process.exit(1);
}

process.stdout.write("\nVerifica statica 2.13.0 completata senza errori.\n");
