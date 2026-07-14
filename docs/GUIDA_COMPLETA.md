# Guida completa all’installazione

Questa guida permette di mettere online Seemax Management Suite senza installare programmi di sviluppo.

## 1. Come funziona il progetto

Il sistema è diviso in due parti:

1. **GitHub Pages** pubblica l’interfaccia del gestionale.
2. **Google Apps Script** riceve le richieste e legge o aggiorna il Foglio Google.

Il browser apre la webapp da GitHub. Quando l’utente effettua il login o salva una pratica, la webapp contatta Apps Script, che esegue l’operazione sul Foglio Google.

## 2. Provare la modalità demo

La configurazione iniziale usa:

```js
demoMode: true
```

Accessi:

- amministratore: `admin.demo` / `DEMO-ADMIN`;
- agente: `agente.demo` / `DEMO-AGENTE`.

In questa modalità tutte le funzioni sono operative, ma i dati vengono salvati nel browser. Cancellando i dati del browser la demo viene ripristinata.

## 3. Preparare il Foglio Google

Puoi utilizzare il Foglio Google già esistente del Quotation Planner.

Prima di procedere crea comunque una copia di sicurezza:

1. apri il Foglio Google;
2. scegli **File > Crea una copia**;
3. assegna alla copia un nome come `Backup Database Seemax`.

Nel foglio originale:

1. apri **Estensioni > Apps Script**;
2. elimina il contenuto del file `Code.gs` soltanto dopo averne conservato una copia;
3. copia il contenuto del file `apps-script/Code.gs` del progetto;
4. incollalo in Apps Script;
5. salva il progetto.

> Il codice fornito comprende le funzioni del nuovo gestionale e le principali azioni richieste dal Quotation Planner. Se il vecchio progetto Apps Script contiene funzioni personalizzate non visibili nell’HTML fornito, conservale e integrale prima della sostituzione definitiva.

## 4. Creare le nuove sezioni del database

Nell’editor Apps Script:

1. seleziona la funzione `setupSeemaxDatabase` dal menu superiore;
2. premi **Esegui**;
3. autorizza lo script quando Google lo richiede;
4. torna al Foglio Google.

Lo script crea o completa automaticamente:

- `AGENTI`;
- `PRODOTTI_LED`;
- `CLIENTI`;
- `PRATICHE`;
- `DOCUMENTI`;
- `ATTIVITA`;
- `IMPOSTAZIONI`;
- `PATCH_NOTES`;
- `PATCH_ITEMS`;
- `ARCHIVIO_PREVENTIVI`;
- `LOG`.

I fogli e le colonne già presenti non vengono cancellati.

Se `AGENTI` era vuoto viene creato un account placeholder:

```text
username: admin.seemax
chiave: CAMBIA_QUESTA_CHIAVE
```

Cambia subito la chiave direttamente nel foglio `AGENTI`.

## 5. Pubblicare Google Apps Script

1. Nell’editor Apps Script premi **Esegui il deployment > Nuovo deployment**.
2. Come tipo seleziona **Applicazione web**.
3. In **Esegui come** seleziona il tuo account.
4. In **Chi ha accesso** seleziona **Chiunque**.
5. Premi **Esegui il deployment**.
6. Copia l’indirizzo che termina con `/exec`.

Quando modifichi `Code.gs`, crea una nuova versione del deployment oppure aggiorna quella esistente da **Gestisci deployment**.

## 6. Collegare la webapp al database

Apri `assets/js/config.js` e modifica:

```js
demoMode: false,
appsScriptUrl: "https://script.google.com/macros/s/INSERISCI_ID/exec",
```

Completa anche:

```js
commercialPhone: "...",
commercialEmail: "...",
address: "..."
```

Lo stesso indirizzo Apps Script viene letto automaticamente dal Quotation Planner integrato.

## 7. Pubblicare su GitHub Pages

### Creazione del repository

1. Accedi a GitHub.
2. Premi **New repository**.
3. Inserisci, ad esempio, `seemax-management-suite`.
4. Crea il repository.
5. Carica **tutto il contenuto di questa cartella**, non la cartella esterna che la contiene.
6. Conferma il caricamento.

La cartella principale del repository deve mostrare direttamente `index.html`, `assets`, `apps-script`, `quotation-planner` e `docs`.

### Attivazione di Pages

1. Apri **Settings** del repository.
2. Seleziona **Pages**.
3. In **Build and deployment** seleziona **Deploy from a branch**.
4. Seleziona il branch `main` e la cartella `/ (root)`.
5. Salva.

Dopo alcuni minuti GitHub mostrerà l’indirizzo pubblico della webapp.

## 8. Primo accesso reale

Gli utenti sono letti dal foglio `AGENTI`.

Colonne essenziali:

| Colonna | Contenuto |
|---|---|
| `username` | Nome utilizzato al login |
| `chiave_id_agente` | Chiave di accesso |
| `nome_visualizzato` | Nome mostrato nel gestionale |
| `email` | Email agente |
| `telefono` | Telefono agente |
| `stato` | `ATTIVO` oppure `SOSPESO` |
| `ruolo` | `ADMIN` oppure `AGENTE` |

L’amministratore vede e modifica agenti, catalogo e impostazioni. L’agente utilizza clienti, pratiche, documenti, attività e Quotation Planner.

## 9. Documenti e allegati

La versione iniziale registra collegamenti a Google Drive:

1. carica il PDF o il documento su Drive;
2. copia il link di condivisione;
3. nel gestionale apri **Documenti > Nuovo documento**;
4. collega il documento alla pratica;
5. incolla il link.

Il caricamento diretto dei file nella webapp è lasciato come estensione futura perché GitHub Pages non può ricevere file sul proprio server.

## 10. Aggiornare il gestionale

Per modificare testi, colori o funzioni:

1. aggiorna i file nel repository;
2. conferma la modifica;
3. GitHub Pages pubblicherà automaticamente la nuova versione.

Se il browser mostra ancora la versione precedente, aggiorna la costante `CACHE` dentro `sw.js`, ad esempio da `seemax-management-v1` a `seemax-management-v2`.

## 11. Installazione su smartphone o computer

Apri la webapp dal browser. Quando disponibile, usa il pulsante **Installa App** oppure il comando del browser **Aggiungi a schermata Home**. Il gestionale verrà aperto come un’app separata.

## 12. Controlli finali

- Login ADMIN riuscito.
- Login AGENTE riuscito.
- Nuovo cliente salvato.
- Nuova pratica salvata.
- Cambio stato pratica funzionante.
- Catalogo visibile.
- Quotation Planner caricato.
- Documento collegato a Drive.
- Apps Script mostra lo stato online.
- Visualizzazione mobile verificata.
