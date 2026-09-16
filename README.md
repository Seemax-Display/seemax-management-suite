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
- catalogo multiprodotto organizzato nelle tab `Ledwall`, `Croci ed Altri Led` e `Schermi LCD`, con immagini, schede tecniche, listini, promozioni e giacenze;
- Croci farmacia P5/P10, Floor Led P3.91, Transparent Led P3.91 e Totem LCD Indoor SMX 430-CP già predisposti a giacenza zero;
- inserimento diretto di pratiche Acquisto/Noleggio/Leasing dal riepilogo S.Q.P.;
- scarico automatico e tracciato del magazzino allo stato Accettata;
- carico/scarico manuale delle giacenze riservato agli ADMIN, con causale e storico;
- pratiche inseribili anche con giacenza insufficiente, evidenziate da un avviso disattivabile sulla singola riga del Foglio Google;
- più prodotti nella stessa pratica, con calcolo aggregato dei cabinet o dei pezzi e indirizzo unico o alternativo per ogni installazione aggiuntiva;
- dimensioni vincolate ai moduli fisici per Floor e Transparent LED; il Transparent 1×1 cresce esclusivamente a multipli di un metro;
- scarico magazzino non bloccante: se la disponibilità non basta la pratica viene salvata, resta segnalata e l'impegno viene mantenuto in attesa senza creare giacenze negative;
- deroga ADMIN `0000` per registrare temporaneamente dati non disponibili, preservata come testo anche negli indirizzi importati nelle pratiche;
- organizzazione delle pratiche nelle modalità `IN DETTAGLIO` e `PER TIPOLOGIA`, memorizzata localmente;
- workflow pratiche semplificato: Inserita, Accettata, Sospesa, Bocciata e Completata;
- notifiche interne con campanella ed email gratuita all'agente responsabile;
- documenti e media caricati direttamente e archiviati su Google Drive;
- documenti già caricati consultabili e scaricabili direttamente anche dalle pratiche operative Inserite e Accettate;
- commessa d'ordine A4 generata interamente nel browser dagli ADMIN per le pratiche Accettate, senza nuove letture o scritture sul database;
- cartelle documentali locali, trascinamento desktop e spostamento con pressione prolungata su smartphone;
- attività, scadenze e appuntamenti;
- gestione agenti e ruoli ADMIN/AGENTE;
- Impostazioni ADMIN organizzate nelle schede Generali, Pratiche, Benvenuto Beta, Patch notes e Sistema;
- editor collegato direttamente al popup grafico originario “Benvenuto nella Beta”, senza un secondo messaggio duplicato;
- Benvenuto Beta e Patch notes con modalità indipendenti Solo una volta o Sempre;
- memoria delle comunicazioni per account, affiancata da cache locale e comando di ripubblicazione separato;
- Quotation Planner montato nativamente nel gestionale, senza iframe;
- tab `PRODOTTI` del Quotation Planner con scelta guidata tra Ledwall, Croci e LED Extra e Schermi LCD;
- Croci a formato fisso, Transparent e Floor a multipli esatti e Totem LCD a quantità anche nei preventivi;
- listini agente/cliente distinti per tutti i nuovi prodotti, con trasferta e provvigione sempre disponibili;
- installazione mantenuta per Ledwall, Croci e LED Extra ed esclusa automaticamente dagli Schermi LCD;
- sessione unica Management Suite/S.Q.P. senza un secondo accesso;
- importazione dei clienti visibili nel Planner oppure compilazione manuale;
- modalità demo locale;
- PWA installabile da browser;
- backend Apps Script già predisposto;
- avvio accelerato con cache locale per utente e aggiornamento del database in background;
- backend ottimizzato con lookup puntuali, scrittura della sola riga interessata e cache breve delle impostazioni;
- Planner alleggerito di oltre il 90% separando immagini e codice;
- protezione multiutente con coda delle scritture, versioni record e prevenzione dei duplicati;
- rilevamento dei conflitti senza sovrascritture silenziose;
- salvataggi POST idempotenti per clienti, pratiche e movimenti, con risposta iframe diretta, conferma parallela anticipata e recupero idempotente;
- canale Apps Script persistente dopo il login, con riuso della connessione e fallback automatico al trasporto POST precedente;
- conferma visiva immediata per nuovi clienti e pratiche, riconciliata con la risposta autorevole del server;
- pannello non bloccante per eliminazioni di clienti, pratiche e documenti e per movimenti manuali di magazzino;
- aggiornamento del magazzino dalla riga già verificata dal backend, senza rilettura completa del catalogo;
- numero preventivo del Planner tramite ponte nativo e contatori persistenti distinti per ADMIN e agenti;
- salvataggio dei preventivi tramite mutazione nativa confermata, in background e senza riletture ripetute dell'archivio;
- archivio preventivi ADMIN completo: caricamento autorizzato dei preventivi degli agenti, filtro per autore, ordinamento per agente/data e attribuzione visibile su ogni scheda;
- elenco, apertura ed eliminazione preventivi sul ponte persistente, con chiavi account escluse dai record e percorso pubblico limitato ai payload cifrati manuali;
- upload manuale dei documenti con avanzamento non bloccante dalla preparazione locale fino alla conferma su Drive e nel database;
- nome del PDF preventivo composto automaticamente da numero, data, intestazione cliente, prodotto, misura e configurazione mono/bifacciale;
- coda email asincrona: le notifiche non trattengono più il lock delle operazioni principali;
- giacenze del Catalogo lette e verificate direttamente in `PRODOTTI_LED.giacenza_attuale`;
- controllo ADMIN dell'avviso giacenza per ogni pratica Inserita, Sospesa o Completata;
- contatore pratiche nelle Proprietà script, senza scansione completa a ogni creazione;
- struttura Google Sheets ripulita automaticamente con backup integrale preventivo e tabelle tecniche attive nascoste;
- trofei e personalizzazioni degli agenti azzerati al punto di partenza ufficiale, senza modificare gli ADMIN;
- conteggi delle schede clienti e pratiche calcolati in un solo passaggio per un rendering più rapido;
- diagnostica dei tempi di salvataggio consultabile dalla console del browser;
- refresh manuale con nuova lettura del database e fallback locale dichiarato in caso di disservizio.

## Prova immediata

Il pacchetto operativo è configurato con `demoMode: false`. Per una prova senza Google Sheets imposta temporaneamente `demoMode: true` in `assets/js/config.js`, quindi apri `index.html` oppure pubblicalo su GitHub Pages.

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

Per aggiornare un'installazione 2.18.0 alla versione 2.19.0 segui [docs/AGGIORNAMENTO_V2.19.0.md](docs/AGGIORNAMENTO_V2.19.0.md). La release porta Croci, LED Extra e Schermi LCD nel Quotation Planner senza modificare il calcolo Ledwall esistente. Per installazioni precedenti resta disponibile la guida [2.18.0](docs/AGGIORNAMENTO_V2.18.0.md), oltre a [docs/PROTEZIONE_MULTIUTENTE.md](docs/PROTEZIONE_MULTIUTENTE.md) e al [rapporto prestazioni 2.14](docs/RAPPORTO_PRESTAZIONI_V2.14.0.md).

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
assets/js/work-order.js       Generatore locale della commessa d'ordine A4
quotation-planner/index.html  Quotation Planner originale
apps-script/Code.gs           Backend e setup Google Sheets
docs/                         Guide operative
manifest.webmanifest          Installazione come app
sw.js                         Cache PWA
```

Non sono necessari Node.js, npm o compilazioni: GitHub Pages pubblica direttamente i file della cartella.
