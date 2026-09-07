# Aggiornamento Seemax Management Suite 2.15.1

La versione 2.15.1 riduce soprattutto il tempo percepito e il costo di trasporto delle scritture, senza eliminare i controlli multiutente. È costruita sulla baseline operativa 2.14.4 e comprende tutte le correzioni precedenti relative a Benvenuto Beta e Patch notes.

## Risultato dell'intervento

| Area | Prima | Versione 2.15.1 |
|---|---|---|
| Connessione di scrittura | Nuovo iframe/form per ogni mutazione | Un solo ponte Apps Script riutilizzato dopo il login |
| Primo riscontro all'agente | Attesa della risposta completa | Cliente o pratica mostrati subito come `SINCRONIZZAZIONE` |
| Conferma autorevole | POST, messaggio e polling | Ponte nativo; stesso fallback POST/polling se necessario |
| Richiesta duplicata | Token e stato mutazione | Stesse protezioni, riutilizzate anche dopo un timeout del ponte |
| E-mail di stato | Preparata nel salvataggio | Registrata in `EMAIL_CODA` e inviata dal trigger |
| Accesso e notifiche | Alcune operazioni estese | Scritture mirate delle sole celle coinvolte |

Il salvataggio effettivo resta completato soltanto quando il backend restituisce il record scritto nel Foglio. L'elemento provvisorio nell'interfaccia non viene mai presentato come confermato.

## Ponte persistente Apps Script

Dopo il login il browser prepara in background una pagina HtmlService nascosta. Le mutazioni successive usano `google.script.run` attraverso la stessa pagina, evitando di creare un nuovo documento iframe e un nuovo form a ogni salvataggio.

Il ponte applica:

- origine frontend consentita esplicitamente;
- nonce casuale per ogni sessione della pagina;
- controllo della finestra mittente;
- controllo versione frontend/backend;
- whitelist delle sole azioni di scrittura previste;
- autenticazione applicativa già utilizzata dal gestionale.

Se il ponte non parte, è obsoleto o smette di rispondere, il gestionale usa automaticamente il trasporto POST precedente. Se una richiesta potrebbe essere già arrivata al server, controlla prima lo stesso `requestId`; il POST di ripiego conserva inoltre lo stesso token idempotente.

## Risposta visiva immediata

Per la creazione e modifica di clienti e pratiche:

1. il browser valida il modulo;
2. assegna il `request_token` definitivo;
3. mostra subito il record con badge `SINCRONIZZAZIONE`;
4. il backend acquisisce il lock, rilegge i dati critici e salva;
5. il record restituito sostituisce quello provvisorio tramite ID o `request_token`.

Durante la sincronizzazione le azioni che richiedono un record già confermato sono disabilitate. Se il backend rifiuta i dati, il badge diventa `DA VERIFICARE`; i dati inseriti restano disponibili e possono essere riaperti e corretti. Le righe provvisorie non vengono salvate nella cache persistente del bootstrap.

## Sicurezza multiutente conservata

La versione mantiene integralmente:

- `ScriptLock` per le mutazioni condivise;
- `SpreadsheetApp.flush()` prima del rilascio del lock;
- `record_version` e rilevamento dei conflitti;
- `request_token` e `requestId` idempotenti;
- numerazione pratica sotto lock;
- rilettura della giacenza dentro il lock;
- controllo ruoli nel backend;
- recupero dello stato dopo risposta tardiva o timeout.

L'aggiornamento immediato dell'interfaccia non esegue calcoli di magazzino locali e non rende autorevole un dato non ancora confermato.

## Coda e-mail asincrona

La migrazione crea il foglio tecnico `EMAIL_CODA` e un trigger temporizzato `processEmailQueueV2151`, eseguito ogni minuto.

Quando uno stato pratica richiede un'e-mail, il salvataggio registra un elemento `PENDING` nella coda mentre possiede già il lock. L'invio tramite `MailApp` avviene successivamente e fuori dal percorso critico dell'agente. Sono previsti:

