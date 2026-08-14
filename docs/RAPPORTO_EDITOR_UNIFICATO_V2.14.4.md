# Rapporto tecnico — Editor comunicazioni unificato 2.14.4

## Problema corretto

Nella 2.14.3 l'editor del Benvenuto era stato collegato a una nuova comunicazione generica, mentre il popup grafico originario “Benvenuto nella Beta” continuava a essere generato da un percorso separato. Ne risultavano due messaggi iniziali e due gruppi di impostazioni.

La 2.14.4 elimina la duplicazione e collega l'editor direttamente al componente grafico originario.

## Sorgenti canoniche

### Benvenuto Beta

Il contenuto è letto esclusivamente dalle chiavi `welcome_message_*` della tabella `IMPOSTAZIONI`:

```text
welcome_message_enabled
welcome_message_frequency
welcome_message_publication_key
welcome_message_revision
welcome_message_published_at
welcome_message_published_by
welcome_message_modal_title
welcome_message_modal_subtitle
welcome_message_badge
welcome_message_title
welcome_message_body
welcome_message_feature_1_title
welcome_message_feature_1_body
welcome_message_feature_2_title
welcome_message_feature_2_body
welcome_message_warning_title
welcome_message_warning_body
welcome_message_feedback_body
welcome_message_button
```

### Patch notes

Il contenuto è letto esclusivamente da:

```text
PATCH_NOTES
PATCH_ITEMS
```

Le chiavi storiche `patch_notes_*` in `IMPOSTAZIONI` partecipano solo alla migrazione e vengono poi eliminate.

## Runtime frontend

Il frontend usa un solo flusso:

```text
scheduleStartupExperience()
        ↓
showWelcomeMessage()
        ↓
betaWelcomeMessageMarkup()
```

Sono stati rimossi i vecchi riferimenti a `showBetaWelcome`, `pendingBetaWelcome`, `beta_test_attiva` e al popup generico `tutorial-welcome`.

L'anteprima ADMIN invoca lo stesso `betaWelcomeMessageMarkup()` con il flag di anteprima, quindi struttura, testi e comportamento responsive coincidono con il messaggio reale.

## Migrazione e pulizia

`prepareCommunicationsV2144_()` esegue una migrazione conservativa:

- privilegia i valori originari `welcome_message_*` già presenti nel Foglio;
- usa il popup duplicato soltanto come fonte di ripiego per campi assenti;
- scrive i valori canonici;
- conserva `PATCH_NOTES` e `PATCH_ITEMS`;
- elimina le righe obsolete da `IMPOSTAZIONI`;
- invalida cache e snapshot runtime.

La funzione `auditCommunicationsV2144()` restituisce:

- contenuto Benvenuto attivo;
- contenuto Patch notes attivo;
- elenco di eventuali chiavi obsolete ancora presenti.

## Pubblicazione e memoria

Benvenuto e Patch notes possiedono ciascuno:

- stato attivo;
- modalità `ONCE` o `ALWAYS`;
- chiave di pubblicazione;
- revisione di pubblicazione;
- data e autore della pubblicazione.

La modalità `ONCE` usa cache locale e le colonne `AGENTI.welcome_seen_revision` / `AGENTI.patch_seen_revision`. La ripubblicazione incrementa solo la revisione della comunicazione selezionata.

## Concorrenza

Il salvataggio amministrativo è serializzato dal lock Apps Script e protetto da `admin_content_revision`. Prima del rilascio del lock viene eseguito `SpreadsheetApp.flush()`, così un'altra esecuzione rilegge dati consolidati.

## Pulizia del Quotation Planner

Il Planner non contiene più patch notes locali. L'oggetto iniziale è vuoto e disattivato; viene popolato soltanto dai dati ricevuti dal backend. È stato rimosso anche il fallback runtime alla vecchia chiave `versione_patch_notes`.

## Verifiche

Sono stati eseguiti:

- controllo sintattico di frontend, backend e script del Planner;
- test della migrazione da uno scenario 2.14.3 con popup duplicato;
- test di conservazione dei testi originari;
- test di rimozione delle chiavi obsolete;
- test `Solo una volta`, `Sempre`, salvataggio e ripubblicazione;
- test di conflitto tra amministratori;
- test dei tre canali di conferma delle mutazioni;
- rendering locale desktop e smartphone del popup e dell'editor.
