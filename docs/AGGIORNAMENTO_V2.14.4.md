# Aggiornamento Seemax Management Suite 2.14.4

## Obiettivo della release

La versione 2.14.4 corregge la gestione delle comunicazioni amministrative introdotta nelle release precedenti.

Il messaggio editabile non è più un secondo popup generico: l'editor modifica direttamente la finestra grafica originaria **“Benvenuto nella Beta”**, composta da testata, riquadro principale, schede informative, avviso, richiesta di feedback e pulsante finale.

Le Patch notes continuano a essere gestite separatamente, con una sola sorgente dati nel Foglio Google.

## Un solo Benvenuto Beta

Il flusso runtime è ora unico:

```text
Impostazioni ADMIN
        ↓
chiavi welcome_message_* in IMPOSTAZIONI
        ↓
showWelcomeMessage()
        ↓
popup grafico “Benvenuto nella Beta”
```

Sono stati rimossi dal percorso operativo il secondo messaggio di benvenuto e i relativi flag duplicati. Il flag `beta_sblocca_trofei` resta valido perché controlla i trofei della fase di test e non la comunicazione iniziale.

L'editor **Benvenuto Beta** consente di modificare:

- titolo e sottotitolo della finestra;
- etichetta Beta;
- titolo e testo del riquadro principale;
- due schede informative;
- titolo e testo dell'avviso;
- testo della richiesta di feedback;
- testo del pulsante finale;
- stato attivo/disattivo;
- modalità **Solo una volta** o **Sempre**.

L'anteprima usa lo stesso componente grafico mostrato agli agenti.

## Patch notes centralizzate

Le sole sorgenti ufficiali sono:

```text
PATCH_NOTES
PATCH_ITEMS
```

Il frontend principale e il Quotation Planner ricevono il contenuto dal backend. Non esistono più note di versione hardcoded che possano divergere dall'editor ADMIN o riapparire dopo un aggiornamento del codice.

## Modalità di visualizzazione

### Solo una volta

La comunicazione viene mostrata una volta per account e per revisione di pubblicazione.

La visualizzazione è registrata:

- nella cache locale, per evitare riaperture immediate sullo stesso dispositivo;
- nella riga `AGENTI`, tramite `welcome_seen_revision` o `patch_seen_revision`, per mantenere lo stato anche cambiando browser o dispositivo.

### Sempre

La comunicazione viene mostrata a ogni apertura o aggiornamento completo del Management Suite.

### Salva

Aggiorna il contenuto senza cambiare la revisione. Gli utenti che hanno già letto una comunicazione impostata su **Solo una volta** non la rivedono.

### Salva e ripubblica

Aggiorna il contenuto e genera una nuova revisione soltanto per la comunicazione interessata. Benvenuto e Patch notes restano indipendenti.

## Migrazione del Foglio Google

La funzione `upgradeSeemaxV2144()`:

1. conserva i valori originari `welcome_message_title`, `welcome_message_body` e `welcome_message_button`;
2. inizializza i campi grafici mancanti del Benvenuto Beta;
3. conserva modalità, revisione e stato di pubblicazione;
4. conserva integralmente `PATCH_NOTES` e `PATCH_ITEMS`;
5. usa le chiavi duplicate della 2.14.3 solo come ripiego quando un valore originario è assente;
6. elimina da `IMPOSTAZIONI` le righe obsolete dopo averne migrato gli eventuali valori;
7. mantiene le colonne di memoria in `AGENTI` e le aggiunge soltanto se mancanti;
8. aggiorna `versione_config` alla 2.14.4.

Tra le chiavi obsolete rimosse rientrano:

```text
beta_test_attiva
welcome_enabled
welcome_display_mode
welcome_publication_key
welcome_published_at
welcome_published_by
welcome_kicker
welcome_title
welcome_message
welcome_primary_button
patch_notes_enabled
patch_notes_frequency
patch_notes_revision
patch_notes_label
patch_notes_title
patch_notes_intro
patch_notes_items
patch_notes_footer
versione_patch_notes
```

