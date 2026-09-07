# Aggiornamento Seemax Management Suite 2.14.0

La versione 2.14.0 riduce il tempo necessario per salvare clienti e pratiche mantenendo Google Fogli come database e senza modificare i nomi dei fogli o delle colonne esistenti.

L'intervento non promette una latenza costante da database dedicato: il tempo di avvio di Google Apps Script e le chiamate ai servizi Google restano variabili. La nuova diagnostica consente però di misurare con precisione dove viene speso il tempo su ogni installazione reale.

## Cosa cambia

- ricerca puntuale di ID e `request_token` invece della lettura completa della tabella;
- scrittura della sola riga interessata;
- controllo `record_version` senza invalidare e rileggere immediatamente la tabella;
- contatore pratiche nelle Proprietà script, inizializzato dai numeri già esistenti;
- cache di 90 secondi per `IMPOSTAZIONI`, invalidata automaticamente quando un amministratore salva le impostazioni;
- nessuna rilettura completa di `NOTIFICHE` dopo il normale salvataggio di una pratica;
- log `UPSERT` ordinari di clienti e pratiche esclusi dal percorso critico; cancellazioni, cambi di stato, magazzino ed errori continuano a essere registrati;
- autenticazione effettuata prima di acquisire il lock globale di scrittura;
- diagnostica dettagliata dei tempi backend e del tempo totale percepito dal browser.

## Compatibilità del database

Non è richiesta una migrazione a un nuovo Foglio.

La funzione `upgradeSeemaxV2140`:

1. verifica le intestazioni necessarie;
2. inizializza il contatore delle pratiche partendo dai numeri esistenti;
3. aggiorna versione e note di rilascio;
4. conserva clienti, pratiche, prodotti, movimenti, documenti e notifiche già presenti.

Il contatore viene memorizzato nelle **Proprietà script** di Apps Script, non in una nuova scheda del Foglio.

## Prima dell'aggiornamento

1. Crea una copia di sicurezza completa del Foglio Google.
2. Conserva una copia del `Code.gs` attualmente pubblicato.
3. Scarica o conserva una copia del repository GitHub attuale.
4. Verifica di conoscere l'URL `/exec` del deployment Apps Script in uso.
5. Evita salvataggi da parte degli agenti durante i pochi passaggi di sostituzione e pubblicazione.

## Aggiornamento del backend Google Apps Script

1. Apri il Foglio Google usato dal gestionale.
2. Seleziona **Estensioni > Apps Script**.
3. Apri il file `Code.gs`.
4. Sostituisci tutto il contenuto con `apps-script/Code.gs` della versione 2.14.0.
5. Salva il progetto.
6. Dal menu delle funzioni seleziona `upgradeSeemaxV2140`.
7. Premi **Esegui** e autorizza lo script, se richiesto.
8. Il risultato atteso è:

   `SEEMAX v2.14.0 configurato: percorso rapido per clienti e pratiche, contatori pratica e diagnostica tempi attivi.`

9. Apri **Esegui il deployment > Gestisci deployment**.
10. Modifica il deployment Web App esistente.
11. Seleziona **Nuova versione** e pubblica.
12. Mantieni le impostazioni:
    - esegui come: **utente che esegue il deployment**;
    - accesso: **chiunque**, secondo la configurazione già usata dal progetto.

> Eseguire la funzione di upgrade non aggiorna il codice pubblico. La pubblicazione di una nuova versione del deployment è obbligatoria.

L'URL `/exec` normalmente resta invariato. Se Google ne genera uno nuovo, riportalo in `assets/js/config.js` prima di pubblicare GitHub.

## Aggiornamento del frontend GitHub Pages

1. Carica il contenuto del pacchetto GitHub 2.14.0 nella radice del repository.
2. Mantieni il valore corretto di `appsScriptUrl` in `assets/js/config.js`.
3. Verifica che in `assets/js/config.js` risultino:

```javascript
version: "2.14.0",
demoMode: false,
performanceDiagnostics: true
```

4. Esegui il commit e attendi il completamento di GitHub Pages.
5. Apri il gestionale e fai un aggiornamento forzato della pagina.
6. Se è installato come PWA, chiudilo completamente e riaprilo dopo il refresh.

La cache PWA della versione è `seemax-management-v2-14-0`, quindi il nuovo service worker elimina automaticamente le cache precedenti quando viene attivato.

## Collaudo operativo minimo

Esegui i controlli in modalità Standard, non in Modalità Rapida.

