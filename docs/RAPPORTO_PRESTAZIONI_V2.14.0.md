# Rapporto prestazioni — Seemax Management Suite 2.14.0

## Obiettivo

La versione 2.14.0 interviene sul percorso critico che va dal click su **Salva** alla conferma ricevuta dal browser. L'obiettivo è ridurre il numero e il volume delle operazioni Google Sheets, accorciare la permanenza nel lock globale e rendere misurabile la latenza residua.

Il progetto continua a usare:

- GitHub Pages per il frontend;
- Google Apps Script come backend;
- Google Fogli come archivio principale;
- Google Drive per i documenti.

Non vengono introdotti servizi a pagamento né nuovi database.

## Percorso precedente

Un normale salvataggio poteva eseguire una sequenza simile:

```text
POST
  -> autenticazione
  -> lock globale
  -> lettura tabella per request_token
  -> lettura tabella per permessi/record
  -> invalidazione cache
  -> nuova lettura tabella per record_version
  -> scansione PRATICHE per il numero progressivo
  -> scrittura record
  -> rilascio lock
  -> scrittura LOG
  -> lettura NOTIFICHE
  -> risposta
```

Le singole operazioni erano corrette dal punto di vista della sicurezza, ma alcune interrogavano più volte la stessa tabella o svolgevano lavoro secondario prima di restituire la conferma.

## Percorso 2.14.0

```text
POST
  -> autenticazione fuori dal lock
  -> lock globale
  -> lookup puntuale per request_token/ID
  -> controllo record_version sul record già trovato
  -> contatore pratica da Proprietà script
  -> letture mirate necessarie alla validazione
  -> scrittura di una sola riga
  -> rilascio lock
  -> risposta con diagnostica
```

Nel normale salvataggio di un cliente o di una pratica Inserita:

- non viene riletto il foglio `NOTIFICHE`;
- non viene scritto il log `UPSERT` ordinario;
- non viene riletta l'intera tabella dopo l'invalidazione della cache;
- non viene scandita l'intera tabella `PRATICHE` per ogni nuovo numero, dopo l'inizializzazione del contatore.

## Modifiche tecniche

### 1. Lookup puntuale

`findRowRecord_()` usa `TextFinder` sulla sola colonna interessata e legge poi soltanto la riga trovata.

Le ricerche più frequenti riguardano:

- `id`;
- `username`;
- `request_token`;
- `numero`;
- chiavi di configurazione.

La cache della singola esecuzione evita di ripetere lo stesso lookup nella stessa mutazione. Per esempio, la pratica letta per il controllo permessi viene riutilizzata dal controllo versione e dall'upsert.

### 2. Scrittura di una sola riga

`upsertObject_()` non ricostruisce e riscrive la tabella. Mantiene i valori esistenti della riga e invia a Sheets:

```javascript
sheet.getRange(rowIndex, 1, 1, headers.length).setValues([values]);
```

L'intera tabella continua a essere letta soltanto nelle funzioni che ne hanno realmente bisogno, come bootstrap, dashboard, migrazioni o consolidamento prodotti.

### 3. Controllo versione senza doppia lettura

`prepareVersionedRecord_()` non invalida più la tabella immediatamente prima di cercare il record. Il record letto sotto lock può essere riutilizzato in sicurezza durante la stessa esecuzione.

Restano attivi:

- `record_version`;
- `expected_record_version`;
- `request_token`;
- lock globale della mutazione.

### 4. Autenticazione fuori dal lock

Per `management_upsert`, autenticazione e parsing del payload avvengono prima di acquisire il lock. Il lock continua a proteggere le verifiche e le scritture condivise, ma non viene occupato mentre si eseguono passaggi che non richiedono serializzazione tra agenti.

Al momento dell'acquisizione vengono azzerate le cache di dati lette prima del lock, mentre le intestazioni possono essere riutilizzate perché non rappresentano uno snapshot dei record.

### 5. Contatore pratiche

I progressivi per prefisso agente vengono memorizzati in `PropertiesService` con chiavi dedicate.

`upgradeSeemaxV2140()` legge una volta la colonna `PRATICHE.numero`, individua il massimo per prefisso e inizializza i contatori. Per ogni nuova pratica:

1. legge il contatore;
2. lo incrementa sotto lock;
3. verifica puntualmente che il candidato non esista;
4. salva il nuovo valore.

L'inserimento manuale di una pratica nel Foglio non crea collisioni: la verifica puntuale continua a scartare un numero già presente. La funzione amministrativa `rebuildPracticeCountersV2140()` può riallineare i contatori in qualsiasi momento.

### 6. Cache breve di IMPOSTAZIONI

Le regole `req_...`, la modalità beta e gli altri valori di `IMPOSTAZIONI` vengono conservati in `CacheService` per 90 secondi.

La cache viene invalidata automaticamente da:

- `setSetting_()`;
- `upsertSettingsBatch_()`.

Il bootstrap e la schermata Impostazioni forzano una lettura fresca, così la cache viene riscaldata con i dati aggiornati.

### 7. Notifiche fuori dal salvataggio ordinario

