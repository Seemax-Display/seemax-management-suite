const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.resolve(__dirname, "../apps-script/Code.gs"), "utf8");
const sandbox = { console, Date, JSON, Math, Error, Object, Array, String, Number, Boolean, RegExp, isNaN, parseInt, parseFloat };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: "Code.gs" });

let checks = 0;
function check(condition, message) {
  checks += 1;
  if (!condition) throw new Error(`TEST FALLITO [${checks}]: ${message}`);
}

// Il ponte ammette soltanto azioni dichiarate e conserva requestId/parametri.
let executed = null;
sandbox.executeManagementRequest_ = (action, params, requestId) => {
  executed = { action, params: JSON.parse(JSON.stringify(params)), requestId };
  return { ok: true, row: { id: "cli-test" }, completed_at: new Date("2026-08-31T12:00:00.000Z") };
};
let response = sandbox.managementBridgeRpc({
  action: "management_upsert",
  requestId: "mutation-save-test",
  params: { entity: "clients", payload: "{}" }
});
check(response.ok === true && response.row.id === "cli-test", "risposta RPC serializzata");
check(executed.action === "management_upsert", "azione consentita inoltrata");
check(executed.requestId === "mutation-save-test" && executed.params.requestId === "mutation-save-test", "requestId conservato");
response = sandbox.managementBridgeRpc({ action: "nextquote", requestId: "next-quote-test", params: { quote_scope: "ADMIN" } });
check(response.ok === true && executed.action === "nextquote", "numero preventivo ammesso sul ponte nativo");
response = sandbox.managementBridgeRpc({ action: "savequote", requestId: "save-quote-test", params: { id_preventivo: "151-26" } });
check(response.ok === true && executed.action === "savequote", "salvataggio preventivo ammesso sul ponte nativo");
response = sandbox.managementBridgeRpc({ action: "management_bootstrap", params: {} });
check(response.ok === false && /non consentita/i.test(response.error), "lettura non prevista rifiutata dal ponte");
check(sandbox.allowedFrontendOrigin_("https://seemax-display.github.io/") === "https://seemax-display.github.io", "origine produzione ammessa");
check(sandbox.allowedFrontendOrigin_("https://example.invalid") === "", "origine estranea rifiutata");
check(sandbox.inlineJsonForScript_("</script>").includes("\\u003c"), "testo inline protetto");

// Le email vengono convertite in righe durevoli senza chiamare MailApp.
let emailRows = null;
const emailHeaders = sandbox.SHEET_SCHEMAS.EMAIL_CODA.slice();
sandbox.sheet_ = (name) => {
  check(name === "EMAIL_CODA", "foglio coda corretto");
  return {
    getLastRow: () => 1,
    getRange: (row, column, rowCount, columnCount) => ({
      setValues(values) {
        check(row === 2 && column === 1, "append coda dalla prima riga dati");
        check(rowCount === values.length && columnCount === emailHeaders.length, "dimensione append coda corretta");
        emailRows = values;
      }
    })
  };
};
sandbox.sheetHeaders_ = () => emailHeaders.slice();
sandbox.uid_ = () => "mail-test";
sandbox.performanceEvent_ = () => {};
sandbox.invalidateTable_ = () => {};
sandbox.RUNTIME_DEFERRED_EMAILS_ = [{
  actor: { username: "admin.test" },
  notificationId: "not-test",
  message: { to: "agente@example.com", subject: "Esito", name: "Seemax", body: "Testo", htmlBody: "<p>Testo</p>" }
}];
sandbox.queueDeferredEmailsLocked_();
check(Array.isArray(emailRows) && emailRows.length === 1, "email accodata in una riga");
const queued = Object.fromEntries(emailHeaders.map((header, index) => [header, emailRows[0][index]]));
check(queued.status === "PENDING" && queued.attempts === 0, "stato iniziale coda corretto");
check(queued.to === "agente@example.com" && queued.notification_id === "not-test", "destinatario e notifica conservati");
check(sandbox.RUNTIME_DEFERRED_EMAILS_.length === 0, "coda runtime svuotata dopo la persistenza");

// Il worker invia fuori dal percorso della mutazione e finalizza l'elemento.
const pending = [{ id: "mail-test", to: "agente@example.com", subject: "Esito", sender_name: "Seemax", body: "Testo", html_body: "<p>Testo</p>" }];
let sent = null;
let finished = null;
sandbox.resetRuntimeCaches_ = () => {};
sandbox.claimNextEmailV2151_ = () => pending.shift() || null;
sandbox.MailApp = { sendEmail: (message) => { sent = message; } };
sandbox.finishEmailQueueItemV2151_ = (item, error) => { finished = { item, error }; };
response = sandbox.processEmailQueueV2151();
check(response.processed === 1, "worker elabora l'email disponibile");
check(sent && sent.to === "agente@example.com", "MailApp chiamato dal worker");
check(finished && finished.item.id === "mail-test" && finished.error === null, "email finalizzata senza errore");

