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
- ricerca, ordinamento e paginazione delle pratiche (10 risultati per pagina);
- catalogo Ledwall con immagini, schede tecniche, listini, promozioni e giacenze;
- inserimento diretto di pratiche Acquisto/Noleggio/Leasing dal riepilogo S.Q.P.;
- scarico automatico e tracciato del magazzino allo stato Accettata;
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

Per aggiornare un'installazione già operativa alla versione 2.2.0 segui [docs/AGGIORNAMENTO_V2.2.md](docs/AGGIORNAMENTO_V2.2.md). La procedura mantiene i dati esistenti e introduce la funzione “Agente del mese”.

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
