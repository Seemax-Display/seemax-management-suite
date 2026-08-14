# Aggiornamento Seemax Management Suite 2.14.2

## Obiettivi della versione

La versione 2.14.2 interviene su due punti emersi durante il collaudo reale della 2.14.1:

1. ridurre ulteriormente il tempo necessario al browser per confermare un salvataggio già completato dal backend;
2. ripristinare nell'area amministrativa la personalizzazione del messaggio di benvenuto e delle patch notes.

## Diagnosi del test del 13 agosto 2026

Il test ricevuto ha misurato:

| Voce | Tempo |
|---|---:|
| Totale percepito dal browser | 7.001 ms |
| Backend Apps Script | 1.476 ms |
| Trasporto/conferma | 5.525 ms |
| Scrittura della riga CLIENTI | 4 ms |
| Attesa lock | 106 ms |
| Durata lock | 674 ms |

Il cliente viene quindi scritto correttamente e rapidamente. Il tempo residuo è quasi interamente composto da:

- 2.608 ms di attesa prima del fallback;
- 4.390 ms per la richiesta di conferma `management_mutation_status`.

La risposta diretta dell'iframe non è arrivata nel browser e la 2.14.1 ha usato correttamente il percorso alternativo `status_poll`.

## Nuovo comportamento del trasporto

La 2.14.2:

- avvia la conferma alternativa dopo 700 ms invece di 2.600 ms;
- mantiene in ascolto l'iframe per 30 secondi;
- mette in competizione la risposta iframe tardiva e la conferma di stato;
- permette all'endpoint di stato di attendere fino a 2.500 ms sul server, evitando richieste ripetute inutili;
- conserva l'idempotenza tramite `requestId` e `request_token`;
- registra nuovi indicatori diagnostici.

Possibili valori di `transport_mode`:

- `post_message`: risposta diretta ricevuta prima del fallback;
- `post_message_late`: risposta iframe arrivata dopo l'avvio della conferma alternativa;
- `status_poll_race`: conferma ottenuta dall'endpoint di stato;
- `record_recovery`: recupero finale tramite il token scritto nel record.

## Ripristino comunicazioni amministrative

Nella sezione **Impostazioni**, per gli utenti ADMIN, è disponibile il pannello:

**Comunicazioni → Benvenuto e patch notes**

Consente di configurare:

### Benvenuto al primo accesso

- attivazione/disattivazione;
- occhiello;
- titolo;
- testo completo;
- etichetta del pulsante principale.

### Patch notes

- versione;
- etichetta release;
- titolo;
- introduzione;
- testo conclusivo;
- fino a 12 voci con emoji, titolo, descrizione e visibilità.

Il salvataggio aggiorna:

- `IMPOSTAZIONI`;
- `PATCH_NOTES`;
- `PATCH_ITEMS`.

Una revisione tecnica impedisce che due amministratori sovrascrivano silenziosamente le modifiche reciproche.

## Protezione dei contenuti esistenti

La funzione `upgradeSeemaxV2142`:

- aggiunge le nuove chiavi in `IMPOSTAZIONI` soltanto se mancanti;
- non cancella clienti, pratiche, agenti o prodotti;
- non aggiunge colonne alle tabelle operative;
- non sovrascrive `PATCH_NOTES` o `PATCH_ITEMS` se esistono già contenuti;
- inizializza le patch notes predefinite solo su un database vuoto.

## Installazione

### 1. Backup

Salva una copia del Foglio Google, del precedente `Code.gs` e del repository GitHub.

### 2. Apps Script

1. Apri **Foglio Google → Estensioni → Apps Script**.
2. Sostituisci integralmente `Code.gs`.
3. Verifica il manifest `appsscript.json`.
4. Salva.
5. Esegui manualmente `upgradeSeemaxV2142`.
6. Autorizza lo script, se richiesto.
7. Pubblica una **nuova versione** del deployment Web App esistente.

Messaggio previsto:

```text
SEEMAX v2.14.2 configurato: personalizzazione benvenuto e patch notes ripristinata; conferma salvataggi anticipata attiva.
```

### 3. GitHub

Carica i file del pacchetto GitHub nella radice del repository. Verifica che `assets/js/config.js` contenga l'URL `/exec` corretto.

### 4. Cache/PWA

La cache della release è:

```text
seemax-management-v2-14-2
```

Dopo la pubblicazione:

- esegui `Ctrl + F5` nel browser;
- oppure chiudi completamente la PWA e riaprila;
- verifica che la versione visualizzata sia `2.14.2`.

## Verifica

Dopo un nuovo salvataggio esegui nella console:

```javascript
SeemaxApi.getLastPerformance()
```

Controlla in particolare:

```text
transport_mode
post_wait_ms
iframe_load_ms
late_message_ms
status_poll_ms
status_server_wait_ms
```

Per vedere nuovamente le patch notes su un dispositivo che le ha già lette, assegna nell'editor una nuova stringa al campo **Versione**, per esempio `2.14.2-comunicazioni-1`.
