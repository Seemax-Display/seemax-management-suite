# Rapporto tecnico — Seemax Management Suite 2.13.0

## Obiettivo dell'intervento

L'aggiornamento 2.13.0 affronta quattro problemi collegati fra loro:

1. salvataggi di clienti e pratiche che diventavano instabili con record ricchi di campi;
2. risposte perse o timeout di Google Apps Script dopo un'operazione già eseguita;
3. giacenze del Catalogo non sempre coincidenti con `PRODOTTI_LED.giacenza_attuale`;
4. necessità amministrativa di nascondere un falso avviso di giacenza sulla singola pratica.

L'obiettivo non è rendere Google Fogli un database relazionale, ma usare correttamente le sue garanzie e ridurre le cause applicative di errore senza sacrificare il lavoro simultaneo degli agenti.

## Confronto prima/dopo

| Area | Prima | Versione 2.13.0 | Beneficio |
|---|---|---|---|
| Salvataggio cliente/pratica | Payload serializzato nella query JSONP/GET | Payload inviato con `POST` | Non dipende più dalla lunghezza massima della URL |
| Errore di convalida | Un esito negativo poteva restare associato alla richiesta di un modulo | In cache vengono conservate soltanto mutazioni riuscite | Il modulo corretto può essere reinviato immediatamente con lo stesso token |
| Conferma di una scrittura | Il timeout sembrava sempre un fallimento | `requestId` consultabile tramite `management_mutation_status` | Il browser distingue una risposta lenta da una scrittura realmente fallita |
| Ripresa dopo timeout | Un nuovo invio poteva duplicare l'operazione | Un solo reinvio con lo stesso `requestId` e `request_token` | Retry sicuro e idempotente |
| Operazioni simultanee | Lock e versioni già presenti, ma trasporto fragile | Lock, rilettura dentro il lock, versione e token agiscono insieme | Nessuna sovrascrittura silenziosa e meno duplicati |
| Login durante altre scritture | L'aggiornamento di `ultimo_accesso` poteva attendere il lock globale | Autenticazione immediata; timestamp con lock breve best-effort | Un upload di un altro agente non blocca per decine di secondi l'accesso |
| Registro operativo | Più `appendRow` potevano allungare la sezione critica | Eventi raccolti e scritti in blocco dopo il lock principale | Gli altri agenti attendono meno durante operazioni con più eventi |
| Refresh manuale | Poteva riutilizzare prima la copia locale | Il reload richiede esplicitamente un bootstrap fresco | Le modifiche fatte nel Foglio vengono ricercate subito |
| Errore temporaneo DB | Pagina vuota o riconnessione manuale | Retry delle letture e fallback locale dichiarato | Continuità operativa senza spacciare la cache per dato aggiornato |
| Versione frontend/backend | Era possibile usare interfaccia e backend non allineati | Controllo obbligatorio della versione | Errore esplicito finché non viene pubblicato il nuovo deployment |
| Fonte Catalogo | Righe prodotto legacy/duplicate potevano prevalere | Lettura canonica di `PRODOTTI_LED` con consolidamento dei duplicati | P2.5 e gli altri modelli mostrano la quantità effettiva del foglio |
| Carico/scarico manuale | Modifica e storico potevano essere riletti da percorsi diversi | Scrittura, invalidazione cache e verifica su `PRODOTTI_LED.giacenza_attuale` | Il risultato mostrato è quello realmente scritto nella fonte ufficiale |
| Quotation Planner | Inserimento pratica ancora affidato al percorso JSONP | Usa la stessa API POST nativa del Management Suite | Stessa sessione, idempotenza e affidabilità del gestionale |
| Avviso giacenza | Modificabile soprattutto dal Foglio | Controllo ADMIN nella pratica Inserita, Sospesa o Completata | Falso positivo occultabile senza cambiare il calcolo reale |
| Attività | Vecchio foglio poteva sembrare ancora necessario | Sezione confermata locale; utility elimina solo `ATTIVITA` vuoto | Meno fogli inutili senza rischio di perdita storica |
| Notifiche | Poteva sembrare una pagina inutilizzata | Confermato l'uso di `NOTIFICHE` per campanella e stati | Il foglio non viene eliminato erroneamente |
| Cache PWA | Un dispositivo poteva mantenere JavaScript precedente | Cache 2.13 e strategia network-first per JS/CSS | Aggiornamenti del codice recepiti più rapidamente |

