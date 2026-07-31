# Aggiornamento Seemax Management Suite 1.9.1

Questa versione collega il riepilogo del Seemax Quotation Planner alle pratiche del gestionale e introduce la gestione automatica delle giacenze.

## Prima di iniziare

1. Fai una copia di sicurezza del Foglio Google.
2. Non eliminare né rinominare i fogli già esistenti.
3. Conserva l'URL `/exec` attuale: rimarrà lo stesso dopo il nuovo deployment.

## 1. Aggiornare GitHub

Carica nel repository tutti i file della versione 1.9.1, mantenendo la stessa struttura delle cartelle. In particolare devono essere presenti:

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
8. Porta la pratica su **Sospesa**: la giacenza deve essere ripristinata.

Per uno schermo unificato controlla entrambe le righe P3.91: il gestionale sottrae separatamente i cabinet 0.50×1.00 e 0.50×0.50.

Nel Quotation Planner ogni soluzione mostra inoltre cabinet disponibili e richiesti. Una giacenza insufficiente genera un avviso, ma non impedisce di terminare o inviare il preventivo.

## Stati pratica e notifiche 1.3

Gli unici stati disponibili sono `Inserita`, `Accettata`, `Sospesa`, `Bocciata` e `Completata`. Lo stato `Bocciata` è disponibile esclusivamente per noleggio e leasing.

- `Inserita`, `Sospesa` e `Bocciata`: i cabinet non risultano impegnati e un eventuale scarico precedente viene ripristinato una sola volta.
- `Accettata` e `Completata`: i cabinet risultano impegnati e vengono sottratti una sola volta.

Quando cambia lo stato, il gestionale crea una notifica per l'agente responsabile. La notifica appare nella campanella in alto e, se nella riga dell'agente è presente un indirizzo email, viene inviata anche tramite email Google senza servizi esterni.

La prima esecuzione di `upgradeSeemaxV11` crea il foglio `NOTIFICHE` e converte automaticamente gli stati precedenti.

## Interfaccia e prestazioni 1.4

- Testi ingranditi e righe delle pratiche evidenziate completamente in base allo stato.
- Modulo pratica semplificato: cliente bloccato nelle pratiche esistenti; rimossi oggetto, scadenza e prossimo passo; righe tecniche di magazzino nascoste.
- Salvataggi rapidi: dopo un'operazione viene aggiornata solo la riga interessata, evitando di ricaricare tutte le tabelle Google.
- Le pratiche completate e i clienti collegati a pratiche completate possono essere eliminati soltanto direttamente dal Foglio Google.
- Catalogo senza il comando “Usa nel Planner”; modifica prodotto divisa in Dettagli, Costi, Giacenze, Scheda tecnica e Altro.
- Quotation Planner incorporato senza apertura in una pagina separata e con accesso ereditato automaticamente dalla sessione del gestionale.

## Novità 1.5

- testi e schede tecniche ulteriormente ingranditi;
- Dashboard con fatturato personale, fatturato Seemax e obiettivo modificabile;
- solo l’amministratore può cambiare lo stato delle pratiche;
- Attività salvate esclusivamente sul dispositivo, senza accessi al database;
- Modalità Rapida con coda locale, indicatore permanente e comando **SALVA TUTTO**;
- barra di avanzamento durante la sincronizzazione e nome dell’elemento trasferito;
- Quotation Planner utilizzabile anche durante la Modalità Rapida; vengono sospesi soltanto salvataggio e caricamento dei preventivi dall’archivio online;
- Documenti caricati come file e archiviati automaticamente in Google Drive;
- identificativo pratica formato da iniziali utente e progressivo a quattro cifre;
- configuratore display con misura guidata/libera, bifacciale, cabinet necessari e controllo giacenza;
- Grenke assegnata automaticamente al Noleggio e IFIS al Leasing.

Il caricamento o la sostituzione dei file non è disponibile in Modalità Rapida. In Modalità Standard il limite per singolo file è 8 MB.

