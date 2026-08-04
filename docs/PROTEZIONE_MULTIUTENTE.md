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

