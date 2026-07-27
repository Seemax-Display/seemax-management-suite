# Struttura del database

## Fogli gestionali

### CLIENTI

Contiene le anagrafiche aziendali e i relativi contatti. `id` identifica il cliente nelle pratiche.

### PRATICHE

Ogni riga rappresenta un’opportunità o lavoro. Gli stati previsti sono:

1. Inserita
2. Accettata
3. Sospesa
4. Bocciata, solo per noleggio e leasing
5. Completata

Le colonne `modelli_display`, `misure_display`, `cabinet_da_sottrarre` e `righe_magazzino_json` descrivono in modo esplicito l'impegno di magazzino.

### DOCUMENTI

Registra nome, tipologia e collegamento Google Drive del documento. `practiceId` collega il file alla pratica.

### ATTIVITA

Contiene telefonate, email, appuntamenti, verifiche e installazioni con scadenza.

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

Tabella chiave/valore per IVA, acconto, validità dei preventivi, numerazioni e versione della configurazione.

## Relazioni principali

```text
AGENTI.username
    ├── PRATICHE.agent_username
    ├── ATTIVITA.agent_username
    ├── DOCUMENTI.agent_username
    └── ARCHIVIO_PREVENTIVI.agent_username

CLIENTI.id
    └── PRATICHE.clientId

PRATICHE.id
    ├── DOCUMENTI.practiceId
    └── ATTIVITA.practiceId
```
