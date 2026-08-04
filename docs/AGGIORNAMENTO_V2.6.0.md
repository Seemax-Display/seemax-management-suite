# Aggiornamento Seemax Management Suite 2.6.0

Questa versione introduce micro-interazioni, feedback aptico e conferme animate.

## Novità

- Feedback aptico leggero su pulsanti, navigazione, selezioni e campi interattivi nei dispositivi compatibili.
- Sequenza aptica distinta per operazioni completate ed errori.
- Risposta visiva alla pressione anche quando la vibrazione non è supportata.
- Transizione leggera tra le sezioni del Management Suite.
- Conferma animata per:
  - creazione di un cliente;
  - creazione e condivisione immediata di un cliente;
  - condivisione successiva di un cliente;
  - creazione di una pratica, anche dal Quotation Planner;
  - variazione dello stato di una pratica;
  - caricamento di un documento;
  - creazione di un agente;
  - inserimento di un prodotto.
- Tutte le animazioni rispettano l'impostazione di accessibilità **Riduci movimento** del dispositivo.

## Compatibilità aptica

La vibrazione viene utilizzata solo quando il browser espone la relativa funzione. Su desktop e sui dispositivi che non la supportano, l'interfaccia mantiene la risposta visiva senza mostrare errori.

## Installazione

1. Sostituisci i file del repository GitHub con quelli di questa versione.
2. In Apps Script sostituisci integralmente `Code.gs`.
3. Esegui una volta `upgradeSeemaxV24`.
4. Crea una nuova distribuzione della Web App.
5. Dopo l'aggiornamento di GitHub Pages, ricarica con `Ctrl+F5`.

Non sono richieste modifiche alla struttura del database.
