# Protezione multiutente

## Strategia

Ogni mutazione condivisa segue la sequenza:

1. acquisizione del lock globale Apps Script;
2. eliminazione della cache di lettura della richiesta;
3. nuova lettura del dato dal Foglio Google;
4. verifica della versione ricevuta dal browser;
5. convalida di permessi e regole commerciali;
6. scrittura;
7. incremento della versione;
8. rilascio del lock.

Le email vengono inviate dopo il rilascio del lock, così una risposta lenta di `MailApp` non blocca le scritture degli altri agenti.

## Protezioni

| Caso | Risultato |
|---|---|
| Due nuove pratiche simultanee | Identificativi differenti |
| Due nuovi clienti simultanei | Righe differenti |
| Due modifiche dello stesso record | La seconda viene fermata come conflitto |
| Modifica catalogo durante scarico | Il cambio di giacenza incrementa la versione del prodotto |
| Due cambi stato simultanei | Magazzino elaborato una sola volta per turno |
| Retry dopo timeout | Il `request_token` restituisce il risultato già creato |
| Due salvataggi impostazioni | Revisione generale; la copia precedente viene respinta |
| Eliminazione di una copia vecchia | Eliminazione annullata e dati ricaricati |

Le sole attività restano locali per scelta progettuale e non partecipano alla concorrenza del database.

## Trasporto 2.13

Le scritture principali non usano più JSONP/GET. Il browser invia un `POST` con un `requestId` stabile; se la risposta della Web App non raggiunge GitHub Pages, interroga `management_mutation_status`. Se il primo POST non è confermato, può effettuarne uno solo di ripresa con lo stesso identificativo. Il backend restituisce l'esito memorizzato oppure riconosce il `request_token` già scritto: la ripresa non applica una seconda volta l'operazione.

Questa strategia risolve separatamente due problemi:

- payload di clienti e pratiche troppo grandi per una URL;
- risposta persa o timeout apparente dopo una scrittura già conclusa.

Il lock resta necessario: l'idempotenza impedisce i duplicati della stessa richiesta, mentre il lock e `record_version` proteggono le richieste diverse eseguite contemporaneamente da più utenti.
