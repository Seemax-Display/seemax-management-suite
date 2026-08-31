# Rapporto prestazioni e concorrenza — v2.15.0

## Obiettivo

Ridurre il costo crescente dei salvataggi quando `CLIENTI`, `PRATICHE`, `PRODOTTI_LED` e `MOVIMENTI_MAGAZZINO` aumentano, mantenendo serializzazione delle scritture, controllo delle versioni e idempotenza.

## Confronto prima/dopo

| Area | Prima | Versione 2.15.0 | Beneficio |
|---|---|---|---|
| Ricerca di un record | Lettura completa del foglio e filtro JavaScript | `TextFinder` sulla sola colonna chiave + lettura di una riga | Meno dati trasferiti e meno oggetti creati |
| Aggiornamento record | Scansione di tutte le righe prima del `setValues` | Localizzazione della chiave e scrittura di una sola riga | Tempo meno sensibile al numero totale di record |
| ID pratica | Scansione di tutte le pratiche a ogni nuova pratica | Contatore per prefisso protetto dal lock | Assegnazione costante e nessun ID duplicato |
| Timeout browser | Cache temporanea + ricerca finale dell'intera entità per token | Cache + esito persistente in `OPERAZIONI` | Recupero affidabile oltre i 10 minuti della cache |
| Giacenza | Merge/scansione completa prodotti per ogni controllo | Lettura diretta dell'ID canonico | Controlli più brevi durante pratiche e movimenti |
| Notifiche dopo stato | Restituzione dell'intero elenco notifiche | Restituzione della sola notifica appena creata | Risposta più piccola e nessuna rilettura superflua |
| Cliente da S.Q.P. | Scansione completa clienti accessibili | Ricerca mirata per ID, P.IVA, email o ragione sociale | Import più rapido con anagrafiche numerose |
| Controllo P.IVA duplicata | Filtro sull'intero foglio clienti | Ricerca della sola colonna P.IVA e lettura dei soli candidati | Validazione meno sensibile alla crescita dell'anagrafica |
| Eliminazione cliente | Scansione completa pratiche collegate | Ricerca mirata di un solo `clientId` | Controllo di protezione più rapido |
| Carico/scarico manuale | Conferma backend più seconda lista completa prodotti | Conferma della riga canonica nel backend e aggiornamento locale puntuale | Un round-trip e una scansione in meno |
| Notifiche lette | Riscrittura di tutte le righe del foglio | Aggiornamento delle sole celle dell'utente | Minore contesa e meno dati scritti |

## Sicurezza multiutente mantenuta

- `LockService.getScriptLock()` serializza le mutazioni condivise.
- `record_version` rileva modifiche concorrenti allo stesso record.
- `request_token` rende idempotente la scrittura applicativa.
- `CONTATORI` assegna sequenze nello stesso lock della creazione.
- `OPERAZIONI` identifica l'esito tramite utente e `requestId`; non è esposto nelle API generiche.
- gli scarichi restano atomici e non portano la giacenza sotto zero.

## Limiti deliberati

Il bootstrap iniziale, dashboard globale, catalogo completo, pagina Agenti e alcune migrazioni leggono ancora insiemi completi perché devono produrre una vista aggregata. La v2.15.0 accelera il percorso di scrittura quotidiano. Una fase successiva potrà introdurre bootstrap incrementale e paginazione server-side, ma richiederà nuovi contratti API e una migrazione frontend più ampia.

Non è corretto promettere un tempo fisso: la latenza assoluta dipende anche da quota Apps Script, dimensione dei documenti, rete e carico dei servizi Google. È invece garantibile dal codice che il salvataggio puntuale non scala più leggendo tutte le righe dell'entità, salvo fallback legacy o funzioni aggregate esplicitamente indicate.

Per misurare il comportamento reale dopo il deployment, l'ADMIN può eseguire `performanceMetricsV2150(30)` dall'editor Apps Script. La funzione legge il registro tecnico e restituisce campioni, media, mediana e massimo per azione, senza alterare clienti, pratiche o giacenze.