## Come viene protetta una mutazione

Una creazione o modifica condivisa segue questo percorso:

1. il browser genera un `request_token` stabile per l'operazione;
2. il payload viene inviato con `POST` e un `requestId` derivato dal token;
3. Apps Script controlla se quel `requestId` è già stato completato;
4. il backend acquisisce il lock globale delle sole scritture;
5. le tabelle interessate vengono rilette dentro il lock;
6. viene controllato `record_version` per impedire aggiornamenti basati su una copia vecchia;
7. la mutazione viene eseguita e il risultato viene memorizzato temporaneamente;
8. se la risposta non torna, il browser consulta lo stato invece di assumere un errore;
9. soltanto se non esiste conferma effettua un unico reinvio con gli stessi identificativi;
10. il backend restituisce il record già creato se riconosce il token.

Gli errori di validazione non vengono memorizzati come esiti definitivi: se un
campo è errato, l'utente lo corregge e può riprovare senza dover chiudere e
riaprire la scheda. La cache di conferma contiene solo operazioni concluse con
successo.

Il token impedisce di applicare due volte la stessa intenzione; il lock impedisce che due intenzioni diverse modifichino contemporaneamente la stessa risorsa; `record_version` impedisce che una copia vecchia sovrascriva una più recente.

## Gestione delle giacenze

La fonte ufficiale è una sola:

`PRODOTTI_LED` → colonna `giacenza_attuale`

Il Catalogo, il bootstrap, il calcolo delle carenze, lo scarico automatico e il carico/scarico ADMIN passano ora dallo stesso resolver di prodotto. I vecchi ID vengono trasformati negli ID canonici, ma non costituiscono un secondo magazzino.

L'upgrade consolida le righe equivalenti. In caso di duplicati, una giacenza modificata rispetto al valore storico iniziale viene considerata dato operativo e non viene sostituita dal seed del software. Prima di eseguire l'upgrade resta comunque obbligatoria una copia di sicurezza del Foglio.

Quando una pratica Accettata o Completata richiede più cabinet di quelli disponibili:

- la pratica viene salvata;
- `giacenza_insufficiente` diventa `SI`;
- `magazzino_in_attesa` diventa `SI`;
- non viene effettuato uno scarico parziale;
- la giacenza non diventa negativa.

Nascondere l'avviso con il controllo ADMIN modifica soltanto `avviso_giacenza`. Non falsifica `giacenza_insufficiente`, non crea cabinet e non applica movimenti di magazzino.

## Fogli necessari e fogli legacy

`NOTIFICHE` è attivo: alimenta la campanella, lo stato letto/non letto e le comunicazioni collegate alle variazioni di pratica. Non deve essere eliminato.

`ATTIVITA` non è più letto né scritto dal backend perché la sezione Attività è locale sul dispositivo. `removeEmptyLegacyActivitySheetV2130()` elimina questo foglio solo se non contiene righe oltre all'intestazione; in presenza di dati si interrompe senza cancellare nulla.

## Pro ottenuti

