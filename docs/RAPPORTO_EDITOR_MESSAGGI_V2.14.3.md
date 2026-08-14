# Rapporto tecnico — Editor messaggi e pubblicazioni 2.14.3

## Modello funzionale

La release separa il concetto di **contenuto** dal concetto di **pubblicazione**.

Ogni comunicazione possiede:

```text
enabled

display_mode        ONCE oppure ALWAYS
publication_key     identificatore opaco della pubblicazione
publication_revision
published_at
published_by
```

Il contenuto può cambiare senza cambiare pubblicazione. Il comando **Ripubblica** cambia chiave e revisione.

## Messaggio di benvenuto

Il Benvenuto usa `IMPOSTAZIONI`:

```text
welcome_enabled
welcome_display_mode
welcome_publication_key
welcome_message_revision
welcome_published_at
welcome_published_by
welcome_kicker
welcome_title
welcome_message
welcome_primary_button
```

Per compatibilità vengono mantenute sincronizzate anche le precedenti chiavi `welcome_message_*`.

## Patch notes

La configurazione editoriale usa:

```text
PATCH_NOTES
PATCH_ITEMS
```

`PATCH_NOTES` conserva le informazioni chiave/valore della pubblicazione e dell'intestazione. `PATCH_ITEMS` conserva fino a 12 voci, ciascuna attivabile o disattivabile.

Le precedenti chiavi `patch_notes_*` in `IMPOSTAZIONI` restano sincronizzate come compatibilità e sorgente di migrazione.

## Memoria per account

La modalità `ONCE` usa due campi in `AGENTI`:

```text
welcome_seen_revision
patch_seen_revision
```

Il browser confronta:

```text
revisione vista dall'account >= revisione pubblicata
```

Se la condizione è vera, il popup non viene mostrato.

Quando il popup diventa visibile:

1. il browser salva subito la `publication_key` in `localStorage`;
2. aggiorna lo stato in memoria della sessione;
3. invia in background `management_mark_message_seen`;
4. il backend rilegge la pubblicazione corrente;
5. verifica che chiave e revisione inviate non siano diventate obsolete;
6. aggiorna soltanto il campo dell'agente interessato.

La chiamata è idempotente: ripetere la stessa marcatura non incrementa nulla e non crea righe.

## Protezione da popup obsoleto

Scenario:

```text
Agente apre Patch notes revisione 2
ADMIN ripubblica revisione 3
la vecchia finestra dell'agente tenta di registrare revisione 2
```

Il backend confronta la chiave e la revisione richieste con quelle correnti. La richiesta vecchia viene restituita come `stale: true` e non segna la revisione 3 come già vista.

## Stato iniziale e bootstrap

`management_bootstrap` legge la riga corrente dell'agente dalla tabella `AGENTI`, anche se l'autenticazione ha usato una cache breve. Restituisce:

```text
data.messageState
user.welcome_seen_revision
user.patch_seen_revision
```

Questo evita che una cache di autenticazione temporaneamente non aggiornata riapra un messaggio già sincronizzato su un altro dispositivo.

## Salvataggio amministrativo concorrente

Benvenuto e Patch notes condividono `admin_content_revision` soltanto per rilevare che un altro amministratore ha salvato nel frattempo.

Il payload contiene `expected_revision`. Se non coincide con quella corrente, il backend restituisce `CONFLICT_RECORD` e il frontend ricarica i dati.

La revisione editoriale non è la revisione di pubblicazione:

- `admin_content_revision` cresce a ogni salvataggio;
- `welcome_message_revision` cresce soltanto quando si ripubblica il Benvenuto;
- `PATCH_NOTES.publication_revision` cresce soltanto quando si ripubblicano le Patch notes.

## Lock e consolidamento

Tutte le scritture condivise entrano in `withMutationLock_()`.

Prima di rilasciare il lock viene eseguito:

```javascript
SpreadsheetApp.flush();
```

In questo modo una seconda esecuzione rilegge lo stato già consolidato del Foglio.

## Quotation Planner

Il Planner usa la stessa chiave locale del Management Suite:

```text
SEEMAX_MESSAGE_SEEN_V1_PATCH_NOTES_<username>
```

Con una sessione agente sincronizza la revisione nel Foglio. Senza login usa solo la cache locale. In modalità integrata il Planner riceve le patch notes dal contesto nativo ma non apre un secondo popup automatico.

## Compatibilità dei dati

La migrazione:

- non cancella `PATCH_NOTES` o `PATCH_ITEMS` già valorizzati;
- usa le vecchie frequenze `ALWAYS`/`ONCE` quando le nuove chiavi sono assenti;
- usa le revisioni legacy come punto di partenza;
- aggiunge solo le chiavi tecniche mancanti;
- assicura le colonne di revisione in `AGENTI` senza riordinare quelle esistenti.

## Collaudi eseguiti

Sono stati verificati localmente:

- sintassi backend, frontend e Planner;
- assenza di funzioni top-level duplicate;
- cinque schede Admin e layout responsive;
- salvataggi parziali separati;
- `Salva` senza cambio della chiave;
- ripubblicazione indipendente;
- modalità `ONCE` e `ALWAYS`;
- memoria separata tra utenti;
- marcatura durevole in `AGENTI`;
- richiesta obsoleta ignorata;
- idempotenza della marcatura;
- conflitto tra amministratori;
- `SpreadsheetApp.flush()` prima del rilascio del lock;
- compatibilità con la struttura del file Excel fornito;
- invarianti del trasporto introdotte nelle versioni 2.14.1/2.14.2.

Il test definitivo contro il Foglio aziendale richiede il deployment della Web App e il collaudo con due account reali.
