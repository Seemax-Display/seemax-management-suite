# Seemax Management Suite — 2.24.0

Aggiornamento completo del pacchetto operativo 2.23.0. Frontend, protocollo Apps Script e cache sono allineati alla versione 2.24.0. Nessuna compilazione necessaria.

## Pubblicazione su database esistente

1. Apri il progetto Apps Script collegato al tuo Foglio e sostituisci `Code.gs` con `apps-script/Code.gs` incluso nello ZIP.
2. Salva ed esegui una volta `upgradeSeemaxV2240()`. Aggiorna la versione di configurazione, riallinea i contatori preventivi e inizializza la revisione del magazzino. Conserva pratiche, clienti, giacenze, documenti, trofei e personalizzazioni.
3. Apri **Distribuisci → Gestisci deployment → Modifica → Nuova versione → Distribuisci**, mantenendo il deployment esistente, il relativo URL `/exec` e le impostazioni della Web App già utilizzate dal gestionale.
4. Estrai lo ZIP e carica su GitHub il contenuto della cartella, rispettando percorsi e nomi. Mantieni il tuo URL Apps Script in `assets/js/config.js` se differisce da quello incluso.
5. Attendi la pubblicazione di GitHub Pages e riapri il gestionale online con Ctrl+F5. Per l'app installata, chiudi e riapri online una volta affinché venga acquisita la nuova cache. La disponibilità offline richiede prima questa acquisizione online.

Questo rilascio richiede anche il nuovo backend: aggiornare soltanto GitHub lascia un protocollo incompatibile. Le precedenti istruzioni che indicavano di non modificare Apps Script riguardavano esclusivamente la versione 2.23.0.

## Pratiche, commessa e credenziali

- La commessa locale riporta il tipo di gestione del display: collegamento locale, Wi-Fi, Smartphone o Cloud.
- Per Cloud stampa nome utente e password effettivi, conservando spazi e caratteri speciali. La tabella dei materiali mantiene le righe per la compilazione a penna.
- La password Cloud è leggibile nel modulo operativo e nella consultazione della pratica completata.
- Pratiche e documenti sono restituiti agli agenti nel rispettivo perimetro di proprietà; l'ADMIN mantiene la vista completa. Lo stesso filtro vale per le copie locali del bootstrap.
- La commessa resta locale e disponibile all'ADMIN per le sole pratiche accettate.

## Magazzino aggiornato automaticamente

- All'accettazione il backend rilegge e valida le quantità correnti dentro il lock condiviso, esegue lo scarico e conferma le scritture prima di rilasciare il lock.
- La risposta contiene le nuove quantità: il browser aggiorna catalogo, configuratore pratica e disponibilità del Planner senza refresh della pagina.
- Da Accettata a Completata conserva lo scarico già applicato. Il ritorno a uno stato che libera il magazzino ripristina le quantità effettivamente impegnate.
- Richieste duplicate, versioni non aggiornate e risposte fuori ordine vengono gestite senza applicare due volte lo stesso scarico nei casi verificati.
- Se due utenti richiedono l'ultima unità, la seconda pratica conserva l'avviso di magazzino in attesa; non vengono registrate quantità negative.
- Le altre sessioni visibili eseguono controlli periodici con intervallo di 15 secondi nelle sezioni Catalogo, Pratiche e Planner. Le schede dello stesso browser ricevono anche un aggiornamento locale tramite BroadcastChannel.
- Il controllo prosegue durante upload e salvataggi. Se il lock è occupato, la lettura viene rinviata senza leggere un movimento a metà.
- Il cursore avanza solo dopo uno snapshot completo. Le risposte parziali di operazioni concorrenti vengono applicate per prodotto e versione.
- Una rilettura completa periodica, indicativamente ogni minuto nelle sezioni interessate, intercetta anche modifiche manuali al Foglio che non aggiornano la revisione applicativa.

L'aggiornamento locale segue la risposta del server; tra dispositivi diversi la visibilità dipende dal controllo periodico e dalla rete. Non è un sistema push istantaneo. La verifica definitiva delle quantità avviene sul server al salvataggio.

## P3.91 e disponibilità dei due formati

Pratiche e Planner utilizzano la stessa logica geometrica per combinare cabinet 50×100 e 50×50 cm, con rotazione dei rettangolari quando necessaria.

- Se i rettangolari non bastano, vengono impiegati i quadrati disponibili; se i quadrati non bastano, viene verificata una composizione alternativa con rettangolari.
- Il calcolo considera le due facce e, nella pratica, l'insieme dei Ledwall richiesti: uno stesso cabinet non viene assegnato a due prodotti.
- La pratica registra e scarica i formati effettivamente utilizzati. Una composizione già impegnata resta invariata nei successivi passaggi di stato.
- Una superficie equivalente non è sufficiente se i cabinet non possono coprire realmente il rettangolo.
- L'aggiornamento delle giacenze modifica disponibilità, conteggi e schema del Planner conservando campi cliente e prezzi manuali. Il ricalcolo commerciale esplicito utilizza la composizione disponibile in quel momento.

Esempi verificati: 100×200 cm con 8 quadrati; 200×50 cm con 2 rettangolari ruotati; 150×150 cm con 4 rettangolari e 1 quadrato. Un bifacciale 150×150 cm richiede almeno un quadrato per faccia: 9 soli rettangolari non bastano.

