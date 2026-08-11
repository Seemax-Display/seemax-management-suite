# Struttura del database

## Fogli gestionali

### CLIENTI

Contiene le anagrafiche aziendali e i relativi contatti. `id` identifica il cliente nelle pratiche. Dalla versione 1.7 comprende inoltre gli esiti distinti della P.IVA (`piva_formalmente_valida`, `piva_vies_valida`, `piva_verifica_ade`), IBAN, telefono internazionale e la gerarchia geografica Regione/Provincia/Comune/CAP.

La privacy è regolata da `condiviso`, `creato_da_username`, `creato_da_nome` e `condiviso_il`. Con `condiviso=NO` il cliente è restituito soltanto al creatore e agli admin; con `condiviso=SI` è consultabile da tutti gli utenti attivi. Il backend impedisce la cancellazione di qualsiasi cliente il cui `id` compare in una pratica.

Dalla versione 2.11 un amministratore può creare un cliente per conto di un agente attivo. In quel caso `creato_da_username`, `creato_da_nome` e `agent_username` vengono assegnati dal backend all’utente selezionato; una richiesta equivalente inviata da un agente viene ignorata, evitando appropriazioni o spostamenti non autorizzati. `creatoIl` conserva l’istante di creazione e viene usato per l’ordinamento cronologico iniziale degli account ADMIN.

Dalla versione 2.12.1 le colonne testuali che ammettono la deroga amministrativa `0000`, comprese Regione, Provincia, Comune, CAP, località, indirizzo e civico, vengono forzate nel formato testo. L’upgrade converte inoltre gli eventuali zeri numerici creati in precedenza da Google Fogli nel valore letterale `0000`. Durante l’importazione in una pratica questi valori sono considerati dati provvisori presenti e non campi vuoti.

### PRATICHE

Ogni riga rappresenta un’opportunità o lavoro. Gli stati previsti sono:

1. Inserita
2. Accettata
3. Sospesa
4. Bocciata, solo per noleggio e leasing
5. Completata

Le colonne `modelli_display`, `misure_display`, `bifacciale`, `cabinet_da_sottrarre` e `righe_magazzino_json` descrivono in modo esplicito la configurazione e l'impegno di magazzino. `ledwall_configurazioni_json` conserva invece l'elenco dei singoli Ledwall della pratica: modello, misura, bifacciale, cabinet, righe di stock e l'eventuale indirizzo alternativo. `righe_magazzino_json` resta la vista aggregata usata dal magazzino. Per il P3.91 unificato sono disponibili anche `p391_unificato`, `p391_cabinet_50100` e `p391_cabinet_5050`; lo scarico continua a usare le righe JSON separate, quindi resta atomico e idempotente.

Le colonne `archiviata` e `archiviata_il` vengono valorizzate quando una pratica passa a `Bocciata`. `agent_username` determina il proprietario e impedisce agli agenti di leggere o modificare pratiche altrui; lo stato è modificabile esclusivamente dagli amministratori.

`creatoIl` conserva l’istante di creazione della pratica. Per le righe storiche che non lo possiedono ancora, l’interfaccia usa `aggiornatoIl` come riferimento compatibile, senza richiedere una riscrittura massiva del foglio.

Le colonne `avviso_giacenza`, `giacenza_insufficiente` e `dettaglio_giacenza` gestiscono l'avviso non bloccante. Una pratica può sempre essere salvata anche se i cabinet non sono disponibili, compreso il passaggio ad Accettata o Completata. In questo caso `magazzino_in_attesa=SI`, `magazzino_applicato=NO` e nessuna quantità viene portata sotto zero. Impostando manualmente `avviso_giacenza` su `NO` nella riga della pratica, il contrassegno rosso viene nascosto; riportandolo a `SI` torna visibile se la disponibilità è ancora insufficiente.

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

Utilizzato sia dal gestionale sia dal Planner per login e ruoli. `ultimo_accesso` determina il primo benvenuto: il backend legge il valore prima di aggiornarlo e mostra la guida automatica soltanto se il campo era vuoto. Dalla versione 2.8.1 comprende inoltre `nome_profilo`, `descrizione_profilo`, `tema_profilo`, `colore_profilo`, `icona_profilo` e `bacheca_trofei_json`. Il nome del profilo è un alias puramente visivo e non sostituisce l'identità ufficiale dell'agente. La bacheca conserva l'ordine degli identificativi dei trofei esposti e può contenere anche un array vuoto. Il salvataggio è limitato all'utente autenticato e il backend convalida temi, colori, icone e trofei realmente sbloccati; per gli amministratori sono consentiti tutti i trofei in modalità di test.

### PRODOTTI_LED

Listino comune a catalogo e calcolatore. Comprende ID prodotto, costi, giacenze, promozioni e singoli campi della scheda tecnica modificabili dal gestionale.

### MOVIMENTI_MAGAZZINO

Registro immutabile dei carichi, scarichi e storni. I movimenti manuali riportano `tipo_movimento` (`CARICO_MANUALE` o `SCARICO_MANUALE`), quantità firmata, giacenza precedente e successiva, autore e causale. Le operazioni passano dal blocco globale Apps Script, così due amministratori non possono sovrascrivere contemporaneamente la stessa giacenza. La colonna `request_token` rende inoltre idempotente ogni movimento manuale: un doppio invio della medesima richiesta viene riconosciuto e non modifica nuovamente la quantità.

Il valore letterale `0000` è una deroga riservata agli ADMIN per i dati temporaneamente sconosciuti di clienti e pratiche. Non equivale a un dato verificato e deve essere sostituito appena disponibile; il backend rifiuta questa deroga se inviata da un agente.

### ARCHIVIO_PREVENTIVI

Archivio tecnico dei preventivi S.Q.P. Il backend aggiunge automaticamente eventuali colonne mancanti quando riceve nuovi campi.

### IMPOSTAZIONI

Tabella chiave/valore per IVA, acconto, validità dei preventivi, numerazioni, versione della configurazione e `obiettivo_fatturato`. Le chiavi che iniziano con `req_acquisto_`, `req_noleggio_` o `req_leasing_` controllano l'obbligatorietà dei campi: usare esclusivamente `SI` o `NO`. Durante il collaudo, `beta_test_attiva` controlla l'avviso mostrato a ogni apertura e `beta_sblocca_trofei` rende temporaneamente disponibili tutti i riconoscimenti; entrambe possono essere riportate a `NO` al termine della fase Beta. Per le pratiche di acquisto **Per Me** il valore provvigionale viene sempre ignorato; il codice fiscale del cliente non è richiesto nelle pratiche di acquisto. Una pratica in stato `Completata` è bloccata dal backend e può essere corretta soltanto intervenendo direttamente sul Foglio Google.

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
