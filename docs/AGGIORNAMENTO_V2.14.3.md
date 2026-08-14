# Aggiornamento Seemax Management Suite 2.14.3

## Obiettivo della release

La versione 2.14.3 riorganizza l'area **Impostazioni** riservata agli amministratori e completa il sistema di pubblicazione dei messaggi iniziali.

Le due comunicazioni sono ora completamente indipendenti:

- **Messaggio di benvenuto**;
- **Patch notes**.

Per ciascuna l'amministratore può decidere se mostrarla una sola volta per account oppure a ogni apertura del sistema, salvarne il contenuto senza disturbare chi l'ha già letto, oppure ripubblicarla per renderla nuovamente visibile a tutti.

## Nuova organizzazione dell'area Admin

La schermata **Impostazioni** è divisa in cinque schede:

1. **Generali** — dati aziendali e parametri economici;
2. **Pratiche** — campi obbligatori per Acquisto, Noleggio e Leasing;
3. **Benvenuto** — contenuto e politica del messaggio iniziale;
4. **Patch notes** — contenuto della release, elenco delle novità e politica di pubblicazione;
5. **Sistema** — collegamento al database, versione, diagnostica e stato tecnico.

La navigazione diventa orizzontale e scorrevole sugli smartphone, mentre resta laterale su desktop.

Anteprime incluse nel pacchetto:

- [Editor Benvenuto desktop](screenshots/v2.14.3/admin-welcome-desktop.png)
- [Editor Patch notes desktop](screenshots/v2.14.3/admin-patch-desktop.png)
- [Editor Patch notes mobile](screenshots/v2.14.3/admin-patch-mobile.png)

## Regole di visualizzazione

Ogni editor offre due modalità.

### Solo una volta

Il messaggio viene mostrato una volta per **account utente** e per **revisione di pubblicazione**.

La visualizzazione viene ricordata in due livelli:

- cache locale del browser, per una risposta immediata;
- colonne `welcome_seen_revision` e `patch_seen_revision` della riga dell'agente, per mantenere lo stato anche passando da un dispositivo o browser a un altro.

Se la sincronizzazione verso il Foglio non riesce al primo tentativo, la cache evita di riaprire subito il popup sullo stesso dispositivo e il sistema ritenta la registrazione al refresh successivo.

### Sempre

Il messaggio viene mostrato a ogni apertura o aggiornamento completo del Management Suite. La memoria di visualizzazione non viene considerata.

## Salva e Salva e ripubblica

### Salva

Aggiorna testo, stato e modalità del messaggio, ma conserva la stessa revisione di pubblicazione.

Con la modalità **Solo una volta**, gli utenti che lo hanno già visto non vengono disturbati. Gli utenti che non lo hanno ancora visto riceveranno direttamente il contenuto aggiornato.

### Salva e ripubblica

Aggiorna il contenuto e genera una nuova chiave/revisione esclusivamente per il messaggio interessato.

Esempio:

- ripubblicare il Benvenuto non modifica la revisione delle Patch notes;
- ripubblicare le Patch notes non modifica la revisione del Benvenuto.

Tutti gli account vedranno nuovamente quel messaggio se la modalità è **Solo una volta**.

## Anteprima

Il pulsante **Anteprima** apre il messaggio usando i valori correnti del modulo, anche prima del salvataggio.

L'anteprima amministrativa:

- non incrementa la revisione;
- non registra il messaggio come visto;
- non altera la cache degli utenti;
- non pubblica alcun dato.

## Compatibilità con il Foglio fornito

Il file `Seemax Management Suite.xlsx` conferma che:

- `IMPOSTAZIONI` è già una tabella chiave/valore;
- `PATCH_NOTES` è già una tabella chiave/valore;
- `PATCH_ITEMS` usa le colonne `emoji`, `title`, `text`, `attivo`;
- `AGENTI` contiene già `welcome_seen_revision` e `patch_seen_revision`.

