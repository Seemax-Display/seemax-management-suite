const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const files = {
  app: read("assets/js/app.js"),
  api: read("assets/js/api.js"),
  config: read("assets/js/config.js"),
  backend: read("apps-script/Code.gs"),
  css: read("assets/css/app.css"),
  html: read("index.html"),
  planner: read("quotation-planner/index.html"),
  plannerNative: read("assets/js/planner-native.js"),
  sw: read("sw.js"),
  workOrder: read("assets/js/work-order.js")
};

let checks = 0;
function check(condition, message) {
  checks += 1;
  if (!condition) throw new Error(`TEST FALLITO [${checks}]: ${message}`);
}
function count(source, pattern) {
  return (source.match(pattern) || []).length;
}

for (const [name, source] of Object.entries({
  app: files.app,
  api: files.api,
  config: files.config,
  backend: files.backend,
  plannerNative: files.plannerNative,
  sw: files.sw,
  workOrder: files.workOrder
})) {
  new vm.Script(source, { filename: name });
  check(true, `sintassi ${name}`);
}

const inlineScripts = Array.from(files.planner.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))
  .map((match) => match[1])
  .filter((source) => source.trim());
inlineScripts.forEach((source, index) => new vm.Script(source, { filename: `quotation-planner-inline-${index + 1}.js` }));
check(inlineScripts.length > 0, "JavaScript inline Quotation Planner valido");

