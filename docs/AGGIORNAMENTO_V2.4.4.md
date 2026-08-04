# Aggiornamento Seemax Management Suite 2.4.4

Questa versione rifinisce la navigazione e rende neutre le informazioni sul collegamento al database.

## Modifiche

- L'icona della sezione **Agenti** usa un solo simbolo, correttamente centrato nel proprio riquadro.
- La barra laterale mostra **Database online** senza riferimenti al servizio tecnico utilizzato.
- Anche la sezione Impostazioni e il controllo del collegamento usano diciture neutre.

## Installazione

1. Sostituisci i file del repository GitHub con quelli di questa versione.
2. In Apps Script sostituisci integralmente `Code.gs`.
3. Esegui una volta `upgradeSeemaxV24`.
4. Crea una nuova distribuzione della Web App.
5. Dopo l'aggiornamento di GitHub Pages, ricarica con `Ctrl+F5`.

Non sono richieste modifiche alla struttura del database.
