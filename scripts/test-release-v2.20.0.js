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
  planner: read("quotation-planner/index.html"),
  seed: read("assets/js/seed.js"),
  sw: read("sw.js")
};

let checks = 0;
function check(condition, message) {
  checks += 1;
  if (!condition) throw new Error(`TEST FALLITO [${checks}]: ${message}`);
}

function functionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`Funzione ${name} non trovata`);
  const open = source.indexOf("{", start);
  let depth = 0;
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") { blockComment = false; index += 1; }
      continue;
    }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (char === "\\") { escaped = true; continue; }
      if (char === quote) quote = "";
      continue;
    }
    if (char === "/" && next === "/") { lineComment = true; index += 1; continue; }
    if (char === "/" && next === "*") { blockComment = true; index += 1; continue; }
    if (char === "'" || char === '"' || char === "`") { quote = char; continue; }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Fine funzione ${name} non trovata`);
}

for (const [name, source] of Object.entries({
  app: files.app,
  api: files.api,
  config: files.config,
  backend: files.backend,
  seed: files.seed,
  sw: files.sw
})) {
  new vm.Script(source, { filename: name });
  check(true, `sintassi ${name}`);
}

const inlineScripts = Array.from(files.planner.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))
  .map((match) => match[1])
  .filter((source) => source.trim());
inlineScripts.forEach((source, index) => new vm.Script(source, { filename: `quotation-planner-inline-${index + 1}.js` }));
check(inlineScripts.length > 0, "JavaScript inline del Quotation Planner valido");

check(/version:\s*["']2\.20\.0["']/.test(files.config), "versione frontend 2.20.0");
check(/SEEMAX_VERSION\s*=\s*["']seemax-management-suite-2\.20\.0["']/.test(files.backend), "versione backend 2.20.0");
check(/seemax-management-v2-20-0-lcd-products/.test(files.sw), "cache Service Worker 2.20.0");
check(/function\s+upgradeSeemaxV2200\s*\(/.test(files.backend), "upgrade v2.20.0 presente");
check(files.sw.includes("./assets/catalog/window-shop-lcd.webp"), "Window Shop nella cache PWA");
check(files.sw.includes("./assets/catalog/lcd-rotating-display.webp"), "Rotating Display nella cache PWA");
check(files.sw.includes("./assets/catalog/lcd-wall-board.webp"), "Wall Board nella cache PWA");

for (const field of ["installazione_opzioni_json", "installazione_predefinita"]) {
  check(new RegExp(`PRODOTTI_LED:[^\\n]+["']${field}["']`).test(files.backend), `colonna ${field} nello schema prodotti`);
  check(files.app.includes(`"${field}"`), `campo ${field} modificabile da ADMIN`);
}

const backendSandbox = { console };
vm.createContext(backendSandbox);
vm.runInContext(files.backend, backendSandbox);
const newProducts = backendSandbox.productDefaultsV2200_();
check(newProducts.length === 3, "tre nuovi LCD definiti");
const byId = Object.fromEntries(newProducts.map((product) => [product.id, product]));
check(byId["lcd-window-shop-high-brightness"].prezzoCina === 1000, "costo Cina Window Shop");
check(byId["lcd-window-shop-high-brightness"].prezzoAgente === 1500 && byId["lcd-window-shop-high-brightness"].prezzoCliente === 1800, "listino Window Shop");
check(byId["lcd-rotating-display-32"].prezzoAgente === 1300 && byId["lcd-rotating-display-32"].prezzoCliente === 1500, "listino Rotating Display");
check(byId["lcd-wall-board"].prezzoAgente === 1800 && byId["lcd-wall-board"].prezzoCliente === 2300, "listino Wall Board");
check(newProducts.every((product) => product.catalogo_tab === "LCD" && product.tipo_calcolo === "UNITA"), "nuovi prodotti nella categoria LCD e a quantità");
check(newProducts.every((product) => Number(product.giacenza_iniziale) === 0 && Number(product.giacenza_attuale) === 0), "nuove giacenze a zero");
check(JSON.parse(byId["lcd-window-shop-high-brightness"].installazione_opzioni_json)[0].label === "POSIZIONATO A TERRA", "Window Shop posizionato a terra");
check(JSON.parse(byId["lcd-rotating-display-32"].installazione_opzioni_json)[0].cost === 0, "Rotating Display posa a zero");
const wallOptions = JSON.parse(byId["lcd-wall-board"].installazione_opzioni_json);
check(wallOptions.length === 2 && wallOptions[0].label === "SOLO FORNITURA" && wallOptions[0].cost === 0, "Wall Board solo fornitura");
check(wallOptions[1].label === "A PARETE" && wallOptions[1].cost === 350, "Wall Board a parete 350 euro");

