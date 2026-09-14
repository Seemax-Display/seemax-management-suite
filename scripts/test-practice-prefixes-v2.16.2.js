const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const backend = read("apps-script/Code.gs");
const app = read("assets/js/app.js");
const config = read("assets/js/config.js");
const sw = read("sw.js");

let checks = 0;
function check(condition, message) {
  checks += 1;
  if (!condition) throw new Error(`TEST FALLITO [${checks}]: ${message}`);
}

check(/version:\s*["']2\.16\.2["']/.test(config), "frontend 2.16.2");
check(/SEEMAX_VERSION\s*=\s*["']seemax-management-suite-2\.16\.2["']/.test(backend), "backend 2.16.2");
check(/seemax-management-v2-16-2-practice-prefixes/.test(sw), "cache PWA 2.16.2");
check(/AGENTI:\s*\[[^\]]*["']prefisso_pratica["']/.test(backend), "colonna prefisso pratica nello schema AGENTI");
check(/function upgradeSeemaxV2162\s*\(/.test(backend), "funzione upgrade 2.16.2 presente");
check(/assignUniquePracticePrefixesV2162_\(\);/.test(backend), "migrazione prefissi richiamata dall'upgrade/setup");
check(/prefisso_pratica:\s*practiceInitials_\(user\)/.test(backend), "prefisso esposto al frontend");
check(/configuredPrefix[\s\S]{0,180}user\s*&&\s*user\.prefisso_pratica/.test(app), "anteprima usa il prefisso persistente");
check(/record\.id\s*=\s*["']TMP-["']\s*\+\s*record\.request_token/.test(app), "nuova pratica usa ID locale provvisorio");
check(/current\.__sync_new_record\s*&&\s*current\.request_token/.test(app), "retry conserva il token idempotente");

const newFlag = backend.indexOf("var isNewPractice =");
const clearId = backend.indexOf('payload.id = "";', newFlag);
const previousLookup = backend.indexOf('var previousPractice = payload.id ?', newFlag);
check(newFlag >= 0 && clearId > newFlag && previousLookup > clearId, "ID anteprima ignorato prima della ricerca della pratica storica");
check(/if \(String\(payload\.nuova_pratica[\s\S]{0,180}payload\.numero = nextPracticeIdentifier_\(numberingUser\)[\s\S]{0,100}payload\.id = ["']PR-["'] \+ payload\.numero/.test(backend), "numero e ID definitivi assegnati dal backend");
check(/match\(\/\^\(\[A-Z\]\[A-Z0-9\]\{0,5\}\)\(\\d\{4\}\)\$\//.test(backend), "ricostruzione contatori accetta prefissi fino a sei caratteri");

const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(backend, sandbox);

const users = [
  { username: "michele", nome_visualizzato: "Michele Purgino", prefisso_pratica: "" },
  { username: "mario", nome_visualizzato: "Mario Platania", prefisso_pratica: "" }
];
const practices = [
  { numero: "MP0001", id: "PR-MP0001", agent_username: "michele", agente: "Michele Purgino", stato: "Completata" }
];
const assigned = sandbox.allocatePracticePrefixesV2162_(users, practices);
check(assigned.michele === "MP", "Michele Purgino conserva il prefisso storico MP");
check(assigned.mario === "MPL", "Mario Platania riceve il prefisso univoco MPL");
check(new Set(Object.values(assigned)).size === Object.keys(assigned).length, "prefissi assegnati senza duplicati");
check(sandbox.practicePrefixFromNumberV2162_("MPL0001") === "MPL", "prefisso MPL riconosciuto dal numero pratica");
check(sandbox.discoverPracticeCounter_("MPL", ["MP0009", "MPL0001", "MPL0004"]) === 4, "contatore MPL ricostruito correttamente");

const concurrent = sandbox.allocatePracticePrefixesV2162_(users.concat([
  { username: "marta", nome_visualizzato: "Marta Platania", prefisso_pratica: "" }
]), practices);
check(new Set(Object.values(concurrent)).size === 3, "collisione futura risolta anche con un terzo agente");

const historicalCollision = sandbox.allocatePracticePrefixesV2162_(users, practices.concat([
  { numero: "MP0002", id: "PR-MP0002", agent_username: "mario", agente: "Mario Platania" },
  { numero: "MP0003", id: "PR-MP0003", agent_username: "mario", agente: "Mario Platania" }
]));
check(historicalCollision.michele === "MP" && historicalCollision.mario === "MPL", "la serie resta al proprietario di MP0001 anche se esistono righe storiche successive");

sandbox.sheet_ = (name) => name;
sandbox.rowsToObjects_ = (name) => name === "AGENTI" ? users : practices;
check(sandbox.practiceInitials_(users[1]) === "MPL", "fallback runtime assegna MPL anche se l'upgrade non è stato ancora eseguito");

const headers = ["username", "nome_visualizzato", "prefisso_pratica"];
const agentValues = [["michele", "Michele Purgino", ""], ["mario", "Mario Platania", ""]];
let writtenPrefixes = null;
const agentSheet = {
  getLastRow: () => 3,
  getRange: (row, column, rowCount, columnCount) => ({
    getDisplayValues: () => agentValues.map((values) => values.slice()),
    setValues: (values) => { writtenPrefixes = values; }
  })
};
sandbox.sheet_ = (name) => name === "AGENTI" ? agentSheet : "PRATICHE";
sandbox.sheetHeaders_ = () => headers.slice();
sandbox.rowsToObjects_ = (sheet) => sheet === "PRATICHE" ? practices : [];
sandbox.invalidateTable_ = () => {};
const migration = sandbox.assignUniquePracticePrefixesV2162_();
check(migration.updated === 2, "migrazione rileva entrambi i prefissi da compilare");
check(JSON.stringify(writtenPrefixes) === JSON.stringify([["MP"], ["MPL"]]), "migrazione scrive MP e MPL nella sola colonna tecnica");

let historicalIdLookup = false;
sandbox.assertWritePermission_ = () => {};
sandbox.assertAdminUnknownUsage_ = () => {};
sandbox.findRowObject_ = (sheet, field, value) => {
  if (sheet === "PRATICHE" && field === "id" && value === "PR-MP0001") {
    historicalIdLookup = true;
    return { id: value, numero: "MP0001", stato: "Completata", agent_username: "michele" };
  }
  if (sheet === "CLIENTI" && field === "id") return { id: value, ragioneSociale: "Cliente test" };
  return null;
};
sandbox.canAccessClient_ = () => true;
sandbox.normalizePracticeLedwallConfigurations_ = () => {};
sandbox.completeClientFromPractice_ = () => {};
sandbox.validatePracticeRequiredFields_ = () => {};
sandbox.logRoutineUpsert_ = () => {};
sandbox.upsertPracticeWithInventory_ = (payload) => ({ ...payload, id: "PR-MPL0001", numero: "MPL0001", nuova_pratica: undefined });
const flow = sandbox.managementUpsertLocked_({}, { username: "mario", nome_visualizzato: "Mario Platania", ruolo: "ADMIN" }, "practices", {
  id: "PR-MP0001", numero: "MP0001", nuova_pratica: "SI", request_token: "req-test", agent_username: "mario", clientId: "cli-1", stato: "Bocciata", tipo_pratica: "NOLEGGIO"
});
check(!historicalIdLookup, "una nuova pratica non consulta l'ID storico derivato dall'anteprima");
check(flow.row.id === "PR-MPL0001" && flow.row.numero === "MPL0001", "il flusso accetta il nuovo ID assegnato dal server");

console.log(`Test prefissi pratiche 2.16.2 OK: ${checks} controlli.`);
