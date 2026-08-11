# Seemax Management Suite

Webapp gestionale statica pensata per GitHub Pages e collegabile a Google Sheets tramite Google Apps Script.

## Funzioni incluse

- dashboard commerciale con indicatori e pipeline;
- gestione clienti;
- anagrafica clienti con controllo P.IVA, VIES, IBAN, telefono internazionale e località italiane collegate;
- clienti privati o condivisi, con attribuzione al creatore e protezione dei clienti collegati a pratiche;
- gestione pratiche e relativi stati;
- creazione guidata con scelta iniziale Acquisto, Noleggio o Leasing e moduli dedicati;
- destinatario ordine “Per Me” o “Per Cliente”, indirizzo installazione e gestione tecnica Ledwall;
- documentazione finanziaria caricabile direttamente nella pratica;
- obbligatorietà dei campi configurabile dagli admin o dal foglio `IMPOSTAZIONI`;
- ricerca, ordinamento e paginazione di clienti e pratiche (6 risultati per pagina);
- ordinamento amministrativo iniziale dal record più recente e assegnazione dei nuovi clienti agli agenti;
- catalogo Ledwall con immagini, schede tecniche, listini, promozioni e giacenze;
- inserimento diretto di pratiche Acquisto/Noleggio/Leasing dal riepilogo S.Q.P.;
- scarico automatico e tracciato del magazzino allo stato Accettata;
- carico/scarico manuale delle giacenze riservato agli ADMIN, con causale e storico;
- pratiche inseribili anche con giacenza insufficiente, evidenziate da un avviso disattivabile sulla singola riga del Foglio Google;
- più Ledwall nella stessa pratica, con calcolo aggregato dei cabinet e indirizzo unico o alternativo per ogni installazione aggiuntiva;
- scarico magazzino non bloccante: se la disponibilità non basta la pratica viene salvata, resta segnalata e l'impegno viene mantenuto in attesa senza creare giacenze negative;
- deroga ADMIN `0000` per registrare temporaneamente dati non disponibili;
- organizzazione delle pratiche in visione corrente oppure per Acquisto, Noleggio e Leasing, memorizzata localmente;
- workflow pratiche semplificato: Inserita, Accettata, Sospesa, Bocciata e Completata;
- notifiche interne con campanella ed email gratuita all'agente responsabile;
- documenti e media caricati direttamente e archiviati su Google Drive;
- cartelle documentali locali, trascinamento desktop e spostamento con pressione prolungata su smartphone;
- attività, scadenze e appuntamenti;
- gestione agenti e ruoli ADMIN/AGENTE;
- Quotation Planner montato nativamente nel gestionale, senza iframe;
- sessione unica Management Suite/S.Q.P. senza un secondo accesso;
- importazione dei clienti visibili nel Planner oppure compilazione manuale;
- modalità demo locale;
- PWA installabile da browser;
- backend Apps Script già predisposto.
- avvio accelerato con cache locale per utente e aggiornamento del database in background;
- backend ottimizzato con letture per richiesta e salvataggi aggregati;
- Planner alleggerito di oltre il 90% separando immagini e codice.
- protezione multiutente con coda delle scritture, versioni record e prevenzione dei duplicati;
- rilevamento dei conflitti senza sovrascritture silenziose.

## Prova immediata

Il progetto parte in modalità demo. Apri `index.html` oppure pubblicalo su GitHub Pages.

- ADMIN: `admin.demo` / `DEMO-ADMIN`
- AGENTE: `agente.demo` / `DEMO-AGENTE`

I dati demo vengono salvati esclusivamente nel browser utilizzato.

## Prima configurazione reale

1. Segui [docs/GUIDA_COMPLETA.md](docs/GUIDA_COMPLETA.md).
2. Installa `apps-script/Code.gs` nel Foglio Google.
3. Pubblica Apps Script come Web App.
4. Incolla l’URL `/exec` in `assets/js/config.js`.
5. Imposta `demoMode: false`.
6. Pubblica questa cartella in un repository GitHub Pages.

Per aggiornare un'installazione già operativa alla versione 2.12.0 segui [docs/AGGIORNAMENTO_V2.12.0.md](docs/AGGIORNAMENTO_V2.12.0.md). Consulta anche [docs/PROTEZIONE_MULTIUTENTE.md](docs/PROTEZIONE_MULTIUTENTE.md) e l’[audit prestazioni 2.3](docs/AUDIT_PRESTAZIONI_V2.3.md).

## Placeholder

Cerca nel progetto la parola `INSERISCI_`, `INCOLLA_` o `CAMBIA_` per trovare i valori ancora da completare. La lista è disponibile in [docs/PLACEHOLDER.md](docs/PLACEHOLDER.md).

## Struttura

```text
index.html                    Interfaccia principale
assets/css/app.css            Grafica responsive
assets/js/config.js           Configurazione da personalizzare
assets/js/seed.js             Dati dimostrativi
assets/js/store.js            Database locale demo
assets/js/api.js              Collegamento Google Apps Script
assets/js/app.js              Funzioni del gestionale
assets/js/planner-native.js   Runtime nativo del Quotation Planner
quotation-planner/index.html  Quotation Planner originale
apps-script/Code.gs           Backend e setup Google Sheets
docs/                         Guide operative
manifest.webmanifest          Installazione come app
sw.js                         Cache PWA
```

Non sono necessari Node.js, npm o compilazioni: GitHub Pages pubblica direttamente i file della cartella.