L’obiettivo fatturato iniziale è impostato a **500.000 €**. Durante l’aggiornamento, l’eventuale valore predefinito precedente di 100.000 € viene sostituito automaticamente; valori personalizzati differenti vengono conservati.

### Correzione misure pratica 1.5.2

- rimosso il campo “Inserimento misura”;
- larghezza e altezza possono essere digitate liberamente;
- le frecce native avanzano secondo la misura reale del cabinet: 0,50, 0,57, 0,64, 0,96 o 1,00 m;
- eliminata la base errata di 0,01 che generava valori come 0,51 e 1,01;
- una misura non multipla mostra la configurazione reale necessaria senza impedire la creazione della pratica;
- la finanziaria iniziale viene riallineata automaticamente al tipo di pratica.

## Novità 1.6

- il caricamento di documenti e media non dipende più soltanto dal messaggio di ritorno dell'iframe di Apps Script: il gestionale interroga anche uno stato di conferma separato, evitando caricamenti infiniti e falsi errori di comunicazione;
- Modalità Lite, Salva bozza e Carica bozza sono state rimosse completamente dal Quotation Planner su desktop e mobile;
- il comando Modalità Rapida è sempre visibile su mobile nella barra inferiore ed è disponibile anche nel menu laterale;
- nella creazione di una pratica il P3.91 compare come un solo prodotto;
- il P3.91 viene composto automaticamente usando cabinet 50×100 e 50×50 cm;
- il campo `righe_magazzino_json` conserva le due righe reali da scaricare, mentre le nuove colonne `p391_unificato`, `p391_cabinet_50100` e `p391_cabinet_5050` rendono la composizione leggibile anche direttamente dal Foglio Google.

Esempio: un P3.91 da **1,00×1,50 m** richiede 2 cabinet 50×100 e 2 cabinet 50×50. In caso bifacciale le due quantità vengono raddoppiate.

## Novità 1.7 – Anagrafica cliente

- controllo formale della Partita IVA italiana e rilevamento dei duplicati;
- verifica facoltativa automatica VIES, distinta dalla verifica di esistenza italiana;
- pulsante diretto al servizio ufficiale Agenzia delle Entrate e registrazione manuale dell’esito;
- verifica IBAN tramite lunghezza nazionale e algoritmo MOD-97;
- telefono internazionale con bandiera, Paese, prefisso e controllo del numero;
- menu dipendenti Regione → Provincia → Comune/Città → CAP;
- archivio territoriale locale derivato dai dati ISTAT, utilizzabile senza interrogazioni continue al database;
- colonne aggiunte automaticamente al foglio `CLIENTI` tramite `upgradeSeemaxV11`.

La verifica VIES negativa non blocca la creazione del cliente: indica soltanto che la P.IVA non risulta abilitata alle operazioni intracomunitarie. Il controllo formale della P.IVA, l’IBAN e il telefono non valido sono invece bloccanti quando i rispettivi campi vengono compilati.

Durante l’aggiornamento, gli eventuali codici fiscali alfanumerici precedentemente conservati nella vecchia colonna “P.IVA / C.F.” vengono spostati automaticamente nella nuova colonna `codice_fiscale`, senza perdita del dato.

## Novità 1.8 – Condivisione clienti e archivio pratiche

