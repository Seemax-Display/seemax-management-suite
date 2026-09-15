(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SeemaxWorkOrder = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function esc(value) {
    return String(value === undefined || value === null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char];
    });
  }

  function text(value, fallback) {
    const normalized = String(value === undefined || value === null ? "" : value).trim();
    return normalized || (fallback === undefined ? "-" : fallback);
  }

  function dateIt(value) {
    const date = value instanceof Date ? value : new Date(value || Date.now());
    if (Number.isNaN(date.getTime())) return text(value);
    return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  }

  function filePart(value) {
    const sanitized = text(value, "Pratica").replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim().slice(0, 90).replace(/[. ]+$/g, "");
    return sanitized || "Pratica";
  }

  function field(label, value, wide) {
    return `<div class="client-field${wide ? " wide" : ""}"><small>${esc(label)}</small><strong>${esc(text(value))}</strong></div>`;
  }

  function sectionTitle(number, title, note) {
    return `<div class="section-title"><span>${esc(number)}</span><strong>${esc(title)}</strong>${note ? `<small>${esc(note)}</small>` : ""}</div>`;
  }

  function normalizedProducts(input) {
    const source = Array.isArray(input) ? input : [];
    const rows = source.filter(Boolean).map(function (product, index) {
      return {
        name: text(product.name || product.nome || product.model, `Prodotto ${index + 1}`),
        code: text(product.code || product.sku || product.product_id),
        size: text(product.size || product.measure || product.misura),
        configuration: text(product.configuration || product.configurazione || product.face),
        cabinets: text(product.cabinets || product.cabinet || product.quantity)
      };
    });
    return rows.length ? rows : [{ name: "Prodotto non indicato", code: "-", size: "-", configuration: "-", cabinets: "-" }];
  }

  function productRows(products) {
    return normalizedProducts(products).map(function (product, index) {
      return `<tr><td><b>${String(index + 1).padStart(2, "0")}</b>${esc(product.name)}</td><td>${esc(product.code)}</td><td>${esc(product.size)}</td><td>${esc(product.configuration)}</td><td>${esc(product.cabinets)}</td></tr>`;
    }).join("");
  }

  function materialRows(count) {
    return Array.from({ length: count }, function (_, index) {
      return `<tr><td><b>${String(index + 1).padStart(2, "0")}</b></td><td></td><td></td></tr>`;
    }).join("");
  }

  function build(payload) {
    const data = payload || {};
    const practice = data.practice || {};
    const client = data.client || {};
    const agent = data.agent || {};
    const company = data.company || {};
    const number = text(practice.number || practice.numero || practice.id, "SENZA NUMERO");
    const clientName = text(client.name || client.ragioneSociale || practice.cliente, "Cliente non indicato");
    const documentTitle = `Commessa d'ordine - ${filePart(number)} - ${filePart(clientName)}`;
    const issueDate = dateIt(data.generatedAt);
    const products = normalizedProducts(data.products);
    const adaptiveMaterialRows = products.length <= 2 ? 8 : products.length === 3 ? 7 : 6;
    const requestedMaterialRows = Number(data.materialRows);
    const materialsCount = Math.max(6, Math.min(12, Number.isFinite(requestedMaterialRows) && requestedMaterialRows > 0 ? requestedMaterialRows : adaptiveMaterialRows));
    const brand = text(company.brand, "SEEMAX DISPLAY");
    const legalName = text(company.legalName, "LED LAB COMPANY");

    const html = `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(documentTitle)}</title>
<style>
  @page{size:A4 portrait;margin:0}
  *{box-sizing:border-box}
  :root{--navy:#0a2348;--navy2:#123a70;--blue:#1768e5;--cyan:#2fa8f5;--ice:#eff6ff;--ice2:#f7fafe;--ink:#10233f;--text:#27364d;--muted:#64748b;--line:#d6e0ec;--green:#0f9d67}
  html,body{margin:0;min-height:100%;background:#e9eef5;color:var(--text);font-family:Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{padding:18px}
  .print-actions{position:fixed;z-index:20;right:20px;top:18px;display:flex;gap:8px}
  .print-actions button{border:0;border-radius:999px;padding:11px 16px;color:#fff;background:var(--blue);box-shadow:0 9px 24px rgba(10,35,72,.22);font:700 13px Arial;cursor:pointer}
  .print-actions .secondary{border:1px solid #cbd9e8;color:var(--navy);background:#fff}
  .sheet{width:210mm;min-height:297mm;margin:0 auto;padding:10mm;overflow:hidden;background:#fbfcfe;box-shadow:0 18px 55px rgba(15,35,63,.18)}
  .header{position:relative;display:grid;grid-template-columns:1fr 1.2fr;align-items:center;height:24mm;overflow:hidden;border-radius:5mm;padding:0 6mm;color:#fff;background:radial-gradient(circle at 13% 10%,rgba(47,168,245,.28),transparent 28%),linear-gradient(110deg,var(--navy),#0b376e)}
  .header:before{content:"";position:absolute;inset:0 0 auto;height:.8mm;background:var(--cyan)}
  .brand{display:grid;grid-template-columns:12mm 1fr;gap:3.5mm;align-items:center}.brand-mark{display:grid;place-items:center;width:12mm;height:12mm;border-radius:3.4mm;color:#fff;background:linear-gradient(145deg,#2fa8f5,#1768e5 58%,#0e3974);box-shadow:inset 0 1px rgba(255,255,255,.35);font-size:6mm;font-weight:900}.brand strong,.brand small{display:block}.brand strong{font-size:4mm;letter-spacing:.02em}.brand small{margin-top:1.5mm;color:#b9d3f5;font-size:2mm;font-weight:700;letter-spacing:.08em}
  .document-head{text-align:right}.document-head h1{margin:0;font-size:7mm;line-height:1;letter-spacing:-.025em}.document-head p{margin:2mm 0 2.6mm;color:#c8daf1;font-size:2.5mm}.status{display:inline-flex;align-items:center;gap:2mm;border-radius:999px;padding:1.5mm 3.2mm;color:var(--green);background:#dff7ec;font-size:2.1mm;font-weight:900;letter-spacing:.04em}.status i{width:1.7mm;height:1.7mm;border-radius:50%;background:var(--green)}
  .meta{display:grid;grid-template-columns:repeat(4,1fr);height:10mm;margin-top:3mm;border:1px solid #cfe0f5;border-radius:3mm;background:var(--ice)}.meta>div{display:grid;align-content:center;padding:0 4mm}.meta>div+div{border-left:1px solid #c9d9ec}.meta small,.meta strong{display:block}.meta small{color:var(--muted);font-size:1.8mm;font-weight:800;letter-spacing:.06em}.meta strong{margin-top:.8mm;color:var(--navy);font-size:2.8mm}
  .card{margin-top:3.4mm;border:1px solid var(--line);border-radius:3.5mm;padding:4mm;background:#fff}.section-title{display:grid;grid-template-columns:6mm auto 1fr;align-items:center;gap:2.2mm;margin-bottom:3.2mm}.section-title>span{display:grid;place-items:center;width:6mm;height:6mm;border-radius:50%;color:#fff;background:var(--blue);font-size:2.1mm;font-weight:900}.section-title>strong{color:var(--navy);font-size:2.7mm;letter-spacing:.025em}.section-title>small{justify-self:end;color:var(--muted);font-size:2mm;font-weight:400}
  .client-grid{display:grid;grid-template-columns:1.35fr .85fr .9fr;gap:3mm 5mm}.client-field{min-width:0}.client-field.wide{grid-column:span 2}.client-field small,.client-field strong{display:block}.client-field small{color:var(--muted);font-size:1.8mm;font-weight:800;letter-spacing:.07em}.client-field strong{overflow-wrap:anywhere;margin-top:1mm;color:var(--ink);font-size:2.8mm;line-height:1.18}
  .reference-grid{display:grid;grid-template-columns:1fr 1fr;gap:3mm}.reference-grid .card{margin-top:3mm;min-height:18mm}.person-name{color:var(--ink);font-size:3.2mm;font-weight:900}.person-contact{margin-top:1.2mm;color:var(--muted);font-size:2mm}.technician-line{height:5mm;margin-top:3mm;border-bottom:1px solid #8fa3bc}.hand-note{display:block;margin-top:1mm;color:var(--muted);font-size:1.8mm;text-align:right}
  table{width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed}.products{overflow:hidden;border:1px solid #d2e1f3;border-radius:2.6mm}.products th{height:7mm;padding:0 2.2mm;color:#fff;background:var(--navy2);font-size:1.8mm;text-align:left;letter-spacing:.035em}.products td{height:8mm;border-top:1px solid #d8e4f1;padding:1.3mm 2.2mm;color:var(--ink);font-size:2.15mm;font-weight:700}.products th+th,.products td+td{border-left:1px solid #d4e0ee}.products td:first-child{padding-left:8mm;position:relative}.products td:first-child b{position:absolute;left:2mm;color:#8ba0ba;font-size:1.7mm}.products th:nth-child(1){width:31%}.products th:nth-child(2){width:19%}.products th:nth-child(3){width:17%}.products th:nth-child(4){width:20%}.products th:nth-child(5){width:13%;text-align:center}.products td:nth-child(5){text-align:center}
  .materials-wrap{margin-top:4mm}.materials-wrap .section-title{margin:0 1mm 2.6mm}.materials{overflow:hidden;border:1px solid #bdcde0;border-radius:2.8mm}.materials th{height:9mm;padding:0 3mm;color:#fff;background:#17457e;font-size:2.2mm;text-align:left;letter-spacing:.025em}.materials th+th,.materials td+td{border-left:1px solid #bdcde0}.materials th:nth-child(1){width:52%}.materials th:nth-child(2){width:32%}.materials th:nth-child(3){width:16%;text-align:center}.materials td{position:relative;height:9mm;border-top:1px solid #d5dfeb;padding:0 3mm;background:#fff}.materials tr:nth-child(even) td{background:var(--ice2)}.materials td:first-child{padding-left:8mm}.materials td:first-child b{position:absolute;left:2.2mm;top:3.3mm;color:#9badc1;font-size:1.7mm}
  .closing{display:grid;grid-template-columns:1.2fr .8fr;gap:3mm;margin-top:3mm}.closing>section{height:39mm;border:1px solid var(--line);border-radius:3mm;padding:4mm;background:#fff}.closing h3{margin:0;color:var(--navy);font-size:2.4mm;letter-spacing:.035em}.note-lines{display:grid;gap:5mm;margin-top:4mm}.note-lines i{border-bottom:1px solid #dbe4ee}.signature-field{display:grid;grid-template-columns:auto 1fr;gap:3mm;align-items:end;margin-top:4mm;color:var(--muted);font-size:2mm;font-weight:700}.signature-field i{height:4mm;border-bottom:1px solid #8fa3bc}.signature-field.signature{margin-top:19mm}
  .footer{display:flex;align-items:center;justify-content:space-between;margin-top:3.2mm;border-top:1px solid #d8e2ee;padding-top:2.5mm;color:var(--muted);font-size:1.8mm}.footer strong{font-size:1.8mm;letter-spacing:.06em}
  .sheet.compact .header{height:21mm}.sheet.compact .card{margin-top:2.6mm;padding-top:3mm;padding-bottom:3mm}.sheet.compact .reference-grid .card{margin-top:2.6mm;min-height:16mm}.sheet.compact .products td{height:6.5mm}.sheet.compact .materials-wrap{margin-top:3mm}.sheet.compact .materials td{height:8mm}.sheet.compact .materials td:first-child b{top:2.8mm}.sheet.compact .closing{margin-top:2.5mm}.sheet.compact .closing>section{height:34mm}.sheet.compact .signature-field.signature{margin-top:14mm}
  @media(max-width:900px){body{padding:10px}.sheet{transform-origin:top left}.print-actions{right:10px;top:10px}.print-actions button{padding:10px 12px}}
  @media print{html,body{width:210mm;height:auto;background:#fff}body{padding:0}.print-actions{display:none}.sheet{width:210mm;min-height:297mm;margin:0;box-shadow:none}.card,.products,.materials,.closing>section{break-inside:avoid}}
</style>
</head>
<body>
  <div class="print-actions"><button type="button" onclick="window.print()">Stampa / Salva PDF</button><button type="button" class="secondary" onclick="window.close()">Chiudi</button></div>
  <main class="sheet${products.length > 2 ? " compact" : ""}">
    <header class="header">
      <div class="brand"><span class="brand-mark">S</span><div><strong>${esc(brand)}</strong><small>${esc(legalName)}</small></div></div>
      <div class="document-head"><h1>COMMESSA D'ORDINE</h1><p>Documento operativo per preparazione tecnica</p><span class="status"><i></i> PRATICA ACCETTATA</span></div>
    </header>
    <section class="meta">
      <div><small>COMMESSA</small><strong>CO-${esc(number)}</strong></div>
      <div><small>PRATICA</small><strong>${esc(number)}</strong></div>
      <div><small>DATA EMISSIONE</small><strong>${esc(issueDate)}</strong></div>
      <div><small>VERSIONE</small><strong>1</strong></div>
    </section>
    <section class="card">
      ${sectionTitle("01", "DETTAGLI DEL CLIENTE")}
      <div class="client-grid">
        ${field("INTESTAZIONE", clientName)}
        ${field("REFERENTE", client.contact || client.referente)}
        ${field("TELEFONO", client.phone || client.telefono)}
        ${field("SEDE OPERATIVA", client.address || client.indirizzoCompleto, true)}
        ${field("EMAIL", client.email)}
      </div>
    </section>
    <div class="reference-grid">
      <section class="card">${sectionTitle("02", "AGENTE DI RIFERIMENTO")}<div class="person-name">${esc(text(agent.name || agent.nome_visualizzato || practice.agente))}</div><div class="person-contact">${esc(text(agent.contact || agent.email || agent.telefono, "Referente commerciale"))}</div></section>
      <section class="card">${sectionTitle("03", "TECNICO INCARICATO")}<div class="technician-line"></div><small class="hand-note">Compilare a penna</small></section>
    </div>
    <section class="card">
      ${sectionTitle("04", "PRODOTTO/I DI RIFERIMENTO")}
      <table class="products"><thead><tr><th>PRODOTTO</th><th>CODICE</th><th>MISURE</th><th>CONFIGURAZIONE</th><th>QUANTITÀ</th></tr></thead><tbody>${productRows(products)}</tbody></table>
    </section>
    <section class="materials-wrap">
      ${sectionTitle("05", "MATERIALI UTILIZZATI", "Compilazione manuale a cura del tecnico")}
      <table class="materials"><thead><tr><th>PRODOTTO DI RIFERIMENTO</th><th>CODICE PRODOTTO</th><th>QUANTITÀ</th></tr></thead><tbody>${materialRows(materialsCount)}</tbody></table>
    </section>
    <section class="closing">
      <section><h3>NOTE TECNICHE</h3><div class="note-lines"><i></i><i></i><i></i></div></section>
      <section><h3>CHIUSURA LAVORAZIONE</h3><div class="signature-field"><span>Data</span><i></i></div><div class="signature-field signature"><span>Firma tecnico</span><i></i></div></section>
    </section>
    <footer class="footer"><span>Generato localmente da Seemax Management Suite - Documento ad uso interno</span><strong>PAGINA 1 / 1</strong></footer>
  </main>
</body>
</html>`;

    return { html, title: documentTitle, fileName: `${documentTitle}.pdf` };
  }

  function open(payload) {
    const built = build(payload);
    if (typeof window === "undefined" || typeof window.open !== "function") throw new Error("Anteprima disponibile soltanto nel browser.");
    const preview = window.open("", "_blank");
    if (!preview) throw new Error("Il browser ha bloccato l'anteprima. Consenti l'apertura delle finestre per questo sito e riprova.");
    preview.document.open();
    preview.document.write(built.html);
    preview.document.close();
    preview.document.title = built.title;
    try { preview.opener = null; } catch (error) { /* protezione facoltativa */ }
    preview.focus();
    return built;
  }

  return { build, open };
});
