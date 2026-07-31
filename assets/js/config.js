/*
 * CONFIGURAZIONE SEEMAX MANAGEMENT SUITE
 * 1. Lascia demoMode: true per provare il gestionale senza Google Sheets.
 * 2. Dopo aver pubblicato Apps Script, incolla l'URL /exec in appsScriptUrl.
 * 3. Imposta demoMode: false e pubblica nuovamente su GitHub.
 */
window.SEEMAX_APP_CONFIG = {
  appName: "Seemax Management Suite",
  version: "1.9.1",
  demoMode: false,
  appsScriptUrl: "https://script.google.com/macros/s/AKfycbxNBdyg27CBYRu9M1FRFCw3Sm701hUZ5UQTyHPI3cE3AuoW8LaBRx_E6TLOoAxzHQCf/exec",
  company: {
    legalName: "LED LAB COMPANY",
    brand: "SEEMAX DISPLAY",
    commercialPhone: "INSERISCI_TELEFONO",
    commercialEmail: "INSERISCI_EMAIL",
    address: "INSERISCI_SEDE_AZIENDALE"
  },
  quotationPlannerPath: "quotation-planner/index.html",
  maxRowsPerPage: 50,
  demoAccounts: [
    { username: "admin.demo", key: "DEMO-ADMIN", displayName: "David Failla", role: "ADMIN", email: "info@seemaxdisplay.it", phone: "" },
    { username: "agente.demo", key: "DEMO-AGENTE", displayName: "Agente Dimostrativo", role: "AGENTE", email: "agente@example.com", phone: "" }
  ]
};
