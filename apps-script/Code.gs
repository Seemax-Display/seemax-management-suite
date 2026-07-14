/**
 * SEEMAX MANAGEMENT SUITE + QUOTATION PLANNER
 * Backend Google Apps Script compatibile con GitHub Pages.
 *
 * INSTALLAZIONE RAPIDA
 * 1. Apri il Foglio Google > Estensioni > Apps Script.
 * 2. Sostituisci Code.gs con questo file.
 * 3. Esegui una volta setupSeemaxDatabase() e autorizza lo script.
 * 4. Distribuisci come Applicazione Web: esegui come "Me", accesso "Chiunque".
 * 5. Copia l'URL /exec in assets/js/config.js.
 */

var SEEMAX_VERSION = "seemax-management-suite-1.0.0";
var ENTITY_SHEETS = {
  products: "PRODOTTI_LED",
  clients: "CLIENTI",
  practices: "PRATICHE",
  documents: "DOCUMENTI",
  activities: "ATTIVITA",
  users: "AGENTI"
};

var SHEET_SCHEMAS = {
  AGENTI: ["username", "chiave_id_agente", "nome_visualizzato", "email", "telefono", "stato", "ruolo", "data_creazione", "ultimo_accesso", "note", "id"],
  PRODOTTI_LED: ["nome", "cabX", "cabY", "prezzoAgente", "prezzoCliente", "prezzoCina", "prezzoPromoAgenti", "prezzoPromoClienti", "infoAdmin", "infoAgenti", "icon", "attivo", "id", "categoria", "descrizione", "immagine_url", "scheda_url"],
  CLIENTI: ["id", "ragioneSociale", "referente", "piva", "email", "telefono", "citta", "indirizzo", "note", "creatoIl", "agent_username", "aggiornatoIl"],
  PRATICHE: ["id", "numero", "clientId", "cliente", "titolo", "stato", "finanziaria", "valore", "agente", "agent_username", "scadenza", "prossimoPasso", "note", "aggiornatoIl", "creatoIl"],
  DOCUMENTI: ["id", "practiceId", "pratica", "cliente", "nome", "tipo", "url", "data", "note", "agent_username", "aggiornatoIl"],
  ATTIVITA: ["id", "practiceId", "titolo", "tipo", "scadenza", "stato", "assegnatoA", "agent_username", "aggiornatoIl"],
  IMPOSTAZIONI: ["chiave", "valore", "note"],
  PATCH_NOTES: ["chiave", "valore"],
  PATCH_ITEMS: ["emoji", "title", "text", "attivo"],
  ARCHIVIO_PREVENTIVI: ["id_preventivo", "data_salvataggio", "quote_scope", "agent_username", "agent_display_name", "numero_preventivo", "data_preventivo", "cliente_azienda", "cliente_referente", "prodotto_principale", "misura_principale_cm", "led_count", "totale_led_cliente", "totale_led_agente", "totale_installazione", "totale_provvigione", "totale_trasferta", "finanziaria_selezionata", "totale_margine_cliente", "totale_margine_agente", "totale_preventivo_riferimento", "agente", "cliente_visibile", "payload_criptato", "salt", "iv", "versione_planner", "versione_config", "note", "saved_by_login", "login_enabled", "password_visibile", "id_preventivo_visibile", "payload_json_completo", "led_json", "sequence_protected", "deleted_at", "delete_note", "save_request_token"],
  LOG: ["data", "username", "ruolo", "azione", "entita", "record_id", "dettaglio"]
};

function setupSeemaxDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("Apri questo script dal Foglio Google da utilizzare come database.");
  PropertiesService.getScriptProperties().setProperty("SPREADSHEET_ID", ss.getId());
  Object.keys(SHEET_SCHEMAS).forEach(function (name) { ensureSheet_(ss, name, SHEET_SCHEMAS[name]); });
  seedSettings_();
  seedPatchNotes_();
  seedProducts_();
  seedPlaceholderAdmin_();
  backfillExistingIds_();
  styleSheets_();
  return "DATABASE SEEMAX configurato correttamente.";
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  var callback = sanitizeCallback_(p.callback);
  try {
    var result = routeGet_(String(p.action || "ping"), p);
    if (result.ok === undefined) result.ok = true;
    return output_(result, callback);
  } catch (error) {
    return output_({ ok: false, error: String(error && error.message ? error.message : error) }, callback);
  }
}

