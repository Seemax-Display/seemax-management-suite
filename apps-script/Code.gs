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

var SEEMAX_VERSION = "seemax-management-suite-2.1.1";
var ENTITY_SHEETS = {
  products: "PRODOTTI_LED",
  clients: "CLIENTI",
  practices: "PRATICHE",
  documents: "DOCUMENTI",
  activities: "ATTIVITA",
  users: "AGENTI",
  movements: "MOVIMENTI_MAGAZZINO"
};

var SHEET_SCHEMAS = {
  AGENTI: ["username", "chiave_id_agente", "nome_visualizzato", "email", "telefono", "stato", "ruolo", "data_creazione", "ultimo_accesso", "note", "id"],
  PRODOTTI_LED: ["nome", "cabX", "cabY", "prezzoAgente", "prezzoCliente", "prezzoCina", "prezzoPromoAgenti", "prezzoPromoClienti", "infoAdmin", "infoAgenti", "icon", "attivo", "id", "sku", "categoria", "descrizione", "immagine_url", "scheda_url", "giacenza_iniziale", "giacenza_attuale", "stato_giacenza", "promo_attiva", "tech_pixel_pitch", "tech_certificazione", "tech_utilizzo", "tech_densita_pixel", "tech_led_standard", "tech_materiale_cabinet", "tech_peso_cabinet", "tech_scala_grigi", "tech_temperatura", "tech_ip", "tech_consumo_medio", "tech_consumo_massimo", "tech_vita_media", "tech_visibilita", "tech_luminosita", "tech_refresh", "aggiornatoIl"],
  CLIENTI: ["id", "ragioneSociale", "referente", "piva", "codice_fiscale", "piva_formalmente_valida", "piva_vies_valida", "piva_vies_nome", "piva_vies_esito", "piva_verifica_ade", "piva_verifica_ade_data", "iban", "iban_valido", "email", "telefono", "telefono_paese", "telefono_prefisso", "telefono_valido", "regione", "provincia", "comune", "cap", "localita", "indirizzo", "civico", "citta", "condiviso", "creato_da_username", "creato_da_nome", "condiviso_il", "note", "creatoIl", "agent_username", "aggiornatoIl"],
  PRATICHE: ["id", "numero", "clientId", "cliente", "titolo", "stato", "finanziaria", "tipo_pratica", "destinatario_ordine", "intestatario_nome", "intestatario_email", "intestatario_telefono", "valore", "valore_provvigione", "numero_rate", "periodicita_pagamento", "indirizzo_installazione_tipo", "installazione_regione", "installazione_provincia", "installazione_comune", "installazione_cap", "installazione_localita", "installazione_indirizzo", "installazione_civico", "gestione_ledwall", "cloud_username", "cloud_password", "documenti_richiesti_json", "documenti_caricati_json", "agente", "agent_username", "scadenza", "prossimoPasso", "note", "preventivo_id", "origine", "modelli_display", "misure_display", "cabinet_da_sottrarre", "righe_magazzino_json", "p391_unificato", "p391_cabinet_50100", "p391_cabinet_5050", "righe_json", "magazzino_applicato", "magazzino_applicato_il", "magazzino_stornato_il", "archiviata", "archiviata_il", "aggiornatoIl", "creatoIl"],
  DOCUMENTI: ["id", "practiceId", "pratica", "cliente", "nome", "tipo", "tipo_pratica_documento", "url", "file_id", "file_name", "file_type", "file_size", "data", "note", "agent_username", "aggiornatoIl"],
  ATTIVITA: ["id", "practiceId", "titolo", "tipo", "scadenza", "stato", "assegnatoA", "agent_username", "aggiornatoIl"],
  IMPOSTAZIONI: ["chiave", "valore", "note"],
  PATCH_NOTES: ["chiave", "valore"],
  PATCH_ITEMS: ["emoji", "title", "text", "attivo"],
  ARCHIVIO_PREVENTIVI: ["id_preventivo", "data_salvataggio", "quote_scope", "agent_username", "agent_display_name", "numero_preventivo", "data_preventivo", "cliente_azienda", "cliente_referente", "prodotto_principale", "misura_principale_cm", "led_count", "totale_led_cliente", "totale_led_agente", "totale_installazione", "totale_provvigione", "totale_trasferta", "finanziaria_selezionata", "totale_margine_cliente", "totale_margine_agente", "totale_preventivo_riferimento", "agente", "cliente_visibile", "payload_criptato", "salt", "iv", "versione_planner", "versione_config", "note", "saved_by_login", "login_enabled", "password_visibile", "id_preventivo_visibile", "payload_json_completo", "led_json", "sequence_protected", "deleted_at", "delete_note", "save_request_token"],
  MOVIMENTI_MAGAZZINO: ["id", "data", "practiceId", "numero_pratica", "cliente", "product_id", "sku", "prodotto", "quantita", "tipo_movimento", "giacenza_prima", "giacenza_dopo", "username", "note"],
  NOTIFICHE: ["id", "data", "recipient_username", "recipient_name", "practiceId", "numero_pratica", "stato_precedente", "nuovo_stato", "titolo", "messaggio", "letta", "letta_il", "actor_username"],
  LOG: ["data", "username", "ruolo", "azione", "entita", "record_id", "dettaglio"]
};

function setupSeemaxDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("Apri questo script dal Foglio Google da utilizzare come database.");
  PropertiesService.getScriptProperties().setProperty("SPREADSHEET_ID", ss.getId());
  Object.keys(SHEET_SCHEMAS).forEach(function (name) { ensureSheet_(ss, name, SHEET_SCHEMAS[name]); });
  seedSettings_();
  migrateRevenueTargetV151_();
  seedPatchNotes_();
  seedProducts_();
  initializeInventoryV11_();
  backfillPracticeInventoryV12_();
  migratePracticeStatusesV13_();
  migrateClientFiscalV17_();
  migrateClientSharingV18_();
  managementDocumentsFolder_();
  seedPlaceholderAdmin_();
  backfillExistingIds_();
  styleSheets_();
  return "DATABASE SEEMAX configurato correttamente.";
}

