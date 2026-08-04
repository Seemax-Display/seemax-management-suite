# Aggiornamento alla versione 2.4.0

La versione 2.4.0 rende le scritture sicure quando più agenti lavorano contemporaneamente.

## Installazione

1. Pubblica su GitHub tutti i file della versione 2.4.0, conservando i valori aziendali di `assets/js/config.js`.
2. Sostituisci integralmente il contenuto di `Code.gs` nel progetto Google Apps Script.
3. Nell’editor Apps Script seleziona ed esegui **una sola volta** `upgradeSeemaxV24()`.
4. Autorizza lo script, se richiesto. La funzione aggiunge esclusivamente le colonne tecniche mancanti e non elimina i dati.
5. Seleziona **Distribuisci → Gestisci deployment → Modifica → Nuova versione** e conferma.
6. Attendi GitHub Pages e ricarica il gestionale con `Ctrl+F5`.

## Nuove colonne tecniche

Nei fogli interessati vengono aggiunte:

- `record_version`: numero progressivo della versione;
- `request_token`: riconosce un salvataggio ripetuto dopo un timeout;
- `aggiornato_da`: indica chi ha eseguito l’ultima modifica.

Non modificare manualmente queste colonne durante il normale utilizzo.

## Comportamento in caso di conflitto

Se due utenti aprono lo stesso elemento, il primo salvataggio viene registrato. Il secondo non sovrascrive i dati: riceve un avviso, aggiorna la schermata e deve riapplicare la propria modifica sulla versione corrente.

Operazioni su elementi differenti vengono eseguite in una coda molto breve e non si sovrascrivono.

## Test Agente del mese

1. Accedi come ADMIN.
2. Apri la Dashboard e seleziona **Maggiori dettagli** nella scheda Agente del mese.
3. Premi **Prova messaggio iniziale**.

L’anteprima usa l’ultimo mese disponibile nello storico, anche se è quello corrente, e non modifica date, pratiche o classifiche.

Il messaggio automatico reale usa invece esclusivamente il vincitore del mese precedente e viene mostrato una volta per utente nel nuovo mese.

