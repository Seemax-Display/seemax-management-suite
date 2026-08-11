# Aggiornamento 2.12.0

Questa versione introduce le pratiche multi-Ledwall, rende definitivamente non bloccante la giacenza insufficiente e corregge l'importazione dell'indirizzo cliente.

## Pubblicazione

1. Carica sul repository GitHub tutti i file del pacchetto frontend 2.12.0.
2. Sostituisci il contenuto di Apps Script con `apps-script/Code.gs`.
3. Salva ed esegui una volta `upgradeSeemaxV2120()` dall'editor Apps Script.
4. Crea una nuova versione del deployment Web App e pubblicala mantenendo lo stesso URL `/exec`.
5. Ricarica il sito ignorando la cache oppure chiudilo e riaprilo come PWA.

## Nuove colonne automatiche

L'upgrade aggiunge a `PRATICHE`:

- `ledwall_configurazioni_json`, con una voce per ogni Ledwall e relativo indirizzo;
- `magazzino_in_attesa`, valorizzato a `SI` quando lo stato richiede lo scarico ma le quantità non sono disponibili.

Le pratiche storiche vengono convertite automaticamente in una configurazione compatibile con un singolo Ledwall. Nessun dato precedente viene eliminato.

## Comportamento della giacenza

- Inserita, Sospesa e Bocciata non impegnano cabinet.
- Accettata e Completata scaricano il magazzino soltanto quando tutte le righe richieste sono disponibili.
- Se manca anche una sola quantità, la pratica viene comunque salvata e resta evidenziata in rosso; lo scarico non viene eseguito parzialmente e il magazzino non diventa negativo.
- `avviso_giacenza=NO` nasconde solamente l'avviso visivo della singola pratica e non altera i controlli contabili.

## Collaudo consigliato

1. Crea una pratica con un prodotto a giacenza zero e verifica che venga salvata con il contrassegno rosso.
2. Da ADMIN portala ad Accettata e verifica `magazzino_in_attesa=SI` senza errore.
3. Crea una pratica con due Ledwall, scegliendo per il secondo `PRESSO ALTRO INDIRIZZ.` e compila la sede alternativa.
4. Verifica nel Foglio che `ledwall_configurazioni_json` contenga due oggetti e che `righe_magazzino_json` contenga le quantità aggregate.