function doPost(e) {
  var p = (e && e.parameter) || {};
  var requestId = String(p.requestId || "");
  var result;
  try {
    if (String(p.action || "") === "savequote") result = saveQuotation_(p);
    else result = routeGet_(String(p.action || ""), p);
    if (result.ok === undefined) result.ok = true;
  } catch (error) {
    result = { ok: false, error: String(error && error.message ? error.message : error) };
  }
  var message = JSON.stringify({ requestId: requestId, payload: result }).replace(/</g, "\\u003c");
  return HtmlService.createHtmlOutput("<!doctype html><meta charset='utf-8'><script>parent.postMessage(" + message + ", '*');</script>");
}

function routeGet_(action, p) {
  switch (action) {
    case "ping": return { ok: true, version: SEEMAX_VERSION, serverTime: new Date().toISOString() };
    case "management_login": return managementLogin_(p);
    case "management_bootstrap": return managementBootstrap_(p);
    case "management_list": return managementList_(p);
    case "management_upsert": return managementUpsert_(p);
    case "management_remove": return managementRemove_(p);
    case "management_settings": return managementSettings_(p);
    case "management_save_settings": return managementSaveSettings_(p);
    case "config": return plannerConfig_();
    case "version": return { ok: true, version: String(getSettings_().versione_config || SEEMAX_VERSION) };
    case "agentlogin": return plannerAgentLogin_(p);
    case "nextquote": return nextQuote_(p);
    case "listquotes": return listQuotes_(p);
    case "loadquote_agent": return loadQuoteAgent_(p);
    case "deletequote_agent": return deleteQuoteAgent_(p);
    case "loadquote": return loadQuotePublic_(p);
    default: throw new Error("Azione non riconosciuta: " + action);
  }
}

/* ========================= MANAGEMENT APP ========================= */

function managementLogin_(p) {
  var user = authenticate_(p.agent_username, p.agent_key);
  touchLogin_(user.username);
  return { ok: true, user: publicUser_(user) };
}

function managementBootstrap_(p) {
  var user = authenticate_(p.agent_username, p.agent_key);
  var products = listEntity_("products", user);
  var clients = listEntity_("clients", user);
  var practices = listEntity_("practices", user);
  var documents = listEntity_("documents", user);
  var activities = listEntity_("activities", user);
  var users = isAdmin_(user) ? listEntity_("users", user).map(publicUser_) : [publicUser_(user)];
  var settings = getSettings_();
  var data = { products: products, clients: clients, practices: practices, documents: documents, activities: activities, users: users, settings: settings };
  data.dashboard = dashboard_(data);
  return { ok: true, data: data, user: publicUser_(user), version: SEEMAX_VERSION };
}

function managementList_(p) {
  var user = authenticate_(p.agent_username, p.agent_key);
  var entity = String(p.entity || "");
  var rows = listEntity_(entity, user);
  if (entity === "users") rows = rows.map(publicUser_);
  return { ok: true, rows: rows };
}

function managementUpsert_(p) {
  var user = authenticate_(p.agent_username, p.agent_key);
  var entity = String(p.entity || "");
  assertWritePermission_(entity, user);
  var payload = parseJson_(p.payload, {});
  if (!payload || typeof payload !== "object") throw new Error("Dati non validi.");
  if (["clients", "practices", "documents", "activities"].indexOf(entity) >= 0) payload.agent_username = payload.agent_username || user.username;
  payload.aggiornatoIl = new Date().toISOString();
  if (entity === "users") {
    payload.id = payload.username;
    if (!payload.chiave_id_agente) {
      var existingUser = findRowObject_("AGENTI", "username", payload.username);
      if (existingUser) payload.chiave_id_agente = existingUser.chiave_id_agente;
    }
  }
  var row = upsertEntity_(entity, payload);
  log_(user, "UPSERT", entity, row.id || row.username || "", "Salvataggio da Management Suite");
  return { ok: true, row: entity === "users" ? publicUser_(row) : row };
}

function managementRemove_(p) {
  var user = authenticate_(p.agent_username, p.agent_key);
  var entity = String(p.entity || "");
  assertWritePermission_(entity, user);
  var id = String(p.id || "");
  if (!id) throw new Error("ID mancante.");
  if (entity === "users" && id === user.username) throw new Error("Non puoi eliminare l'account attualmente collegato.");
  var removed = removeEntity_(entity, id, user);
  log_(user, "DELETE", entity, id, "Eliminazione da Management Suite");
  return { ok: removed };
}