for (const [value, expected] of [
  ["Window Shop LCD", "lcd-window-shop-high-brightness"],
  ["LCD Rotating Display", "lcd-rotating-display-32"],
  ["LCD Wall Board", "lcd-wall-board"]
]) check(backendSandbox.canonicalProductId_(value) === expected, `ID canonico ${expected}`);

for (const asset of ["window-shop-lcd.webp", "lcd-rotating-display.webp", "lcd-wall-board.webp"]) {
  const assetPath = path.join(root, "assets/catalog", asset);
  check(fs.existsSync(assetPath) && fs.statSync(assetPath).size > 10000, `immagine ${asset} integrata`);
}

for (const id of ["lcd-totem-smx-430-cp", "lcd-window-shop-high-brightness", "lcd-rotating-display-32", "lcd-wall-board"]) {
  check(files.planner.includes(`productId:'${id}'`), `${id} presente nel Planner`);
}
check(/productId:'lcd-window-shop-high-brightness'[\s\S]{0,260}prezzoAgente:1500,\s*prezzoCliente:1800,\s*prezzoCina:1000/.test(files.planner), "listino Window Shop nel Planner");
check(/productId:'lcd-rotating-display-32'[\s\S]{0,240}prezzoAgente:1300,\s*prezzoCliente:1500/.test(files.planner), "listino Rotating Display nel Planner");
check(/productId:'lcd-wall-board'[\s\S]{0,420}prezzoAgente:1800,\s*prezzoCliente:2300[\s\S]{0,260}label:'A PARETE',cost:350/.test(files.planner), "listino e posa Wall Board nel Planner");
check(/function installSequenceIndex[\s\S]{0,300}filter\(quote => quoteUsesStandardInstallation\(quote\)\)/.test(files.planner), "LCD esclusi dagli scaglioni installazione multiprodotto");
check(/installationFixed:!usesStandardInstall/.test(files.planner), "posa LCD marcata come costo fisso");
check(/Il costo viene applicato senza scaglioni multiprodotto/.test(files.planner), "spiegazione posa LCD presente");
check(/POSIZIONATO A TERRA/.test(files.planner) && /SOLO FORNITURA/.test(files.planner), "etichette posa richieste presenti");
check(/A PARETE[\s\S]{0,30}(?:350|€350)/.test(files.planner), "costo parete visibile nella configurazione");
check(/installLabel/.test(files.planner) && /margineInstallazione/.test(files.planner), "posa e relativo valore conservati nel risultato");
check(/showInstallCost[\s\S]{0,800}installLabel/.test(files.planner), "posa inclusa nella stampa preventivo");

const plannerScript = inlineScripts.reduce((longest, current) => current.length > longest.length ? current : longest, "");
const lcdStart = plannerScript.indexOf("const lcdProducts = [");
const lcdEndMarker = "\n\n    const LOCAL_SPECIAL_DEFAULTS";
const lcdEnd = plannerScript.indexOf(lcdEndMarker, lcdStart);
check(lcdStart >= 0 && lcdEnd > lcdStart, "dati LCD estraibili dal Planner");

