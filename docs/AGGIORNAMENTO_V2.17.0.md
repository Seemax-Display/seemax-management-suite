# Aggiornamento Seemax Management Suite 2.17.0

La versione 2.17.0 completa la gestione operativa degli allegati nelle pratiche e introduce la commessa d'ordine tecnica approvata per le pratiche Accettate.

## Documenti nelle pratiche operative

Aprendo una pratica Inserita o Accettata, la scheda `Sezione Documenti` mostra ora gli allegati già associati alla pratica. Per ogni file sono disponibili due comandi distinti:

- `Visualizza`, per aprire il documento in una nuova scheda;
- `Scarica`, per richiedere il download diretto da Google Drive.

La consultazione resta disponibile anche in Modalità Rapida. In tale modalità è bloccato soltanto il caricamento di nuovi file, come già previsto; non vengono introdotte sincronizzazioni o letture aggiuntive.

La stessa coppia di comandi è stata uniformata nell'archivio delle pratiche Completate e nella sezione generale Documenti.

I permessi non cambiano: il backend continua a inviare a ogni agente soltanto i documenti che può consultare, mentre l'ADMIN mantiene la vista completa.

## Commessa d'ordine

Quando un ADMIN apre una pratica nello stato `Accettata`, sopra le schede del modulo trova il comando `Genera commessa`.

Il documento A4 contiene:

- numero della commessa e della pratica;
- data di emissione;
- dettagli del cliente;
- agente di riferimento;
- riga vuota per il tecnico incaricato;
- riepilogo di tutti i Ledwall della pratica;
- codice prodotto, misura, configurazione mono/bifacciale e cabinet;
- tabella compilabile a penna con `Prodotto di riferimento`, `Codice prodotto` e `Quantità`;
- note tecniche, data e firma del tecnico.

Le linee della tabella usano una griglia a colonne fisse, senza guide interne disallineate. Con tre o più Ledwall viene attivata automaticamente un'impaginazione più compatta per mantenere ordinato il foglio A4.

## Funzionamento locale e prestazioni

La commessa viene costruita esclusivamente nel browser usando i dati già presenti nella pratica aperta. La funzione:

- non chiama Apps Script;
- non interroga Google Sheets;
- non scrive nuovi record;
- non crea movimenti o notifiche;
- non occupa il lock delle operazioni multiutente.

La generazione non può quindi rallentare il lavoro degli altri agenti. Il comando esegue comunque tre controlli locali indipendenti: ruolo ADMIN, stato Accettata e pratica già confermata dal server.

## Stampa o salvataggio PDF

1. Apri una pratica Accettata con un account ADMIN.
2. Premi `Genera commessa`.
3. Nella nuova anteprima premi `Stampa / Salva PDF`.
4. Scegli la stampante oppure `Salva come PDF`.

Il titolo della finestra prepara anche un nome file coerente con numero pratica e cliente. Se il browser blocca l'anteprima, autorizza i popup per il dominio del Management Suite e riprova.

## Installazione

1. Sostituisci il contenuto del progetto Apps Script con `apps-script/Code.gs` della versione 2.17.0.
2. Salva ed esegui manualmente `upgradeSeemaxV2170()`.
3. Pubblica una nuova versione della Web App Apps Script mantenendo lo stesso URL `/exec`.
4. Pubblica su GitHub Pages tutti i file frontend della versione 2.17.0, incluso `assets/js/work-order.js`.
5. Esegui `Ctrl+F5` oppure chiudi e riapri la PWA.
6. Verifica che frontend, backend e Service Worker riportino tutti la versione 2.17.0.

L'upgrade non modifica pratiche, clienti, documenti, giacenze, trofei o personalizzazioni. Aggiorna la versione backend e conserva tutte le migrazioni di sicurezza già applicate.

## Verifiche incluse

- sintassi frontend, backend, Service Worker e Quotation Planner;
- caricamento del generatore prima dell'applicazione;
- inclusione del generatore nella nuova cache PWA;
- azioni Visualizza e Scarica sui documenti;
- esclusione dei documenti non associati da una pratica nuova;
- visibilità della commessa soltanto per ADMIN su pratica Accettata;
- blocco delle pratiche ancora in sincronizzazione;
- assenza di chiamate di rete nel generatore;
- formato A4, campi richiesti e testi protetti da markup;
- righe e colonne simmetriche nella tabella tecnica;
- variante compatta per più Ledwall;
- regressioni su lock, `record_version`, `request_token`, preventivi, upload, magazzino, patch notes e prefissi pratica.
