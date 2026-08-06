# Seemax Management Suite 2.8.0

## Nuova pagina Profilo

- Il riquadro utente nella barra superiore apre il profilo personale con una transizione integrata.
- Il profilo mostra nome, ruolo, descrizione e riconoscimento Agente del mese.
- La descrizione personale è modificabile fino a 420 caratteri.
- Le preferenze vengono registrate nel foglio `AGENTI`.

## Statistiche personali

Le statistiche considerano esclusivamente le pratiche in stato `Completata` dell'utente:

- modello di display più utilizzato, ponderato per cabinet;
- pratica completata dal valore più alto;
- tipologia di pratica più frequente;
- totale delle provvigioni ottenute.

## Bacheca trofei

- È possibile esporre fino a otto trofei sbloccati.
- I trofei si aggiungono, rimuovono e riordinano tramite trascinamento o frecce.
- La disposizione viene salvata nel database e segue l'utente sui suoi dispositivi.
- Gli amministratori dispongono di tutti i trofei sbloccati per le verifiche grafiche.
- Un agente non può aggiungere alla bacheca un trofeo non ancora sbloccato.

## Aggiornamento database

Il foglio `AGENTI` riceve le colonne:

- `descrizione_profilo`
- `bacheca_trofei_json`

Dopo aver sostituito `Code.gs`, eseguire una volta `upgradeSeemaxV28()` e pubblicare una nuova versione del deployment Apps Script.
