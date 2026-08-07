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

  function windowProxy(scopedDocument, locationState, listeners, container) {
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
        if (property === "scrollTo" || property === "scroll") return (options) => {
          const requestedTop = typeof options === "number" ? options : Number((options || {}).top || 0);
          const anchor = container.getBoundingClientRect().top + target.scrollY - 105;
          target.scrollTo({ top: Math.max(0, anchor + requestedTop), behavior: (options || {}).behavior || "auto" });
        };
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
      sourcePromise = sourcePromise || fetch(`${SOURCE}?v=${encodeURIComponent(context.version || "current")}`, { cache: "default" }).then((response) => {
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
        #btnDatabaseRefresh,#btnAgentLogin,#btnAgentLogout{display:none!important}
        .view#view-grenke.active,.view#view-ifis.active{width:100%!important;max-width:none!important;box-sizing:border-box;margin:0!important;padding:24px 20px 38px!important;overflow:visible!important}
        #view-grenke .finance-switch,#view-ifis .finance-switch{margin-bottom:16px!important}
        .grenke-shell,.ifis-shell{width:100%;box-sizing:border-box;padding:12px!important;gap:18px!important;align-items:stretch!important;border:1px solid #d8e3f0;border-radius:24px;background:linear-gradient(180deg,#f8fbff 0%,#f1f6fc 100%);box-shadow:0 16px 42px rgba(8,26,49,.10)}
        .grenke-shell{grid-template-columns:minmax(0,1fr) clamp(285px,22vw,340px)!important}
        .ifis-shell{grid-template-columns:minmax(0,1fr) clamp(300px,23vw,360px)!important}
        .grenke-panel,.ifis-panel{width:100%;min-width:0;height:100%;box-sizing:border-box}
        .grenke-panel .gp-body,.ifis-panel .ifis-body{padding:20px!important}
        .grenke-selection-note{padding:8px 2px 2px;line-height:1.45}
        .grenke-shell .aside-stack,.ifis-shell .aside-stack{min-width:0;height:100%}
        @media(max-width:1040px){.grenke-shell,.ifis-shell{grid-template-columns:minmax(0,1fr) 290px!important}}
        @media(max-width:760px){.view#view-grenke.active,.view#view-ifis.active{padding:12px 8px 28px!important}.grenke-shell,.ifis-shell{grid-template-columns:1fr!important;padding:8px!important;gap:12px!important;border-radius:19px}.grenke-panel .gp-body,.ifis-panel .ifis-body{padding:15px!important}}
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
      execute(scopedDocument, windowProxy(scopedDocument, locationState, listeners, container), locationState, scopedHistory);
      ["btnDatabaseRefresh", "btnAgentLogin", "btnAgentLogout"].forEach((id) => {
        const control = shadow.getElementById(id); if (control) control.remove();
      });
      const plannerLayers = ["draftModalLayer", "onlineArchiveModalLayer", "practiceTypeModalLayer", "calcLoadingLayer", "sqpDialogLayer", "patchNotesLayer", "tutorialLayer"]
        .map((id) => shadow.getElementById(id)).filter(Boolean);
      const syncPlannerLayerState = () => {
        const active = plannerLayers.some((layer) => !layer.classList.contains("hidden"));
        document.body.classList.toggle("planner-modal-open", active);
      };
      const plannerLayerObserver = new MutationObserver(syncPlannerLayerState);
      plannerLayers.forEach((layer) => plannerLayerObserver.observe(layer, { attributes: true, attributeFilter: ["class"] }));
      syncPlannerLayerState();
      const lifecycle = new MutationObserver(() => {
        if (container.isConnected) return;
        listeners.forEach(([type, listener, options]) => window.removeEventListener(type, listener, options));
        document.body.classList.remove("planner-modal-open");
        plannerLayerObserver.disconnect();
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
