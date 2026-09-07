# Patch interfaccia — progresso salvataggi 2.15.1

Questa patch mantiene invariato il percorso di salvataggio della versione 2.15.1 e aggiunge esclusivamente un riscontro visivo non bloccante per clienti e pratiche.

## Comportamento

- Il cliente o la pratica appare subito nell'elenco con lo stato di sincronizzazione già previsto.
- Un pannello mostra `Sto caricando il cliente…` oppure `Sto caricando la pratica…`.
- La barra avanza in modo estetico fino a un massimo del 92%, senza effettuare interrogazioni aggiuntive.
- Il 100% viene mostrato soltanto dopo la conferma autorevole del backend.
- In caso di errore il pannello assume lo stato `Da verificare` e il record locale conserva il comportamento di recupero della 2.15.1.
- Più operazioni avviate nello stesso momento vengono raccolte nello stesso pannello.

## Impatto tecnico

Non sono stati modificati:

- `apps-script/Code.gs`;
- struttura o contenuto del Foglio Google;
- numero di letture e scritture;
- polling e trasporto;
- `ScriptLock`, `record_version` e `request_token`;
- logica di magazzino;
- upload dei documenti.

L'avanzamento intermedio è intenzionalmente indicativo. Non dichiara il completamento dell'operazione prima della risposta del database.

## Installazione

Con Apps Script 2.15.1 già pubblicato, caricare su GitHub i file del pacchetto aggiornato. Non è necessario sostituire `Code.gs`, creare un nuovo deployment Apps Script o rieseguire `upgradeSeemaxV2151()`.

Il nome della cache del Service Worker è stato modificato per distribuire subito i nuovi file dell'interfaccia.