function upgradeSeemaxV11() {
  var ss = db_();
  Object.keys(SHEET_SCHEMAS).forEach(function (name) { ensureSheet_(ss, name, SHEET_SCHEMAS[name]); });
  seedSettings_();
  migrateRevenueTargetV151_();
  initializeInventoryV11_();
  backfillPracticeInventoryV12_();
  migratePracticeStatusesV13_();
  migrateClientFiscalV17_();
  migrateClientSharingV18_();
  managementDocumentsFolder_();
  setSetting_("versione_config", SEEMAX_VERSION, "Upgrade Management Suite v2.1.1");
  styleSheets_();
  return "SEEMAX v1.9.1 configurato: salvataggio pratiche e allegati ottimizzato.";
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
    case "management_create_from_quote": return managementCreateFromQuote_(p);
    case "management_mark_notifications_read": return managementMarkNotificationsRead_(p);
    case "management_upload_document": return managementUploadDocument_(p);
    case "management_upload_status": return managementUploadStatus_(p);
    case "management_update_practice_documents": return managementUpdatePracticeDocuments_(p);
    case "management_verify_vat": return managementVerifyVat_(p);
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
  var activities = [];
  var users = isAdmin_(user) ? listEntity_("users", user).map(publicUser_) : [publicUser_(user)];
  var settings = getSettings_();
  var notifications = listNotificationsForUser_(user);
  var data = { products: products, clients: clients, practices: practices, documents: documents, activities: activities, users: users, settings: settings, notifications: notifications };
  data.dashboard = dashboard_(data, user);
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
  if (["clients", "practices", "documents", "activities"].indexOf(entity) >= 0) {
    var ownedRecord = entity === "practices" && payload.id ? findRowObject_("PRATICHE", "id", payload.id) : null;
    payload.agent_username = payload.agent_username || (ownedRecord && ownedRecord.agent_username) || user.username;
  }
  payload.aggiornatoIl = new Date().toISOString();
  if (entity === "practices") {
    var previousPractice = payload.id ? findRowObject_("PRATICHE", "id", payload.id) : null;
    if (!isAdmin_(user) && previousPractice && String(previousPractice.agent_username || "") !== String(user.username)) {
      throw new Error("Non sei autorizzato a modificare questa pratica.");
    }
    payload.agent_username = previousPractice && previousPractice.agent_username || user.username;
    payload.agente = previousPractice && previousPractice.agente || userDisplayName_(user);
    if (!isAdmin_(user) && previousPractice && normalizePracticeStatus_(previousPractice.stato || "Inserita") !== normalizePracticeStatus_(payload.stato || previousPractice.stato || "Inserita")) {
      throw new Error("Solo l'amministratore può modificare lo stato di una pratica.");
    }
    if (!isAdmin_(user) && !previousPractice) payload.stato = "Inserita";
    var isPersonalPurchase = String(payload.tipo_pratica || "").toUpperCase() === "ACQUISTO" && String(payload.destinatario_ordine || "").toUpperCase() === "PER ME";
    var practiceClient = findRowObject_("CLIENTI", "id", payload.clientId || previousPractice && previousPractice.clientId || "");
    if (!isPersonalPurchase && (!practiceClient || !canAccessClient_(practiceClient, user))) throw new Error("Cliente non disponibile o non autorizzato.");
    if (isPersonalPurchase) {
      payload.clientId = "";
      payload.cliente = userDisplayName_(user);
      payload.intestatario_nome = userDisplayName_(user);
      payload.intestatario_email = String(user.email || "");
      payload.intestatario_telefono = String(user.telefono || "");
      payload.valore_provvigione = 0;
    }
    validatePracticeRequiredFields_(payload);
    var practiceRow = upsertPracticeWithInventory_(payload, user);
    if (previousPractice && String(previousPractice.stato || "") !== String(practiceRow.stato || "")) createPracticeStatusNotification_(previousPractice, practiceRow, user);
    log_(user, "UPSERT", entity, practiceRow.id || "", "Pratica aggiornata con controllo magazzino");
    return { ok: true, row: practiceRow, notifications: listNotificationsForUser_(user) };
  }
  if (entity === "clients") {
    var existingClient = payload.id ? findRowObject_("CLIENTI", "id", payload.id) : null;
    if (existingClient && !canEditClient_(existingClient, user)) throw new Error("Questo cliente può essere modificato soltanto dal creatore o da un amministratore.");
    payload.creato_da_username = existingClient && existingClient.creato_da_username || existingClient && existingClient.agent_username || user.username;
    payload.creato_da_nome = existingClient && existingClient.creato_da_nome || userDisplayName_(findRowObject_("AGENTI", "username", payload.creato_da_username) || user);
    payload.agent_username = payload.creato_da_username;
    payload.condiviso = String(payload.condiviso || existingClient && existingClient.condiviso || "NO").toUpperCase() === "SI" ? "SI" : "NO";
    payload.condiviso_il = payload.condiviso === "SI" ? (existingClient && existingClient.condiviso_il || new Date().toISOString()) : "";
    validateClientFiscalData_(payload, user);
  }
  if (entity === "users") {
    payload.id = payload.username;
    if (!payload.chiave_id_agente) {
      var existingUser = findRowObject_("AGENTI", "username", payload.username);
      if (existingUser) payload.chiave_id_agente = existingUser.chiave_id_agente;
    }
  }
  var documentLock = null;
  var row;
  try {
    if (entity === "documents") {
      documentLock = LockService.getScriptLock();
      documentLock.waitLock(20000);
    }
    row = upsertEntity_(entity, payload);
  } finally {
    if (documentLock) documentLock.releaseLock();
  }
  log_(user, "UPSERT", entity, row.id || row.username || "", "Salvataggio da Management Suite");
  return { ok: true, row: entity === "users" ? publicUser_(row) : row };
}

function managementUploadDocument_(p) {
  var requestId = String(p.requestId || "");
  try {
    var user = authenticate_(p.agent_username, p.agent_key);
    var filename = String(p.filename || "documento").replace(/[\\\/:*?"<>|]+/g, "_");
    var mimeType = String(p.mimeType || "application/octet-stream");
    var raw = String(p.fileBase64 || "");
    var comma = raw.indexOf(",");
    if (comma >= 0) raw = raw.substring(comma + 1);
    if (!raw) throw new Error("File mancante.");
    var bytes = Utilities.base64Decode(raw);
    if (bytes.length > 8 * 1024 * 1024) throw new Error("Il file supera il limite di 8 MB.");
    var folder = managementDocumentsFolder_();
    var file = folder.createFile(Utilities.newBlob(bytes, mimeType, filename));
    file.setDescription("Caricato da " + (user.nome_visualizzato || user.username) + " tramite Seemax Management Suite");
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (sharingError) { /* alcuni domini Workspace impediscono la condivisione pubblica */ }
    var upload = { ok: true, url: file.getUrl(), file_id: file.getId(), file_name: filename, file_size: bytes.length };
    cacheUploadResult_(requestId, upload);
    return upload;
  } catch (error) {
    cacheUploadResult_(requestId, { ok: false, error: String(error && error.message ? error.message : error) });
    throw error;
  }
}

function managementDocumentsFolder_() {
  var properties = PropertiesService.getScriptProperties();
  var cachedId = String(properties.getProperty("MANAGEMENT_DOCUMENTS_FOLDER_ID") || "");
  if (cachedId) {
    try { return DriveApp.getFolderById(cachedId); } catch (error) { properties.deleteProperty("MANAGEMENT_DOCUMENTS_FOLDER_ID"); }
  }
  var folderName = "SEEMAX MANAGEMENT DOCUMENTI";
  var folders = DriveApp.getFoldersByName(folderName);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
  properties.setProperty("MANAGEMENT_DOCUMENTS_FOLDER_ID", folder.getId());
  return folder;
}

function managementVerifyVat_(p) {
  authenticate_(p.agent_username, p.agent_key);
  var vatNumber = String(p.vatNumber || "").replace(/\D/g, "");
  if (!validItalianVat_(vatNumber)) throw new Error("Partita IVA formalmente non valida.");
  var response = UrlFetchApp.fetch("https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number", {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ countryCode: "IT", vatNumber: vatNumber }),
    muteHttpExceptions: true
  });
  var code = response.getResponseCode();
  var body = parseJson_(response.getContentText(), {});
  if (code < 200 || code >= 300) throw new Error(body.message || "Servizio VIES temporaneamente non disponibile.");
  return {
    ok: true,
    valid: body.valid === true,
    countryCode: String(body.countryCode || "IT"),
    vatNumber: String(body.vatNumber || vatNumber),
    name: String(body.name || body.traderName || "").trim(),
    address: String(body.address || "").trim(),
    requestDate: body.requestDate || new Date().toISOString()
  };
}

