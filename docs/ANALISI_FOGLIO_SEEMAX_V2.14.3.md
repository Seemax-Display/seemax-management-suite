# Analisi del Foglio Seemax per la release 2.14.3

Il file Excel fornito è stato usato come fotografia della struttura del Foglio Google operativo. La release non richiede di importare o sostituire questo file: la funzione di upgrade lavora direttamente sul Foglio già collegato ad Apps Script.

## Riepilogo delle schede

| Scheda | Colonne con intestazione | Righe dati non vuote | Stato |
|---|---:|---:|---|
| `AGENTI` | 23 | 26 | visibile |
| `NOTIFICHE` | 13 | 1 | visibile |
| `MOVIMENTI_MAGAZZINO` | 15 | 5 | visibile |
| `CLIENTI` | 41 | 37 | visibile |
| `PRATICHE` | 67 | 38 | visibile |
| `DOCUMENTI` | 19 | 1 | visibile |
| `ATTIVITA` | 12 | 0 | visibile |
| `LOG` | 7 | 47 | visibile |
| `ARCHIVIO_PREVENTIVI` | 87 | 0 | visibile |
| `IMPOSTAZIONI` | 3 | 95 | visibile |
| `PRODOTTI_LED` | 42 | 7 | visibile |
| `PATCH_ITEMS` | 4 | 3 | visibile |
| `PATCH_NOTES` | 2 | 5 | visibile |
| `ISTRUZIONI` | 1 | 11 | visibile |

## Memoria dei messaggi per account

La scheda `AGENTI` contiene già le colonne tecniche necessarie:

- `welcome_seen_revision`: presente nella colonna 22.
- `patch_seen_revision`: presente nella colonna 23.

La 2.14.3 usa queste colonne per ricordare la visualizzazione in modalità **Solo una volta** sul profilo dell’agente. La cache del browser resta un’accelerazione, mentre il Foglio mantiene lo stato passando da PC a smartphone o cambiando browser.

## Configurazioni rilevate e migrazione

| Chiave | Valore nel file fornito | Gestione 2.14.3 |
|---|---|---|
| `welcome_message_enabled` | `SI` | preservata; non viene sovrascritta se già valorizzata |
| `welcome_message_frequency` | `ALWAYS` | usata come sorgente legacy se la nuova modalità non è ancora presente |
| `welcome_message_revision` | `2` | preservata come revisione iniziale e incrementata solo con Ripubblica |
| `welcome_enabled` | `SI` | preservata; non viene sovrascritta se già valorizzata |
| `welcome_display_mode` | `—` | preservata; non viene sovrascritta se già valorizzata |
| `welcome_publication_key` | `—` | preservata; non viene sovrascritta se già valorizzata |
| `patch_notes_enabled` | `SI` | preservata; non viene sovrascritta se già valorizzata |
| `patch_notes_frequency` | `ONCE` | usata come sorgente legacy se la nuova modalità non è ancora presente |
| `patch_notes_revision` | `2` | preservata come revisione iniziale e incrementata solo con Ripubblica |
| `admin_content_revision` | `1` | usata per rilevare modifiche concorrenti di due amministratori |

## Contenuti editoriali esistenti

- `PATCH_NOTES` contiene 5 chiavi valorizzate.
- `PATCH_ITEMS` contiene 3 voci non vuote.
- I testi esistenti hanno precedenza sui contenuti predefiniti della release.
- La funzione di upgrade aggiunge solo i campi tecnici mancanti e non cancella le patch notes personalizzate.

## Impatto della release sul database

- Nessuna nuova colonna viene aggiunta a `CLIENTI`, `PRATICHE`, `PRODOTTI_LED` o alle altre tabelle operative.
- Se le due colonne di revisione non esistessero in un’installazione differente, `upgradeSeemaxV2143` le aggiungerebbe in modo compatibile a `AGENTI`. Nel file fornito sono già presenti.
- Le nuove opzioni di pubblicazione sono salvate come righe chiave/valore in `IMPOSTAZIONI` e `PATCH_NOTES`.
- `PATCH_ITEMS` conserva la struttura attuale `emoji`, `title`, `text`, `attivo`.
- Non è necessario caricare nuovamente l’Excel: basta aggiornare `Code.gs`, eseguire `upgradeSeemaxV2143` e pubblicare una nuova versione della Web App.

## Comportamento iniziale con i valori rilevati

- Benvenuto: modalità iniziale `ALWAYS`, revisione `2`.
- Patch notes: modalità iniziale `ONCE`, revisione `2`.
- Un normale **Salva** conserva revisione e chiave di pubblicazione.
- **Salva e ripubblica** incrementa soltanto la revisione del messaggio interessato e lo rende nuovamente visibile a tutti gli account.
