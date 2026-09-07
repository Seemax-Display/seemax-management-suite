# Aggiornamento Seemax Management Suite 2.15.2

La versione 2.15.2 estende il lavoro in background al salvataggio dei preventivi e all'upload manuale dei documenti. Aggiorna inoltre il nome proposto durante l'esportazione PDF.

## Salvataggio preventivi

Nel Quotation Planner integrato il preventivo usa ora il ponte nativo già aperto dal Management Suite:

- il popup bloccante resta visibile soltanto durante verifica del numero e crittografia locale;
- appena inizia il trasferimento compare il pannello non bloccante del gestionale;
- il backend restituisce direttamente l'esito della mutazione;
- non viene più riletto ripetutamente `ARCHIVIO_PREVENTIVI` per cercare la conferma;
- lo stesso `save_request_token` recupera l'esito dopo timeout senza una seconda scrittura;
- un numero usato da un'altra richiesta viene rifiutato e sostituito con il successivo disponibile.

Il salvataggio viene eseguito nello stesso `ScriptLock` globale delle altre mutazioni. `SpreadsheetApp.flush()` consolida la riga prima del rilascio del lock.

Il Planner autonomo conserva il precedente POST con verifica successiva come fallback di compatibilità, perché fuori dal Management Suite non dispone del ponte nativo.

## Upload manuale documenti

Caricando un file dalla sezione Documenti, l'interfaccia resta utilizzabile e mostra queste fasi:

1. preparazione o ottimizzazione locale;
2. trasferimento a Google Drive;
3. verifica del file su Drive;
4. registrazione dei metadati nel Foglio;
5. conferma finale del backend.

La riga compare subito con il badge `SINCRONIZZAZIONE`. Fino alla conferma non può essere aperta, modificata, trascinata o eliminata. In caso di errore resta marcata `DA VERIFICARE`, così i dati inseriti non vengono persi e il file può essere selezionato nuovamente.

Il Base64 è escluso dallo stato visibile e dalla cache locale. Avviare più upload consecutivi non può scambiare cartella o file tra due operazioni.

La barra è soltanto un riscontro grafico: non interroga Google Sheets. Raggiunge il 100% esclusivamente dopo la risposta autorevole del backend.

## Nome del PDF

Il nome proposto segue questo schema:

```text
Prev. n. NUMERO-ANNO - del GG-MM-AAAA - INTESTAZIONE CLIENTE - Ledwall Display P.TIPOLOGIA - BASExALTEZZA - MONOFACCIALE/BIFACCIALE
```

Esempio verificato:

```text
Prev. n. 151-26 - del 07-09-2026 - Azienda Test Srl - Ledwall Display P2.5 - 2,00x1,50 - BIFACCIALE
```

Il suffisso dell'anno viene calcolato automaticamente, quindi nel 2026 è `-26`.

## Installazione

1. Crea una copia di sicurezza del Foglio Google e del precedente `Code.gs`.
2. Sostituisci il backend Apps Script con `apps-script/Code.gs` 2.15.2.
3. Salva ed esegui `upgradeSeemaxV2152()`.
4. Autorizza lo script, se richiesto.
5. Pubblica una nuova versione dello stesso deployment Web App.
6. Verifica di mantenere lo stesso URL `/exec` in `assets/js/config.js`.
7. Pubblica su GitHub tutti i file frontend del pacchetto 2.15.2.
8. Esegui `Ctrl+F5` oppure chiudi e riapri completamente la PWA.

Le versioni attese sono:

```text
Frontend: 2.15.2
Backend: seemax-management-suite-2.15.2
Cache: seemax-management-v2-15-2-background-quotes-documents
```

## Collaudo sul sistema reale

1. Accedi come agente e salva un preventivo: il pannello deve comparire dopo la preparazione e il Planner deve restare utilizzabile.
2. Verifica che in `ARCHIVIO_PREVENTIVI` esista una sola riga con il codice mostrato.
3. Simula un doppio clic o una risposta tardiva: non deve comparire una seconda riga.
4. Esegui due salvataggi da due agenti: non devono condividere lo stesso numero.
5. Carica un PDF dalla sezione Documenti e naviga in un'altra sezione durante l'upload.
6. Torna ai Documenti e verifica URL Drive, nome, pratica e cartella.
7. Esporta un preventivo mono e uno bifacciale e controlla il nome proposto dal browser.

Il test locale non può simulare autorizzazioni, quote, cold start o latenza reale del Foglio privato. Questi aspetti devono essere verificati dopo il deployment.