function managementSettings_(p) {
  authenticate_(p.agent_username, p.agent_key);
  return { ok: true, settings: getSettings_() };
}

function managementSaveSettings_(p) {
  var user = authenticate_(p.agent_username, p.agent_key);
  if (!isAdmin_(user)) throw new Error("Funzione riservata all'amministratore.");
  var values = parseJson_(p.payload, {});
  Object.keys(values).forEach(function (key) { setSetting_(key, values[key], "Aggiornato da Management Suite"); });
  log_(user, "UPDATE", "settings", "IMPOSTAZIONI", "Impostazioni generali aggiornate");
  return { ok: true, settings: getSettings_() };
}

function listEntity_(entity, user) {
  var sheetName = ENTITY_SHEETS[entity];
  if (!sheetName) throw new Error("Entità non supportata: " + entity);
  if (entity === "users" && !isAdmin_(user)) return [publicUser_(user)];
  var rows = rowsToObjects_(sheet_(sheetName));
  if (!isAdmin_(user) && ["practices", "documents", "activities"].indexOf(entity) >= 0) {
    rows = rows.filter(function (row) { return !row.agent_username || String(row.agent_username) === String(user.username); });
  }
  return rows;
}

function upsertEntity_(entity, record) {
  var sheetName = ENTITY_SHEETS[entity];
  var idField = entity === "users" ? "username" : "id";
  if (!sheetName) throw new Error("Entità non supportata.");
  if (!record[idField]) record[idField] = uid_(entity.substring(0, 3));
  return upsertObject_(sheetName, idField, String(record[idField]), record);
}

