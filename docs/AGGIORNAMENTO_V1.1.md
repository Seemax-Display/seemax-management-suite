# Aggiornamento Seemax Management Suite 1.3

Questa versione collega il riepilogo del Seemax Quotation Planner alle pratiche del gestionale e introduce la gestione automatica delle giacenze.

## Prima di iniziare

1. Fai una copia di sicurezza del Foglio Google.
2. Non eliminare né rinominare i fogli già esistenti.
3. Conserva l'URL `/exec` attuale: rimarrà lo stesso dopo il nuovo deployment.

## 1. Aggiornare GitHub

Carica nel repository tutti i file della versione 1.1, mantenendo la stessa struttura delle cartelle. In particolare devono essere presenti:

- `quotation-planner/index.html`;
- `assets/catalog/` con le immagini prodotto;
- `assets/js/app.js`, `seed.js`, `store.js`, `config.js`;
- `assets/css/app.css`;
- `sw.js`.

Attendi uno o due minuti, poi apri la pagina GitHub Pages con un aggiornamento forzato (`Ctrl+F5`).

## 2. Aggiornare Apps Script

1. Apri il Foglio Google collegato al gestionale.
2. Vai su **Estensioni → Apps Script**.
3. Sostituisci tutto il contenuto di `Code.gs` con il nuovo file `apps-script/Code.gs`.
4. Salva.
5. Nel selettore delle funzioni scegli `upgradeSeemaxV11` e premi **Esegui** una sola volta.
6. Accetta le autorizzazioni Google, se richieste.

La funzione aggiorna le colonne senza cancellare clienti, agenti o pratiche, crea il foglio `MOVIMENTI_MAGAZZINO`, consolida gli eventuali duplicati P3.91 e completa le pratiche S.Q.P. già registrate con modello, misura e cabinet da sottrarre.

## 3. Pubblicare la nuova Web App

1. In Apps Script apri **Esegui il deployment → Gestisci deployment**.
2. Modifica il deployment attivo.
3. Alla voce versione scegli **Nuova versione**.
4. Premi **Esegui il deployment**.
5. Verifica che l'URL termini con `/exec` e sia lo stesso presente in `assets/js/config.js`.

## 4. Collaudo consigliato

1. Apri il Quotation Planner e prepara un preventivo di prova.
2. Nel riepilogo premi **Inserisci Pratica**.
3. Scegli **Acquisto**, **Noleggio** o **Leasing**.
4. Apri il gestionale: cliente, intestazione, importi e composizione devono essere già presenti.
5. Prendi nota della giacenza del prodotto.
6. Porta la pratica su **Accettata**: la giacenza deve diminuire una sola volta.
7. Salva nuovamente la pratica senza cambiare stato: la giacenza non deve diminuire ancora.
8. Porta la pratica su **Annullata**: la giacenza deve essere ripristinata.

Per uno schermo unificato controlla entrambe le righe P3.91: il gestionale sottrae separatamente i cabinet 0.50×1.00 e 0.50×0.50.

Nel Quotation Planner ogni soluzione mostra inoltre cabinet disponibili e richiesti. Una giacenza insufficiente genera un avviso, ma non impedisce di terminare o inviare il preventivo.

## Stati pratica e notifiche 1.3

Gli unici stati disponibili sono `Inserita`, `Accettata`, `Sospesa`, `Bocciata` e `Completata`. Lo stato `Bocciata` è disponibile esclusivamente per noleggio e leasing.

- `Inserita`, `Sospesa` e `Bocciata`: i cabinet non risultano impegnati e un eventuale scarico precedente viene ripristinato una sola volta.
- `Accettata` e `Completata`: i cabinet risultano impegnati e vengono sottratti una sola volta.

Quando cambia lo stato, il gestionale crea una notifica per l'agente responsabile. La notifica appare nella campanella in alto e, se nella riga dell'agente è presente un indirizzo email, viene inviata anche tramite email Google senza servizi esterni.

La prima esecuzione di `upgradeSeemaxV11` crea il foglio `NOTIFICHE` e converte automaticamente gli stati precedenti.

## Regole di magazzino

- Lo scarico avviene esclusivamente al passaggio a **Accettata**.
- Ogni pratica può scaricare il magazzino una sola volta.
- **Rifiutata** o **Annullata** ripristinano le quantità precedentemente scaricate.
- Una pratica già scaricata non può cambiare composizione: prima va annullata e poi reinserita.
- Se manca anche una sola tipologia di cabinet, l'accettazione viene bloccata e nessuna giacenza viene modificata.
- Ogni operazione viene registrata in `MOVIMENTI_MAGAZZINO`.

## Dato ancora da completare

Per **P4 0.64×0.64** le immagini ricevute mostrano 4 pezzi e una promozione attiva, ma non mostrano il prezzo. Il prodotto viene quindi creato con giacenza 4 e prezzo da definire. Inserisci il prezzo reale dalla sezione Catalogo come amministratore oppure direttamente nel foglio `PRODOTTI_LED`.