function validateClientFiscalData_(payload, user) {
  var vat = String(payload.piva || "").replace(/\D/g, "");
  var iban = String(payload.iban || "").replace(/\s+/g, "").toUpperCase();
  if (vat && !validItalianVat_(vat)) throw new Error("Partita IVA formalmente non valida.");
  if (iban && !validIban_(iban)) throw new Error("IBAN formalmente non valido.");
  if (vat) {
    var duplicate = rowsToObjects_(sheet_("CLIENTI")).filter(function (row) {
      return canAccessClient_(row, user) && String(row.id || "") !== String(payload.id || "") && String(row.piva || "").replace(/\D/g, "") === vat;
    })[0];
    if (duplicate) throw new Error("Partita IVA già associata al cliente " + (duplicate.ragioneSociale || duplicate.id) + ".");
  }
  payload.piva = vat;
  payload.codice_fiscale = String(payload.codice_fiscale || "").replace(/\s+/g, "").toUpperCase();
  payload.piva_formalmente_valida = vat ? "SI" : "NO";
  payload.iban = iban;
  payload.iban_valido = iban ? "SI" : "NO";
  payload.citta = payload.comune || payload.citta || "";
}

function migrateClientFiscalV17_() {
  rowsToObjects_(sheet_("CLIENTI")).forEach(function (client) {
    var previous = String(client.piva || "").replace(/\s+/g, "").toUpperCase();
    if (/^[A-Z0-9]{16}$/.test(previous) && /[A-Z]/.test(previous) && !client.codice_fiscale) {
      client.codice_fiscale = previous;
      client.piva = "";
      client.piva_formalmente_valida = "NO";
      upsertObject_("CLIENTI", "id", client.id, client);
    }
  });
}

function migrateClientSharingV18_() {
  rowsToObjects_(sheet_("CLIENTI")).forEach(function (client) {
    var changed = false;
    if (!client.creato_da_username && client.agent_username) { client.creato_da_username = client.agent_username; changed = true; }
    if (!client.creato_da_username) { client.creato_da_username = "admin"; changed = true; }
    if (!client.creato_da_nome) {
      client.creato_da_nome = userDisplayName_(findRowObject_("AGENTI", "username", client.creato_da_username) || { username: client.creato_da_username });
      changed = true;
    }
    if (!client.condiviso) { client.condiviso = "NO"; changed = true; }
    if (changed) upsertObject_("CLIENTI", "id", client.id, client);
  });
}

function validItalianVat_(vat) {
  if (!/^\d{11}$/.test(String(vat || ""))) return false;
  var sum = 0;
  for (var index = 0; index < 10; index++) {
    var number = Number(vat.charAt(index));
    if (index % 2 === 1) {
      number *= 2;
      if (number > 9) number -= 9;
    }
    sum += number;
  }
  return (10 - (sum % 10)) % 10 === Number(vat.charAt(10));
}

function validIban_(value) {
  var iban = String(value || "").replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban) || iban.length < 15 || iban.length > 34) return false;
  var rearranged = iban.substring(4) + iban.substring(0, 4);
  var remainder = 0;
  for (var index = 0; index < rearranged.length; index++) {
    var char = rearranged.charAt(index);
    var expanded = /\d/.test(char) ? char : String(char.charCodeAt(0) - 55);
    for (var digit = 0; digit < expanded.length; digit++) remainder = (remainder * 10 + Number(expanded.charAt(digit))) % 97;
  }
  return remainder === 1;
}

function cacheUploadResult_(requestId, result) {
  if (!requestId) return;
  CacheService.getScriptCache().put("management_upload_" + requestId, JSON.stringify(result), 600);
}

function managementUploadStatus_(p) {
  authenticate_(p.agent_username, p.agent_key);
  var requestId = String(p.requestId || "");
  if (!requestId) throw new Error("Identificativo upload mancante.");
  var raw = CacheService.getScriptCache().get("management_upload_" + requestId);
  return { ok: true, completed: !!raw, upload: raw ? parseJson_(raw, {}) : null };
}

function managementUpdatePracticeDocuments_(p) {
  var user = authenticate_(p.agent_username, p.agent_key);
  var practiceId = String(p.practice_id || "");
  var practice = findRowObject_("PRATICHE", "id", practiceId);
  if (!practice) throw new Error("Pratica non trovata.");
  if (!isAdmin_(user) && String(practice.agent_username || "") !== String(user.username)) throw new Error("Non sei autorizzato ad aggiornare questa pratica.");
  practice.documenti_caricati_json = String(p.documenti_caricati_json || "[]");
  practice.aggiornatoIl = new Date().toISOString();
  var saved = upsertObject_("PRATICHE", "id", practice.id, practice);
  log_(user, "UPDATE_DOCUMENTS", "practices", practice.id, "Riepilogo allegati pratica aggiornato");
  return { ok: true, row: saved };
}

function managementCreateFromQuote_(p) {
  var user = authenticate_(p.agent_username, p.agent_key);
  var payload = parseJson_(p.payload, {});
  var type = String(payload.tipo_pratica || "").toUpperCase();
  if (["ACQUISTO", "NOLEGGIO", "LEASING"].indexOf(type) < 0) throw new Error("Scegli Acquisto, Noleggio o Leasing.");
  var company = String(payload.cliente_azienda || payload.cliente_referente || "").trim();
  if (!company) throw new Error("Inserisci almeno la ragione sociale o il referente cliente nel S.Q.P.");
  var client = findClientForQuote_(payload, user);
  var items = Array.isArray(payload.righe) ? payload.righe : [];
  if (!items.length) throw new Error("Il preventivo non contiene Ledwall selezionati.");
  var quoteId = String(payload.preventivo_id || "").trim();
  if (quoteId) {
    var existingPractice = rowsToObjects_(sheet_("PRATICHE")).filter(function (row) {
      return String(row.preventivo_id || "") === quoteId && String(row.agent_username || "") === String(user.username);
    })[0];
    if (existingPractice) return { ok: true, existing: true, practice: existingPractice, client: findRowObject_("CLIENTI", "id", existingPractice.clientId) || {} };
  }
  var finance = type === "ACQUISTO" ? "Acquisto diretto" : (type === "NOLEGGIO" ? "Grenke" : "IFIS");
  var number = nextPracticeIdentifier_(user);
  var title = items.map(function (item) {
    return String(item.prodotto || "Ledwall") + " " + String(item.misura_m || item.misura_cm || "");
  }).join(" + ");
  var practice = {
    id: "PR-" + number,
    numero: number,
    clientId: client.id,
    cliente: client.ragioneSociale,
    titolo: title,
    stato: "Inserita",
    finanziaria: finance,
    tipo_pratica: type,
    destinatario_ordine: type === "ACQUISTO" ? "PER CLIENTE" : "",
    valore: Number(payload.valore || 0),
    valore_provvigione: Number(payload.valore_provvigione || 0),
    numero_rate: String(payload.numero_rate || ""),
    periodicita_pagamento: String(payload.periodicita_pagamento || ""),
    indirizzo_installazione_tipo: type === "ACQUISTO" ? "PRESSO ALTRO INDIRIZZO" : "COME INDIRIZZO CLIENTE",
    installazione_comune: String(payload.cliente_localita || ""),
    gestione_ledwall: "",
    documenti_richiesti_json: JSON.stringify(requiredDocumentsForPractice_(type)),
    documenti_caricati_json: "[]",
    agente: user.nome_visualizzato || user.username,
    agent_username: user.username,
    prossimoPasso: type === "ACQUISTO" ? "Attendere accettazione cliente" : "Raccogliere documentazione finanziaria",
    note: String(payload.note || ""),
    preventivo_id: quoteId,
    origine: "SEEMAX QUOTATION PLANNER",
    modelli_display: items.map(function (item) { return String(item.modello_display || item.prodotto || ""); }).filter(Boolean).join(" | "),
    misure_display: items.map(function (item) { return String(item.misura_display || item.misura_m || item.misura_cm || ""); }).filter(Boolean).join(" | "),
    cabinet_da_sottrarre: items.map(function (item) { return String(item.cabinet_da_sottrarre || item.cabinet || ""); }).filter(Boolean).join(" | "),
    righe_magazzino_json: JSON.stringify(buildInventoryRowsFromItems_(items)),
    righe_json: JSON.stringify(items),
    magazzino_applicato: "NO",
    creatoIl: new Date().toISOString(),
    aggiornatoIl: new Date().toISOString()
  };
  practice = upsertObject_("PRATICHE", "id", practice.id, practice);
  log_(user, "CREATE_FROM_QUOTE", "practices", practice.id, "Pratica " + type + " creata dal S.Q.P. preventivo " + practice.preventivo_id);
  return { ok: true, practice: practice, client: client };
}

