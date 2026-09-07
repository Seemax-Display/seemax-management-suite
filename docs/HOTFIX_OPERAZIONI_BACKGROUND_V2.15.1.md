# Patch operazioni in background e numero preventivo — 2.15.1

Questa revisione estende il riscontro non bloccante della 2.15.1 alle eliminazioni e ai movimenti manuali di magazzino, riduce una lettura ridondante di `PRODOTTI_LED` e corregge il recupero del prossimo numero nel Quotation Planner.

## Operazioni mostrate nel pannello

- creazione e modifica di clienti e pratiche;
- eliminazione di clienti;
- eliminazione di pratiche;
- eliminazione di documenti caricati;
- carico manuale di merce;
- scarico manuale di merce.

La finestra modale del magazzino si chiude dopo la validazione locale e il movimento prosegue in background. Il resto del gestionale rimane utilizzabile. Più operazioni contemporanee vengono raccolte nello stesso pannello.

La barra è indicativa fino al 92%. Raggiunge il 100% esclusivamente quando il backend restituisce l'esito autorevole. Un cliente, una pratica o un documento viene rimosso dalla vista soltanto dopo tale conferma. In caso di errore resta invariato e il pannello mostra `Da verificare`. Anche la giacenza locale resta invariata se il movimento viene rifiutato.

## Magazzino più rapido

Il backend 2.15.1 verifica già `PRODOTTI_LED.giacenza_attuale` dentro `ScriptLock` e restituisce la riga prodotto riletta dal Foglio. Il frontend ora usa direttamente questa risposta e non esegue più una successiva lettura completa del catalogo.

Restano invariati:

- controllo ADMIN;
- `request_token` idempotente;
- ricerca del movimento duplicato;
- rilettura della giacenza dentro il lock;
- divieto di giacenza negativa;
- registrazione in `MOVIMENTI_MAGAZZINO`.

## Numero preventivo del Quotation Planner

Nel Planner integrato il prossimo numero passa ora attraverso il collegamento nativo della Management Suite. Il JSONP rimane come fallback per l'esecuzione autonoma e usa un timeout più ampio.

Apps Script conserva due contatori distinti nelle Proprietà script:

- `SEEMAX_QUOTE_COUNTER_V2151_ADMIN`;
- `SEEMAX_QUOTE_COUNTER_V2151_AGENTE`.

La migrazione li inizializza una sola volta leggendo dall'archivio soltanto le colonne necessarie. In seguito `nextquote` legge una proprietà, mentre ogni preventivo salvato aggiorna il relativo contatore dentro il lock. Il controllo di collisione al salvataggio resta attivo, quindi due agenti non possono registrare lo stesso identificativo.

## Installazione

Questa patch include una modifica backend per il contatore preventivi:

1. crea una copia di sicurezza del Foglio e del precedente `Code.gs`;
2. sostituisci `apps-script/Code.gs`;
3. esegui `upgradeSeemaxV2151()` dall'editor Apps Script;
4. pubblica una nuova versione della Web App mantenendo lo stesso URL `/exec`;
5. pubblica su GitHub tutti i file del pacchetto;
6. attendi GitHub Pages ed esegui `Ctrl+F5`, oppure chiudi e riapri la PWA.

L'esecuzione di `upgradeSeemaxV2151()` non azzera la numerazione: ricostruisce i contatori partendo dai preventivi già presenti.

