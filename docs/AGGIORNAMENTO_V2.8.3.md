# Seemax Management Suite 2.8.3

Questo aggiornamento inaugura la fase di test operativa del Management Suite e rende temporaneamente disponibili tutti i trofei a ogni utente.

## Novità della fase Beta

- A ogni apertura del gestionale viene mostrato il messaggio **BENVENUTO NELLA FASE DI TEST**.
- L'avviso spiega cosa provare, chiarisce che i dati inseriti servono al collaudo e invita a lasciare feedback da PC e smartphone.
- Tutti i trofei sono temporaneamente disponibili per ogni agente, sia nell'interfaccia sia nella validazione del backend.
- I progressi reali continuano a essere calcolati: lo sblocco beta concede la personalizzazione della bacheca, ma non altera le statistiche raggiunte.
- Gli avvisi iniziali sono coordinati in questo ordine: **Agente del mese**, **Fase Beta**, quindi **benvenuto/tutorial del primo accesso**. Non possono sovrapporsi.

## Come terminare la fase Beta

Non è necessario pubblicare un nuovo codice. Nel foglio `IMPOSTAZIONI` imposta:

- `beta_test_attiva` = `NO` per non mostrare più il messaggio;
- `beta_sblocca_trofei` = `NO` per tornare ai soli trofei realmente conquistati.

Le due righe vengono create automaticamente dalla funzione di upgrade. In seguito il codice grafico temporaneo potrà essere rimosso senza modificare i dati degli utenti.

## Aggiornamento GitHub Pages

Sostituisci i file del repository con quelli presenti nel pacchetto frontend e attendi il completamento della pubblicazione GitHub Pages.

## Aggiornamento Apps Script

1. Sostituisci il contenuto di `Code.gs` con il file aggiornato.
2. Esegui una volta `upgradeSeemaxV283()` e autorizza lo script se richiesto.
3. Crea una **nuova versione** del deployment Web App.
4. Mantieni l'esecuzione come proprietario e l'accesso consentito a chiunque utilizzi il gestionale.
5. Ricarica il sito con `Ctrl+F5`.

La funzione di upgrade conserva tutti i dati presenti e aggiunge esclusivamente le due impostazioni della fase Beta.