function removeEntity_(entity, id, user) {
  var sheetName = ENTITY_SHEETS[entity];
  var idField = entity === "users" ? "username" : "id";
  var sheet = sheet_(sheetName);
  var data = sheet.getDataRange().getValues();
  if (!data.length) return false;
  var headers = data[0].map(String);
  var idIndex = headers.indexOf(idField);
  var agentIndex = headers.indexOf("agent_username");
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][idIndex]) === String(id)) {
      if (!isAdmin_(user) && agentIndex >= 0 && data[i][agentIndex] && String(data[i][agentIndex]) !== String(user.username)) throw new Error("Record non autorizzato.");
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

function dashboard_(data) {
  var practices = data.practices || [];
  var activities = data.activities || [];
  var open = practices.filter(function (p) { return ["Chiusa", "Rifiutata"].indexOf(String(p.stato)) < 0; });
  var statuses = ["Nuova", "Preventivo", "Documenti", "Istruttoria", "Delibera", "Contratto", "Installazione", "Chiusa"];
  var pipeline = statuses.map(function (status) {
    var rows = practices.filter(function (p) { return String(p.stato) === status; });
    return { status: status, count: rows.length, value: rows.reduce(function (sum, p) { return sum + Number(p.valore || 0); }, 0) };
  });
  return {
    totals: { clients: (data.clients || []).length, practices: open.length, value: open.reduce(function (sum, p) { return sum + Number(p.valore || 0); }, 0), activities: activities.filter(function (a) { return String(a.stato) !== "Completata"; }).length },
    recentPractices: practices.slice().sort(function (a, b) { return String(b.aggiornatoIl || "").localeCompare(String(a.aggiornatoIl || "")); }).slice(0, 5),
    nextActivities: activities.filter(function (a) { return String(a.stato) !== "Completata"; }).sort(function (a, b) { return String(a.scadenza || "").localeCompare(String(b.scadenza || "")); }).slice(0, 6),
    pipeline: pipeline
  };
}

/* ========================= QUOTATION PLANNER ========================= */

function plannerConfig_() {
  var settings = getSettings_();
  var notes = getKeyValueSheet_("PATCH_NOTES");
  var items = rowsToObjects_(sheet_("PATCH_ITEMS")).filter(function (row) { return String(row.attivo || "SI").toUpperCase() !== "NO"; });
  return {
    ok: true,
    version: String(settings.versione_config || SEEMAX_VERSION),
    impostazioni: settings,
    prodotti: rowsToObjects_(sheet_("PRODOTTI_LED")).filter(function (row) { return String(row.attivo || "SI").toUpperCase() !== "NO"; }),
    patchNotes: { version: notes.version || SEEMAX_VERSION, label: notes.label || "SEEMAX QUOTATION PLANNER", title: notes.title || "Aggiornamento", intro: notes.intro || "", footer: notes.footer || "", items: items }
  };
}

function plannerAgentLogin_(p) {
  var user = authenticate_(p.agent_username, p.agent_key);
  touchLogin_(user.username);
  return { ok: true, username: user.username, displayName: user.nome_visualizzato, nome_visualizzato: user.nome_visualizzato, email: user.email || "", telefono: user.telefono || "", ruolo: String(user.ruolo || "AGENTE").toUpperCase() };
}

function nextQuote_(p) {
  var scope = String(p.quote_scope || "AGENTE").toUpperCase();
  var settings = getSettings_();
  var start = Number(scope === "ADMIN" ? settings.numero_preventivo_admin_iniziale : settings.numero_preventivo_agenti_iniziale) || 1;
  var rows = rowsToObjects_(sheet_("ARCHIVIO_PREVENTIVI"));
  var nums = rows.filter(function (row) { return String(row.quote_scope || "AGENTE").toUpperCase() === scope && !row.deleted_at; }).map(function (row) { return parseInt(String(row.numero_preventivo || row.id_preventivo || "0").split("-")[0], 10) || 0; });
  var next = Math.max(start - 1, nums.length ? Math.max.apply(null, nums) : 0) + 1;
  var year = String(new Date().getFullYear()).slice(-2);
  return { ok: true, next_num: String(next), next_id: String(next) + "-" + year, quote_scope: scope };
}

function saveQuotation_(p) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var savedByLogin = String(p.saved_by_login || "").toUpperCase() === "SI";
    var user = null;
    if (savedByLogin) user = authenticate_(p.agent_username, p.agent_key);
    var id = String(p.id_preventivo || p.id_preventivo_visibile || "");
    if (!id) throw new Error("Codice preventivo mancante.");
    var existing = findRowObject_("ARCHIVIO_PREVENTIVI", "id_preventivo", id);
    if (existing && p.save_request_token && existing.save_request_token && String(existing.save_request_token) !== String(p.save_request_token)) {
      var next = nextQuote_({ quote_scope: p.quote_scope });
      return { ok: false, error: "Numero preventivo già utilizzato.", error_code: "QUOTE_NUMBER_CHANGED", next_num: next.next_num, next_id: next.next_id };
    }
    var record = {};
    Object.keys(p).forEach(function (key) { if (["action", "requestId"].indexOf(key) < 0) record[key] = p[key]; });
    record.id_preventivo = id;
    record.data_salvataggio = new Date().toISOString();
    record.agent_username = record.agent_username || (user ? user.username : "");
    record.agent_display_name = record.agent_display_name || (user ? user.nome_visualizzato : record.agente || "");
    upsertObject_("ARCHIVIO_PREVENTIVI", "id_preventivo", id, record);
    log_(user || { username: "ACCESSO_CON_CHIAVE", ruolo: "ESTERNO" }, "SAVE", "ARCHIVIO_PREVENTIVI", id, "Salvataggio preventivo S.Q.P.");
    return { ok: true, id_preventivo: id, save_request_token: record.save_request_token || "" };
  } finally { lock.releaseLock(); }
}

function listQuotes_(p) {
  var user = authenticate_(p.agent_username, p.agent_key);
  var rows = rowsToObjects_(sheet_("ARCHIVIO_PREVENTIVI")).filter(function (row) { return !row.deleted_at && (isAdmin_(user) || String(row.agent_username || "") === String(user.username)); });
  rows.sort(function (a, b) { return String(b.data_salvataggio || "").localeCompare(String(a.data_salvataggio || "")); });
  return { ok: true, quotes: rows.slice(0, 200).map(function (row) { return { id_preventivo: row.id_preventivo, cliente_visibile: row.cliente_visibile || row.cliente_azienda, data_salvataggio: row.data_salvataggio, totale_preventivo_riferimento: row.totale_preventivo_riferimento, finanziaria_selezionata: row.finanziaria_selezionata }; }) };
}

