# Aggiornamento Seemax Management Suite 2.13.0

Questa versione rende affidabili i salvataggi di clienti e pratiche, collega Catalogo e movimenti alla stessa giacenza di `PRODOTTI_LED` e aggiunge il controllo ADMIN degli avvisi magazzino.

## Prima dell'aggiornamento

1. Crea una copia di sicurezza del Foglio Google.
2. Conserva una copia del `Code.gs` attualmente pubblicato.
3. Non eliminare `NOTIFICHE`: è usato dalla campanella e dalle variazioni di stato.

## Backend Google Apps Script

1. Apri **Estensioni > Apps Script** dal Foglio usato dal Management Suite.
2. Sostituisci `Code.gs` con il file `apps-script/Code.gs` della versione 2.13.0.
3. Salva.
4. Dal menu delle funzioni seleziona `upgradeSeemaxV2130` e premi **Esegui**.
5. Autorizza lo script, se richiesto.
6. Facoltativo: esegui `selfTestInventoryMergeV2130` (non modifica dati), quindi `auditInventorySourceV2130`. Nel registro di esecuzione deve apparire P2.5 con la quantità presente in `PRODOTTI_LED.giacenza_attuale`.
7. Apri **Esegui il deployment > Gestisci deployment > Modifica**.
8. Seleziona **Nuova versione**, quindi pubblica. L'URL `/exec` resta normalmente invariato.

> Eseguire soltanto la funzione di upgrade non aggiorna il deployment pubblico: il passaggio 7 è indispensabile.

`upgradeSeemaxV2130` completa le colonne mancanti e consolida eventuali vecchie righe duplicate dei prodotti conservando i valori compilati nel Foglio. `PRODOTTI_LED` rimane l'unica fonte delle giacenze.

Il self-test restituisce `ok: true` e `merged_stock: 60` nel caso di collaudo incorporato. `auditInventorySourceV2130()` deve invece mostrare la quantità reale del tuo Foglio: è quest'ultimo risultato che va confrontato con il Catalogo.

## Frontend GitHub Pages

Carica l'intero progetto aggiornato nel repository e attendi il completamento di GitHub Pages. La versione frontend è `2.13.0` e la cache PWA è `seemax-management-v2-13-0`.

Dopo la pubblicazione:

1. apri il sito;
2. esegui un refresh manuale;
3. verifica che non compaia l'avviso “Backend non aggiornato”;
4. se il dispositivo conserva una vecchia PWA, chiudi e riapri la webapp dopo il refresh.

## Collaudo consigliato

1. Nel foglio `PRODOTTI_LED`, verifica il valore `giacenza_attuale` di P2.5.
2. Apri il Catalogo: il numero deve essere identico.
3. Da ADMIN registra un carico di 1 cabinet con una causale.
4. Controlla sia la nuova quantità in `PRODOTTI_LED` sia la riga in `MOVIMENTI_MAGAZZINO`.
5. Crea un cliente e una pratica; non devono più comparire errori dovuti alla lunghezza della richiesta.
6. Riprova lo stesso salvataggio durante una rete lenta: il token impedisce duplicati.
7. Apri una pratica Inserita, Sospesa o Completata da ADMIN e prova **Nascondi/Mostra avviso**.
8. Ricarica manualmente la pagina e verifica che una modifica fatta direttamente nel Foglio venga riletta.

## Pulizia facoltativa

La sezione Attività è salvata localmente. Se nel Foglio esiste ancora `ATTIVITA` ed è vuoto, puoi eseguire `removeEmptyLegacyActivitySheetV2130()`. La funzione si interrompe senza cancellare nulla se trova righe storiche.
