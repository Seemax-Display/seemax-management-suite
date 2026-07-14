# Struttura del database

## Fogli gestionali

### CLIENTI

Contiene le anagrafiche aziendali e i relativi contatti. `id` identifica il cliente nelle pratiche.

### PRATICHE

Ogni riga rappresenta un’opportunità o lavoro. Gli stati previsti sono:

1. Nuova
2. Preventivo
3. Documenti
4. Istruttoria
5. Delibera
6. Contratto
7. Installazione
8. Chiusa
9. Rifiutata

### DOCUMENTI

Registra nome, tipologia e collegamento Google Drive del documento. `practiceId` collega il file alla pratica.

### ATTIVITA

Contiene telefonate, email, appuntamenti, verifiche e installazioni con scadenza.

### LOG

Registra le principali operazioni effettuate dagli utenti: salvataggi, modifiche ed eliminazioni.

## Fogli condivisi con il Quotation Planner

### AGENTI

Utilizzato sia dal gestionale sia dal Planner per login e ruoli.

### PRODOTTI_LED

Listino comune a catalogo e calcolatore. Le colonne originali restano compatibili; il setup aggiunge soltanto campi gestionali come `id`, `categoria`, `descrizione` e URL delle immagini.

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