function requiredDocumentsForPractice_(type) {
  var normalized = String(type || "").toUpperCase();
  var settings = getSettings_();
  var fields = normalized === "NOLEGGIO"
    ? ["documento_identita", "tessera_sanitaria", "visura", "altra_documentazione"]
    : normalized === "LEASING"
      ? ["documento_identita", "tessera_sanitaria", "preventivo_seemax", "preventivo_ifis", "visura", "altra_documentazione"]
      : [];
  return fields.filter(function (field) { return practiceRequired_(normalized, field, settings); });
}

function findClientForQuote_(payload, user) {
  var rows = rowsToObjects_(sheet_("CLIENTI")).filter(function (row) { return canAccessClient_(row, user); });
  var selectedId = String(payload.cliente_id_gestionale || "").trim();
  var selected = selectedId ? rows.filter(function (row) { return String(row.id || "") === selectedId; })[0] : null;
  var vat = normalizeKey_(payload.cliente_piva_cf);
  var email = normalizeKey_(payload.cliente_email);
  var company = normalizeKey_(payload.cliente_azienda || payload.cliente_referente);
  var found = selected || rows.filter(function (row) {
    if (vat && normalizeKey_(row.piva) === vat) return true;
    if (email && normalizeKey_(row.email) === email) return true;
    return company && normalizeKey_(row.ragioneSociale) === company;
  })[0];
  var record = found || {
    id: uid_("cli"), creatoIl: new Date().toISOString(), condiviso: "NO",
    creato_da_username: user.username, creato_da_nome: userDisplayName_(user)
  };
  record.ragioneSociale = String(payload.cliente_azienda || payload.cliente_referente || record.ragioneSociale || "Cliente S.Q.P.");
  record.referente = String(payload.cliente_referente || record.referente || "");
  record.piva = String(payload.cliente_piva_cf || record.piva || "");
  record.email = String(payload.cliente_email || record.email || "");
  record.telefono = String(payload.cliente_telefono || record.telefono || "");
  record.citta = String(payload.cliente_localita || record.citta || "");
  record.agent_username = record.agent_username || user.username;
  record.creato_da_username = record.creato_da_username || record.agent_username || user.username;
  record.creato_da_nome = record.creato_da_nome || userDisplayName_(user);
  record.aggiornatoIl = new Date().toISOString();
  return upsertObject_("CLIENTI", "id", record.id, record);
}

function nextPracticeNumber_() {
  var year = String(new Date().getFullYear()).slice(-2);
  var nums = rowsToObjects_(sheet_("PRATICHE")).map(function (row) {
    return parseInt(String(row.numero || "0").split("-")[0], 10) || 0;
  });
  var next = (nums.length ? Math.max.apply(null, nums) : 0) + 1;
  return String(next).padStart(3, "0") + "-" + year;
}

function practiceInitials_(user) {
  var source = String(user.nome_visualizzato || user.username || "SM").trim();
  var parts = source.split(/\s+/).filter(String);
  var initials = parts.length > 1 ? parts[0].charAt(0) + parts[parts.length - 1].charAt(0) : source.replace(/[^A-Za-z0-9]/g, "").substring(0, 2);
  return String(initials || "SM").toUpperCase();
}

function nextPracticeIdentifier_(user) {
  var prefix = practiceInitials_(user);
  var pattern = new RegExp("^" + prefix + "(\\d{4})$", "i");
  var max = rowsToObjects_(sheet_("PRATICHE")).reduce(function (current, row) {
    var match = String(row.numero || "").match(pattern);
    return match ? Math.max(current, Number(match[1]) || 0) : current;
  }, 0);
  return prefix + String(max + 1).padStart(4, "0");
}

function upsertPracticeWithInventory_(payload, user) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (String(payload.nuova_pratica || "NO").toUpperCase() === "SI") {
      payload.numero = nextPracticeIdentifier_(user);
      payload.id = "PR-" + payload.numero;
      delete payload.nuova_pratica;
    }
    if (!payload.numero || String(payload.numero).toUpperCase() === "AUTO") payload.numero = nextPracticeIdentifier_(user);
    payload.id = payload.id || "PR-" + payload.numero;
    if (!payload.id) payload.id = uid_("pra");
    var existing = findRowObject_("PRATICHE", "id", payload.id);
    var wasApplied = String(existing && existing.magazzino_applicato || "NO").toUpperCase() === "SI";
    var nextStatus = normalizePracticeStatus_(payload.stato || existing && existing.stato || "Inserita");
    payload.stato = nextStatus;
    payload.archiviata = nextStatus === "Bocciata" ? "SI" : "NO";
    payload.archiviata_il = nextStatus === "Bocciata" ? (existing && existing.archiviata_il || new Date().toISOString()) : "";
    var inferredType = String(payload.finanziaria || existing && existing.finanziaria || "") === "Grenke" ? "NOLEGGIO" : (String(payload.finanziaria || existing && existing.finanziaria || "") === "IFIS" ? "LEASING" : "ACQUISTO");
    var practiceType = String(payload.tipo_pratica || existing && existing.tipo_pratica || inferredType).toUpperCase();
    payload.tipo_pratica = practiceType;
    if (nextStatus === "Bocciata" && practiceType === "ACQUISTO") throw new Error("Lo stato Bocciata è disponibile solo per pratiche di noleggio o leasing.");
    var hasInventoryRows = !!String(payload.righe_magazzino_json || existing && existing.righe_magazzino_json || payload.righe_json || existing && existing.righe_json || "").trim();
    var requiresStock = ["Accettata", "Completata"].indexOf(nextStatus) >= 0;
    var releasesStock = ["Inserita", "Sospesa", "Bocciata"].indexOf(nextStatus) >= 0;
    var shouldApply = requiresStock && !wasApplied && hasInventoryRows;
    var shouldReverse = releasesStock && wasApplied;
    if (wasApplied && existing && payload.righe_json && String(payload.righe_json) !== String(existing.righe_json || "") && !shouldReverse) {
      throw new Error("La composizione Ledwall non può essere modificata dopo l'impegno di magazzino. Annulla prima la pratica.");
    }
    if (shouldApply) {
      applyInventoryForPractice_(payload, user, -1, "SCARICO_PRATICA_" + nextStatus.toUpperCase());
      payload.magazzino_applicato = "SI";
      payload.magazzino_applicato_il = new Date().toISOString();
      payload.magazzino_stornato_il = "";
    } else if (shouldReverse) {
      applyInventoryForPractice_(existing || payload, user, 1, "STORNO_PRATICA");
      payload.magazzino_applicato = "NO";
      payload.magazzino_stornato_il = new Date().toISOString();
    } else if (existing) {
      payload.magazzino_applicato = existing.magazzino_applicato || "NO";
      payload.magazzino_applicato_il = existing.magazzino_applicato_il || "";
      payload.magazzino_stornato_il = existing.magazzino_stornato_il || "";
    }
    return upsertObject_("PRATICHE", "id", payload.id, payload);
  } finally { lock.releaseLock(); }
}

