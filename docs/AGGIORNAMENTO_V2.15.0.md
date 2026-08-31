# Aggiornamento Seemax Management Suite 2.15.0

Questa versione introduce il percorso rapido per i salvataggi senza rinunciare alle protezioni multiutente già presenti.

## Installazione

1. Sostituisci il contenuto di Apps Script con `apps-script/Code.gs`.
2. Salva il progetto Apps Script.
3. Esegui manualmente una sola volta `upgradeSeemaxV2150()` e autorizza le eventuali nuove operazioni richieste.
4. Verifica che nel Foglio siano comparsi `CONTATORI` e `OPERAZIONI`.
5. Crea una **nuova versione** del deployment Web App, lasciando “Esegui come: Me” e l'accesso previsto dalla tua installazione.
6. Pubblica su GitHub tutti i file del pacchetto, inclusi `assets/js/config.js` e `sw.js`.
7. Ricarica la Web App ignorando la cache oppure chiudila e riaprila. Frontend e backend devono entrambi indicare `2.15.0`.

L'upgrade non elimina né riscrive clienti, pratiche, documenti o movimenti di magazzino. La prima esecuzione legge le pratiche esistenti una sola volta per inizializzare i contatori alle sequenze massime già presenti.

## Cosa cambia tecnicamente

- `findRowObject_` cerca nella sola colonna chiave e legge una singola riga quando non è già disponibile una tabella completa in memoria.
- `upsertObject_` aggiorna o inserisce direttamente la riga interessata; le scansioni complete restano riservate alle viste che ne hanno davvero bisogno.
- `nextPracticeIdentifier_` usa `CONTATORI` sotto `LockService`, con una verifica supplementare della presenza dell'ID in `PRATICHE`.
- le mutazioni concluse vengono registrate in `OPERAZIONI`; l'endpoint di stato consulta prima la cache e poi il registro persistente.
- i controlli di magazzino leggono direttamente la riga canonica in `PRODOTTI_LED`; il merge legacy completo viene usato soltanto se quella riga non esiste.
- il cambio stato pratica restituisce la sola notifica appena creata, riducendo la risposta e le letture non necessarie.

## Controllo dopo il deployment

1. Accedi con un account ADMIN e uno AGENTE in due browser differenti.
2. Crea quasi contemporaneamente una pratica da ciascun account: gli identificativi devono essere distinti.
3. Modifica due clienti differenti: entrambe le modifiche devono restare presenti.
4. Esegui un carico/scarico e verifica la stessa `giacenza_attuale` in `PRODOTTI_LED`.
5. Controlla che `OPERAZIONI` contenga una riga `COMPLETATA` per ciascun salvataggio POST.
6. Verifica dal menu Apps Script “Esecuzioni” i valori `performance.elapsed_ms` restituiti dalle mutazioni, se stai effettuando misurazioni comparative.

## Manutenzione

- `rebuildPracticeCountersV2150()` riallinea i contatori agli ID esistenti senza ridurre le sequenze già prenotate.
- `cleanupOperationsV2150(90)` elimina gli esiti tecnici più vecchi di 90 giorni. È facoltativa e può essere eseguita periodicamente dall'amministratore.
- `performanceMetricsV2150(30)` restituisce conteggio, media, mediana e massimo delle mutazioni concluse negli ultimi 30 giorni, senza modificare alcun dato.

Non modificare manualmente `CONTATORI` mentre gli utenti stanno lavorando. Se vengono aggiunte pratiche direttamente nel Foglio, esegui `rebuildPracticeCountersV2150()` prima di riaprire l'inserimento dal gestionale.

## Correzione Patch Notes

La pubblicazione di una nuova revisione ora viene verificata sulla risposta effettiva del backend e mostrata subito all'amministratore. Il salvataggio è idempotente: un timeout e il relativo retry non possono incrementare due volte la revisione. La coda è stata corretta anche quando il messaggio di benvenuto usa “Mostra ad ogni avvio”: una Patch Notes nuova ha priorità e non può restare nascosta dietro al benvenuto. Chiudere una comunicazione con la `×` prosegue inoltre con l'eventuale comunicazione successiva senza marcarla come letta.
