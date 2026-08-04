# Audit prestazioni — versione 2.3.0

## Esito

L’analisi ha individuato quattro cause principali dei rallentamenti: letture ripetute degli stessi fogli nella medesima richiesta, scritture eseguite una riga alla volta, caricamento anticipato di risorse non necessarie e polling frequente durante gli upload.

| Area | Prima | Versione 2.3.0 |
|---|---|---|
| Apertura Spreadsheet | Ripetuta dalle funzioni interne | Una sola apertura per richiesta |
| Lettura dello stesso foglio | Più `getDataRange()` | Una lettura per foglio e richiesta |
| Salvataggio impostazioni | Una scrittura per chiave | Un’unica scrittura aggregata |
| Notifiche lette | Una scrittura per notifica | Un’unica scrittura aggregata |
| Autenticazione ravvicinata | Lettura AGENTI a ogni chiamata | Cache protetta di 45 secondi |
| Planner HTML | Circa 3,99 MB | Circa 360 KB |
| Primo avvio | Precaricava Planner, località e telefono | Caricamento solo quando richiesto |
| Accesso successivo | Attesa completa del database | Vista locale immediata e aggiornamento in background |
| Upload | Poll dopo 1,2 s, ogni 0,7 s | Poll dopo 4 s, ogni 1,5 s |

La riduzione del solo documento Planner è superiore al 90%. Le immagini sono ora file riutilizzabili e memorizzabili separatamente dal browser.

## Modifiche tecniche

- cache in memoria, limitata alla singola esecuzione Apps Script, per Spreadsheet, fogli e tabelle;
- invalidazione automatica della cache dopo modifiche o eliminazioni;
- aggiornamento locale del dataset senza ricaricare l’intero database dopo ogni azione;
- cache del bootstrap distinta per utente, valida 12 ore, con sincronizzazione in background;
- conservazione dei dati locali visibili se Google Apps Script è temporaneamente lento;
- librerie di validazione cliente caricate soltanto aprendo la scheda cliente;
- service worker alleggerito e cache delle risorse statiche aggiornata in background;
- estrazione delle immagini Base64 dal Planner;
- script di ottimizzazione ripetibile senza alterare un Planner già convertito.

## Limiti esterni

Google Apps Script può avere avvii a freddo e tempi variabili. Anche Google Drive, l’invio email e la verifica VIES sono servizi esterni: la loro latenza non può essere eliminata dal frontend. La versione 2.3.0 riduce le chiamate evitabili e mantiene l’interfaccia utilizzabile durante un aggiornamento lento.

## Controlli eseguiti

- controllo sintattico di tutti i file JavaScript e di `Code.gs`;
- controllo degli spazi e dei conflitti nel diff Git;
- verifica che l’ottimizzazione del Planner sia idempotente;
- verifica della dimensione del Planner e della presenza degli asset estratti;
- verifica della nuova versione della cache PWA.

