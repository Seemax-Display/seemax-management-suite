(function () {
  "use strict";

  const LOCATIONS_URL = "assets/data/italy-locations.json";
  const ADE_URL = "https://telemanagrafici.agenziaentrate.gov.it/VerificaPIVA/Scegli.do?parameter=verificaPiva";
  let locationsPromise;

  const esc = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
  const digits = (value) => String(value || "").replace(/\D/g, "");
  const flag = (code) => String(code || "").toUpperCase().replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));

  function loadLocations() {
    if (!locationsPromise) {
      locationsPromise = fetch(LOCATIONS_URL, { cache: "force-cache" })
        .then((response) => {
          if (!response.ok) throw new Error("Archivio geografico non disponibile.");
          return response.json();
        })
        .then((data) => data.rows || []);
    }
    return locationsPromise;
  }

  function validItalianVat(value) {
    const vat = digits(value);
    if (!/^\d{11}$/.test(vat)) return false;
    let sum = 0;
    for (let index = 0; index < 10; index += 1) {
      let number = Number(vat[index]);
      if (index % 2 === 1) {
        number *= 2;
        if (number > 9) number -= 9;
      }
      sum += number;
    }
    return (10 - (sum % 10)) % 10 === Number(vat[10]);
  }

  function validIban(value) {
    const iban = String(value || "").replace(/\s+/g, "").toUpperCase();
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban) || iban.length < 15 || iban.length > 34) return false;
    const lengths = { AL: 28, AD: 24, AT: 20, AZ: 28, BH: 22, BE: 16, BA: 20, BR: 29, BG: 22, CR: 22, HR: 21, CY: 28, CZ: 24, DK: 18, DO: 28, EE: 20, FO: 18, FI: 18, FR: 27, GE: 22, DE: 22, GI: 23, GR: 27, GL: 18, GT: 28, HU: 28, IS: 26, IQ: 23, IE: 22, IL: 23, IT: 27, JO: 30, KZ: 20, XK: 20, KW: 30, LV: 21, LB: 28, LI: 21, LT: 20, LU: 20, MT: 31, MR: 27, MU: 30, MC: 27, MD: 24, ME: 22, NL: 18, MK: 19, NO: 15, PK: 24, PS: 29, PL: 28, PT: 25, QA: 29, RO: 24, LC: 32, SM: 27, ST: 25, SA: 24, RS: 22, SC: 31, SK: 24, SI: 19, ES: 24, SE: 24, CH: 21, TL: 23, TN: 24, TR: 26, UA: 29, AE: 23, GB: 22, VA: 22, VG: 24 };
    if (lengths[iban.slice(0, 2)] && lengths[iban.slice(0, 2)] !== iban.length) return false;
    const rearranged = iban.slice(4) + iban.slice(0, 4);
    let remainder = 0;
    for (const char of rearranged) {
      const expanded = /\d/.test(char) ? char : String(char.charCodeAt(0) - 55);
      for (const digit of expanded) remainder = (remainder * 10 + Number(digit)) % 97;
    }
    return remainder === 1;
  }

  function status(element, type, text) {
    if (!element) return;
    element.className = `field-validation ${type || "neutral"}`;
    element.textContent = text;
  }

  function countryOptions(selected) {
    const phone = window.libphonenumber;
    if (!phone) return `<option value="IT">🇮🇹 Italia (+39)</option>`;
    const display = typeof Intl.DisplayNames === "function" ? new Intl.DisplayNames(["it"], { type: "region" }) : null;
    return phone.getCountries().map((code) => {
      const name = display ? display.of(code) : code;
      const prefix = phone.getCountryCallingCode(code);
      return `<option value="${code}" ${code === selected ? "selected" : ""}>${flag(code)} ${esc(name)} (+${prefix})</option>`;
    }).sort((a, b) => (a.includes('value="IT"') ? -1 : b.includes('value="IT"') ? 1 : a.localeCompare(b, "it"))).join("");
  }

  function renderFields(record) {
    const phoneCountry = record.telefono_paese || "IT";
    const adeOptions = ["NON VERIFICATA", "ATTIVA", "SOSPESA", "CESSATA", "NON PRESENTE"];
    return `
      <fieldset class="client-section full">
        <legend>Identificazione fiscale</legend>
        <div class="form-grid">
          <label>Partita IVA italiana
            <input name="piva" inputmode="numeric" maxlength="11" value="${esc(record.piva || "")}" placeholder="11 cifre">
            <small id="vatLocalStatus" class="field-validation neutral">Inserisci 11 cifre.</small>
          </label>
          <label>Codice fiscale
            <input name="codice_fiscale" maxlength="16" value="${esc(record.codice_fiscale || "")}" placeholder="Per persone fisiche o soggetti senza P.IVA">
          </label>
          <label>Stato VIES
            <input name="piva_vies_nome" value="${esc(record.piva_vies_nome || "")}" readonly placeholder="Non verificato">
            <small id="vatViesStatus" class="field-validation neutral">${esc(record.piva_vies_esito || "Verifica facoltativa per operazioni UE.")}</small>
          </label>
          <div class="verification-actions full">
            <button class="btn soft" type="button" id="verifyViesButton">Verifica VIES</button>
            <a class="btn ghost" href="${ADE_URL}" target="_blank" rel="noopener">Verifica sul sito Agenzia Entrate ↗</a>
          </div>
          <label>Esito verifica Agenzia Entrate
            <select name="piva_verifica_ade">${adeOptions.map((value) => `<option value="${value}" ${String(record.piva_verifica_ade || "NON VERIFICATA") === value ? "selected" : ""}>${value}</option>`).join("")}</select>
          </label>
          <label>Data verifica Agenzia Entrate
            <input name="piva_verifica_ade_data" type="date" value="${esc(String(record.piva_verifica_ade_data || "").slice(0, 10))}">
          </label>
          <input type="hidden" name="piva_formalmente_valida" value="${esc(record.piva_formalmente_valida || "NO")}">
          <input type="hidden" name="piva_duplicata" value="NO">
          <input type="hidden" name="piva_vies_valida" value="${esc(record.piva_vies_valida || "NON VERIFICATA")}">
          <input type="hidden" name="piva_vies_esito" value="${esc(record.piva_vies_esito || "")}">
        </div>
      </fieldset>
      <fieldset class="client-section full">
        <legend>Dati bancari e contatti</legend>
        <div class="form-grid">
          <label class="full">IBAN
            <input name="iban" autocomplete="off" value="${esc(record.iban || "")}" placeholder="IT00 X000 0000 0000 0000 0000 000">
            <small id="ibanStatus" class="field-validation neutral">Controllo matematico MOD-97.</small>
          </label>
          <input type="hidden" name="iban_valido" value="${esc(record.iban_valido || "NO")}">
          <label>Paese e prefisso
            <select name="telefono_paese">${countryOptions(phoneCountry)}</select>
          </label>
          <label>Cellulare
            <input name="telefono_numero" type="tel" value="${esc(record.telefono_numero || record.telefono || "")}" placeholder="Numero di cellulare">
            <small id="phoneStatus" class="field-validation neutral">Il numero verrà salvato in formato internazionale.</small>
          </label>
          <input type="hidden" name="telefono" value="${esc(record.telefono || "")}">
          <input type="hidden" name="telefono_prefisso" value="${esc(record.telefono_prefisso || "+39")}">
          <input type="hidden" name="telefono_valido" value="${esc(record.telefono_valido || "NO")}">
        </div>
      </fieldset>
      <fieldset class="client-section full">
        <legend>Sede e località</legend>
        <div class="form-grid">
          <label>Regione<select name="regione"><option value="">Caricamento regioni…</option></select></label>
          <label>Provincia<select name="provincia" disabled><option value="">Seleziona prima la regione</option></select></label>
          <label>Comune / Città<select name="comune" disabled><option value="">Seleziona prima la provincia</option></select></label>
          <label>CAP<select name="cap" disabled><option value="">Seleziona prima il comune</option></select></label>
          <label>Località / frazione<input name="localita" value="${esc(record.localita || "")}" placeholder="Facoltativa"></label>
          <label>Indirizzo<input name="indirizzo" value="${esc(record.indirizzo || "")}" placeholder="Via, viale, piazza…"></label>
          <label>Numero civico<input name="civico" value="${esc(record.civico || "")}"></label>
          <input type="hidden" name="citta" value="${esc(record.comune || record.citta || "")}">
        </div>
      </fieldset>`;
  }

  function bind(form, record, clients, api, notify) {
    const vat = form.elements.piva;
    const iban = form.elements.iban;
    const phoneCountry = form.elements.telefono_paese;
    const phoneNumber = form.elements.telefono_numero;

    function updateVat() {
      vat.value = digits(vat.value).slice(0, 11);
      const valid = validItalianVat(vat.value);
      form.elements.piva_formalmente_valida.value = valid ? "SI" : "NO";
      if (!vat.value) status(document.getElementById("vatLocalStatus"), "neutral", "Inserisci 11 cifre.");
      else if (!valid) status(document.getElementById("vatLocalStatus"), "invalid", "Partita IVA formalmente non valida.");
      else {
        const duplicate = (clients || []).find((client) => String(client.id) !== String(record.id || "") && digits(client.piva) === vat.value);
        form.elements.piva_duplicata.value = duplicate ? "SI" : "NO";
        status(document.getElementById("vatLocalStatus"), duplicate ? "invalid" : "valid", duplicate ? `Già associata a ${duplicate.ragioneSociale}.` : "Formato italiano valido.");
      }
      if (!valid) form.elements.piva_duplicata.value = "NO";
    }

    function updateIban() {
      iban.value = String(iban.value || "").replace(/\s+/g, "").toUpperCase().replace(/(.{4})/g, "$1 ").trim();
      const valid = validIban(iban.value);
      form.elements.iban_valido.value = valid ? "SI" : "NO";
      status(document.getElementById("ibanStatus"), !iban.value ? "neutral" : valid ? "valid" : "invalid", !iban.value ? "Campo facoltativo." : valid ? "IBAN formalmente valido." : "IBAN non valido: controlla Paese, lunghezza e cifre di controllo.");
    }

    function updatePhone() {
      const library = window.libphonenumber;
      const country = phoneCountry.value || "IT";
      const prefix = library ? `+${library.getCountryCallingCode(country)}` : "+39";
      form.elements.telefono_prefisso.value = prefix;
      if (!phoneNumber.value.trim()) {
        form.elements.telefono.value = "";
        form.elements.telefono_valido.value = "NO";
        status(document.getElementById("phoneStatus"), "neutral", "Campo facoltativo.");
        return;
      }
      try {
        const parsed = library.parsePhoneNumber(phoneNumber.value, country);
        const valid = parsed && parsed.isValid();
        form.elements.telefono.value = valid ? parsed.number : `${prefix}${digits(phoneNumber.value)}`;
        form.elements.telefono_valido.value = valid ? "SI" : "NO";
        status(document.getElementById("phoneStatus"), valid ? "valid" : "invalid", valid ? `Numero valido: ${parsed.formatInternational()}` : "Numero non valido per il Paese selezionato.");
      } catch (error) {
        form.elements.telefono.value = `${prefix}${digits(phoneNumber.value)}`;
        form.elements.telefono_valido.value = "NO";
        status(document.getElementById("phoneStatus"), "invalid", "Numero incompleto o non riconosciuto.");
      }
    }

    vat.addEventListener("input", updateVat);
    iban.addEventListener("input", updateIban);
    phoneCountry.addEventListener("change", updatePhone);
    phoneNumber.addEventListener("input", updatePhone);
    updateVat(); updateIban(); updatePhone();

    const verifyButton = document.getElementById("verifyViesButton");
    verifyButton.addEventListener("click", async () => {
      updateVat();
      if (form.elements.piva_formalmente_valida.value !== "SI") {
        notify("Inserisci prima una Partita IVA formalmente valida.", "danger");
        vat.focus();
        return;
      }
      verifyButton.disabled = true;
      verifyButton.textContent = "Verifica in corso…";
      status(document.getElementById("vatViesStatus"), "neutral", "Collegamento al servizio europeo VIES…");
      try {
        const result = await api.verifyVat(vat.value);
        form.elements.piva_vies_valida.value = result.valid ? "SI" : "NO";
        form.elements.piva_vies_nome.value = result.name || "";
        const message = result.valid
          ? `P.IVA abilitata VIES${result.name ? ` · ${result.name}` : ""}.`
          : "P.IVA non risultata abilitata alle operazioni intracomunitarie. Questo non prova che sia inesistente.";
        form.elements.piva_vies_esito && (form.elements.piva_vies_esito.value = message);
        status(document.getElementById("vatViesStatus"), result.valid ? "valid" : "warning", message);
      } catch (error) {
        status(document.getElementById("vatViesStatus"), "warning", `VIES non disponibile: ${error.message}`);
      } finally {
        verifyButton.disabled = false;
        verifyButton.textContent = "Verifica VIES";
      }
    });

    const adeSelect = form.elements.piva_verifica_ade;
    adeSelect.addEventListener("change", () => {
      if (adeSelect.value !== "NON VERIFICATA" && !form.elements.piva_verifica_ade_data.value) {
        form.elements.piva_verifica_ade_data.value = new Date().toISOString().slice(0, 10);
      }
    });

    loadLocations().then((rows) => bindLocations(form, record, rows)).catch((error) => notify(error.message, "danger"));
  }

  function bindLocations(form, record, rows) {
    const region = form.elements.regione;
    const province = form.elements.provincia;
    const comune = form.elements.comune;
    const cap = form.elements.cap;
    const unique = (values) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "it"));
    const setOptions = (select, values, placeholder, selected) => {
      select.innerHTML = `<option value="">${placeholder}</option>${values.map((value) => `<option value="${esc(value)}" ${String(value) === String(selected || "") ? "selected" : ""}>${esc(value)}</option>`).join("")}`;
      select.disabled = !values.length;
    };
    const currentComune = record.comune || record.citta || "";
    const inferredRow = rows.find((row) => row.n === currentComune && (!record.regione || row.r === record.regione));
    const currentRegion = record.regione || (inferredRow && inferredRow.r) || "";
    const currentProvince = /\([A-Z]{2}\)$/.test(String(record.provincia || ""))
      ? record.provincia
      : inferredRow ? `${inferredRow.p} (${inferredRow.s})` : record.provincia || "";
    const currentCap = record.cap || "";

    function updateProvinces(selected) {
      setOptions(province, unique(rows.filter((row) => row.r === region.value).map((row) => `${row.p} (${row.s})`)), "Seleziona provincia", selected);
    }
    function updateComuni(selected) {
      const sigla = (province.value.match(/\(([^)]+)\)$/) || [])[1] || "";
      setOptions(comune, unique(rows.filter((row) => row.r === region.value && row.s === sigla).map((row) => row.n)), "Seleziona comune", selected);
    }
    function updateCaps(selected) {
      const sigla = (province.value.match(/\(([^)]+)\)$/) || [])[1] || "";
      setOptions(cap, unique(rows.filter((row) => row.s === sigla && row.n === comune.value).map((row) => row.c)), "Seleziona CAP", selected);
      form.elements.citta.value = comune.value;
    }
    setOptions(region, unique(rows.map((row) => row.r)), "Seleziona regione", currentRegion);
    updateProvinces(currentProvince);
    updateComuni(currentComune);
    updateCaps(currentCap);
    region.addEventListener("change", () => { updateProvinces(""); updateComuni(""); updateCaps(""); });
    province.addEventListener("change", () => { updateComuni(""); updateCaps(""); });
    comune.addEventListener("change", () => updateCaps(""));
  }

  window.SeemaxClientTools = { renderFields, bind, validItalianVat, validIban };
})();
