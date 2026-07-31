# Struttura del database

## Fogli gestionali

### CLIENTI

Contiene le anagrafiche aziendali e i relativi contatti. `id` identifica il cliente nelle pratiche. Dalla versione 1.7 comprende inoltre gli esiti distinti della P.IVA (`piva_formalmente_valida`, `piva_vies_valida`, `piva_verifica_ade`), IBAN, telefono internazionale e la gerarchia geografica Regione/Provincia/Comune/CAP.

La privacy è regolata da `condiviso`, `creato_da_username`, `creato_da_nome` e `condiviso_il`. Con `condiviso=NO` il cliente è restituito soltanto al creatore e agli admin; con `condiviso=SI` è consultabile da tutti gli utenti attivi. Il backend impedisce la cancellazione di qualsiasi cliente il cui `id` compare in una pratica.

### PRATICHE

Ogni riga rappresenta un’opportunità o lavoro. Gli stati previsti sono:

1. Inserita
2. Accettata
3. Sospesa
4. Bocciata, solo per noleggio e leasing
5. Completata

Le colonne `modelli_display`, `misure_display`, `cabinet_da_sottrarre` e `righe_magazzino_json` descrivono in modo esplicito l'impegno di magazzino. Per il P3.91 unificato sono disponibili anche `p391_unificato`, `p391_cabinet_50100` e `p391_cabinet_5050`; lo scarico continua a usare le righe JSON separate, quindi resta atomico e idempotente.

Le colonne `archiviata` e `archiviata_il` vengono valorizzate quando una pratica passa a `Bocciata`. `agent_username` determina il proprietario e impedisce agli agenti di leggere o modificare pratiche altrui; lo stato è modificabile esclusivamente dagli amministratori.

Dalla versione 1.9 la riga contiene inoltre destinatario dell'ordine, intestatario, provvigione, rate, periodicità, indirizzo di installazione, modalità di gestione del Ledwall, credenziali Cloud e riepilogo dei documenti richiesti/caricati. I campi restano nella stessa tabella per consentire filtri e controlli diretti da Google Fogli.

### DOCUMENTI

Registra nome, tipologia, ID e collegamento Google Drive del file caricato. `practiceId` collega il file alla pratica e `tipo_pratica_documento` distingue documento d'identità, tessera sanitaria, visura, preventivo Seemax, preventivo IFIS o altra documentazione. I byte del file non vengono inseriti nel Foglio: restano nella cartella Drive `SEEMAX MANAGEMENT DOCUMENTI`.

### ATTIVITA

Il foglio può rimanere per compatibilità storica, ma dalla versione 1.5 le attività non vengono più lette o scritte nel database. Telefonate, email, appuntamenti e scadenze sono salvati localmente sul dispositivo.

### LOG

Registra le principali operazioni effettuate dagli utenti: salvataggi, modifiche ed eliminazioni.

### NOTIFICHE

Conserva le variazioni di stato destinate all'agente responsabile e lo stato letto/non letto mostrato dalla campanella.

## Fogli condivisi con il Quotation Planner

### AGENTI

Utilizzato sia dal gestionale sia dal Planner per login e ruoli.

### PRODOTTI_LED

Listino comune a catalogo e calcolatore. Comprende ID prodotto, costi, giacenze, promozioni e singoli campi della scheda tecnica modificabili dal gestionale.

### ARCHIVIO_PREVENTIVI

Archivio tecnico dei preventivi S.Q.P. Il backend aggiunge automaticamente eventuali colonne mancanti quando riceve nuovi campi.

### IMPOSTAZIONI

Tabella chiave/valore per IVA, acconto, validità dei preventivi, numerazioni, versione della configurazione e `obiettivo_fatturato`. Le chiavi che iniziano con `req_acquisto_`, `req_noleggio_` o `req_leasing_` controllano l'obbligatorietà dei campi: usare esclusivamente `SI` o `NO`.

## Relazioni principali

```text
AGENTI.username
    ├── PRATICHE.agent_username
    ├── DOCUMENTI.agent_username
    └── ARCHIVIO_PREVENTIVI.agent_username

CLIENTI.id
    └── PRATICHE.clientId

PRATICHE.id
    └── DOCUMENTI.practiceId
```