Le chiavi canoniche del Benvenuto restano sotto il prefisso `welcome_message_*`. Le Patch notes restano nei rispettivi fogli dedicati.

La migrazione non elimina clienti, pratiche, agenti, prodotti, documenti o movimenti. Non è necessario importare nuovamente il file Excel.

## Area Impostazioni ADMIN

La schermata resta organizzata nelle schede:

1. Generali;
2. Pratiche;
3. Benvenuto Beta;
4. Patch notes;
5. Sistema.

Anteprime incluse nel pacchetto:

- [Benvenuto Beta mostrato agli utenti](screenshots/v2.14.4/beta-welcome-desktop.png)
- [Editor Benvenuto Beta desktop](screenshots/v2.14.4/admin-welcome-desktop.png)
- [Anteprima desktop](screenshots/v2.14.4/admin-welcome-preview-desktop.png)
- [Editor Benvenuto Beta smartphone](screenshots/v2.14.4/admin-welcome-mobile.png)
- [Anteprima smartphone](screenshots/v2.14.4/admin-welcome-preview-mobile.png)

## Protezione multiutente

Le modifiche amministrative usano:

- lock globale Apps Script;
- revisione `admin_content_revision`;
- controllo della revisione attesa dal browser;
- `SpreadsheetApp.flush()` prima del rilascio del lock;
- registrazione idempotente della visualizzazione per account.

Due amministratori non possono sovrascrivere silenziosamente la stessa revisione: il secondo salvataggio riceve un conflitto e richiede il ricaricamento dei contenuti.

## Installazione

### 1. Backup

Conserva una copia del Foglio Google, del precedente `Code.gs` e del repository GitHub.

### 2. Aggiorna Google Apps Script

Apri:

```text
Foglio Google → Estensioni → Apps Script
```

Poi:

1. sostituisci completamente `Code.gs`;
2. salva;
3. seleziona `upgradeSeemaxV2144`;
4. premi **Esegui**;
5. autorizza lo script, se richiesto.

Risultato previsto:

```text
SEEMAX v2.14.4 configurato: unico Benvenuto Beta editabile,
patch notes centralizzate e chiavi obsolete rimosse.
```

Puoi eseguire facoltativamente `auditCommunicationsV2144()`: il campo `obsolete_settings_still_present` deve essere vuoto.

### 3. Pubblica una nuova versione della Web App

Apri:

```text
Esegui il deployment → Gestisci deployment → Modifica
```

Seleziona **Nuova versione** e aggiorna il deployment esistente. L'URL `/exec` normalmente resta invariato.

### 4. Aggiorna GitHub

Carica il contenuto del pacchetto GitHub nella radice del repository. Verifica che `assets/js/config.js` contenga ancora l'URL Apps Script corretto.

### 5. Aggiorna la PWA

La cache è:

```text
seemax-management-v2-14-4
```

Dopo la pubblicazione esegui `Ctrl + F5`, oppure chiudi completamente la PWA e riaprila.

## Collaudo consigliato

1. Accedi come ADMIN e apri **Impostazioni → Benvenuto Beta**.
2. Cambia un testo e usa **Anteprima**: deve apparire il popup grafico originario.
3. Salva senza ripubblicare: chi lo ha già visto non deve rivederlo in modalità **Solo una volta**.
4. Usa **Salva e ripubblica**: tutti gli account devono riceverlo nuovamente.
5. Ripeti la prova con le Patch notes e verifica che le revisioni restino indipendenti.
6. Imposta una comunicazione su **Sempre** e aggiorna la pagina.
7. Controlla che non compaia alcun secondo messaggio generico di benvenuto.
8. Esegui `auditCommunicationsV2144()` e verifica che non restino chiavi obsolete.
