# Aggiornamento Seemax Management Suite 2.4.3

Questa versione rimuove il comando amministrativo **PROVA MESSAGGIO** e separa rigorosamente i risultati di Agente del mese per periodo.

## Cosa cambia

- Vincitore, fatturato, numero di pratiche e pratica principale appartengono esclusivamente al mese di riferimento.
- Le classifiche Acquisto, Noleggio, Leasing e Complessivo ignorano le pratiche completate in altri mesi.
- Lo storico resta disponibile, ma ogni riga rappresenta autonomamente il proprio mese.
- Il pulsante **PROVA MESSAGGIO** e la relativa azione sono stati rimossi.

## Installazione

1. Sostituisci i file del repository GitHub con quelli di questa versione.
2. In Apps Script sostituisci integralmente `Code.gs`.
3. Esegui una volta `upgradeSeemaxV24` dall'editor Apps Script.
4. Crea una nuova distribuzione della Web App e verifica che l'URL `/exec` sia quello configurato in `assets/js/config.js`.
5. Attendi la pubblicazione di GitHub Pages e ricarica la pagina con `Ctrl+F5`.

Non sono richieste nuove colonne nel foglio Google.
