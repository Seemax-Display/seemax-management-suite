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
  seed: read("assets/js/seed.js"),
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
  workOrder: files.workOrder,
  seed: files.seed
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
check(/version:\s*["']2\.18\.0["']/.test(files.config), "versione frontend 2.18.0");
check(/SEEMAX_VERSION\s*=\s*["']seemax-management-suite-2\.18\.0["']/.test(files.backend), "versione backend 2.18.0");
check(/seemax-management-v2-18-0-catalog-products/.test(files.sw), "cache Service Worker 2.18.0");
check(/function\s+upgradeSeemaxV2180\s*\(/.test(files.backend), "upgrade 2.18.0 presente");
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

// Catalogo v2.18.0 e dati di migrazione.
for (const field of ["catalogo_tab", "tipo_calcolo", "unita_magazzino", "formato_label", "tech_misura"]) {
  check(new RegExp(`PRODOTTI_LED:[^\\n]+["']${field}["']`).test(files.backend), `colonna ${field} nello schema prodotti`);
}
const newProducts = sandbox.productDefaultsV2180_();
check(newProducts.length === 6, "sei nuovi prodotti definiti nella migrazione");
const byId = Object.fromEntries(newProducts.map((product) => [product.id, product]));
check(byId["cross-p5-6464"].prezzoAgente === 999 && byId["cross-p10-9696"].prezzoAgente === 1099 && byId["cross-p10-128128"].prezzoAgente === 1449, "prezzi delle tre Croci corretti");
check(byId["floor-led-50100"].prezzoAgente === 1800 && byId["transparent-led-100100"].prezzoAgente === 1200, "prezzi Floor e Transparent corretti");
check(byId["lcd-totem-smx-430-cp"].prezzoAgente === 2000, "prezzo Totem LCD corretto");
check(newProducts.every((product) => Number(product.giacenza_attuale) === 0 && Number(product.giacenza_iniziale) === 0), "giacenze iniziali dei nuovi prodotti a zero");
check(newProducts.filter((product) => product.catalogo_tab === "ALTRI_LED").length === 5 && newProducts.filter((product) => product.catalogo_tab === "LCD").length === 1, "classificazione catalogo dei nuovi prodotti");
check(byId["transparent-led-100100"].cabX === 100 && byId["transparent-led-100100"].cabY === 100 && byId["transparent-led-100100"].tipo_calcolo === "MODULARE_ESATTO", "Transparent configurato con cabinet 1x1 e multipli esatti");
check(byId["floor-led-50100"].cabX === 50 && byId["floor-led-50100"].cabY === 100 && byId["floor-led-50100"].tipo_calcolo === "MODULARE_ESATTO", "Floor configurato con cabinet 0,50x1,00 e multipli esatti");
check(byId["cross-p10-128128"].tech_misura === "1,28×1,28 m", "scheda Croce 128x128 usa la misura coerente");
const consolidateBody = (files.backend.match(/function consolidateProductRows_\(entry\) \{[\s\S]*?\n\}/) || [""])[0];
check(count(consolidateBody, /productSheet\.deleteRow\(sheetRow\)/g) === 1, "migrazione elimina ciascuna riga prodotto una sola volta");

for (const [value, expected] of [
  ["Floor Led P3.91", "floor-led-50100"],
  ["Transparent Led P3.91", "transparent-led-100100"],
  ["Croce Farmacia P5 64x64", "cross-p5-6464"],
  ["Croce Farmacia P10 96x96", "cross-p10-9696"],
  ["Croce Farmacia P10 128x128", "cross-p10-128128"],
  ["SMX 430-CP", "lcd-totem-smx-430-cp"]
]) check(sandbox.canonicalProductId_(value) === expected, `ID canonico ${expected}`);

for (const asset of ["croce-farmacia.jpg", "floor-led.jpg", "transparent-led.png", "totem-lcd-indoor.png"]) {
  const assetPath = path.join(root, "assets/catalog", asset);
  check(fs.existsSync(assetPath) && fs.statSync(assetPath).size > 10000, `immagine ${asset} integrata`);
}

check(files.app.includes('label: "Ledwall"') && files.app.includes('label: "Croci ed Altri Led"') && files.app.includes('label: "Schermi LCD"'), "tre tab Catalogo presenti");
check(/data-action="set-catalog-tab"/.test(files.app), "navigazione tab Catalogo collegata");
check(/data-product-quantity/.test(files.app) && /MODULARE_ESATTO/.test(files.app), "configuratore pratica per quantità e moduli esatti");
check(/snapUpToStep/.test(files.app) && /exactMultiple/.test(files.app), "vincoli dimensionali verificati nel frontend");
check(/productCalculationMode_/.test(files.backend) && /exactModuleMultiple_/.test(files.backend), "vincoli dimensionali ricontrollati nel backend");
check(/prodotto\.catalogo_tab|catalogo_tab/.test(files.app), "metadati categoria utilizzati dal frontend");
check(/QUANTITÀ<\/th>/.test(files.workOrder), "commessa resa compatibile con prodotti a pezzi");

const inventoryMap = {
  ...byId,
  "p25-6464": { id: "p25-6464", nome: "P2.5", cabX: 64, cabY: 64, catalogo_tab: "LEDWALL", tipo_calcolo: "MODULARE", unita_magazzino: "CABINET", formato_label: "64×64 cm" },
  "p391-50100": { id: "p391-50100", nome: "P3.91", cabX: 50, cabY: 100 },
  "p391-5050": { id: "p391-5050", nome: "P3.91", cabX: 50, cabY: 50 }
};
sandbox.findInventoryProduct_ = (id) => inventoryMap[id] || null;
const practice = {
  ledwall_configurazioni_json: JSON.stringify([
    { product_id: "transparent-led-100100", modello_display: "Transparent Led P3.91", larghezza: 2, altezza: 3, bifacciale: "NO", indirizzo_tipo: "INDIRIZZO UNICO" },
    { product_id: "cross-p5-6464", modello_display: "Croce Farmacia P5 64×64", quantita_unita: 2, bifacciale: "SI", indirizzo_tipo: "INDIRIZZO UNICO" },
    { product_id: "floor-led-50100", modello_display: "Floor Led P3.91", larghezza: 1.5, altezza: 2, bifacciale: "NO", indirizzo_tipo: "INDIRIZZO UNICO" }
  ])
};
sandbox.normalizePracticeLedwallConfigurations_(practice);
const normalized = JSON.parse(practice.ledwall_configurazioni_json);
const inventory = Object.fromEntries(JSON.parse(practice.righe_magazzino_json).map((line) => [line.product_id, line.quantita]));
check(inventory["transparent-led-100100"] === 6, "Transparent 2x3 calcolato in sei cabinet 1x1");
check(inventory["floor-led-50100"] === 6, "Floor 1,5x2 calcolato in sei cabinet 0,5x1");
check(inventory["cross-p5-6464"] === 2 && normalized[1].bifacciale === "NO", "Croce calcolata a pezzi senza moltiplicazione bifacciale");
check(!inventory["p391-50100"] && !inventory["p391-5050"], "Floor e Transparent non confluiscono nel P3.91 Ledwall");
check(normalized.every((item) => item.tipo_calcolo && item.unita_magazzino && item.formato_label), "metadati di calcolo salvati nella pratica");

let rejectedNonMultiple = false;
try {
  sandbox.normalizePracticeLedwallConfigurations_({ ledwall_configurazioni_json: JSON.stringify([{ product_id: "transparent-led-100100", larghezza: 1.5, altezza: 1, bifacciale: "NO" }]) });
} catch (error) { rejectedNonMultiple = /multipli esatti/.test(String(error.message)); }
check(rejectedNonMultiple, "backend rifiuta Transparent con larghezza non multipla di un metro");

console.log(`Test rilascio Seemax 2.18.0 OK: ${checks} controlli.`);