function loadQuoteAgent_(p) {
  var user = authenticate_(p.agent_username, p.agent_key);
  var row = findRowObject_("ARCHIVIO_PREVENTIVI", "id_preventivo", p.id_preventivo);
  if (!row || row.deleted_at) throw new Error("Preventivo non trovato.");
  if (!isAdmin_(user) && String(row.agent_username || "") !== String(user.username)) throw new Error("Preventivo non autorizzato.");
  row.ok = true;
  return row;
}

function loadQuotePublic_(p) {
  var row = findRowObject_("ARCHIVIO_PREVENTIVI", "id_preventivo", p.id_preventivo);
  if (!row || row.deleted_at) throw new Error("Preventivo non trovato.");
  row.ok = true;
  return row;
}

function deleteQuoteAgent_(p) {
  var user = authenticate_(p.agent_username, p.agent_key);
  var row = findRowObject_("ARCHIVIO_PREVENTIVI", "id_preventivo", p.id_preventivo);
  if (!row || row.deleted_at) throw new Error("Preventivo non trovato.");
  if (!isAdmin_(user) && String(row.agent_username || "") !== String(user.username)) throw new Error("Preventivo non autorizzato.");
  row.deleted_at = new Date().toISOString();
  row.delete_note = "Eliminato da " + user.username;
  upsertObject_("ARCHIVIO_PREVENTIVI", "id_preventivo", p.id_preventivo, row);
  log_(user, "DELETE", "ARCHIVIO_PREVENTIVI", p.id_preventivo, "Eliminazione logica preventivo");
  return { ok: true };
}

/* ========================= DATABASE HELPERS ========================= */

function db_() {
  var id = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (id) return SpreadsheetApp.openById(id);
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) throw new Error("Database non inizializzato. Esegui setupSeemaxDatabase().");
  PropertiesService.getScriptProperties().setProperty("SPREADSHEET_ID", active.getId());
  return active;
}

function sheet_(name) {
  var ss = db_();
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ensureSheet_(ss, name, SHEET_SCHEMAS[name] || []);
  return sheet;
}

function ensureSheet_(ss, name, schema) {
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  var lastColumn = sheet.getLastColumn();
  var headers = lastColumn ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(String) : [];
  if (!headers.length || headers.every(function (h) { return !h; })) {
    if (schema.length) sheet.getRange(1, 1, 1, schema.length).setValues([schema]);
    headers = schema.slice();
  } else {
    schema.forEach(function (header) {
      if (headers.indexOf(header) < 0) {
        headers.push(header);
        sheet.getRange(1, headers.length).setValue(header);
      }
    });
  }
  if (headers.length) {
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setBackground("#0A3570").setFontColor("#FFFFFF").setFontWeight("bold").setWrap(true);
  }
  return sheet;
}

function rowsToObjects_(sheet) {
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0].map(String);
  return values.slice(1).filter(function (row) { return row.some(function (cell) { return cell !== "" && cell !== null; }); }).map(function (row) {
    var obj = {};
    headers.forEach(function (header, index) { if (header) obj[header] = serializable_(row[index]); });
    return obj;
  });
}

function serializable_(value) {
  if (Object.prototype.toString.call(value) === "[object Date]") return value.toISOString();
  return value;
}

function findRowObject_(sheetName, keyField, keyValue) {
  var rows = rowsToObjects_(sheet_(sheetName));
  for (var i = 0; i < rows.length; i++) if (String(rows[i][keyField]) === String(keyValue)) return rows[i];
  return null;
}

function upsertObject_(sheetName, keyField, keyValue, record) {
  var sheet = sheet_(sheetName);
  var lastColumn = sheet.getLastColumn();
  var headers = lastColumn ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(String) : [];
  Object.keys(record).forEach(function (key) {
    if (headers.indexOf(key) < 0) {
      headers.push(key);
      sheet.getRange(1, headers.length).setValue(key).setBackground("#0A3570").setFontColor("#FFFFFF").setFontWeight("bold");
    }
  });
  var data = sheet.getDataRange().getValues();
  var keyIndex = headers.indexOf(keyField);
  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) if (String(data[i][keyIndex]) === String(keyValue)) { rowIndex = i + 1; break; }
  var existing = rowIndex > 0 ? data[rowIndex - 1] : [];
  var values = headers.map(function (header, index) {
    if (record[header] !== undefined) return record[header];
    return existing[index] !== undefined ? existing[index] : "";
  });
  if (rowIndex > 0) sheet.getRange(rowIndex, 1, 1, headers.length).setValues([values]);
  else { rowIndex = Math.max(2, sheet.getLastRow() + 1); sheet.getRange(rowIndex, 1, 1, headers.length).setValues([values]); }
  var result = {};
  headers.forEach(function (header, index) { result[header] = serializable_(values[index]); });
  return result;
}

