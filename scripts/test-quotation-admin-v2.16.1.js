const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const backend = fs.readFileSync(path.join(root, 'apps-script/Code.gs'), 'utf8');
const planner = fs.readFileSync(path.join(root, 'quotation-planner/index.html'), 'utf8');

let checks = 0;
function check(condition, message) {
  checks += 1;
  if (!condition) throw new Error(`TEST FALLITO [${checks}]: ${message}`);
}

const records = [
  {
    id_preventivo: '11-26', agent_username: 'admin', agent_display_name: 'Amministratore',
    data_salvataggio: '2026-09-09T08:00:00.000Z', cliente_visibile: 'Cliente Admin',
    payload_criptato: 'cipher-admin', salt: 'salt', iv: 'iv', payload_json_completo: '{"owner":"admin"}',
    password_visibile: 'ACCESSO_ADMIN', agent_key: 'ADMIN-KEY', saved_by_login: 'SI'
  },
  {
    id_preventivo: '12-26', agent_username: 'mario', agent_display_name: 'Mario Rossi',
    data_salvataggio: '2026-09-09T10:00:00.000Z', cliente_visibile: 'Cliente Mario',
    payload_criptato: 'cipher-mario', salt: 'salt', iv: 'iv', payload_json_completo: '{"owner":"mario"}',
    password_visibile: 'ACCESSO_AGENTE', agent_key: 'MARIO-KEY', saved_by_login: 'SI'
  },
  {
    id_preventivo: '13-26', agent_username: 'anna', agent_display_name: 'Anna Verdi',
    data_salvataggio: '2026-09-08T10:00:00.000Z', cliente_visibile: 'Cliente Anna',
    payload_criptato: 'cipher-anna', salt: 'salt', iv: 'iv', payload_json_completo: '{"owner":"anna"}',
    password_visibile: 'ACCESSO_AGENTE', agent_key: 'ANNA-KEY', saved_by_login: 'SI'
  },
  {
    id_preventivo: '10-26', agent_username: '', agent_display_name: '',
    data_salvataggio: '2026-09-01T10:00:00.000Z', cliente_visibile: 'Cliente Esterno',
    payload_criptato: 'cipher-public', salt: 'salt', iv: 'iv', payload_json_completo: '{"owner":"external"}',
    password_visibile: 'PUBLIC-PASSWORD', saved_by_login: 'NO', save_request_token: 'manual-token'
  }
];

let activeUser = {username: 'admin', ruolo: 'ADMIN'};
const backendSandbox = {
  authenticate_: () => ({...activeUser}),
  isAdmin_: (user) => String(user && user.ruolo || '').toUpperCase() === 'ADMIN',
  rowsToObjects_: () => records.map((record) => ({...record})),
  sheet_: () => ({}),
  findRowObject_: (_sheet, _field, id) => {
    const record = records.find((entry) => entry.id_preventivo === id);
    return record ? {...record} : null;
  },
  cloneObject_: (value) => ({...value})
};
vm.createContext(backendSandbox);
const backendStart = backend.indexOf('function listQuotes_');
const backendEnd = backend.indexOf('function deleteQuoteAgent_', backendStart);
check(backendStart >= 0 && backendEnd > backendStart, 'funzioni backend preventivi individuate');
vm.runInContext(backend.slice(backendStart, backendEnd), backendSandbox);

const adminList = backendSandbox.listQuotes_({});
check(adminList.admin_view === true && adminList.quotes.length === 4, 'ADMIN riceve tutti i preventivi');
check(adminList.quotes.every((quote) => Object.prototype.hasOwnProperty.call(quote, 'agent_display_name')), 'ADMIN riceve l’autore di ogni preventivo');
check(adminList.quotes[0].id_preventivo === '12-26', 'lista iniziale ordinata per data più recente');

activeUser = {username: 'mario', ruolo: 'AGENTE'};
const agentList = backendSandbox.listQuotes_({});
check(agentList.admin_view === false && agentList.quotes.length === 1, 'agente riceve soltanto il proprio archivio');
check(!Object.prototype.hasOwnProperty.call(agentList.quotes[0], 'agent_display_name'), 'opzioni di attribuzione non esposte nella lista agente');

activeUser = {username: 'admin', ruolo: 'ADMIN'};
const foreignLoad = backendSandbox.loadQuoteAgent_({id_preventivo: '12-26'});
check(foreignLoad.authorized_payload_json === '{"owner":"mario"}', 'ADMIN riceve la copia autorizzata del preventivo agente');
check(foreignLoad.foreign_quote === true && foreignLoad.requested_by_admin === true, 'risposta identifica il caricamento amministrativo altrui');
check(!Object.prototype.hasOwnProperty.call(foreignLoad, 'payload_json_completo') && !Object.prototype.hasOwnProperty.call(foreignLoad, 'password_visibile'), 'campi grezzi sensibili rimossi dalla risposta');
check(!Object.prototype.hasOwnProperty.call(foreignLoad, 'agent_key'), 'chiave account rimossa dalla risposta autenticata');
check(!Object.prototype.hasOwnProperty.call(foreignLoad, 'payload_criptato'), 'risposta ADMIN altrui non duplica il contenuto cifrato');

const ownAdminLoad = backendSandbox.loadQuoteAgent_({id_preventivo: '11-26'});
check(!ownAdminLoad.authorized_payload_json && ownAdminLoad.foreign_quote === false, 'preventivo proprio ADMIN resta sul percorso cifrato originale');

activeUser = {username: 'mario', ruolo: 'AGENTE'};
const ownAgentLoad = backendSandbox.loadQuoteAgent_({id_preventivo: '12-26'});
check(ownAgentLoad.payload_criptato === 'cipher-mario' && !ownAgentLoad.authorized_payload_json, 'agente apre il proprio preventivo cifrato');
let blocked = false;
try { backendSandbox.loadQuoteAgent_({id_preventivo: '13-26'}); } catch (error) { blocked = /non autorizzato/i.test(error.message); }
check(blocked, 'agente non può aprire il preventivo di un altro agente');

