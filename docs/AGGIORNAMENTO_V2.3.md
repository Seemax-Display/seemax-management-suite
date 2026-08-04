# Aggiornamento alla versione 2.3.0

Questa versione è dedicata alle prestazioni e non richiede di ricreare il database.

## Installazione

1. Sostituisci nel repository GitHub tutti i file del progetto con quelli della versione 2.3.0, conservando i tuoi valori personalizzati in `assets/js/config.js`.
2. Apri il progetto Apps Script collegato al Foglio Google.
3. Sostituisci integralmente `Code.gs` con `apps-script/Code.gs`.
4. Seleziona **Distribuisci → Gestisci deployment → Modifica**.
5. Crea una **Nuova versione** e conferma la distribuzione come Web App.
6. Non cambiare l’URL `/exec`: se hai modificato il deployment esistente resta invariato.
7. Attendi la pubblicazione di GitHub Pages, poi ricarica l’app una volta con `Ctrl+F5`.

Non eseguire nuovamente `setupSeemaxDatabase()` su un database operativo: non è necessario per questo aggiornamento.

## Verifica rapida

1. Accedi e controlla che la dashboard venga visualizzata.
2. Ricarica la pagina: dal secondo accesso i dati locali devono apparire subito, mentre il database si aggiorna in background.
3. Modifica una pratica di prova e verifica il Foglio Google.
4. Carica un documento e attendi la conferma.
5. Apri Quotation Planner e Catalogo per verificare immagini e schede tecniche.

La cache di autenticazione dura al massimo 45 secondi. Dopo avere disattivato un agente o cambiato il suo ruolo, attendi questo intervallo prima del controllo definitivo.

