# Aggiornamento Seemax Management Suite 2.5.0

La versione 2.5 introduce il **Super Tutorial**, una guida interattiva incorporata nel gestionale.

## Funzionamento

- Al primo accesso di ogni utente appare un messaggio di benvenuto.
- **Disattiva tutorial** impedisce l'avvio automatico, lasciando comunque disponibile il comando manuale.
- **Spiegami tutto** avvia il percorso completo.
- Il tutorial cambia pagina automaticamente ed evidenzia l'elemento descritto.
- Sono disponibili avanzamento, **Indietro**, **Avanti**, **Interrompi** e **Concludi**.
- Le frecce sinistra e destra della tastiera consentono di navigare tra i passaggi; `Esc` interrompe la guida.
- Il percorso viene adattato al ruolo: le sezioni Agenti e Impostazioni sono spiegate soltanto agli amministratori.
- Il pulsante **Tutorial** resta sempre disponibile nella barra superiore e diventa un comando compatto su smartphone.
- La scelta viene memorizzata separatamente per ogni utente e dispositivo.

## Installazione

1. Sostituisci i file del repository GitHub con quelli di questa versione.
2. In Apps Script sostituisci integralmente `Code.gs`.
3. Esegui una volta `upgradeSeemaxV24`.
4. Crea una nuova distribuzione della Web App.
5. Dopo l'aggiornamento di GitHub Pages, ricarica con `Ctrl+F5`.

Non sono richieste nuove colonne nel database.