- presa in carico atomica;
- massimo cinque tentativi;
- ripetizione con attesa crescente;
- stati `PENDING`, `IN_CORSO`, `COMPLETATA` ed `ERRORE`;
- dettaglio dell'ultimo errore.

L'e-mail può quindi arrivare con un ritardo normale fino a circa un minuto. La notifica interna nel gestionale viene invece registrata insieme alla variazione di stato.

## Stime ragionevoli

Le stime seguenti sono obiettivi da verificare sul deployment reale, non tempi garantiti da Google.

Nel test operativo precedente sono stati misurati `7.001 ms` complessivi, di cui `1.476 ms` nel backend e `5.525 ms` di overhead del trasporto con polling. Il ponte persistente interviene precisamente su questi 5,5 secondi: a parità di carico Google, la conferma dovrebbe avvicinarsi molto di più al tempo backend, mentre la comparsa locale del record è immediata.

| Misura | Obiettivo |
|---|---:|
| Comparsa locale di cliente/pratica dopo la conferma del modulo | meno di 100 ms su un dispositivo ordinario |
| Overhead aggiuntivo del ponte già pronto | normalmente decine di millisecondi lato browser |
| Risparmio evitando iframe/form per ogni scrittura | circa 0,2–1,5 s, variabile per browser e rete |
| Risparmio quando sarebbe stata inviata un'e-mail | circa 0,3–2+ s, variabile per Google |
| Conferma completa nel Foglio | dipende da cold start, lock, dimensione e servizi Google |

Un avvio a freddo di Apps Script o un lock occupato da un altro agente restano visibili nella misura `backend_total_ms` o `lock_wait_ms`. Nessuna modifica client può eliminare tali latenze senza spostare il backend fuori da Apps Script.

## Installazione

1. Crea una copia di sicurezza del Foglio e del precedente `Code.gs`.
2. Sostituisci il backend con `apps-script/Code.gs` 2.15.1.
3. Salva ed esegui manualmente `upgradeSeemaxV2151()`.
4. Autorizza lo script, inclusa la creazione del trigger e l'invio e-mail, se richiesto.
5. Controlla che esistano il foglio `EMAIL_CODA` e il trigger `processEmailQueueV2151`.
6. Pubblica una nuova versione del deployment Web App, mantenendo lo stesso URL `/exec`.
7. Pubblica su GitHub tutti i file del pacchetto 2.15.1.
8. Attendi GitHub Pages, quindi esegui `Ctrl+F5` o chiudi e riapri la PWA.

Frontend, backend e cache devono riportare rispettivamente:

```text
2.15.1
seemax-management-suite-2.15.1
seemax-management-v2-15-1
```

## Collaudo dopo il deployment

Esegui in ordine:

1. login ADMIN e agente;
2. creazione di un cliente;
3. creazione di una pratica;
4. due modifiche contemporanee dello stesso record: la seconda deve ricevere `CONFLICT_RECORD`;
5. doppio invio con lo stesso token: deve esistere una sola riga;
6. cambio stato che produce una notifica e-mail;
7. verifica che la pratica sia confermata subito e l'e-mail venga completata dalla coda;
8. pubblicazione di nuove Patch notes in modalità `ONCE` e `ALWAYS`;
9. prova con due agenti contemporanei su numerazione e magazzino.

Dalla console del browser puoi esaminare:

```javascript
SeemaxApi.getLastPerformance()
```

Quando il nuovo percorso è attivo, `transport_mode` deve essere `native_bridge`. In caso di incompatibilità o blocco del browser, il salvataggio resta operativo e `bridge_fallback` risulta `true`.

## Ripristino

Se il collaudo reale evidenzia un problema:

1. ripubblica il precedente frontend;
2. ridistribuisci il precedente `Code.gs` come nuova versione della Web App;
3. lascia `EMAIL_CODA` nel Foglio: non interferisce con le versioni precedenti;
4. il trigger può essere eliminato manualmente dalla pagina Trigger di Apps Script.

Non eliminare clienti, pratiche, movimenti o notifiche per eseguire il ripristino.