// Il login aggiorna una sola cella e non richiede il lock globale.
let loginWrite = null;
sandbox.findRowRecord_ = () => ({ rowIndex: 4 });
sandbox.sheetHeaders_ = () => ["username", "ultimo_accesso"];
sandbox.sheet_ = () => ({
  getRange(row, column) {
    return { setValue(value) { loginWrite = { row, column, value }; } };
  }
});
sandbox.invalidateTable_ = () => {};
check(sandbox.touchLoginBestEffort_("agente.test") === true, "ultimo accesso aggiornato");
check(loginWrite && loginWrite.row === 4 && loginWrite.column === 2, "scritta soltanto la cella ultimo_accesso");

// Il numero preventivo scansiona solo il sottoinsieme iniziale una volta,
// poi usa PropertiesService senza rileggere ARCHIVIO_PREVENTIVI.
const quoteHeaders = sandbox.SHEET_SCHEMAS.ARCHIVIO_PREVENTIVI.slice();
const quoteRows = [
  ["120-26", "", "ADMIN", "", "", 120],
  ["45-26", "", "AGENTE", "", "", 45],
  ["150-25", "", "ADMIN", "", "", 150]
];
let quoteRangeReads = 0;
sandbox.sheetHeaders_ = () => quoteHeaders;
sandbox.sheet_ = (name) => {
  check(name === "ARCHIVIO_PREVENTIVI", "foglio contatore preventivi corretto");
  return {
    getLastRow: () => quoteRows.length + 1,
    getRange(row, column, rowCount, columnCount) {
      quoteRangeReads += 1;
      check(row === 2 && column === 1 && rowCount === 3 && columnCount === 6, "lettura iniziale limitata alle colonne necessarie");
      return { getValues: () => quoteRows.map((values) => values.slice()) };
    }
  };
};
const quoteProperties = new Map();
sandbox.PropertiesService = {
  getScriptProperties: () => ({
    getProperty: (key) => quoteProperties.has(key) ? quoteProperties.get(key) : null,
    setProperty: (key, value) => { quoteProperties.set(key, String(value)); }
  })
};
const rebuilt = sandbox.rebuildQuoteCountersV2151_();
check(rebuilt.ADMIN === 150 && rebuilt.AGENTE === 45, "massimi preventivo ricostruiti per profilo");
check(quoteRangeReads === 1, "archivio preventivi letto una sola volta durante la migrazione");
sandbox.getSettings_ = () => ({ numero_preventivo_admin_iniziale: 100, numero_preventivo_agenti_iniziale: 1 });
sandbox.sheet_ = () => { throw new Error("ARCHIVIO_PREVENTIVI non deve essere riletto"); };
const nextAdmin = sandbox.nextQuote_({ quote_scope: "ADMIN" });
const nextAgent = sandbox.nextQuote_({ quote_scope: "AGENTE" });
check(nextAdmin.next_num === "151" && nextAgent.next_num === "46", "numero successivo letto dai contatori persistenti");
sandbox.rememberQuoteCounter_("ADMIN", "160-26");
check(sandbox.nextQuote_({ quote_scope: "ADMIN" }).next_num === "161", "salvataggio aggiorna il contatore successivo");

// Il preventivo usa lo stesso lock globale delle altre mutazioni e lo stesso
// token restituisce il risultato precedente senza una seconda scrittura.
let quoteLockCalls = 0;
let quoteWrites = 0;
let quoteLogs = 0;
let storedQuote = null;
sandbox.withMutationLock_ = (callback) => { quoteLockCalls += 1; return callback(); };
sandbox.authenticate_ = () => ({ username: "agente.test", nome_visualizzato: "Agente Test", ruolo: "AGENTE" });
sandbox.findRowObject_ = () => storedQuote ? { ...storedQuote } : null;
sandbox.upsertObject_ = (_sheet, _key, _id, record) => { quoteWrites += 1; storedQuote = { ...record }; return { ...record }; };
sandbox.log_ = () => { quoteLogs += 1; };
response = sandbox.saveQuotation_({
  id_preventivo: "46-26", numero_preventivo: "46-26", quote_scope: "AGENTE",
  saved_by_login: "SI", agent_username: "agente.test", agent_key: "secret",
  save_request_token: "quote-request-test"
});
check(response.ok === true && response.id_preventivo === "46-26", "preventivo salvato con risposta minima");
check(quoteWrites === 1 && quoteLogs === 1 && quoteLockCalls === 1, "prima richiesta scrive una sola volta sotto lock");
response = sandbox.saveQuotation_({
  id_preventivo: "46-26", numero_preventivo: "46-26", quote_scope: "AGENTE",
  saved_by_login: "SI", agent_username: "agente.test", agent_key: "secret",
  save_request_token: "quote-request-test"
});
check(response.ok === true && response.duplicate === true, "retry preventivo riconosciuto come duplicato");
check(quoteWrites === 1 && quoteLogs === 1, "retry non riscrive e non duplica il log");
response = sandbox.saveQuotation_({
  id_preventivo: "46-26", numero_preventivo: "46-26", quote_scope: "AGENTE",
  saved_by_login: "SI", agent_username: "agente.test", agent_key: "secret",
  save_request_token: "quote-request-different"
});
check(response.ok === false && response.error_code === "QUOTE_NUMBER_CHANGED", "collisione tra agenti restituisce un nuovo numero");

console.log(`Backend optimization test 2.15.2 OK: ${checks} controlli.`);
