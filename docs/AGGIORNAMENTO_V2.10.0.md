# Seemax Management Suite 2.10.0

Questo aggiornamento introduce strumenti amministrativi di magazzino, una deroga controllata per i dati non ancora disponibili e una nuova organizzazione locale delle pratiche.

## Novità

- Gli ADMIN possono inserire il valore letterale `0000` nei campi cliente o pratica ancora sconosciuti. Il backend rifiuta la stessa deroga agli agenti.
- Partita IVA, IBAN, telefono, e-mail, SDI/PEC e localizzazione mostrano chiaramente la deroga amministrativa senza considerarli dati realmente verificati.
- Una pratica può essere salvata anche quando la giacenza è zero o insufficiente. La riga viene evidenziata con un contrassegno rosso, ma il preventivo e l'inserimento non vengono bloccati.
- Nel foglio `PRATICHE`, imposta `avviso_giacenza` su `NO` per nascondere l'avviso della singola pratica, oppure su `SI` per riattivarlo.
- L'impegno effettivo del magazzino, al passaggio ad Accettata/Completata, continua a impedire quantità negative.
- Nel Catalogo gli ADMIN trovano **Carico / Scarico**, con prodotto, quantità, causale obbligatoria e registro degli ultimi movimenti.
- Carichi e scarichi vengono eseguiti soltanto in Modalità Standard e sotto blocco Apps Script, garantendo coerenza con più utenti contemporanei.
- Nella sezione Pratiche ogni utente può scegliere **Visione attuale** oppure **Per tipologia**. La preferenza resta sul dispositivo e non genera scritture nel database.

## Aggiornamento GitHub Pages

Sostituisci i file del repository con quelli del pacchetto frontend 2.10.0 e attendi il completamento della pubblicazione GitHub Pages.

## Aggiornamento Apps Script

1. Sostituisci il contenuto di `Code.gs` con il file aggiornato.
2. Salva ed esegui una volta `upgradeSeemaxV2100()`.
3. Autorizza lo script se richiesto.
4. Crea una **nuova versione** del deployment Web App.
5. Mantieni l'esecuzione come proprietario e l'accesso previsto per il gestionale.
6. Ricarica il sito con `Ctrl+F5`; su smartphone chiudi e riapri la Web App.

La migrazione aggiunge le colonne `avviso_giacenza`, `giacenza_insufficiente` e `dettaglio_giacenza` in `PRATICHE`, oltre a `request_token` in `MOVIMENTI_MAGAZZINO`. Quest'ultimo impedisce che un doppio invio dello stesso carico/scarico venga contabilizzato due volte. Gli avvisi delle pratiche esistenti vengono inizializzati senza eliminare dati.
