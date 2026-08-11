# Aggiornamento 2.12.1

Questa versione corregge l’utilizzo del placeholder amministrativo `0000` negli indirizzi dei clienti e nelle pratiche.

## Problema corretto

In alcune colonne Google Fogli poteva reinterpretare `0000` come numero `0`. Il gestionale trattava successivamente quello zero come un campo vuoto e impediva l’importazione dell’indirizzo nella pratica.

La versione 2.12.1:

- forza come testo tutte le colonne che ammettono `0000`;
- riconosce anche gli zeri numerici già presenti come placeholder storici;
- converte automaticamente tali valori nel testo `0000`;
- permette di creare una pratica usando un cliente con indirizzo completamente provvisorio;
- mantiene la deroga riservata agli amministratori.

## Pubblicazione

1. Carica sul repository GitHub tutti i file del pacchetto frontend 2.12.1.
2. Sostituisci il contenuto di Apps Script con `apps-script/Code.gs`.
3. Salva ed esegui una volta `upgradeSeemaxV2121()` dall’editor Apps Script.
4. Autorizza l’esecuzione se richiesto.
5. Crea una nuova versione del deployment Web App mantenendo lo stesso URL `/exec`.
6. Ricarica il sito ignorando la cache oppure chiudilo e riaprilo come PWA.

## Collaudo consigliato

1. Crea o modifica da ADMIN un cliente usando `0000` in tutti i campi dell’indirizzo.
2. Crea una pratica per quel cliente e seleziona `Importa dall’anagrafica cliente`.
3. Verifica che l’indirizzo venga mostrato come provvisorio e che la pratica venga salvata.
4. Controlla nel Foglio `PRATICHE` che i campi `installazione_*` contengano `0000` e non celle vuote.

Nessun cliente o pratica viene eliminato durante la migrazione.
