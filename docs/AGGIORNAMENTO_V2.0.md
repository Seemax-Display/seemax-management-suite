# Aggiornamento 2.0 — Quotation Planner nativo

La versione 2.0 integra il Seemax Quotation Planner direttamente nel DOM del
Management Suite. Il Planner non viene più caricato tramite iframe e utilizza
la sessione già aperta nel gestionale.

## Novità principali

- sessione unica per Management Suite e S.Q.P.;
- nessun secondo login quando l’utente è già autenticato;
- selezione di un cliente visibile nel gestionale oppure inserimento manuale;
- collegamento diretto del cliente selezionato alla pratica generata;
- stesso endpoint Apps Script e stesso Foglio Google per entrambe le aree;
- calcoli Ledwall, Grenke, IFIS, riepilogo, stampa e inserimento pratica
  conservati durante la migrazione;
- eliminazione dell’iframe dalla rotta `Quotation Planner`.

## Pubblicazione

1. Sostituire nel repository GitHub tutti i file del progetto con quelli della
   versione 2.0, senza eliminare cartelle o dati aggiuntivi già presenti.
2. Copiare il nuovo contenuto di `apps-script/Code.gs` nel progetto Apps Script
   collegato al Foglio Google.
3. In Apps Script scegliere **Distribuisci → Gestisci deployment → Modifica**.
4. Selezionare **Nuova versione** e confermare la distribuzione mantenendo lo
   stesso URL `/exec`.
5. Attendere il completamento di GitHub Pages.
6. Aprire il gestionale e ricaricare forzatamente la pagina con
   `Ctrl + Maiusc + R`.

## Verifica

1. Accedere al Management Suite.
2. Aprire **Quotation Planner** dal menu.
3. Verificare che non venga richiesto un nuovo login.
4. In **Dati**, scegliere un cliente dall’elenco “Origine dati cliente”.
5. Controllare la compilazione automatica dei campi.
6. Preparare un preventivo, aprire il riepilogo e creare una pratica.
7. Verificare nel gestionale e nel Foglio Google che la pratica sia collegata
   allo stesso cliente selezionato.

Il file `quotation-planner/index.html` rimane nel progetto come sorgente del
motore S.Q.P. e riferimento di compatibilità. Non è più una pagina caricata
all’interno di un iframe.
