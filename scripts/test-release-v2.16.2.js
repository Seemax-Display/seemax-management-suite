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
  sw: read("sw.js"),
  planner: read("quotation-planner/index.html"),
  plannerNative: read("assets/js/planner-native.js")
};

let checks = 0;
function check(condition, message) {
  checks += 1;
  if (!condition) throw new Error(`TEST FALLITO [${checks}]: ${message}`);
}

for (const [name, source] of Object.entries({ app: files.app, api: files.api, config: files.config, backend: files.backend, sw: files.sw, plannerNative: files.plannerNative })) {
  new vm.Script(source, { filename: name });
  check(true, `sintassi ${name}`);
}

const inlineScripts = Array.from(files.planner.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))
  .map((match) => match[1])
  .filter((source) => source.trim());
inlineScripts.forEach((source, index) => new vm.Script(source, { filename: `quotation-planner-inline-${index + 1}.js` }));
check(inlineScripts.length > 0, "JavaScript inline Quotation Planner valido");

check(/version:\s*["']2\.16\.2["']/.test(files.config), "versione frontend 2.16.2");
check(/SEEMAX_VERSION\s*=\s*["']seemax-management-suite-2\.16\.2["']/.test(files.backend), "versione backend 2.16.2");
check(/seemax-management-v2-16-2-practice-prefixes/.test(files.sw), "cache Service Worker 2.16.2");
check(/upgradeSeemaxV2162/.test(files.backend), "upgrade 2.16.2 presente");
check(/prefisso_pratica/.test(files.backend) && /prefisso_pratica/.test(files.app), "prefisso pratica condiviso tra backend e frontend");
check(/payload\.id\s*=\s*["']{2}/.test(files.backend), "ID di anteprima azzerato per una pratica nuova");
check(/record\.id\s*=\s*["']TMP-["']\s*\+\s*record\.request_token/.test(files.app), "ID ottimistico temporaneo e univoco");
check(/nextPracticeIdentifier_\(numberingUser\)/.test(files.backend), "numero definitivo generato dal server");
check(/withMutationLock_\(function \(\) \{ return managementUpsertLocked_/.test(files.backend), "salvataggio pratica protetto da ScriptLock");
check(/record_version/.test(files.backend) && /request_token/.test(files.backend), "versionamento e idempotenza conservati");
check(/SpreadsheetApp\.flush\(\);[\s\S]{0,500}lock\.releaseLock\(\)/.test(files.backend), "flush eseguito prima del rilascio lock");
check(/validatePracticePrefixForAccountV2162_/.test(files.backend), "unicità prefisso validata al salvataggio agente");
check(/non può essere modificato perché l’agente possiede già pratiche/.test(files.backend), "prefisso storico protetto dalle modifiche");
check(/Prefisso pratiche/.test(files.app), "campo prefisso disponibile all'ADMIN");
check(/MPL → MPL0001/.test(files.app), "microcopy prefisso esteso presente");
check(/current\.__sync_new_record\s*&&\s*current\.request_token/.test(files.app), "retry conserva il token originale");
check(/function replaceLocalEntity/.test(files.app) && /request_token/.test(files.app.slice(files.app.indexOf("function replaceLocalEntity"), files.app.indexOf("function markLocalEntitySyncFailed"))), "riga temporanea sostituita tramite token");

// Regressioni principali delle release precedenti.
check(/savequote:\s*true/.test(files.backend), "salvataggio preventivi sul ponte nativo");
check(/listquotes:\s*true/.test(files.backend) && /loadquote_agent:\s*true/.test(files.backend), "archivio preventivi ADMIN preservato");
check(/async function saveQuotation/.test(files.api), "preventivi in background preservati");
check(/management_upload_document/.test(files.api), "upload documenti preservato");
check(/startInventoryProgress/.test(files.app) && /management_inventory_adjust/.test(files.backend), "magazzino in background preservato");
check(/showPatchNotesMessage\(true\)/.test(files.app), "pubblicazione patch notes preservata");
check(files.app.includes("☷ IN DETTAGLIO") && files.app.includes("▦ PER TIPOLOGIA"), "modalità pratiche preservate");
check(!/^(?:<<<<<<< |=======|>>>>>>> )/m.test(Object.values(files).join("\n")), "assenza marcatori di conflitto");
check(!/function publicUser rectified/.test(files.backend), "firma publicUser valida");

const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(files.backend, sandbox);
const assignment = sandbox.allocatePracticePrefixesV2162_([
  { username: "michele", nome_visualizzato: "Michele Purgino" },
  { username: "mario", nome_visualizzato: "Mario Platania" }
], [
  { numero: "MP0001", id: "PR-MP0001", agent_username: "michele", agente: "Michele Purgino" }
]);
check(assignment.michele === "MP", "Michele Purgino conserva MP");
check(assignment.mario === "MPL", "Mario Platania riceve MPL");
check(new Set(Object.values(assignment)).size === 2, "prefissi finali univoci");

console.log(`Test rilascio Seemax 2.16.2 OK: ${checks} controlli.`);