function authenticate_(username, key) {
  username = String(username || "").trim();
  key = String(key || "").trim();
  if (!username || !key) throw new Error("Credenziali mancanti.");
  var user = findRowObject_("AGENTI", "username", username);
  if (!user || String(user.chiave_id_agente || "") !== key || String(user.stato || "ATTIVO").toUpperCase() !== "ATTIVO") throw new Error("Nome utente o Chiave ID non corretti.");
  return user;
}

function publicUser_(user) {
  return { id: user.id || user.username, username: user.username, displayName: user.nome_visualizzato || user.username, nome_visualizzato: user.nome_visualizzato || user.username, email: user.email || "", telefono: user.telefono || "", stato: user.stato || "ATTIVO", role: String(user.ruolo || "AGENTE").toUpperCase(), ruolo: String(user.ruolo || "AGENTE").toUpperCase(), note: user.note || "" };
}

function isAdmin_(user) { return String(user && user.ruolo || "AGENTE").toUpperCase() === "ADMIN"; }

function assertWritePermission_(entity, user) {
  if (["products", "users"].indexOf(entity) >= 0 && !isAdmin_(user)) throw new Error("Funzione riservata all'amministratore.");
  if (!ENTITY_SHEETS[entity]) throw new Error("Entità non supportata.");
}

function touchLogin_(username) {
  var user = findRowObject_("AGENTI", "username", username);
  if (user) { user.ultimo_accesso = new Date().toISOString(); upsertObject_("AGENTI", "username", username, user); }
}

function getSettings_() { return getKeyValueSheet_("IMPOSTAZIONI"); }

function getKeyValueSheet_(sheetName) {
  var rows = rowsToObjects_(sheet_(sheetName));
  var out = {};
  rows.forEach(function (row) { var key = row.chiave; if (key) out[key] = row.valore; });
  return out;
}

function setSetting_(key, value, note) { return upsertObject_("IMPOSTAZIONI", "chiave", key, { chiave: key, valore: value, note: note || "" }); }

function log_(user, action, entity, id, detail) {
  try {
    var sheet = sheet_("LOG");
    sheet.appendRow([new Date().toISOString(), user.username || "", user.ruolo || "", action, entity, id, detail || ""]);
  } catch (error) { /* il log non deve bloccare l'operazione principale */ }
}

function uid_(prefix) { return prefix + "-" + new Date().getTime().toString(36) + "-" + Math.random().toString(36).substring(2, 8); }
function parseJson_(value, fallback) { try { return JSON.parse(String(value || "")); } catch (error) { return fallback; } }
function sanitizeCallback_(value) { var callback = String(value || ""); return /^[A-Za-z_$][0-9A-Za-z_$\.]*$/.test(callback) ? callback : ""; }

function output_(data, callback) {
  var json = JSON.stringify(data).replace(/</g, "\\u003c");
  return ContentService.createTextOutput(callback ? callback + "(" + json + ");" : json).setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}

/* ========================= INITIAL DATA ========================= */

function seedSettings_() {
  var defaults = {
    versione_config: SEEMAX_VERSION,
    iva_percentuale: 22,
    acconto_percentuale: 30,
    validita_preventivo_giorni: 15,
    telefono_commerciale: "INSERISCI_TELEFONO",
    numero_preventivo_iniziale: 1,
    numero_preventivo_admin_iniziale: 1,
    numero_preventivo_agenti_iniziale: 1
  };
  var current = getSettings_();
  Object.keys(defaults).forEach(function (key) { if (current[key] === undefined || current[key] === "") setSetting_(key, defaults[key], "Valore iniziale Seemax Management Suite"); });
}