const plannerSandbox = {
  console,
  admin: false,
  dbNumber: (value, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  },
  extraLedProducts: [],
  ledwalls: [],
  PRODUCT_FAMILY_META: { LEDWALL: {}, EXTRA_LED: {}, LCD: {} },
  STANDARD_INSTALLATION_OPTIONS: [
    { value: "personalizza", label: "Da personalizzare", cost: null },
    { value: "autonoma", label: "Autonoma", cost: null },
    { value: "parete", label: "A parete", cost: null }
  ],
  INSTALL_IMPACT_FACTORS: [1, 0.5, 0.3],
  PROVINCE_KM: { Catania: 0, Palermo: 166 },
  COSTO_KM: 2,
  SPECIAL_PIXEL_SPECS: {},
  state: { ledQuotes: [] },
  effectiveClientUnitPrice: (model) => Number(model.prezzoCliente || 0),
  effectiveAgentUnitPrice: (model) => Number(model.prezzoAgente || 0),
  hasClientPromo: () => false,
  hasAgentPromo: () => false,
  installationBaseCost: () => 0,
  stockProductIdForItem: (model) => model.productId || "",
  installLabelFromValue: (value) => value
};
vm.createContext(plannerSandbox);
const lcdDeclaration = plannerScript.slice(lcdStart, lcdEnd) + "\nthis.lcdProducts = lcdProducts;";
vm.runInContext(lcdDeclaration, plannerSandbox);
for (const name of [
  "parseInstallationOptions", "normalizeProductFamily", "productsForFamily", "productById", "quoteProductModel",
  "quoteUsesStandardInstallation", "quoteInstallationOptions", "quoteInstallationOption", "quoteSupportsInstallation",
  "installImpactFactor", "installSequenceIndex", "installMultiplierLabel", "isExactModuleMultiple", "buildSpecialProductResult"
]) vm.runInContext(functionSource(plannerScript, name), plannerSandbox);

function model(id) {
  return plannerSandbox.lcdProducts.find((product) => product.productId === id);
}
function result(id, overrides = {}, quoteIndex = 0) {
  const product = model(id);
  const quote = {
    productFamily: "LCD",
    productId: id,
    quantity: "1",
    install: product.installationDefault,
    installCustom: "0",
    province: "Catania",
    commission: "0",
    bif: false,
    ...overrides
  };
  return plannerSandbox.buildSpecialProductResult(product, quote, quoteIndex);
}

const windowShop = result("lcd-window-shop-high-brightness", { quantity: "2" });
check(windowShop.prezzoAgenteTotale === 3000 && windowShop.prezzoClienteTotale === 3600, "Window Shop calcolato a quantità");
check(windowShop.installLabel === "POSIZIONATO A TERRA" && windowShop.margineInstallazione === 0, "Window Shop a terra senza costo");
check(windowShop.margineCliente === 1600 && windowShop.costoCinaBase === 2000, "margine Window Shop usa il costo Cina");

const rotating = result("lcd-rotating-display-32", { province: "Palermo", commission: "100" });
check(rotating.prezzoAgenteTotale === 1732 && rotating.prezzoClienteTotale === 1932, "Rotating Display include trasferta e provvigione");
check(rotating.installLabel === "POSIZIONATO A TERRA" && rotating.margineInstallazione === 0, "Rotating Display a terra senza costo");

const wallSupply = result("lcd-wall-board");
check(wallSupply.prezzoAgenteTotale === 1800 && wallSupply.prezzoClienteTotale === 2300, "Wall Board solo fornitura");
check(wallSupply.installLabel === "SOLO FORNITURA" && wallSupply.margineInstallazione === 0, "etichetta solo fornitura");
const wallMounted = result("lcd-wall-board", { install: "wall_lcd" });
check(wallMounted.prezzoAgenteTotale === 2150 && wallMounted.prezzoClienteTotale === 2650, "Wall Board a parete aggiunge 350 euro");
check(wallMounted.installLabel === "A PARETE" && wallMounted.margineInstallazione === 350 && wallMounted.installMultiplier === 1, "montaggio Wall Board fisso e non scalato");

plannerSandbox.state.ledQuotes = [
  { productFamily: "LEDWALL" },
  { productFamily: "LCD" },
  { productFamily: "EXTRA_LED" },
  { productFamily: "LCD" },
  { productFamily: "LEDWALL" }
];
check(plannerSandbox.installSequenceIndex(4) === 2, "due LCD non consumano gli scaglioni 100/50/30");

check(/withMutationLock_\(function \(\)/.test(files.backend), "lock multiutente preservati");
check(/record_version/.test(files.backend) && /request_token/.test(files.backend), "versionamento e idempotenza preservati");
check(/savequote:\s*true/.test(files.backend) && /loadquote_agent:\s*true/.test(files.backend), "archivio preventivi preservato");
check(!/^(?:<<<<<<< |=======|>>>>>>> )/m.test(Object.values(files).join("\n")), "assenza marcatori di conflitto");

console.log(`OK - ${checks} controlli release v2.20.0 superati.`);