- in creazione e modifica cliente è disponibile la scelta **Condividi cliente**, inizialmente disattivata;
- un cliente privato è visibile soltanto al creatore e agli amministratori;
- un cliente condiviso è consultabile e selezionabile da tutti gli utenti attivi, mostra il nome del creatore e resta modificabile soltanto dal creatore o da un amministratore;
- nessun cliente collegato a una pratica può essere eliminato dal gestionale;
- gli agenti non vedono il campo Stato e il server imposta automaticamente le nuove pratiche su `Inserita`;
- soltanto gli amministratori possono variare lo stato;
- le email di esito usano l'oggetto `ESITO PRATICA [ID] - Seemax Management Suite`;
- `Accettata` e `Completata` producono un esito positivo, `Bocciata` un esito negativo e archivia automaticamente la pratica; `Sospesa` produce una comunicazione temporanea;
- la sezione Pratiche permette ricerca per ID e cliente, oppure anche per agente agli amministratori;
- sono disponibili ordinamento per stato, ID, cliente, tipologia, finanziaria, valore e, per gli amministratori, agente;
- vengono mostrate al massimo 10 pratiche per pagina.

La funzione `upgradeSeemaxV11` aggiunge a `CLIENTI` i campi `condiviso`, `creato_da_username`, `creato_da_nome` e `condiviso_il`. Aggiunge inoltre a `PRATICHE` i campi `archiviata` e `archiviata_il`, senza cancellare i dati esistenti.

## Novità 1.9 – Pratiche guidate

- il comando **Nuova pratica** apre tre card: Acquisto, Noleggio e Leasing;
- Acquisto distingue ordini **Per Me** e **Per Cliente**;
- Noleggio usa Grenke, rate 24/30/36/48/60 e periodicità mensile, bimestrale o trimestrale;
- Leasing usa IFIS, rate 32/42/48/54/60/66/72 e periodicità mensile, bimestrale o trimestrale;
- ogni pratica registra indirizzo di installazione, modalità di gestione del Ledwall ed eventuali credenziali Cloud;
- scegliendo `In Cloud` appaiono username, password e il collegamento alla registrazione Led Cloud;
- i documenti vengono caricati nel Drive Seemax e collegati automaticamente alla pratica;
- il Quotation Planner trasferisce valore pratica, provvigione, durata e periodicità quando disponibili;
- gli admin possono rendere obbligatorio o facoltativo ogni nuovo campo dalla sezione Impostazioni;
- le stesse regole possono essere modificate nel foglio `IMPOSTAZIONI`, impostando il valore della relativa chiave `req_...` su `SI` oppure `NO`.

Le nuove colonne vengono aggiunte a `PRATICHE` e `DOCUMENTI` eseguendo nuovamente `upgradeSeemaxV11`; nessuna riga esistente viene cancellata.

### Ottimizzazione 1.9.1

- i file vengono letti localmente mentre la pratica viene registrata;
- fino a tre allegati vengono trasferiti contemporaneamente;
- l’avanzamento mostra quanti documenti sono stati completati;
- il riepilogo allegati usa un aggiornamento leggero e non riesegue l’intero flusso della pratica;
- l’ID della cartella Drive viene memorizzato per evitare una nuova ricerca a ogni file;
- le scritture parallele nel foglio `DOCUMENTI` sono protette per impedire sovrascritture;
- se un singolo allegato fallisce, la pratica e gli altri documenti restano salvati e viene indicato esattamente quale file ricaricare.

## Regole di magazzino

- Lo scarico avviene al passaggio a **Accettata** o **Completata**, senza ripetersi se era già stato applicato.
- Ogni pratica può scaricare il magazzino una sola volta.
- **Sospesa** o **Bocciata** ripristinano le quantità precedentemente scaricate senza ripetere lo storno.
- Una pratica già scaricata non può cambiare composizione: prima va annullata e poi reinserita.
- Se manca anche una sola tipologia di cabinet, l'accettazione viene bloccata e nessuna giacenza viene modificata.
- Ogni operazione viene registrata in `MOVIMENTI_MAGAZZINO`.

## Dato ancora da completare

Per **P4 0.64×0.64** le immagini ricevute mostrano 4 pezzi e una promozione attiva, ma non mostrano il prezzo. Il prodotto viene quindi creato con giacenza 4 e prezzo da definire. Inserisci il prezzo reale dalla sezione Catalogo come amministratore oppure direttamente nel foglio `PRODOTTI_LED`.