1. Accedi come ADMIN.
2. Crea un cliente di prova con una P.IVA non già presente.
3. Verifica che il cliente compaia in `CLIENTI` una sola volta.
4. Crea una pratica Inserita collegata al cliente.
5. Verifica che la pratica compaia in `PRATICHE` una sola volta e che il numero progressivo sia corretto.
6. Modifica il cliente appena creato e verifica l'incremento di `record_version`.
7. Modifica la pratica e verifica l'incremento di `record_version`.
8. Ripeti un salvataggio durante una connessione lenta: `request_token` deve impedire duplicati.
9. Prova due salvataggi da due account e verifica che non vengano sovrascritti dati più recenti.
10. Verifica Catalogo e giacenze con `auditInventorySourceV2130()` se il progetto usa righe prodotto storiche o duplicate.

## Come leggere i tempi reali

Nel browser:

1. premi `F12` oppure apri gli strumenti per sviluppatori;
2. seleziona **Console**;
3. salva un cliente o una pratica;
4. cerca il messaggio `[SEEMAX PERFORMANCE]`;
5. per rileggere l'ultima misurazione esegui:

```javascript
SeemaxApi.getLastPerformance()
```

Campi principali:

| Campo | Significato |
|---|---|
| `client_total_ms` | Tempo complessivo dal click alla risposta ricevuta dal browser |
| `backend_total_ms` | Tempo misurato all'interno di Apps Script |
| `transport_overhead_ms` | Differenza indicativa dovuta a rete, avvio/trasporto iframe e risposta |
| `lock_wait_ms` | Tempo trascorso in attesa che un'altra scrittura liberi il lock |
| `lock_hold_ms` | Tempo durante il quale la mutazione ha mantenuto il lock globale |
| `totals_ms.lookup` | Tempo complessivo delle ricerche puntuali |
| `totals_ms.read` | Tempo complessivo delle letture da Google Fogli |
| `totals_ms.write` | Tempo complessivo delle scritture su Google Fogli |
| `totals_ms.cache` | Tempo delle operazioni di cache rilevate |
| `events` | Dettaglio delle singole operazioni misurate |

Interpretazione pratica:

- `lock_wait_ms` alto: un altro agente stava salvando nello stesso momento;
- `backend_total_ms` alto con molte letture/scritture: il collo di bottiglia è soprattutto Google Fogli o la logica backend;
- `transport_overhead_ms` alto ma backend rapido: incidono rete, cold start, iframe o risposta Apps Script;
- prima richiesta lenta e successive più rapide: probabile cold start e riscaldamento cache;
- pratica con cambio stato più lenta: può includere notifica ed eventuale email.

## Log operativo

Per ridurre una scrittura aggiuntiva dopo ogni salvataggio, il file contiene:

```javascript
routineUpsertLogs: false
```

Con questo valore:

- la normale creazione/modifica di cliente o pratica non aggiunge una riga `UPSERT` al foglio `LOG`;
- cambi di stato, eliminazioni, movimenti di magazzino ed errori continuano a essere registrati.

Per ripristinare il log di ogni normale upsert, imposta `routineUpsertLogs: true` in `SEEMAX_PERFORMANCE_OPTIONS_`, sapendo che questo può aggiungere latenza e contesa sul lock del log.

## Cache delle impostazioni

`IMPOSTAZIONI` viene memorizzato per 90 secondi in `CacheService`.

- un salvataggio eseguito dalla schermata Impostazioni invalida subito la cache;
- il bootstrap e la schermata Impostazioni forzano una lettura fresca e riscaldano nuovamente la cache;
- una modifica manuale effettuata direttamente nel Foglio può richiedere fino a 90 secondi per essere vista da una singola richiesta che non esegue un bootstrap fresco.

Per disattivarla, imposta `settingsCacheSeconds: 0`.

## Ripristino della versione precedente

In caso di problema:

1. rimetti il precedente `Code.gs`;
2. pubblica una nuova versione del deployment Apps Script;
3. ripristina il commit GitHub precedente;
4. esegui un refresh forzato o reinstalla la PWA.

Le proprietà dei contatori create dalla 2.14.0 possono restare: non modificano i dati del Foglio e non interferiscono con la 2.13.0.

## Limiti che restano

- Google Apps Script può avere cold start e tempi variabili;
- ogni salvataggio reale richiede comunque almeno alcune chiamate ai servizi Google;
- il lock rimane globale perché protegge duplicati, versioni e magazzino in un ambiente che non offre transazioni SQL;
- il bootstrap continua a leggere più tabelle complete;
- i prodotti vengono ancora consolidati dalla tabella `PRODOTTI_LED` per preservare la compatibilità con eventuali righe legacy;
- i tempi effettivi devono essere misurati sul Foglio reale: i test locali verificano il percorso del codice, non la latenza dei server Google.