La funzione di upgrade preserva i contenuti esistenti e migra automaticamente le precedenti chiavi:

```text
welcome_message_enabled
welcome_message_frequency
welcome_message_revision
patch_notes_enabled
patch_notes_frequency
patch_notes_revision
```

Le nuove chiavi vengono aggiunte soltanto quando mancanti. Non vengono cambiate le colonne di clienti, pratiche, prodotti o movimenti.

Non è necessario importare nuovamente il file Excel nel Foglio Google.

## Protezione multiutente

Le modifiche amministrative usano:

- lock globale Apps Script;
- revisione `admin_content_revision`;
- controllo del valore atteso inviato dal browser;
- `SpreadsheetApp.flush()` prima del rilascio del lock.

Se due amministratori aprono lo stesso contenuto e il primo salva, il secondo riceve un conflitto controllato e deve ricaricare la versione aggiornata. Non viene eseguita una sovrascrittura silenziosa.

Anche la registrazione della visualizzazione per account è idempotente e protetta dal lock. Una vecchia finestra rimasta aperta non può marcare come vista una ripubblicazione avvenuta nel frattempo.

## Installazione

### 1. Backup

Prima di iniziare conserva:

- una copia del Foglio Google;
- il precedente `Code.gs`;
- un branch o una copia del repository GitHub.

### 2. Aggiornamento Google Apps Script

Apri:

```text
Foglio Google → Estensioni → Apps Script
```

Poi:

1. sostituisci completamente `Code.gs`;
2. salva;
3. seleziona `upgradeSeemaxV2143`;
4. premi **Esegui**;
5. autorizza lo script se richiesto.

Risultato previsto:

```text
SEEMAX v2.14.3 configurato: schede Admin, modalità Una volta/Sempre,
ripubblicazione indipendente e memoria per account attive.
```

### 3. Pubblicazione della Web App

Apri:

```text
Esegui il deployment → Gestisci deployment → Modifica
```

Seleziona **Nuova versione** e pubblica il deployment esistente. In questo modo l'URL `/exec` normalmente resta invariato.

### 4. Aggiornamento GitHub

Carica i file della 2.14.3 nella radice del repository. Controlla che `assets/js/config.js` contenga ancora l'URL Apps Script corretto.

### 5. Aggiornamento della PWA

La nuova cache è:

```text
seemax-management-v2-14-3
```

Dopo GitHub Pages:

- esegui `Ctrl + F5`;
- chiudi e riapri completamente la PWA;
- verifica che la versione mostrata sia `2.14.3`.

## Collaudo consigliato

Accedi con un ADMIN e due account agente distinti.

1. Imposta Benvenuto su **Solo una volta** e usa **Salva e ripubblica**.
2. Apri il sistema con entrambi gli agenti: il popup deve apparire una volta a ciascuno.
3. Aggiorna la pagina: non deve riapparire.
4. Accedi con uno degli stessi account da un altro browser: non deve riapparire dopo che la sincronizzazione account è stata completata.
5. Ripubblica soltanto il Benvenuto: deve ricomparire, mentre le Patch notes devono conservare il proprio stato.
6. Ripeti la procedura invertendo le due comunicazioni.
7. Imposta una comunicazione su **Sempre**: deve apparire a ogni refresh.
8. Usa **Anteprima**: non deve modificare ciò che vede un agente.
9. Apri lo stesso editor con due ADMIN; salva dal primo e poi dal secondo. Il secondo deve ricevere l'avviso di conflitto.

## Limite del Planner anonimo

Il Quotation Planner aperto senza una sessione Management Suite non dispone di un account `AGENTI`. In quel caso la modalità **Solo una volta** può essere ricordata soltanto nel browser locale.

Quando il Planner è usato con un agente autenticato, sincronizza `patch_seen_revision` con il Foglio. Quando è integrato nel Management Suite, non apre una seconda volta lo stesso popup già gestito dalla shell principale.
