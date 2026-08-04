# Aggiornamento 2.1 — Planner e archivio Documenti

Patch 2.1.1: il trascinamento con mouse è immediato; la pressione di due
secondi resta riservata all’interazione touchscreen.

## Novità

- maggiore margine sui quattro lati delle schermate Grenke e IFIS;
- riposizionamento automatico all’inizio della schermata finanziaria selezionata;
- rimossi dal Planner i pulsanti Login, Logout e Aggiorna dati online;
- dopo la creazione di una pratica dal S.Q.P. l’elenco viene aggiornato e filtrato automaticamente;
- simboli principali sostituiti con emoji coerenti;
- nuove cartelle locali nella sezione Documenti;
- spostamento dei documenti tramite trascinamento oppure pressione di due secondi;
- caricamento di file esterni tramite trascinamento dentro una cartella;
- icone specifiche per PDF, immagini, fogli di calcolo e documenti.

## Comportamento delle cartelle

Le cartelle sono salvate localmente nel browser e sono associate all’utente
collegato. Non spostano fisicamente i file nel Drive e non generano richieste al
database. Per questo motivo l’organizzazione può essere differente su ciascun
dispositivo, mentre i documenti originali restano sempre disponibili.

## Pubblicazione

1. Caricare tutti i file della versione 2.1 nel repository GitHub.
2. Sostituire il contenuto di `apps-script/Code.gs` nel progetto Apps Script.
3. Pubblicare una nuova versione del deployment mantenendo lo stesso URL.
4. Attendere GitHub Pages e ricaricare con `Ctrl + Maiusc + R`.

## Verifica consigliata

1. Aprire Grenke e IFIS e verificare che ogni cambio schermata torni all’inizio.
2. Creare una pratica dal riepilogo S.Q.P. e controllare l’apertura dell’elenco.
3. Creare due cartelle in Documenti.
4. Tenere premuto un documento per due secondi e selezionare una cartella.
5. Trascinare un file esterno dentro una cartella e completarne il caricamento.
