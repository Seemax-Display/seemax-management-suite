# Seemax Management Suite 2.9.0

Questo aggiornamento protegge le pratiche concluse, rende riconoscibili le importazioni dal Quotation Planner e introduce l’assegnazione delle nuove pratiche da parte degli ADMIN.

## Novità

- Le pratiche in stato **Completata** si aprono in un archivio professionale in sola lettura.
- Il blocco delle modifiche è applicato anche in Apps Script: non può essere aggirato modificando il frontend.
- Le pratiche importate dal Quotation Planner sono evidenziate con il contrassegno **Importata · da completare** fino al passaggio definitivo allo stato Completata.
- In una pratica di acquisto il codice fiscale mancante del cliente è facoltativo; Partita IVA ed e-mail restano richieste.
- Anche per l’acquisto è disponibile **Importa dall’anagrafica cliente** per l’indirizzo di installazione. L’indirizzo viene copiato nella pratica come fotografia dei dati correnti.
- Per gli acquisti **Per Me** la provvigione viene esclusa dai controlli e salvata a zero.
- Durante la creazione, un ADMIN può assegnare la pratica al proprio profilo oppure a un agente attivo. Identificativo, intestazione “Per Me”, notifiche, fatturato e responsabilità seguono l’agente scelto.
- L’assegnazione viene validata nel backend e non può essere cambiata accidentalmente dopo la creazione.

## Aggiornamento GitHub Pages

Sostituisci i file del repository con quelli del pacchetto `seemax-management-suite-v2.9.0-frontend.zip`, quindi attendi il completamento della pubblicazione GitHub Pages.

## Aggiornamento Apps Script

1. Sostituisci il contenuto di `Code.gs` con il file aggiornato.
2. Salva ed esegui una volta `upgradeSeemaxV290()`.
3. Autorizza lo script se richiesto.
4. Crea una **nuova versione** del deployment Web App.
5. Mantieni l’esecuzione come proprietario e l’accesso consentito agli utenti del gestionale.
6. Ricarica il sito con `Ctrl+F5` oppure chiudi e riapri la Web App su smartphone.

La funzione di upgrade non elimina né riscrive pratiche, clienti o documenti esistenti. Aggiunge soltanto gli eventuali campi mancanti, compresa la colonna `bifacciale` usata nell’archivio concluso.
