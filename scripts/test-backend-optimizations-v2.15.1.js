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

console.log(`Backend optimization test 2.15.1 OK: ${checks} controlli.`);
