(function () {
  const today = new Date();
  const iso = (offset) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  };
  const previousMonthIso = () => new Date(today.getFullYear(), today.getMonth() - 1, 15, 12, 0, 0).toISOString();

  window.SEEMAX_DEMO_SEED = {
    products: [
      { id: "p19-50100", sku:"SMX-P19-50100", nome: "P1.9", categoria: "Ledwall Indoor", cabX: 50, cabY: 100, prezzoAgente: 850, prezzoCliente: 950, prezzoCina: 560, giacenza_attuale:0, stato_giacenza:"SOLO SU ORDINAZIONE", promo_attiva:"NO", immagine_url:"assets/catalog/p19.png", attivo: "SI" },
      { id: "p25-6464", sku:"SMX-P25-6464", nome: "P2.5", categoria: "Ledwall Indoor/Outdoor", cabX: 64, cabY: 64, prezzoAgente: 700, prezzoCliente: 890, prezzoCina: 450, giacenza_attuale:0, stato_giacenza:"IN ARRIVO", promo_attiva:"NO", immagine_url:"assets/catalog/p25.png", attivo: "SI" },
      { id: "p3-5757", sku:"SMX-P3-5757", nome: "P3", categoria: "Ledwall Indoor/Outdoor", cabX: 57, cabY: 57, prezzoAgente: 410, prezzoCliente: 550, prezzoCina: 250, giacenza_attuale:60, stato_giacenza:"DISPONIBILE", promo_attiva:"SI", immagine_url:"assets/catalog/p3.jpg", attivo: "SI" },
      { id: "p391-50100", sku:"SMX-P391-50100", nome: "P3.91", categoria: "Ledwall Indoor/Outdoor", cabX: 50, cabY: 100, prezzoAgente: 550, prezzoCliente: 650, prezzoCina: 280, giacenza_attuale:56, stato_giacenza:"DISPONIBILE", promo_attiva:"NO", immagine_url:"assets/catalog/p391-50100.png", attivo: "SI" },
      { id: "p391-5050", sku:"SMX-P391-5050", nome: "P3.91 - 0.50x0.50", categoria: "Ledwall Indoor/Outdoor", cabX: 50, cabY: 50, prezzoAgente: 295, prezzoCliente: 335, prezzoCina: 150, giacenza_attuale:64, stato_giacenza:"DISPONIBILE", promo_attiva:"NO", immagine_url:"assets/catalog/p391-5050.jpg", attivo: "SI" },
      { id: "p4-9696", sku:"SMX-P4-9696", nome: "P4", categoria: "Ledwall Outdoor", cabX: 96, cabY: 96, prezzoAgente: 860, prezzoCliente: 1080, prezzoCina: 580, giacenza_attuale:8, stato_giacenza:"DISPONIBILE", promo_attiva:"NO", immagine_url:"assets/catalog/p4-9696.jpg", attivo: "SI" },
      { id: "p4-6464", sku:"SMX-P4-6464", nome: "P4 - 0.64x0.64", categoria: "Ledwall Outdoor", cabX: 64, cabY: 64, prezzoAgente: "", prezzoCliente: "", prezzoCina: "", giacenza_attuale:4, stato_giacenza:"DISPONIBILE", promo_attiva:"SI", immagine_url:"assets/catalog/p4-9696.jpg", descrizione:"Prezzo promozionale da completare.", attivo: "SI" }
    ],
    clients: [
      { id: "cli-demo-1", ragioneSociale: "Farmacia Piazza Centro", referente: "Maria Rossi", piva: "01234567890", email: "maria@example.com", telefono: "095 0000000", citta: "Catania", indirizzo: "Via Esempio 10", condiviso: "NO", creato_da_username: "agente.demo", creato_da_nome: "Agente Dimostrativo", agent_username: "agente.demo", note: "Cliente privato dimostrativo", creatoIl: iso(-42) },
      { id: "cli-demo-2", ragioneSociale: "Boutique Etna SRL", referente: "Giuseppe Bianchi", piva: "09876543210", email: "info@example.com", telefono: "090 0000000", citta: "Messina", indirizzo: "Corso Esempio 25", condiviso: "SI", creato_da_username: "agente.demo", creato_da_nome: "Agente Dimostrativo", agent_username: "agente.demo", note: "Cliente condiviso · interessato a P3.91", creatoIl: iso(-28) },
      { id: "cli-demo-3", ragioneSociale: "Centro Gomme Demo", referente: "Luca Verdi", piva: "", email: "commerciale@example.com", telefono: "0931 000000", citta: "Siracusa", indirizzo: "Zona Industriale", condiviso: "SI", creato_da_username: "admin.demo", creato_da_nome: "David Failla", agent_username: "admin.demo", note: "Cliente condiviso dall’amministratore", creatoIl: iso(-12) }
    ],
    practices: [
      { id: "PR-001-26", numero: "001-26", clientId: "cli-demo-1", cliente: "Farmacia Piazza Centro", titolo: "Ledwall P3.91 2×1 m", stato: "Inserita", tipo_pratica: "NOLEGGIO", finanziaria: "Grenke", valore: 6500, agente: "Agente Dimostrativo", agent_username: "agente.demo", scadenza: iso(5), prossimoPasso: "Richiamare il cliente", note: "In attesa di conferma", aggiornatoIl: iso(-1) },
      { id: "PR-002-26", numero: "002-26", clientId: "cli-demo-2", cliente: "Boutique Etna SRL", titolo: "Ledwall P2.5 3,20×1,92 m", stato: "Accettata", tipo_pratica: "LEASING", finanziaria: "IFIS", valore: 10500, agente: "Agente Dimostrativo", agent_username: "agente.demo", scadenza: iso(2), prossimoPasso: "Ricevere visura camerale", note: "Documentazione parziale", aggiornatoIl: iso(-2) },
      { id: "PR-003-26", numero: "003-26", clientId: "cli-demo-3", cliente: "Centro Gomme Demo", titolo: "Sopralluogo e studio fattibilità", stato: "Completata", tipo_pratica: "ACQUISTO", finanziaria: "Da definire", valore: 5000, agente: "David Failla", agent_username: "admin.demo", scadenza: iso(8), prossimoPasso: "Fissare sopralluogo", note: "", completataIl: previousMonthIso(), aggiornatoIl: iso(0) }
    ],
    documents: [
      { id: "doc-demo-1", practiceId: "PR-001-26", pratica: "001-26", cliente: "Farmacia Piazza Centro", nome: "Preventivo Ledwall.pdf", tipo: "Preventivo", url: "", data: iso(-1), note: "Placeholder: aggiungere link Google Drive" },
      { id: "doc-demo-2", practiceId: "PR-002-26", pratica: "002-26", cliente: "Boutique Etna SRL", nome: "Visura camerale.pdf", tipo: "Documento cliente", url: "", data: iso(-3), note: "Esempio dimostrativo" }
    ],
    activities: [
      { id: "act-demo-1", practiceId: "PR-001-26", titolo: "Richiamare Farmacia Piazza Centro", tipo: "Telefonata", scadenza: iso(1), stato: "Aperta", assegnatoA: "Agente Dimostrativo" },
      { id: "act-demo-2", practiceId: "PR-002-26", titolo: "Controllare documentazione IFIS", tipo: "Verifica", scadenza: iso(2), stato: "Aperta", assegnatoA: "David Failla" },
      { id: "act-demo-3", practiceId: "PR-003-26", titolo: "Confermare data sopralluogo", tipo: "Appuntamento", scadenza: iso(4), stato: "Aperta", assegnatoA: "Agente Dimostrativo" }
    ],
    movements: [],
    users: (window.SEEMAX_APP_CONFIG.demoAccounts || []).map((u, i) => ({ id: u.username, username: u.username, nome_visualizzato: u.displayName, email: u.email, telefono: u.phone, stato: "ATTIVO", ruolo: u.role, note: i === 0 ? "Account amministrativo demo" : "Account agente demo" })),
    settings: {
      iva_percentuale: 22,
      acconto_percentuale: 30,
      validita_preventivo_giorni: 15,
      telefono_commerciale: "INSERISCI_TELEFONO",
      numero_preventivo_admin_iniziale: 1,
      numero_preventivo_agenti_iniziale: 1,
      obiettivo_fatturato: 500000,
      beta_sblocca_trofei: "SI",
      admin_content_revision: 1,
      welcome_message_enabled: "SI",
      welcome_message_frequency: "ONCE",
      welcome_message_publication_key: "welcome-demo-1",
      welcome_message_revision: 1,
      welcome_message_published_at: "",
      welcome_message_published_by: "",
      welcome_message_modal_title: "Benvenuto nella Beta",
      welcome_message_modal_subtitle: "La nuova esperienza di lavoro entra ufficialmente nella fase di prova",
      welcome_message_badge: "SEEMAX MANAGEMENT SUITE · VERSIONE BETA",
      welcome_message_title: "BENVENUTO NELLA FASE DI TEST",
      welcome_message_body: "Stai utilizzando Seemax Management Suite in modalità di prova. Il sistema entra ora nella sua fase di test operativo e resterà accessibile nei prossimi giorni per permetterti di conoscerlo e metterlo alla prova.",
      welcome_message_feature_1_title: "Esplora il tuo nuovo spazio di lavoro",
      welcome_message_feature_1_body: "Crea clienti, inserisci pratiche, prepara preventivi con il Quotation Planner e consulta catalogo e giacenze: tutto è finalmente raccolto in un unico ambiente.",
      welcome_message_feature_2_title: "Personalizza profilo e bacheca",
      welcome_message_feature_2_body: "Per tutta la fase di test, ogni trofeo è temporaneamente disponibile. Scegli i tuoi preferiti, ordinali e prova tutte le possibilità di personalizzazione.",
      welcome_message_warning_title: "Ambiente di prova",
      welcome_message_warning_body: "I dati inseriti nella modalità demo sono esclusivamente dimostrativi e restano sul dispositivo.",
      welcome_message_feedback_body: "Il tuo contributo è prezioso: segnala all’amministratore Seemax impressioni, anomalie e suggerimenti emersi durante l’utilizzo.",
      welcome_message_button: "🚀 Inizia a esplorare",
      req_acquisto_destinatario_ordine: "SI", req_acquisto_clientid: "SI", req_acquisto_valore: "SI", req_acquisto_valore_provvigione: "NO",
      req_acquisto_installazione_regione: "NO", req_acquisto_installazione_provincia: "NO", req_acquisto_installazione_comune: "SI", req_acquisto_installazione_cap: "SI", req_acquisto_installazione_localita: "NO", req_acquisto_installazione_indirizzo: "SI", req_acquisto_installazione_civico: "SI", req_acquisto_gestione_ledwall: "SI", req_acquisto_cloud_username: "NO", req_acquisto_cloud_password: "NO", req_acquisto_note: "NO",
      req_noleggio_clientid: "SI", req_noleggio_valore: "SI", req_noleggio_valore_provvigione: "SI", req_noleggio_numero_rate: "SI", req_noleggio_periodicita_pagamento: "SI",
      req_noleggio_indirizzo_installazione_tipo: "SI", req_noleggio_installazione_regione: "NO", req_noleggio_installazione_provincia: "NO", req_noleggio_installazione_comune: "SI", req_noleggio_installazione_cap: "SI", req_noleggio_installazione_localita: "NO", req_noleggio_installazione_indirizzo: "SI", req_noleggio_installazione_civico: "SI", req_noleggio_gestione_ledwall: "SI", req_noleggio_cloud_username: "NO", req_noleggio_cloud_password: "NO",
      req_noleggio_documento_identita: "SI", req_noleggio_tessera_sanitaria: "SI", req_noleggio_visura: "SI", req_noleggio_altra_documentazione: "NO",
      req_leasing_clientid: "SI", req_leasing_valore: "SI", req_leasing_valore_provvigione: "SI", req_leasing_numero_rate: "SI", req_leasing_periodicita_pagamento: "SI",
      req_leasing_indirizzo_installazione_tipo: "SI", req_leasing_installazione_regione: "NO", req_leasing_installazione_provincia: "NO", req_leasing_installazione_comune: "SI", req_leasing_installazione_cap: "SI", req_leasing_installazione_localita: "NO", req_leasing_installazione_indirizzo: "SI", req_leasing_installazione_civico: "SI", req_leasing_gestione_ledwall: "SI", req_leasing_cloud_username: "NO", req_leasing_cloud_password: "NO",
      req_leasing_documento_identita: "SI", req_leasing_tessera_sanitaria: "SI", req_leasing_preventivo_seemax: "SI", req_leasing_preventivo_ifis: "SI", req_leasing_visura: "SI", req_leasing_altra_documentazione: "NO"
    }
  };
})();
