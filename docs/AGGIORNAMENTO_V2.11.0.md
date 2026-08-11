# Seemax Management Suite 2.11.0

Questo aggiornamento rende più leggibili gli elenchi commerciali e consente agli amministratori di creare un’anagrafica per conto dell’agente che dovrà gestirla.

## Novità

- La pagina **Clienti** mostra 6 anagrafiche per volta e crea automaticamente le pagine successive.
- La pagina **Pratiche** mostra 6 pratiche per volta e mantiene ricerca, filtri, ordinamento e vista per tipologia.
- Per gli account ADMIN, l’ordinamento iniziale di Clienti e Pratiche è **Data creazione · Decrescente**, quindi dal record più recente al più vecchio.
- I menu permettono comunque di riordinare Clienti per ragione sociale, località, condivisione e agente associato; le Pratiche conservano tutti gli ordinamenti già presenti.
- Durante la creazione di un cliente, l’ADMIN trova il campo obbligatorio **Associa il cliente a** e può scegliere il proprio profilo oppure un agente attivo.
- Il backend convalida l’assegnazione: un agente non può attribuire clienti ad altri utenti e un account sospeso non può essere selezionato.
- I nuovi record memorizzano un timestamp completo in `creatoIl`. Le righe storiche senza timestamp continuano a funzionare tramite il valore compatibile `aggiornatoIl`.

## Aggiornamento GitHub Pages

Sostituisci i file del repository con quelli del pacchetto frontend 2.11.0 e attendi il completamento della pubblicazione GitHub Pages.

## Aggiornamento Apps Script

1. Sostituisci il contenuto di `Code.gs` con il file aggiornato.
2. Salva ed esegui una volta `upgradeSeemaxV2110()`.
3. Autorizza lo script se richiesto.
4. Apri **Distribuisci → Gestisci deployment → Modifica**.
5. Seleziona **Nuova versione** e conferma, mantenendo lo stesso URL `/exec`.
6. Ricarica il sito con `Ctrl+F5`; su smartphone chiudi e riapri la Web App.

La migrazione non elimina né sposta dati e non aggiunge fogli obbligatori. Aggiorna versione e patch notes, mentre i timestamp completi vengono registrati automaticamente sui nuovi record.
