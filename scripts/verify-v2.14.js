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

for (const [name, source] of [["Code.gs", backend], ["api.js", api], ["app.js", app], ["planner-native.js", nativePlanner]]) {
  const names = [...source.matchAll(/(?:^|\n)\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map((match) => match[1]);
  const counts = names.reduce((result, functionName) => {
    result[functionName] = (result[functionName] || 0) + 1;
    return result;
  }, {});
  const duplicates = Object.entries(counts).filter(([, count]) => count > 1).map(([functionName]) => functionName);
  check(duplicates.length === 0, `${name}: nessuna funzione top-level duplicata`);
}

check(/SEEMAX_VERSION\s*=\s*"seemax-management-suite-2\.14\.0"/.test(backend), "Backend versione 2.14.0");
check(/version:\s*"2\.14\.0"/.test(config), "Frontend versione 2.14.0");
check(/seemax-management-v2-14-0/.test(worker), "Cache PWA versione 2.14.0");
check(/function\s+upgradeSeemaxV2140\s*\(/.test(backend), "Funzione upgradeSeemaxV2140 presente");
check(/function\s+updatePatchNotesV2140_\s*\(/.test(backend), "Patch notes 2.14 presenti");
check(/function\s+rebuildPracticeCountersV2140_\s*\(/.test(backend), "Contatori pratica 2.14 presenti");
check(/createTextFinder\(String\(keyValue\)\)/.test(backend), "Lookup puntuale tramite TextFinder presente");
check(/function\s+findRowObjectsByNormalizedDigits_/.test(backend), "Controllo P.IVA limitato alla colonna interessata");
check(/function\s+findRowObjectsByNormalizedText_/.test(backend), "Ricerca cliente S.Q.P. limitata alle colonne interessate");
check(/var\s+tokenPractice\s*=\s*findRowObject_\("PRATICHE",\s*"request_token"/.test(backend), "Idempotenza S.Q.P. usa lookup puntuale");
check(/function\s+settingsCacheKey_/.test(backend) && /settingsCacheSeconds:\s*90/.test(backend), "Cache breve IMPOSTAZIONI presente");
check(/routineUpsertLogs:\s*false/.test(backend) && /function\s+logRoutineUpsert_/.test(backend), "Log di routine escluso dal percorso critico");
check(/result\.performance\s*=\s*performanceSnapshot_\(\)/.test(backend), "Diagnostica backend allegata alle mutazioni POST");
check(/captureMutationPerformance/.test(api) && /getLastPerformance/.test(api), "Diagnostica frontend disponibile");
check(/performanceDiagnostics:\s*true/.test(config), "Diagnostica frontend attiva");
check(!/notifications:\s*entity\s*===\s*"practices"/.test(backend), "Nessuna rilettura notifiche nella risposta duplicata");
check(/return\s*\{\s*ok:\s*true,\s*row:\s*practiceRow\s*\}/.test(backend), "Salvataggio pratica restituisce il record senza rilettura NOTIFICHE");
check(!/invalidateTable_\(sheetName\);\s*var\s+existing\s*=\s*findRowObject_/.test(backend), "Controllo versione senza invalidazione e rilettura forzata");
check(/function\s+upsertObject_[\s\S]*?sheet\.getRange\(rowIndex,\s*1,\s*1,\s*headers\.length\)\.setValues/.test(backend), "Upsert scrive una sola riga");
check(/\.replace\(\/<\/g,\s*"\\\\u003c"\)/.test(backend), "Payload postMessage protetto da sequenze HTML");
check(/case\s+"management_mutation_status"/.test(backend), "Endpoint di conferma mutazioni presente");
check(/postMutation\("management_upsert"/.test(api), "Upsert clienti/pratiche usa POST idempotente");
check(!/jsonp\("management_upsert"/.test(api), "Nessun upsert ordinario via URL JSONP");
check(/BACKEND_VERSION_MISMATCH/.test(api) && /BACKEND_VERSION_MISMATCH/.test(app), "Frontend blocca backend non allineato");

try {
  const sandbox = { console };
  vm.createContext(sandbox);
  vm.runInContext(backend, sandbox, { filename: "Code.gs:self-test" });
  const inventoryTest = sandbox.selfTestInventoryMergeV2130();
  check(inventoryTest && inventoryTest.ok === true && Number(inventoryTest.merged_stock) === 60, "Self-test P2.5: la giacenza operativa 60 prevale sul seed 0");
} catch (error) {
  failures.push(`Self-test giacenza P2.5: ${error.message}`);
}

class MockFoundRange {
  constructor(row) { this.row = row; }
  getRow() { return this.row; }
}

class MockTextFinder {
  constructor(range, text) {
    this.range = range;
    this.text = String(text);
    this.caseSensitive = false;
    this.entire = false;
  }
  matchCase(value) { this.caseSensitive = !!value; return this; }
  matchEntireCell(value) { this.entire = !!value; return this; }
  useRegularExpression() { return this; }
  matches(value) {
    const source = String(value == null ? "" : value);
    const left = this.caseSensitive ? source : source.toLowerCase();
    const right = this.caseSensitive ? this.text : this.text.toLowerCase();
    return this.entire ? left === right : left.includes(right);
  }
  findAll() {
    const out = [];
    for (let r = 0; r < this.range.numRows; r += 1) {
      for (let c = 0; c < this.range.numCols; c += 1) {
        const value = this.range.sheet.valueAt(this.range.row + r, this.range.column + c);
        if (this.matches(value)) out.push(new MockFoundRange(this.range.row + r));
      }
    }
    return out;
  }
  findNext() { return this.findAll()[0] || null; }
}

class MockRange {
  constructor(sheet, row, column, numRows = 1, numCols = 1) {
    this.sheet = sheet;
    this.row = row;
    this.column = column;
    this.numRows = numRows;
    this.numCols = numCols;
  }
  getValues() {
    this.sheet.metrics.reads += 1;
    if (this.row === 1 && this.column === 1 && this.numRows === this.sheet.getLastRow() && this.numCols === this.sheet.getLastColumn()) {
      this.sheet.metrics.fullTableReads += 1;
    }
    return Array.from({ length: this.numRows }, (_, r) => Array.from({ length: this.numCols }, (_, c) => this.sheet.valueAt(this.row + r, this.column + c)));
  }
  getDisplayValues() { return this.getValues().map((row) => row.map((value) => String(value == null ? "" : value))); }
  setValues(values) {
    this.sheet.metrics.writes += 1;
    for (let r = 0; r < this.numRows; r += 1) {
      for (let c = 0; c < this.numCols; c += 1) this.sheet.setValueAt(this.row + r, this.column + c, values[r][c]);
    }
    return this;
  }
  setBackground() { return this; }
  setFontColor() { return this; }
  setFontWeight() { return this; }
  setWrap() { return this; }
  setNumberFormat() { return this; }
  setValue(value) { return this.setValues([[value]]); }
  createTextFinder(text) { this.sheet.metrics.textFinders += 1; return new MockTextFinder(this, text); }
}

class MockSheet {
  constructor(name, values) {
    this.name = name;
    this.values = values.map((row) => row.slice());
    this.metrics = { reads: 0, writes: 0, fullTableReads: 0, textFinders: 0 };
  }
  getName() { return this.name; }
  getLastRow() {
    for (let r = this.values.length - 1; r >= 0; r -= 1) if (this.values[r].some((value) => value !== "" && value != null)) return r + 1;
    return 0;
  }
  getLastColumn() { return this.values.reduce((max, row) => Math.max(max, row.length), 0); }
  getRange(row, column, numRows = 1, numCols = 1) { return new MockRange(this, row, column, numRows, numCols); }
  valueAt(row, column) { return (this.values[row - 1] || [])[column - 1] ?? ""; }
  setValueAt(row, column, value) {
    while (this.values.length < row) this.values.push([]);
    while (this.values[row - 1].length < column) this.values[row - 1].push("");
    this.values[row - 1][column - 1] = value;
  }
}

try {
  const sandbox = { console };
  vm.createContext(sandbox);
  vm.runInContext(backend, sandbox, { filename: "Code.gs:lookup-test" });
  const clients = new MockSheet("CLIENTI", [
    ["id", "ragioneSociale", "piva", "record_version", "request_token"],
    ["cli-1", "Cliente Uno", "12345678901", 1, "tok-1"],
    ["cli-2", "Cliente Due", "10987654321", 1, "tok-2"]
  ]);
  sandbox.resetRuntimeCaches_();
  sandbox.sheet_ = (name) => {
    if (name !== "CLIENTI") throw new Error(`Foglio mock inatteso: ${name}`);
    return clients;
  };
  const found = sandbox.findRowObject_("CLIENTI", "id", "cli-2");
  check(found && found.ragioneSociale === "Cliente Due", "Lookup puntuale restituisce il cliente corretto");
  check(clients.metrics.fullTableReads === 0, "Lookup puntuale non legge l'intera tabella CLIENTI");
  const finderCount = clients.metrics.textFinders;
  const foundAgain = sandbox.findRowObject_("CLIENTI", "id", "cli-2");
  check(foundAgain && clients.metrics.textFinders === finderCount, "Lookup ripetuto riusa la cache della richiesta");
  const normalizedMatches = sandbox.findRowObjectsByNormalizedText_("CLIENTI", "ragioneSociale", "  cliente   due ", 10);
  check(normalizedMatches.length === 1 && normalizedMatches[0].id === "cli-2", "Ricerca normalizzata S.Q.P. trova il cliente senza tabella completa");
  check(clients.metrics.fullTableReads === 0, "Ricerca normalizzata S.Q.P. non legge l'intera tabella CLIENTI");
  const saved = sandbox.upsertObject_("CLIENTI", "id", "cli-2", { id: "cli-2", ragioneSociale: "Cliente Due Aggiornato", piva: "10987654321", record_version: 2, request_token: "tok-3" });
  check(saved.ragioneSociale === "Cliente Due Aggiornato", "Upsert puntuale aggiorna il record corretto");
  check(clients.metrics.writes === 1, "Upsert puntuale esegue una sola scrittura di riga");
  check(clients.metrics.fullTableReads === 0, "Upsert puntuale non legge l'intera tabella CLIENTI");
} catch (error) {
  failures.push(`Test lookup/upsert puntuale: ${error.stack || error.message}`);
}

try {
  const sandbox = { console };
  const properties = new Map();
  sandbox.PropertiesService = {
    getScriptProperties() {
      return {
        getProperty(key) { return properties.has(key) ? properties.get(key) : null; },
        setProperty(key, value) { properties.set(key, String(value)); }
      };
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(backend, sandbox, { filename: "Code.gs:counter-test" });
  const practices = new MockSheet("PRATICHE", [
    ["id", "numero"],
    ["PR-DF0001", "DF0001"],
    ["PR-DF0002", "DF0002"]
  ]);
  sandbox.resetRuntimeCaches_();
  sandbox.sheet_ = (name) => {
    if (name !== "PRATICHE") throw new Error(`Foglio mock inatteso: ${name}`);
    return practices;
  };
  const next = sandbox.nextPracticeIdentifier_({ nome_visualizzato: "David Failla", username: "david" });
  check(next === "DF0003", "Contatore pratica prosegue dal massimo esistente");
  const readsAfterFirst = practices.metrics.reads;
  const nextAgain = sandbox.nextPracticeIdentifier_({ nome_visualizzato: "David Failla", username: "david" });
  check(nextAgain === "DF0004", "Contatore pratica incrementa senza nuova scansione completa");
  check(practices.metrics.reads <= readsAfterFirst + 2, "Secondo numero pratica evita la scansione della colonna completa");
} catch (error) {
  failures.push(`Test contatore pratiche: ${error.stack || error.message}`);
}

if (failures.length) {
  process.stderr.write(`\nVerifica fallita (${failures.length}):\n- ${failures.join("\n- ")}\n`);
  process.exit(1);
}

process.stdout.write("\nVerifica statica e funzionale 2.14.0 completata senza errori.\n");
