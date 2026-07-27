# Struttura del database

## Fogli gestionali

### CLIENTI

Contiene le anagrafiche aziendali e i relativi contatti. `id` identifica il cliente nelle pratiche. Dalla versione 1.7 comprende inoltre gli esiti distinti della P.IVA (`piva_formalmente_valida`, `piva_vies_valida`, `piva_verifica_ade`), IBAN, telefono internazionale e la gerarchia geografica Regione/Provincia/Comune/CAP.

### PRATICHE

Ogni riga rappresenta un’opportunità o lavoro. Gli stati previsti sono:

1. Inserita
2. Accettata
3. Sospesa
4. Bocciata, solo per noleggio e leasing
5. Completata

Le colonne `modelli_display`, `misure_display`, `cabinet_da_sottrarre` e `righe_magazzino_json` descrivono in modo esplicito l'impegno di magazzino. Per il P3.91 unificato sono disponibili anche `p391_unificato`, `p391_cabinet_50100` e `p391_cabinet_5050`; lo scarico continua a usare le righe JSON separate, quindi resta atomico e idempotente.

### DOCUMENTI

Registra nome, tipologia, ID e collegamento Google Drive del file caricato. `practiceId` collega il file alla pratica. I byte del file non vengono inseriti nel Foglio: restano nella cartella Drive `SEEMAX MANAGEMENT DOCUMENTI`.

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

Tabella chiave/valore per IVA, acconto, validità dei preventivi, numerazioni, versione della configurazione e `obiettivo_fatturato`.

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
