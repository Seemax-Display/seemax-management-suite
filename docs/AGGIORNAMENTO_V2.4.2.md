# Aggiornamento alla versione 2.4.2

## Centro upload

Durante il caricamento dei documenti appare in basso a destra un indicatore persistente con:

- percentuale complessiva;
- numero di documenti rimanenti;
- pratica collegata;
- stato conclusivo;
- segnalazione di eventuali errori.

Premendo l’indicatore si apre il dettaglio dei file:

- 🕓 in attesa;
- ⏳ in caricamento;
- ✅ caricato;
- ❌ non riuscito.

Al termine l’indicatore diventa verde. Se un file fallisce diventa rosso e conserva il dettaglio finché non viene chiuso.

## Protezione dalla chiusura

Finché esiste almeno un trasferimento attivo:

- il browser richiede conferma prima di chiudere o ricaricare la pagina;
- il pulsante **Esci** viene bloccato;
- la navigazione interna al gestionale rimane disponibile perché non interrompe l’upload.

I browser moderni mostrano un messaggio di sicurezza standard e non consentono al sito di personalizzarne il testo. L’utente può comunque forzare la chiusura: nessuna applicazione web può impedirlo definitivamente.

## Installazione

1. Pubblicare i file 2.4.2 su GitHub.
2. Sostituire `Code.gs` in Apps Script.
3. Eseguire `upgradeSeemaxV24()`.
4. Pubblicare una nuova versione del deployment Web App.
5. Ricaricare il sito con `Ctrl+F5`.