function normalizePracticeStatus_(status) {
  var value = String(status || "").trim().toLowerCase();
  var map = {
    "nuova": "Inserita", "preventivo": "Inserita", "documenti": "Inserita", "istruttoria": "Inserita", "delibera": "Inserita", "inserita": "Inserita",
    "accettata": "Accettata", "sospesa": "Sospesa", "annullata": "Sospesa",
    "rifiutata": "Bocciata", "bocciata": "Bocciata",
    "contratto": "Completata", "installazione": "Completata", "chiusa": "Completata", "completata": "Completata"
  };
  if (!map[value]) throw new Error("Stato pratica non valido.");
  return map[value];
}

function migratePracticeStatusesV13_() {
  rowsToObjects_(sheet_("PRATICHE")).forEach(function (practice) {
    var normalized;
    try { normalized = normalizePracticeStatus_(practice.stato || "Inserita"); } catch (error) { normalized = "Inserita"; }
    var changed = practice.stato !== normalized;
    practice.stato = normalized;
    if (!practice.tipo_pratica) { practice.tipo_pratica = practice.finanziaria === "Grenke" ? "NOLEGGIO" : (practice.finanziaria === "IFIS" ? "LEASING" : "ACQUISTO"); changed = true; }
    if (changed) upsertObject_("PRATICHE", "id", practice.id, practice);
  });
}

function listNotificationsForUser_(user) {
  return rowsToObjects_(sheet_("NOTIFICHE")).filter(function (row) {
    return String(row.recipient_username || "") === String(user.username || "");
  }).sort(function (a, b) { return String(b.data || "").localeCompare(String(a.data || "")); }).slice(0, 50);
}

function managementMarkNotificationsRead_(p) {
  var user = authenticate_(p.agent_username, p.agent_key);
  var rows = listNotificationsForUser_(user);
  var now = new Date().toISOString();
  rows.forEach(function (row) {
    if (String(row.letta || "NO").toUpperCase() !== "SI") {
      row.letta = "SI";
      row.letta_il = now;
      upsertObject_("NOTIFICHE", "id", row.id, row);
    }
  });
  return { ok: true, notifications: listNotificationsForUser_(user) };
}

function createPracticeStatusNotification_(before, after, actor) {
  var recipientUsername = String(after.agent_username || before.agent_username || "");
  if (!recipientUsername) return;
  var recipient = findRowObject_("AGENTI", "username", recipientUsername) || {};
  var title = "Pratica " + String(after.numero || after.id || "") + ": " + String(after.stato || "");
  var message = "La pratica " + String(after.numero || after.id || "") + " di " + String(after.cliente || "cliente") + " è passata da " + String(before.stato || "—") + " a " + String(after.stato || "—") + ".";
  var id = uid_("not");
  upsertObject_("NOTIFICHE", "id", id, {
    id: id, data: new Date().toISOString(), recipient_username: recipientUsername,
    recipient_name: recipient.nome_visualizzato || recipientUsername, practiceId: after.id,
    numero_pratica: after.numero || "", stato_precedente: before.stato || "", nuovo_stato: after.stato || "",
    titolo: title, messaggio: message, letta: "NO", letta_il: "", actor_username: actor.username || ""
  });
  var email = String(recipient.email || "").trim();
  if (email) {
    try {
      var state = String(after.stato || "");
      var outcome = state.toUpperCase();
      var practiceId = String(after.numero || after.id || "");
      var clientName = String(after.cliente || "cliente");
      var recipientName = userDisplayName_(recipient);
      var subject = "ESITO PRATICA " + practiceId + " - Seemax Management Suite";
      var emailText = "";
      if (state === "Accettata" || state === "Completata") {
        emailText = "Gentile " + recipientName + ", siamo felici di informarti che la pratica " + practiceId + " intestata a " + clientName + " ha avuto esito: " + outcome + ".\n\nPuoi dunque continuare a monitorare lo stato della pratica direttamente in App o dal gestionale.";
      } else if (state === "Bocciata") {
        emailText = "Gentile " + recipientName + ", ci dispiace informarti che la pratica " + practiceId + " intestata a " + clientName + " ha avuto esito: " + outcome + ".\n\nPertanto non sarà più possibile continuare e la pratica sarà automaticamente archiviata.";
      } else if (state === "Sospesa") {
        emailText = "Gentile " + recipientName + ", ti informiamo che la pratica " + practiceId + " intestata a " + clientName + " è stata temporaneamente sospesa.\n\nRiceverai una nuova comunicazione quando lo stato della pratica verrà aggiornato.";
      }
      if (emailText) {
        MailApp.sendEmail({
          to: email,
          subject: subject,
          name: "Seemax Management Suite",
          body: emailText,
          htmlBody: "<p>" + escapeHtml_(emailText).replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>") + "</p>"
        });
      }
    } catch (error) { log_(actor, "EMAIL_NOTIFICATION_ERROR", "notifications", id, String(error && error.message || error)); }
  }
}

function escapeHtml_(value) {
  return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
}

function applyInventoryForPractice_(practice, user, direction, movementType) {
  var lines = inventoryLinesFromPractice_(practice);
  if (!lines.length) throw new Error("La pratica non contiene righe cabinet valide per il magazzino.");
  var products = {};
  lines.forEach(function (line) {
    var product = findInventoryProduct_(line.product_id);
    if (!product) throw new Error("Prodotto magazzino non trovato: " + line.product_id);
    products[line.product_id] = product;
    var available = Number(product.giacenza_attuale || 0);
    if (direction < 0 && available < line.quantita) throw new Error("Giacenza insufficiente per " + (product.nome || line.product_id) + ": disponibili " + available + ", richiesti " + line.quantita + ".");
  });
  lines.forEach(function (line) {
    var product = products[line.product_id];
    var before = Number(product.giacenza_attuale || 0);
    var delta = direction * Number(line.quantita || 0);
    var after = before + delta;
    product.giacenza_attuale = after;
    product.aggiornatoIl = new Date().toISOString();
    upsertObject_("PRODOTTI_LED", "id", product.id, product);
    var movementId = uid_("mov");
    upsertObject_("MOVIMENTI_MAGAZZINO", "id", movementId, {
      id: movementId, data: new Date().toISOString(), practiceId: practice.id,
      numero_pratica: practice.numero || "", cliente: practice.cliente || "", product_id: product.id,
      sku: product.sku || product.id, prodotto: product.nome + " " + product.cabX + "x" + product.cabY,
      quantita: delta, tipo_movimento: movementType, giacenza_prima: before, giacenza_dopo: after,
      username: user.username, note: "Movimento automatico da stato pratica"
    });
  });
}