## Planner: nuova apertura e archivio

- Una nuova apertura o un ricaricamento completo del gestionale avvia un preventivo pulito e chiede al database il prossimo numero.
- Il backend confronta il contatore con il massimo effettivamente presente nell'archivio della relativa numerazione ADMIN/AGENTE, anche dopo variazioni manuali nel Foglio.
- Prima di salvare verifica nuovamente la numerazione. Nel percorso integrato una collisione fra nuovi preventivi può essere risolta automaticamente aggiornando anche contenuto criptato e numero archiviato.
- L'ADMIN conserva la modifica manuale del numero.
- **Carica preventivo** mantiene numero e identità del documento, consentendo la sovrascrittura autorizzata con controllo della versione precedente.
- Cambiare sezione o mandare la pagina in background conserva il lavoro nella memoria della pagina corrente. Il ritorno della rete non ricrea il Planner già aperto.
- Le bozze salvate esplicitamente restano disponibili. Viene eliminato il ripristino automatico su disco che faceva ricomparire vecchi preventivi dopo la chiusura del sistema.
- Un salvataggio terminato in background non sostituisce l'identità di un altro preventivo caricato nel frattempo.

## Riconnessione e interfaccia

La riconnessione è automatica al ritorno dal background, al ripristino della rete e al recupero della pagina dalla memoria del browser. Il banner mostra lo stato senza pulsante “Riconnetti ora”. In caso di errore temporaneo sono previsti nuovi tentativi automatici.

Gli aggiornamenti conservano modulo aperto e dati non salvati. Il rendering delle liste viene differito quando c'è un modulo attivo; il Planner già montato rimane disponibile.

La classifica mostra **Fatturato complessivo**: somma delle pratiche Completate dell'utente in tutti i periodi. Pratiche in lavorazione o bocciate non generano fatturato. I singoli trofei e l'agente del mese mantengono le proprie regole.

## Pixel Lab

- Accesso esclusivamente dal Catalogo Ledwall / Altri LED; rimosso dal Quotation Planner.
- Animazione completa a ogni apertura, mantenendo laboratorio e immagini nella stessa sessione.
- Rimosso il pulsante interno “PARAGONA”; restano le schede di confronto risoluzione e schede tecniche.
- Conservati sette modelli, immagini locali, calcoli pixel, schede, consumi e download PNG.
- Rispettata la preferenza del dispositivo per la riduzione delle animazioni.

## Prestazioni

- Upload e registrazione documento riuniti in un'unica invocazione ordinaria del backend. Il retry riusa il risultato di upload disponibile e il token del documento.
- Creazione file su Drive fuori dal lock globale delle scritture al Foglio.
- Movimenti di una pratica scritti in un solo blocco anziché aggiunti uno per volta.
- Risposte di magazzino limitate a quantità, stato e versione: nessun bootstrap completo dopo ogni movimento.
- Verifiche periodiche basate sulla revisione: se non è cambiata, viene evitata la lettura dei prodotti.
- Bootstrap e letture di magazzino concorrenti accorpati; dati identici non provocano nuovi eventi di rendering.
- Una lettura completa appena ricevuta viene riutilizzata per gli accessi ravvicinati alle sezioni.
- Gli aggiornamenti dei soli prodotti non ricalcolano dashboard e classifica.
- Download dei documenti mantenuti direttamente su Drive, senza passare attraverso Apps Script.

Rimangono avvio e quote di Apps Script, tempi di Sheets/Drive e velocità della connessione. Non sono stati misurati tempi reali sul database operativo e non viene promesso un tempo fisso in secondi.

## Verifiche

- 179 controlli di regressione: regole assistenza GRENKE/IFIS, archivio, offline, agenda e protezione dei moduli.
- 41 controlli backend e commessa con servizi Google simulati: accettazione, completamento, storno, retry, ultimo cabinet condiviso, P3.91, numerazione, fatturato e upload.
- 20 controlli Planner in DOM simulato: nuova sessione, passaggio fra sezioni, archivio, sovrascrittura, collisioni e giacenze.
- 15 controlli API: risposte fuori ordine, cursore, upload unico, bootstrap concorrenti e visibilità dei dati.
- 11 controlli dei moduli aperti: dati non salvati conservati, giacenze ricalcolate, password leggibile e classifica cumulativa.
- 3.313 configurazioni geometriche P3.91: copertura senza sovrapposizioni e confronto con ricerca indipendente.
- Pixel Lab in DOM simulato con rasterizzazione Canvas, riapertura animazione, conservazione immagini e controlli dei messaggi.
- Service Worker: precache, Planner offline, risorse versionate e separazione fra shell e laboratorio.
- Sintassi JavaScript/Apps Script, riferimenti locali e integrità dello ZIP.

Il collaudo sul Foglio privato e su browser/dispositivi reali non è stato eseguito da questo ambiente. Dopo il deployment verifica sul tuo account almeno l'accettazione di una pratica, il completamento senza secondo scarico, l'aggiornamento da una seconda sessione, il rientro dal background e l'acquisizione offline della cache.

## Contenuto essenziale

Solo file di esecuzione, backend, README e licenze necessarie. Nessun test, dipendenza npm, archivio annidato o duplicato di sviluppo. Il pacchetto rimane sotto il limite di 100 file per il caricamento su GitHub.
