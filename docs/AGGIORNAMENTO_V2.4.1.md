# Aggiornamento alla versione 2.4.1

Patch dedicata a collegamento Google Fogli, timeout e caricamento documenti.

## Diagnosi effettuata

Il deployment configurato ha risposto correttamente con HTTP 200, ma durante il controllo del 4 agosto 2026 una semplice richiesta ha richiesto circa 18–22 secondi. Il backend pubblico risultava ancora alla versione `seemax-management-suite-2.3.0`.

I precedenti timeout erano più brevi della risposta reale di Apps Script; il browser poteva quindi segnalare un errore nonostante Google stesse ancora elaborando.

## Correzioni

- timeout ordinario portato a 45 secondi;
- login fino a 60 secondi;
- bootstrap fino a 90 secondi;
- mutazioni multiutente fino a 60 secondi lato browser;
- conferma upload fino a 180 secondi;
- il polling non interrompe più una risposta Apps Script dopo soli 12 secondi;
- il POST dell’upload ha 35 secondi per restituire direttamente l’esito prima di attivare il controllo alternativo;
- immagini superiori a 900 KB ridimensionate fino a 2000 px e convertite in JPEG qualità 82%;
- PDF, Word ed Excel restano originali;
- avviso automatico se frontend e Apps Script hanno versioni differenti;
- nuovo controllo `management_health` che verifica il vero Spreadsheet e i fogli obbligatori.

## Installazione

1. Caricare i file 2.4.1 su GitHub.
2. Sostituire `Code.gs` in Apps Script.
3. Eseguire una volta `upgradeSeemaxV24()` se non era già stata eseguita per la versione 2.4.0. È possibile rieseguirla senza eliminare dati.
4. Creare obbligatoriamente una nuova versione del deployment Web App.
5. Ricaricare il sito con `Ctrl+F5`.

## Verifica del collegamento

Accedere come utente, aprire **Impostazioni** e premere **Test database**. Il test controlla:

- autenticazione;
- apertura del vero Google Spreadsheet;
- presenza di AGENTI, CLIENTI, PRATICHE, PRODOTTI_LED, DOCUMENTI e IMPOSTAZIONI;
- versione del backend;
- tempo impiegato dal server.

