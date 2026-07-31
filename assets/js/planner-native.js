(function () {
  "use strict";

  const SOURCE = "quotation-planner/index.html";
  let sourcePromise = null;
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));

  function scopedCss(css) {
    return String(css || "")
      .replace(/:root/g, ":host")
      .replace(/\bhtml\s*\{/g, ".sqp-native-body{")
      .replace(/\bbody(?=\s*[,>{.#:\[])/g, ".sqp-native-body");
  }

  function documentProxy(shadow, body) {
    return {
      body, documentElement: body, scrollingElement: body, head: document.head,
      fonts: document.fonts, readyState: "complete",
      get activeElement() { return document.activeElement; },
      getElementById: (id) => shadow.getElementById(id),
      querySelector: (selector) => shadow.querySelector(selector),
      querySelectorAll: (selector) => shadow.querySelectorAll(selector),
      getElementsByClassName: (name) => shadow.querySelectorAll("." + name),
      createElement: (...args) => document.createElement(...args),
      createTextNode: (...args) => document.createTextNode(...args),
      createDocumentFragment: () => document.createDocumentFragment(),
      addEventListener(type, listener, options) {
        if (type === "DOMContentLoaded") return queueMicrotask(() => listener.call(this, new Event("DOMContentLoaded")));
        body.addEventListener(type, listener, options);
      },
      removeEventListener: (...args) => body.removeEventListener(...args),
      dispatchEvent: (...args) => body.dispatchEvent(...args)
    };
  }

  function windowProxy(scopedDocument, locationState, listeners) {
    return new Proxy(window, {
      get(target, property) {
        if (property === "document") return scopedDocument;
        if (property === "location") return locationState;
        if (property === "addEventListener") return (type, listener, options) => {
          if (type === "hashchange") return;
          target.addEventListener(type, listener, options);
          listeners.push([type, listener, options]);
        };
        if (property === "removeEventListener") return (type, listener, options) => target.removeEventListener(type, listener, options);
        if (property === "scrollTo" || property === "scroll") return (options) => scopedDocument.scrollingElement.scrollTo({ top: Number((options || {}).top || 0), behavior: (options || {}).behavior || "auto" });
        const value = target[property];
        return typeof value === "function" ? value.bind(target) : value;
      }
    });
  }

  function first(client, ...keys) {
    for (const key of keys) if (client && String(client[key] ?? "").trim()) return String(client[key]).trim();
    return "";
  }

  function installClientImporter(shadow, clients) {
    const company = shadow.getElementById("clientCompany");
    const grid = company && company.closest(".form-grid");
    if (!grid || shadow.getElementById("suiteClientSource")) return;
    const field = document.createElement("div");
    field.className = "field full suite-client-import";
    field.innerHTML = `<label class="label" for="suiteClientSource">Origine dati cliente</label><div class="suite-client-choice"><select id="suiteClientSource"><option value="">Inserimento manuale</option>${clients.map((client) => `<option value="${escapeHtml(client.id)}">${escapeHtml(client.ragioneSociale || client.nome || "Cliente senza nome")}</option>`).join("")}</select><span>Seleziona un cliente del Management Suite oppure compila liberamente i campi sottostanti.</span></div>`;
    grid.insertBefore(field, company.closest(".field"));
    field.querySelector("select").addEventListener("change", (event) => {
      const client = clients.find((item) => String(item.id) === event.target.value);
      if (!client) return;
      const values = {
        clientCompany: first(client, "ragioneSociale", "nome"),
        clientVat: first(client, "piva", "codice_fiscale"),
        clientName: first(client, "referente", "nome_referente"),
        clientEmail: first(client, "email", "pec"),
        clientPhone: first(client, "telefono", "cellulare"),
        clientCity: first(client, "comune", "citta", "localita")
      };
      Object.entries(values).forEach(([id, value]) => {
        const input = shadow.getElementById(id);
        if (!input) return;
        input.value = value;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });
      shadow.getElementById("projectNotes").dataset.managementClientId = String(client.id || "");
    });
  }

  async function mount(container, context) {
    if (!container || container.dataset.plannerMounted === "1") return;
    container.dataset.plannerMounted = "1";
    container.innerHTML = `<div class="sqp-native-loading"><span></span><strong>Avvio Quotation Planner integrato…</strong><small>Caricamento del motore di calcolo Seemax</small></div>`;
    try {
      sourcePromise = sourcePromise || fetch(SOURCE, { cache: "no-cache" }).then((response) => {
        if (!response.ok) throw new Error(`File Planner non disponibile (${response.status})`);
        return response.text();
      });
      const source = await sourcePromise;
      const parsed = new DOMParser().parseFromString(source, "text/html");
      const styles = Array.from(parsed.querySelectorAll("style")).map((node) => node.textContent).join("\n");
      const applicationScript = Array.from(parsed.querySelectorAll("script:not([src])")).map((node) => node.textContent).join("\n");
      parsed.querySelectorAll("script").forEach((node) => node.remove());
      container.innerHTML = "";
      const shadow = container.attachShadow({ mode: "open" });
      shadow.innerHTML = `<style>${scopedCss(styles)}
        :host{display:block;min-height:720px}.sqp-native-body{min-height:720px;background:transparent}
        .suite-client-import{border:1px solid #93c5fd;border-radius:16px;padding:14px;background:#eff6ff}
        .suite-client-choice{display:grid;grid-template-columns:minmax(220px,1fr) minmax(260px,1.4fr);gap:12px;align-items:center}
        .suite-client-choice span{font-size:13px;line-height:1.45;color:#475569}
        @media(max-width:760px){.suite-client-choice{grid-template-columns:1fr}}
      </style><div class="sqp-native-body integrated-suite management-native">${parsed.body.innerHTML}</div>`;
      const body = shadow.querySelector(".sqp-native-body");
      if (context.fastMode) body.classList.add("management-fast");
      const scopedDocument = documentProxy(shadow, body);
      const locationState = { search: `?integrated=1${context.fastMode ? "&fast=1" : ""}`, hash: "", href: location.href, reload() {} };
      const scopedHistory = { replaceState(_state, _title, url) { locationState.hash = String(url || "").replace(/^[^#]*#?/, "#"); } };
      const listeners = [];
      window.SEEMAX_NATIVE_CONTEXT = context;
      const execute = new Function("document", "window", "location", "history", applicationScript);
      execute(scopedDocument, windowProxy(scopedDocument, locationState, listeners), locationState, scopedHistory);
      const lifecycle = new MutationObserver(() => {
        if (container.isConnected) return;
        listeners.forEach(([type, listener, options]) => window.removeEventListener(type, listener, options));
        lifecycle.disconnect();
      });
      lifecycle.observe(document.body, { childList: true, subtree: true });
      const importer = () => installClientImporter(shadow, context.clients || []);
      queueMicrotask(importer);
      setTimeout(importer, 150);
      setTimeout(importer, 900);
    } catch (error) {
      container.dataset.plannerMounted = "0";
      container.innerHTML = `<div class="empty-state"><span>!</span><h3>Planner non disponibile</h3><p>${escapeHtml(error.message || error)}</p><button class="btn primary" data-action="reload-planner">Riprova</button></div>`;
    }
  }

  window.SeemaxNativePlanner = { mount };
})();