La risposta del normale upsert pratica contiene il record salvato, non l'elenco completo delle notifiche dell'utente. Le notifiche vengono caricate durante il bootstrap e attraverso le funzioni dedicate.

Quando cambia lo stato della pratica, la nuova notifica viene comunque scritta. L'eventuale invio email resta un'attività più costosa e può rendere quel caso specifico più lento rispetto a una pratica Inserita senza cambio stato.

### 8. Log di routine opzionale

La scrittura di `LOG` per ogni semplice upsert è disattivata con:

```javascript
routineUpsertLogs: false
```

Restano nel log gli eventi con valore operativo o amministrativo, compresi:

- cambio di stato;
- eliminazione;
- movimenti di magazzino;
- aggiornamento documenti;
- errori di email;
- aggiornamenti impostazioni.

La scelta evita una seconda scrittura e una seconda acquisizione del lock subito dopo il salvataggio principale.

### 9. Diagnostica integrata

Ogni mutazione POST può restituire:

```javascript
{
  performance: {
    total_ms,
    lock_wait_ms,
    lock_hold_ms,
    totals_ms,
    events
  }
}
```

Il frontend aggiunge il tempo totale osservato dal browser e calcola una differenza indicativa di trasporto.

La diagnostica non include dati di clienti o pratiche. Registra nomi tecnici delle operazioni, quantità di righe/colonne e durate.

## Riduzione delle operazioni attese

Il numero esatto dipende dal record, dai controlli fiscali, dal magazzino e dallo stato. Il confronto qualitativo del percorso tipico è:

| Operazione | Prima | 2.14.0 |
|---|---|---|
| Ricerca `request_token` | lettura tabella completa | ricerca su una colonna + lettura riga trovata |
| Ricerca record per ID | lettura/cache tabella | ricerca puntuale con cache per richiesta |
| Controllo versione | invalidazione + nuova lettura | riuso del record letto sotto lock |
| Numero nuova pratica | scansione della tabella | contatore in Proprietà script + verifica puntuale |
| Scrittura record | riga interessata, ma dopo più letture | una sola riga, senza rilettura forzata |
| Notifiche dopo pratica | lettura completa | nessuna lettura nel normale upsert |
| Log cliente/pratica ordinario | scrittura aggiuntiva | disattivato per default |
| Impostazioni durante pratica | possibile lettura foglio | cache condivisa di 90 secondi |

## Cosa non è stato sacrificato

- protezione multiutente;
- idempotenza dopo timeout;
- controllo dei conflitti;
- autorizzazioni ADMIN/AGENTE;
- validazione P.IVA, IBAN, PEC, email e telefono;
- controllo del cliente associato;
- gestione multi-Ledwall;
- controllo e movimenti di magazzino;
- compatibilità con righe prodotto legacy;
- documenti Google Drive;
- notifiche e email sui cambi di stato previsti.

## Test automatici eseguiti

Lo script `scripts/verify-v2.14.js` verifica:

- sintassi di backend e frontend;
- assenza di funzioni top-level duplicate;
- allineamento versione backend/frontend/PWA;
- presenza dell'upgrade 2.14.0;
- presenza di lookup puntuale, cache impostazioni, contatore e diagnostica;
- assenza della rilettura notifiche nella risposta pratica;
- self-test del consolidamento giacenza P2.5;
- lookup cliente su un foglio simulato senza lettura completa della tabella;
- riuso della cache nella stessa richiesta;
- upsert con una sola scrittura di riga;
- incremento del contatore pratiche senza nuova scansione completa.

Questi test controllano il comportamento del codice. Non possono simulare il cold start o la latenza reale dei servizi Google associati al Foglio aziendale.

## Come decidere se Google Fogli è ancora sufficiente

Dopo il deployment, raccogli per alcuni giorni misure di:

- salvataggio nuovo cliente;
- modifica cliente;
- nuova pratica Inserita;
- modifica pratica senza cambio stato;
- cambio stato con notifica/email;
- richieste simultanee di due agenti.

Google Fogli può restare una soluzione adeguata se:

- la maggior parte dei salvataggi ha un tempo percepito accettabile;
- `lock_wait_ms` resta generalmente basso;
- le tabelle non crescono al punto da rendere lento il bootstrap;
- le quote Apps Script non vengono avvicinate;
- non servono query relazionali o realtime avanzato.

Una migrazione verso PostgreSQL/Supabase diventa più conveniente se:

- i cold start e la variabilità restano incompatibili con il flusso commerciale;
- più agenti generano attese frequenti sul lock globale;
- clienti e pratiche raggiungono volumi che richiedono indici e paginazione server-side;
- servono aggiornamenti realtime tra dispositivi;
- servono transazioni, vincoli univoci e relazioni native;
- il gestionale diventa mission-critical e richiede backup e osservabilità più strutturati.

## Conclusione

La 2.14.0 elimina inefficienze applicative concrete prima di attribuire ogni ritardo a Google Fogli. È il passaggio corretto per ottenere due risultati:

1. migliorare subito l'installazione attuale senza cambiare infrastruttura;
2. raccogliere dati sufficienti per decidere in modo oggettivo se e quando migrare a un database dedicato.