function seedPatchNotes_() {
  if (rowsToObjects_(sheet_("PATCH_NOTES")).length) return;
  var rows = [
    ["version", "1.0.0"], ["label", "SEEMAX MANAGEMENT SUITE"], ["title", "Gestionale Seemax attivo"],
    ["intro", "Dashboard, catalogo, clienti, pratiche, documenti e Quotation Planner sono ora collegati in un unico ambiente."],
    ["footer", "Completa i placeholder e configura GitHub Pages seguendo la guida allegata."]
  ];
  sheet_("PATCH_NOTES").getRange(2, 1, rows.length, 2).setValues(rows);
}

function seedProducts_() {
  var sheet = sheet_("PRODOTTI_LED");
  if (rowsToObjects_(sheet).length) return;
  var products = [
    { id: "p19-50100", nome: "P1.9", categoria: "Ledwall Outdoor", cabX: 50, cabY: 100, prezzoAgente: 850, prezzoCliente: 950, prezzoCina: 560, attivo: "SI" },
    { id: "p25-6464", nome: "P2.5", categoria: "Ledwall Outdoor", cabX: 64, cabY: 64, prezzoAgente: 700, prezzoCliente: 890, prezzoCina: 450, attivo: "SI" },
    { id: "p3-5757", nome: "P3", categoria: "Ledwall Outdoor", cabX: 57, cabY: 57, prezzoAgente: 410, prezzoCliente: 550, prezzoCina: 250, attivo: "SI" },
    { id: "p391-50100", nome: "P3.91", categoria: "Ledwall Outdoor", cabX: 50, cabY: 100, prezzoAgente: 550, prezzoCliente: 650, prezzoCina: 280, attivo: "SI" },
    { id: "p391-5050", nome: "P3.91", categoria: "Ledwall Outdoor", cabX: 50, cabY: 50, prezzoAgente: 295, prezzoCliente: 335, prezzoCina: 150, attivo: "SI" },
    { id: "p4-9696", nome: "P4", categoria: "Ledwall Outdoor", cabX: 96, cabY: 96, prezzoAgente: 860, prezzoCliente: 1080, prezzoCina: 580, attivo: "SI" }
  ];
  products.forEach(function (product) { upsertObject_("PRODOTTI_LED", "id", product.id, product); });
}

function seedPlaceholderAdmin_() {
  if (rowsToObjects_(sheet_("AGENTI")).length) return;
  upsertObject_("AGENTI", "username", "admin.seemax", {
    id: "admin.seemax", username: "admin.seemax", chiave_id_agente: "CAMBIA_QUESTA_CHIAVE",
    nome_visualizzato: "Amministratore Seemax", email: "INSERISCI_EMAIL", telefono: "INSERISCI_TELEFONO",
    stato: "ATTIVO", ruolo: "ADMIN", data_creazione: new Date().toISOString(), note: "ACCOUNT PLACEHOLDER: cambiare chiave prima dell'uso"
  });
}

function backfillExistingIds_() {
  fillMissingIds_("PRODOTTI_LED", "id", function (row) {
    return "prod-" + slugId_((row.nome || "ledwall") + "-" + (row.cabX || "x") + "-" + (row.cabY || "y"));
  });
  fillMissingIds_("AGENTI", "id", function (row) { return String(row.username || uid_("usr")); });
  fillMissingIds_("CLIENTI", "id", function () { return uid_("cli"); });
  fillMissingIds_("PRATICHE", "id", function (row) { return row.numero ? "PR-" + row.numero : uid_("pra"); });
  fillMissingIds_("DOCUMENTI", "id", function () { return uid_("doc"); });
  fillMissingIds_("ATTIVITA", "id", function () { return uid_("act"); });
}

function fillMissingIds_(sheetName, idField, factory) {
  var sheet = sheet_(sheetName);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return;
  var headers = values[0].map(String);
  var idIndex = headers.indexOf(idField);
  if (idIndex < 0) return;
  for (var i = 1; i < values.length; i++) {
    if (!values[i][idIndex] && values[i].some(function (cell) { return cell !== "" && cell !== null; })) {
      var row = {};
      headers.forEach(function (header, index) { row[header] = values[i][index]; });
      sheet.getRange(i + 1, idIndex + 1).setValue(factory(row));
    }
  }
}

function slugId_(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function styleSheets_() {
  Object.keys(SHEET_SCHEMAS).forEach(function (name) {
    var sheet = sheet_(name);
    if (sheet.getLastColumn()) sheet.autoResizeColumns(1, Math.min(sheet.getLastColumn(), 18));
  });
}