function inventoryLinesFromPractice_(practice) {
  var explicit = parseJson_(practice.righe_magazzino_json, []);
  var items = parseJson_(practice.righe_json, []);
  var grouped = {};
  explicit.forEach(function (line) {
    var id = canonicalProductId_(line.product_id || line.modello_display, line.cabX, line.cabY);
    var qty = Number(line.quantita || line.cabinet_da_sottrarre || 0);
    if (id && qty > 0) grouped[id] = (grouped[id] || 0) + qty;
  });
  if (!explicit.length) items.forEach(function (item) {
    var stock = Array.isArray(item.stock_lines) ? item.stock_lines : [];
    if (!stock.length) stock = buildInventoryRowsFromItems_([item]);
    stock.forEach(function (line) {
      var id = canonicalProductId_(line.product_id || line.modello_display || item.modello_display || item.prodotto, line.cabX, line.cabY);
      var qty = Number(line.quantita || 0);
      if (id && qty > 0) grouped[id] = (grouped[id] || 0) + qty;
    });
  });
  return Object.keys(grouped).map(function (id) { return { product_id: id, quantita: grouped[id] }; });
}

function findInventoryProduct_(productId) {
  var direct = findRowObject_("PRODOTTI_LED", "id", productId);
  if (direct) return direct;
  return rowsToObjects_(sheet_("PRODOTTI_LED")).filter(function (row) {
    return canonicalProductId_(row.id || row.nome, row.cabX, row.cabY) === productId;
  })[0] || null;
}

function buildInventoryRowsFromItems_(items) {
  var out = [];
  (items || []).forEach(function (item) {
    if (Array.isArray(item.stock_lines) && item.stock_lines.length) {
      item.stock_lines.forEach(function (line) { out.push(line); });
      return;
    }
    var qty = Number(item.cabinet_da_sottrarre || item.cabinet || 0);
    var id = canonicalProductId_(item.product_id || item.modello_display || item.prodotto, item.cabX, item.cabY);
    if (id && qty > 0) out.push({ product_id: id, modello_display: item.modello_display || item.prodotto || "", quantita: qty });
  });
  return out;
}

function backfillPracticeInventoryV12_() {
  rowsToObjects_(sheet_("PRATICHE")).forEach(function (practice) {
    var items = parseJson_(practice.righe_json, []);
    if (!items.length) return;
    var changed = false;
    if (!practice.modelli_display) { practice.modelli_display = items.map(function (item) { return item.modello_display || item.prodotto || ""; }).filter(Boolean).join(" | "); changed = true; }
    if (!practice.misure_display) { practice.misure_display = items.map(function (item) { return item.misura_display || item.misura_m || item.misura_cm || ""; }).filter(Boolean).join(" | "); changed = true; }
    if (!practice.righe_magazzino_json) { practice.righe_magazzino_json = JSON.stringify(buildInventoryRowsFromItems_(items)); changed = true; }
    if (!practice.cabinet_da_sottrarre) {
      practice.cabinet_da_sottrarre = buildInventoryRowsFromItems_(items).map(function (line) { return (line.descrizione || line.modello_display || line.product_id) + ": " + Number(line.quantita || 0); }).join(" | ");
      changed = true;
    }
    if (changed) upsertObject_("PRATICHE", "id", practice.id, practice);
  });
}

function canonicalProductId_(value, cabX, cabY) {
  var raw = String(value || "").toLowerCase().replace(/,/g, ".").replace(/p3[-_ ]91/g, "p3.91").replace(/p2[-_ ]5/g, "p2.5").replace(/p1[-_ ]9/g, "p1.9");
  if (/p391-50100|p3\.91.*(0\.50x1\.00|50x100)/.test(raw)) return "p391-50100";
  if (/p391-5050|p3\.91.*(0\.50x0\.50|50x50)/.test(raw)) return "p391-5050";
  if (raw.indexOf("p3.91") >= 0) return Number(cabY) === 50 ? "p391-5050" : "p391-50100";
  if (/p19-50100|p1\.9/.test(raw)) return "p19-50100";
  if (/p25-6464|p2\.5/.test(raw)) return "p25-6464";
  if (/p3-5757|(^|[^0-9])p3([^0-9]|$)/.test(raw)) return "p3-5757";
  if (/p4-6464|p4.*(0\.64x0\.64|64x64)/.test(raw) || (raw.indexOf("p4") >= 0 && Number(cabX) === 64)) return "p4-6464";
  if (/p4-9696|p4/.test(raw)) return "p4-9696";
  return "";
}

function normalizeKey_(value) { return String(value || "").trim().toLowerCase().replace(/\s+/g, " "); }