let protectedPublicBlocked = false;
try { backendSandbox.loadQuotePublic_({id_preventivo: '12-26'}); } catch (error) { protectedPublicBlocked = /protetto da account/i.test(error.message); }
check(protectedPublicBlocked, 'percorso pubblico non apre preventivi salvati con account');
const publicLoad = backendSandbox.loadQuotePublic_({id_preventivo: '10-26'});
check(publicLoad.payload_criptato === 'cipher-public' && publicLoad.save_request_token === 'manual-token', 'percorso con password conserva i dati cifrati necessari');
check(!publicLoad.payload_json_completo && !publicLoad.password_visibile && !publicLoad.agent_key, 'percorso pubblico non espone JSON, password o chiavi');

const stateStart = planner.indexOf('const agentQuoteArchiveState =');
const stateEnd = planner.indexOf('async function openAgentQuoteListModal()', stateStart);
check(stateStart >= 0 && stateEnd > stateStart, 'motore ordinamento Planner individuato');
const plannerSandbox = {
  Intl, Date, Number, Set, String,
  safe: (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[character])),
  agentSession: {username: 'admin', displayName: 'Amministratore'},
  document: {querySelectorAll: () => []},
  $: () => null
};
vm.createContext(plannerSandbox);
vm.runInContext(planner.slice(stateStart, stateEnd) + '\nthis.quoteTest={state:agentQuoteArchiveState, visible:visibleAgentArchiveQuotes, render:renderAgentQuoteArchive};', plannerSandbox);
const quoteTest = plannerSandbox.quoteTest;
quoteTest.state.quotes = adminList.quotes.slice();
quoteTest.state.sortBy = 'date';
quoteTest.state.direction = 'desc';
check(quoteTest.visible()[0].id_preventivo === '12-26', 'ordinamento data decrescente corretto');
quoteTest.state.sortBy = 'agent';
quoteTest.state.direction = 'asc';
check(quoteTest.visible().map((quote) => quote.agent_display_name).join('|') === 'Accesso esterno|Amministratore|Anna Verdi|Mario Rossi', 'ordinamento alfabetico agente corretto');
quoteTest.state.filterAgent = 'anna';
check(quoteTest.visible().length === 1 && quoteTest.visible()[0].id_preventivo === '13-26', 'filtro per agente corretto');
quoteTest.state.filterAgent = '';
quoteTest.state.adminView = true;
const adminPanel = {innerHTML: ''};
quoteTest.render(adminPanel);
check(adminPanel.innerHTML.includes('adminQuoteAgentFilter') && adminPanel.innerHTML.includes('adminQuoteSortBy'), 'controlli di organizzazione renderizzati per ADMIN');
check((adminPanel.innerHTML.match(/Creato da:/g) || []).length === 4, 'autore renderizzato su ogni scheda ADMIN');
quoteTest.state.adminView = false;
const agentPanel = {innerHTML: ''};
quoteTest.render(agentPanel);
check(!agentPanel.innerHTML.includes('adminQuoteAgentFilter') && !agentPanel.innerHTML.includes('Creato da:'), 'controlli e autore assenti nella vista AGENTE');

check(/if\(record\.authorized_payload_json\)[\s\S]{0,180}JSON\.parse\(record\.authorized_payload_json\)/.test(planner), 'Planner applica il payload autorizzato ADMIN');
check(/const adminTools = adminView \?/.test(planner), 'controlli archivio costruiti soltanto per ADMIN');
check(/const owner = adminView \?/.test(planner), 'autore mostrato soltanto sulle schede ADMIN');
check(/typeof nativeApi\.listQuotations === 'function'/.test(planner), 'elenco preferisce il collegamento nativo');
check(/typeof nativeApi\.loadQuotation === 'function'/.test(planner), 'caricamento preferisce il collegamento nativo');
check(/typeof nativeApi\.deleteQuotation === 'function'/.test(planner), 'eliminazione preferisce il collegamento nativo');
check(/\["action", "requestId", "agent_key"\]/.test(backend), 'chiave di autenticazione esclusa dai nuovi record');
check(/function clearArchivedQuoteKeysV2161_/.test(backend), 'upgrade rimuove le chiavi archiviate in precedenza');

let archiveKeyColumnCleared = false;
let archiveCacheInvalidated = false;
const cleanupSandbox = {
  sheet_: () => ({
    getLastRow: () => 4,
    getRange: () => ({
      getDisplayValues: () => [['MARIO-KEY'], [''], ['ANNA-KEY']],
      clearContent: () => { archiveKeyColumnCleared = true; }
    })
  }),
  sheetHeaders_: () => ['id_preventivo', 'agent_key'],
  invalidateTable_: (name) => { archiveCacheInvalidated = name === 'ARCHIVIO_PREVENTIVI'; }
};
vm.createContext(cleanupSandbox);
const cleanupStart = backend.indexOf('function clearArchivedQuoteKeysV2161_');
const cleanupEnd = backend.indexOf('/* Azzeramento di lancio', cleanupStart);
vm.runInContext(backend.slice(cleanupStart, cleanupEnd), cleanupSandbox);
check(cleanupSandbox.clearArchivedQuoteKeysV2161_() === 2 && archiveKeyColumnCleared, 'upgrade svuota tutte le chiavi account storiche');
check(archiveCacheInvalidated, 'cache archivio invalidata dopo la pulizia delle chiavi');

console.log(`Test preventivi ADMIN 2.16.1 OK: ${checks} controlli.`);