- clienti e pratiche complesse non saturano più una URL;
- un timeout non equivale più automaticamente a una perdita del salvataggio;
- una ripresa di rete non genera una seconda pratica o un secondo cliente;
- gli accessi non vengono accodati dietro agli upload per aggiornare un dato secondario;
- il lavoro simultaneo conserva lock e controllo di versione;
- il Catalogo e il movimento manuale condividono la stessa cella di giacenza;
- il refresh manuale cerca sempre dati nuovi;
- gli amministratori possono gestire i falsi avvisi senza alterare l'inventario;
- gli errori di versione sono riconoscibili e non mascherati dalla cache locale.
- una validazione fallita non “avvelena” i tentativi successivi dello stesso modulo.

## Limiti che restano

1. **Cold start e quote Apps Script.** Google può impiegare alcuni secondi ad avviare un'esecuzione e applica limiti giornalieri e concorrenti. Il frontend può gestirli meglio, non eliminarli.
2. **Upload Base64 verso Drive.** La trasformazione aumenta il volume trasmesso e Apps Script non offre in questa architettura un upload realmente resumable dal browser. I documenti restano separati dal primo salvataggio della pratica e caricati in background, ma file grandi possono essere lenti.
3. **Bootstrap completo.** A ogni caricamento vengono ancora lette tabelle intere. Con migliaia di pratiche serviranno API paginate o sincronizzazione incrementale per revisione/data.
4. **CacheService non è un registro permanente.** Conserva la risposta per dieci minuti. I record principali restano protetti dal `request_token` scritto nel Foglio; operazioni future che non producono una riga propria dovrebbero usare un registro idempotenza persistente.
5. **Google Fogli non applica vincoli relazionali nativi.** Le regole sono nel codice. Superata una determinata scala, un database transazionale come PostgreSQL/Supabase offrirebbe indici, transazioni e audit più robusti, lasciando Fogli come vista/report.
6. **Osservabilità.** Il foglio `LOG` registra eventi, ma non esiste ancora una dashboard tecnica di latenza, tasso di timeout, errori e quote Apps Script.

## Miglioramenti consigliati successivi

### Priorità alta

- upload diretto/resumable verso uno storage con URL firmate, salvando nel Foglio soltanto i metadati;
- endpoint bootstrap per revisioni, in modo da scaricare solo record modificati dopo l'ultimo aggiornamento;
- pagina ADMIN “Stato sistema” con latenza, ultimo bootstrap, versione backend, ultimo errore e coda upload;
- registro persistente delle richieste per le mutazioni che non hanno un proprio `request_token` su record.

### Priorità media

- paginazione server-side di clienti, pratiche, documenti e log;
- indici logici mantenuti in `CacheService` per ricerca identificativi e token;
- test automatici end-to-end contro un Foglio di collaudo separato;
- politiche di conservazione per `LOG`, `NOTIFICHE` lette e movimenti storici.

### Evoluzione architetturale

Se il numero di agenti, documenti e pratiche cresce in modo consistente, la soluzione consigliata è mantenere l'interfaccia GitHub Pages ma spostare le scritture critiche su un backend transazionale. Google Fogli può continuare a essere aggiornato come report operativo, evitando di interrompere le abitudini amministrative attuali.

## Collaudo obbligatorio dopo il deployment

I controlli statici locali non possono sostituire un'esecuzione sul Foglio privato. Dopo avere pubblicato `Code.gs` come nuova versione della Web App:

1. eseguire `selfTestInventoryMergeV2130()` e poi `auditInventorySourceV2130()` per verificare P2.5;
2. confrontare Catalogo e `PRODOTTI_LED.giacenza_attuale`;
3. fare un carico di 1 e uno scarico di 1 con causale;
4. creare un cliente e una pratica senza allegati;
5. creare una pratica dal Quotation Planner;
6. provare due creazioni simultanee da due finestre/account;
7. provare due modifiche contemporanee dello stesso record e verificare il conflitto;
8. creare una pratica con giacenza insufficiente e verificare che venga salvata in attesa;
9. provare il controllo ADMIN mostra/nascondi avviso;
10. modificare un valore direttamente nel Foglio e verificare che un refresh manuale lo rilegga.