// Versioni e pacchetto PWA.
check(/version:\s*["']2\.17\.0["']/.test(files.config), "versione frontend 2.17.0");
check(/SEEMAX_VERSION\s*=\s*["']seemax-management-suite-2\.17\.0["']/.test(files.backend), "versione backend 2.17.0");
check(/seemax-management-v2-17-0-work-orders/.test(files.sw), "cache Service Worker 2.17.0");
check(/function\s+upgradeSeemaxV2170\s*\(/.test(files.backend), "upgrade 2.17.0 presente");
check(files.html.indexOf("assets/js/work-order.js") > files.html.indexOf("assets/js/planner-native.js"), "generatore caricato dopo il ponte Planner");
check(files.html.indexOf("assets/js/work-order.js") < files.html.indexOf("assets/js/app.js"), "generatore caricato prima dell'app");
check(files.sw.includes("./assets/js/work-order.js"), "generatore incluso nella cache PWA");

// Documenti consultabili nelle pratiche operative.
check(/function\s+safeDocumentUrl\s*\(/.test(files.app), "URL documento validato");
check(/\["http:",\s*"https:"\]\.includes\(parsed\.protocol\)/.test(files.app), "protocolli documento limitati a HTTP e HTTPS");
check(/function\s+documentDriveFileId\s*\(/.test(files.app), "ID Drive ricavato in modo mirato");
check(/drive\.google\.com\/uc\?export=download&id=/.test(files.app), "collegamento Drive per download diretto");
check(/Visualizza ↗/.test(files.app) && /Scarica ↓/.test(files.app), "azioni Visualizza e Scarica presenti");
check(/function\s+practiceDocumentListMarkup\s*\(/.test(files.app), "elenco documenti riutilizzabile presente");
check(/const existingDocuments = !isNewForm/.test(files.app), "una pratica nuova non eredita documenti non associati");
check(/practiceDocumentListMarkup\(existingDocuments\)/.test(files.app), "documenti esistenti mostrati nel modulo pratica");
check(count(files.app, /\["documents",\s*"Sezione Documenti"\]/g) === 2, "tab Documenti presente per acquisto e pratiche finanziarie");
check(/openCompletedPractice[\s\S]*documentActionMarkup\(document,\s*"Non disponibile"\)/.test(files.app), "visualizzazione e download preservati anche nell'archivio completato");
check(/\.practice-document-list/.test(files.css) && /\.practice-document-actions/.test(files.css), "layout documenti desktop presente");
check(/\.document-actions>\.practice-document-actions\{display:flex;flex-wrap:wrap\}/.test(files.css), "azioni documenti allineate nella libreria generale");
check(/@media\(max-width:480px\)[\s\S]*\.practice-document-actions/.test(files.css), "layout documenti smartphone presente");

// Generazione locale della commessa.
check(/data-action="generate-work-order"/.test(files.app), "pulsante genera commessa presente");
check(/!isNewForm\s*&&\s*api\.isAdmin\(\)[\s\S]{0,180}ACCETTATA/.test(files.app), "pulsante limitato a ADMIN e pratica Accettata");
check(/function\s+generateWorkOrder\s*\(/.test(files.app), "handler commessa presente");
check(/if \(!api\.isAdmin\(\)\)/.test(files.app), "permesso ADMIN ricontrollato nell'handler");
check(/!==\s*"ACCETTATA"/.test(files.app), "stato Accettata ricontrollato nell'handler");
check(/__sync_state[\s\S]{0,80}PENDING/.test(files.app), "pratica non confermata esclusa");
check(/window\.SeemaxWorkOrder\.open\(workOrderPayload\(record\)\)/.test(files.app), "payload locale passato al generatore");
check(!/(?:fetch\s*\(|XMLHttpRequest|SeemaxApi|google\.script|appsScriptUrl|management_[a-z_]+)/.test(files.workOrder), "generatore privo di comunicazioni di rete e API");
check(!/management_generate_work_order/.test(files.backend), "nessun endpoint backend aggiunto per la commessa");
check(/\.work-order-launch/.test(files.css), "comando commessa integrato nell'interfaccia");

const workOrder = require(path.join(root, "assets/js/work-order.js"));
const fixture = {
  generatedAt: "2026-09-14T12:00:00Z",
  company: { brand: "SEEMAX DISPLAY", legalName: "LED LAB COMPANY" },
  practice: { number: "MPL0007" },
  client: {
    name: "Cliente Prova & Figli <S.r.l.>",
    contact: "Mario Rossi",
    phone: "+39 090 0000000",
    email: "amministrazione@example.it",
    address: "Via Roma 25, 98057 Milazzo (ME)"
  },
  agent: { name: "Mario Platania", contact: "mario@example.it" },
  products: [
    { name: "Ledwall Display P2.5", code: "P25-50100", size: "4,00 x 2,00 m", configuration: "Monofacciale", cabinets: "16 pz" },
    { name: "Ledwall Display P3.91", code: "P391-50100 + P391-5050", size: "3,50 x 2,50 m", configuration: "Bifacciale", cabinets: "42 pz" }
  ]
};
const built = workOrder.build(fixture);
check(/^Commessa d'ordine - MPL0007 - /.test(built.fileName) && built.fileName.endsWith(".pdf"), "nome file commessa coerente");
const dottedName = workOrder.build({ ...fixture, client: { ...fixture.client, name: "Cliente Esempio S.r.l." } }).fileName;
check(!/\.\.pdf$/.test(dottedName), "nome file senza punteggiatura duplicata prima dell'estensione");
check(/@page\{size:A4 portrait;margin:0\}/.test(built.html), "formato A4 dichiarato");
check(/COMMESSA D'ORDINE/.test(built.html), "titolo commessa presente");
for (const label of ["DETTAGLI DEL CLIENTE", "AGENTE DI RIFERIMENTO", "TECNICO INCARICATO", "PRODOTTO/I DI RIFERIMENTO", "MATERIALI UTILIZZATI"]) {
  check(built.html.includes(label), `sezione ${label}`);
}
check(/Compilare a penna/.test(built.html), "campo tecnico esplicitamente manuale");
check(/PRODOTTO DI RIFERIMENTO<\/th><th>CODICE PRODOTTO<\/th><th>QUANTITÀ/.test(built.html), "colonne materiali richieste");
check(built.html.includes("Cliente Prova &amp; Figli &lt;S.r.l.&gt;"), "testo cliente protetto da markup");
check(!built.html.includes("Cliente Prova & Figli <S.r.l.>"), "testo cliente non inserito come HTML grezzo");
check(count((built.html.match(/<table class="products">[\s\S]*?<\/table>/) || [""])[0], /<tbody>|<tr>/g) >= 3, "più prodotti riportati nella commessa");
const materialsTable = (built.html.match(/<table class="materials">[\s\S]*?<\/table>/) || [""])[0];
check(count(materialsTable, /<tr>/g) === 9, "otto righe manuali oltre all'intestazione");
check(!/<td[^>]*>[^<]*<i/.test(materialsTable), "nessuna riga guida asimmetrica nelle celle materiali");
check(/border-collapse:separate;border-spacing:0;table-layout:fixed/.test(built.html), "colonne a larghezza fissa e bordi allineati");

const compact = workOrder.build({ ...fixture, products: [...fixture.products, { name: "Ledwall Display P4", code: "P4", size: "2,00 x 1,50 m", configuration: "Monofacciale", cabinets: "12 pz" }] });
check(/<main class="sheet compact">/.test(compact.html), "impaginazione compatta automatica con più Ledwall");
const compactMaterials = (compact.html.match(/<table class="materials">[\s\S]*?<\/table>/) || [""])[0];
check(count(compactMaterials, /<tr>/g) === 8, "sette righe manuali nella variante compatta");

let writtenPreview = "";
let focusedPreview = false;
const previewWindow = {
  document: {
    title: "",
    open() {},
    write(value) { writtenPreview = value; },
    close() {}
  },
  focus() { focusedPreview = true; }
};
global.window = { open: () => previewWindow };
const opened = workOrder.open(fixture);
delete global.window;
check(writtenPreview === opened.html && focusedPreview, "anteprima scritta e aperta localmente dal browser");
check(previewWindow.document.title === opened.title, "titolo anteprima pronto per il nome PDF");

// Regressioni critiche preservate.
check(/withMutationLock_\(function \(\) \{ return managementUpsertLocked_/.test(files.backend), "salvataggi pratica sotto ScriptLock");
check(/record_version/.test(files.backend) && /request_token/.test(files.backend), "versionamento e idempotenza preservati");
check(/SpreadsheetApp\.flush\(\);[\s\S]{0,500}lock\.releaseLock\(\)/.test(files.backend), "flush prima del rilascio lock");
check(/assignUniquePracticePrefixesV2162_\(\)/.test(files.backend), "prefissi pratica univoci preservati");
check(/savequote:\s*true/.test(files.backend) && /loadquote_agent:\s*true/.test(files.backend), "archivio preventivi ADMIN preservato");
check(/async function saveQuotation/.test(files.api), "preventivi in background preservati");
check(/management_upload_document/.test(files.api), "upload documenti in background preservato");
check(/startInventoryProgress/.test(files.app), "magazzino in background preservato");
check(/showPatchNotesMessage\(true\)/.test(files.app), "pubblicazione patch notes preservata");
check(files.app.includes("☷ IN DETTAGLIO") && files.app.includes("▦ PER TIPOLOGIA"), "modalità pratiche preservate");
check(!/^(?:<<<<<<< |=======|>>>>>>> )/m.test(Object.values(files).join("\n")), "assenza marcatori di conflitto");
check(count(files.css, /\{/g) === count(files.css, /\}/g), "parentesi CSS bilanciate");

const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(files.backend, sandbox);
const assignment = sandbox.allocatePracticePrefixesV2162_([
  { username: "michele", nome_visualizzato: "Michele Purgino" },
  { username: "mario", nome_visualizzato: "Mario Platania" }
], [
  { numero: "MP0001", id: "PR-MP0001", agent_username: "michele", agente: "Michele Purgino" }
]);
check(assignment.michele === "MP" && assignment.mario === "MPL", "sequenze MP e MPL preservate");

console.log(`Test rilascio Seemax 2.17.0 OK: ${checks} controlli.`);