function managementRemove_(p) {
  var user = authenticate_(p.agent_username, p.agent_key);
  var entity = String(p.entity || "");
  assertWritePermission_(entity, user);
  var id = String(p.id || "");
  if (!id) throw new Error("ID mancante.");
  if (entity === "users" && id === user.username) throw new Error("Non puoi eliminare l'account attualmente collegato.");
  if (entity === "practices") {
    var practice = findRowObject_("PRATICHE", "id", id);
    if (practice && String(practice.stato || "") === "Completata") throw new Error("Le pratiche completate possono essere eliminate solo dal Foglio Google.");
    if (practice && String(practice.magazzino_applicato || "NO").toUpperCase() === "SI") throw new Error("Prima di eliminare la pratica, impostala come Sospesa per ripristinare le giacenze.");
  }
  if (entity === "clients") {
    var clientToRemove = findRowObject_("CLIENTI", "id", id);
    if (clientToRemove && !canEditClient_(clientToRemove, user)) throw new Error("Questo cliente può essere eliminato soltanto dal creatore o da un amministratore.");
    var linkedPractice = rowsToObjects_(sheet_("PRATICHE")).filter(function (row) { return String(row.clientId || "") === id; })[0];
    if (linkedPractice) throw new Error("Il cliente è collegato a una pratica e non può essere eliminato dal Management Suite.");
  }
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
  if (entity === "movements" && !isAdmin_(user)) return [];
  var rows = rowsToObjects_(sheet_(sheetName));
  if (entity === "clients") {
    var linkedClientIds = {};
    rowsToObjects_(sheet_("PRATICHE")).forEach(function (practice) { if (practice.clientId) linkedClientIds[String(practice.clientId)] = true; });
    rows = rows.filter(function (row) { return canAccessClient_(row, user); }).map(function (row) {
      row.ha_pratiche_collegate = linkedClientIds[String(row.id)] ? "SI" : "NO";
      row.puo_modificare = canEditClient_(row, user) ? "SI" : "NO";
      return row;
    });
  }
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

function dashboard_(data, user) {
  var practices = data.practices || [];
  var activities = data.activities || [];
  var open = practices.filter(function (p) { return ["Bocciata", "Completata"].indexOf(String(p.stato)) < 0; });
  var statuses = ["Inserita", "Accettata", "Sospesa", "Bocciata", "Completata"];
  var pipeline = statuses.map(function (status) {
    var rows = practices.filter(function (p) { return String(p.stato) === status; });
    return { status: status, count: rows.length, value: rows.reduce(function (sum, p) { return sum + Number(p.valore || 0); }, 0) };
  });
  var allPractices = rowsToObjects_(sheet_("PRATICHE"));
  var completedAll = allPractices.filter(function (p) { return String(p.stato) === "Completata"; });
  var completedPersonal = completedAll.filter(function (p) { return String(p.agent_username || "") === String(user.username || ""); });
  var target = Number((data.settings || {}).obiettivo_fatturato || 0);
  return {
    totals: { clients: (data.clients || []).length, practices: open.length, value: open.reduce(function (sum, p) { return sum + Number(p.valore || 0); }, 0), activities: activities.filter(function (a) { return String(a.stato) !== "Completata"; }).length },
    revenue: {
      personal: completedPersonal.reduce(function (sum, p) { return sum + Number(p.valore || 0); }, 0),
      company: completedAll.reduce(function (sum, p) { return sum + Number(p.valore || 0); }, 0),
      target: target
    },
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

function userDisplayName_(user) {
  return String(user && (user.nome_visualizzato || user.displayName || user.username) || "Utente");
}

function clientOwner_(client) {
  return String(client && (client.creato_da_username || client.agent_username) || "");
}

function canAccessClient_(client, user) {
  if (isAdmin_(user)) return true;
  return clientOwner_(client) === String(user && user.username || "") || String(client && client.condiviso || "NO").toUpperCase() === "SI";
}

function canEditClient_(client, user) {
  return isAdmin_(user) || clientOwner_(client) === String(user && user.username || "");
}

function assertWritePermission_(entity, user) {
  if (["products", "users", "movements"].indexOf(entity) >= 0 && !isAdmin_(user)) throw new Error("Funzione riservata all'amministratore.");
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

function practiceRequired_(type, field, settings) {
  var key = "req_" + String(type || "").toLowerCase() + "_" + String(field || "").toLowerCase();
  return String((settings || getSettings_())[key] || "NO").toUpperCase() === "SI";
}

function validatePracticeRequiredFields_(practice) {
  var type = String(practice.tipo_pratica || "").toUpperCase();
  var settings = getSettings_();
  var labels = {
    destinatario_ordine: "Destinatario ordine", clientId: "Cliente", valore: "Valore pratica",
    valore_provvigione: "Valore provvigione", numero_rate: "Numero di rate",
    periodicita_pagamento: "Mensilità", indirizzo_installazione_tipo: "Scelta indirizzo di installazione",
    installazione_regione: "Regione di installazione", installazione_provincia: "Provincia di installazione",
    installazione_comune: "Comune di installazione", installazione_cap: "CAP di installazione",
    installazione_localita: "Località di installazione", installazione_indirizzo: "Indirizzo di installazione",
    installazione_civico: "Civico di installazione",
    gestione_ledwall: "Gestione del Ledwall", cloud_username: "Username Cloud", cloud_password: "Password Cloud"
  };
  var fields = Object.keys(labels);
  fields.forEach(function (field) {
    if (!practiceRequired_(type, field, settings)) return;
    if (field === "clientId" && type === "ACQUISTO" && String(practice.destinatario_ordine || "").toUpperCase() === "PER ME") return;
    if (field.indexOf("installazione_") === 0 && field !== "indirizzo_installazione_tipo" && String(practice.indirizzo_installazione_tipo || "").toUpperCase() === "COME INDIRIZZO CLIENTE") return;
    if ((field === "cloud_username" || field === "cloud_password") && String(practice.gestione_ledwall || "").toUpperCase() !== "IN CLOUD") return;
    if (!String(practice[field] || "").trim()) throw new Error("Campo obbligatorio mancante: " + labels[field] + ".");
  });
}

function migrateRevenueTargetV151_() {
  var current = Number(getSettings_().obiettivo_fatturato || 0);
  if (!current || current === 100000) setSetting_("obiettivo_fatturato", 500000, "Obiettivo iniziale Management Suite v1.5.1");
}

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
    numero_preventivo_agenti_iniziale: 1,
    obiettivo_fatturato: 500000,
    req_acquisto_destinatario_ordine: "SI",
    req_acquisto_clientid: "SI",
    req_acquisto_valore: "SI",
    req_acquisto_valore_provvigione: "NO",
    req_acquisto_installazione_regione: "NO",
    req_acquisto_installazione_provincia: "NO",
    req_acquisto_installazione_comune: "SI",
    req_acquisto_installazione_cap: "SI",
    req_acquisto_installazione_localita: "NO",
    req_acquisto_installazione_indirizzo: "SI",
    req_acquisto_installazione_civico: "SI",
    req_acquisto_gestione_ledwall: "SI",
    req_acquisto_cloud_username: "NO",
    req_acquisto_cloud_password: "NO",
    req_acquisto_note: "NO",
    req_noleggio_clientid: "SI",
    req_noleggio_valore: "SI",
    req_noleggio_valore_provvigione: "SI",
    req_noleggio_numero_rate: "SI",
    req_noleggio_periodicita_pagamento: "SI",
    req_noleggio_indirizzo_installazione_tipo: "SI",
    req_noleggio_installazione_regione: "NO",
    req_noleggio_installazione_provincia: "NO",
    req_noleggio_installazione_comune: "SI",
    req_noleggio_installazione_cap: "SI",
    req_noleggio_installazione_localita: "NO",
    req_noleggio_installazione_indirizzo: "SI",
    req_noleggio_installazione_civico: "SI",
    req_noleggio_gestione_ledwall: "SI",
    req_noleggio_cloud_username: "NO",
    req_noleggio_cloud_password: "NO",
    req_noleggio_documento_identita: "SI",
    req_noleggio_tessera_sanitaria: "SI",
    req_noleggio_visura: "SI",
    req_noleggio_altra_documentazione: "NO",
    req_leasing_clientid: "SI",
    req_leasing_valore: "SI",
    req_leasing_valore_provvigione: "SI",
    req_leasing_numero_rate: "SI",
    req_leasing_periodicita_pagamento: "SI",
    req_leasing_indirizzo_installazione_tipo: "SI",
    req_leasing_installazione_regione: "NO",
    req_leasing_installazione_provincia: "NO",
    req_leasing_installazione_comune: "SI",
    req_leasing_installazione_cap: "SI",
    req_leasing_installazione_localita: "NO",
    req_leasing_installazione_indirizzo: "SI",
    req_leasing_installazione_civico: "SI",
    req_leasing_gestione_ledwall: "SI",
    req_leasing_cloud_username: "NO",
    req_leasing_cloud_password: "NO",
    req_leasing_documento_identita: "SI",
    req_leasing_tessera_sanitaria: "SI",
    req_leasing_preventivo_seemax: "SI",
    req_leasing_preventivo_ifis: "SI",
    req_leasing_visura: "SI",
    req_leasing_altra_documentazione: "NO"
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
    { id: "p19-50100", sku: "SMX-P19-50100", nome: "P1.9", categoria: "Ledwall Indoor", cabX: 50, cabY: 100, prezzoAgente: 850, prezzoCliente: 950, prezzoCina: 560, attivo: "SI", immagine_url: "assets/catalog/p19.png" },
    { id: "p25-6464", sku: "SMX-P25-6464", nome: "P2.5", categoria: "Ledwall Indoor/Outdoor", cabX: 64, cabY: 64, prezzoAgente: 700, prezzoCliente: 890, prezzoCina: 450, attivo: "SI", immagine_url: "assets/catalog/p25.png" },
    { id: "p3-5757", sku: "SMX-P3-5757", nome: "P3", categoria: "Ledwall Indoor/Outdoor", cabX: 57, cabY: 57, prezzoAgente: 410, prezzoCliente: 550, prezzoCina: 250, attivo: "SI", immagine_url: "assets/catalog/p3.jpg" },
    { id: "p391-50100", sku: "SMX-P391-50100", nome: "P3.91", categoria: "Ledwall Indoor/Outdoor", cabX: 50, cabY: 100, prezzoAgente: 550, prezzoCliente: 650, prezzoCina: 280, attivo: "SI", immagine_url: "assets/catalog/p391-50100.png" },
    { id: "p391-5050", sku: "SMX-P391-5050", nome: "P3.91 - 0.50x0.50", categoria: "Ledwall Indoor/Outdoor", cabX: 50, cabY: 50, prezzoAgente: 295, prezzoCliente: 335, prezzoCina: 150, attivo: "SI", immagine_url: "assets/catalog/p391-5050.jpg" },
    { id: "p4-9696", sku: "SMX-P4-9696", nome: "P4", categoria: "Ledwall Outdoor", cabX: 96, cabY: 96, prezzoAgente: 860, prezzoCliente: 1080, prezzoCina: 580, attivo: "SI", immagine_url: "assets/catalog/p4-9696.jpg" }
  ];
  products.forEach(function (product) { upsertObject_("PRODOTTI_LED", "id", product.id, product); });
}

function initializeInventoryV11_() {
  var defaults = [
    { id: "p19-50100", sku: "SMX-P19-50100", nome: "P1.9", cabX: 50, cabY: 100, prezzoAgente: 850, prezzoCliente: 950, prezzoCina: 560, giacenza_iniziale: 0, giacenza_attuale: 0, stato_giacenza: "SOLO SU ORDINAZIONE", promo_attiva: "NO", immagine_url: "assets/catalog/p19.png", descrizione: "Ledwall indoor ad alta definizione.", infoAgenti: "Ledwall Display P1.9 | Misura Cabinet: 0.50x1.00 | Qualità elevata da medie e lunghe distanze; ottimo a distanze ravvicinate | Utilizzabile solo per installazioni indoor", infoAdmin: "Ledwall Display P1.9 | 0.50x1.00 | Indoor | Costo Cina: 560 euro (incluso 30% spedizione)" },
    { id: "p25-6464", sku: "SMX-P25-6464", nome: "P2.5", cabX: 64, cabY: 64, giacenza_iniziale: 0, giacenza_attuale: 0, stato_giacenza: "IN ARRIVO", promo_attiva: "NO", immagine_url: "assets/catalog/p25.png", descrizione: "Ledwall indoor/outdoor, formato 0.64x0.64.", infoAgenti: "Ledwall Display P2.5 | Misura Cabinet: 0.64x0.64 | Qualità eccellente da medie e lunghe distanze; buono a distanze ravvicinate | Utilizzabile indoor e outdoor | Adatto per vetrina o installazioni totem", infoAdmin: "Ledwall Display P2.5 | 0.64x0.64 | Indoor/Outdoor | Costo Cina: 450 euro (incluso 30% spedizione)" },
    { id: "p3-5757", sku: "SMX-P3-5757", nome: "P3", cabX: 57, cabY: 57, giacenza_iniziale: 60, giacenza_attuale: 60, stato_giacenza: "DISPONIBILE", promo_attiva: "SI", immagine_url: "assets/catalog/p3.jpg", descrizione: "Ledwall indoor/outdoor, formato 0.57x0.57.", infoAgenti: "Ledwall Display P3 | Misura Cabinet: 0.57x0.57 | Qualità eccellente da medie e lunghe distanze | Utilizzabile indoor e outdoor | Adatto per installazioni a parete e a bandiera", infoAdmin: "Ledwall Display P3 | 0.57x0.57 | Indoor/Outdoor | Costo Cina: 250 euro" },
    { id: "p391-50100", sku: "SMX-P391-50100", nome: "P3.91", cabX: 50, cabY: 100, giacenza_iniziale: 56, giacenza_attuale: 56, stato_giacenza: "DISPONIBILE", promo_attiva: "NO", immagine_url: "assets/catalog/p391-50100.png", descrizione: "Ledwall indoor/outdoor, cabinet rettangolare.", infoAgenti: "Ledwall Display P3.91 | Misura Cabinet: 0.50x1.00 | Qualità ottima da medie e lunghe distanze | Utilizzabile indoor e outdoor | Adatto per installazioni a parete e a bandiera", infoAdmin: "Ledwall Display P3.91 | 0.50x1.00 | Indoor/Outdoor | Costo Cina: 280 euro" },
    { id: "p391-5050", sku: "SMX-P391-5050", nome: "P3.91 - 0.50x0.50", cabX: 50, cabY: 50, prezzoAgente: 295, prezzoCliente: 335, prezzoCina: 150, giacenza_iniziale: 64, giacenza_attuale: 64, stato_giacenza: "DISPONIBILE", promo_attiva: "NO", immagine_url: "assets/catalog/p391-5050.jpg", descrizione: "Ledwall indoor/outdoor, cabinet quadrato.", infoAgenti: "Ledwall Display P3.91 | Misura Cabinet: 0.50x0.50 | Qualità ottima da medie e lunghe distanze | Utilizzabile indoor e outdoor | Adatto per installazioni a parete e a bandiera", infoAdmin: "Ledwall Display P3.91 | 0.50x0.50 | Indoor/Outdoor | Costo Cina: 150 euro" },
    { id: "p4-9696", sku: "SMX-P4-9696", nome: "P4", cabX: 96, cabY: 96, giacenza_iniziale: 8, giacenza_attuale: 8, stato_giacenza: "DISPONIBILE", promo_attiva: "NO", immagine_url: "assets/catalog/p4-9696.jpg", descrizione: "Ledwall outdoor, formato 0.96x0.96.", infoAgenti: "Ledwall Display P4 | Misura Cabinet: 0.96x0.96 | Qualità buona da medie e lunghe distanze | Utilizzabile prevalentemente outdoor | Adatto per installazioni a parete e a bandiera", infoAdmin: "Ledwall Display P4 | 0.96x0.96 | Outdoor | Costo Cina: 580 euro" },
    { id: "p4-6464", sku: "SMX-P4-6464", nome: "P4 - 0.64x0.64", cabX: 64, cabY: 64, giacenza_iniziale: 4, giacenza_attuale: 4, stato_giacenza: "DISPONIBILE", promo_attiva: "SI", attivo: "SI", categoria: "Ledwall Outdoor", descrizione: "Prodotto catalogo: prezzo promozionale da completare.", immagine_url: "assets/catalog/p4-9696.jpg" }
  ];
  defaults.forEach(function (entry) { consolidateProductRows_(entry); });
}

function consolidateProductRows_(entry) {
  var productSheet = sheet_("PRODOTTI_LED");
  var values = productSheet.getDataRange().getValues();
  var headers = values[0].map(String);
  var matches = [];
  for (var i = 1; i < values.length; i++) {
    var row = {};
    headers.forEach(function (header, index) { row[header] = values[i][index]; });
    if (canonicalProductId_(row.id || row.nome, row.cabX, row.cabY) === entry.id) matches.push({ sheetRow: i + 1, row: row });
  }
  matches.sort(function (a, b) { return (a.row.id === entry.id ? 1 : 0) - (b.row.id === entry.id ? 1 : 0); });
  var merged = {};
  Object.keys(entry).forEach(function (key) { merged[key] = entry[key]; });
  matches.forEach(function (match) {
    Object.keys(match.row).forEach(function (key) {
      var value = match.row[key];
      if (value !== "" && value !== null && value !== undefined) merged[key] = value;
    });
  });
  merged.id = entry.id;
  merged.sku = entry.sku;
  merged.nome = entry.nome;
  merged.cabX = entry.cabX;
  merged.cabY = entry.cabY;
  merged.attivo = merged.attivo || "SI";
  matches.map(function (match) { return match.sheetRow; }).sort(function (a, b) { return b - a; }).forEach(function (sheetRow) { productSheet.deleteRow(sheetRow); });
  upsertObject_("PRODOTTI_LED", "id", entry.id, merged);
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
