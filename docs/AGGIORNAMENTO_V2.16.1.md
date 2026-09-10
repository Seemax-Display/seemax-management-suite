# Aggiornamento Seemax Management Suite 2.16.1

La versione 2.16.1 corregge l'apertura dei preventivi degli agenti da parte dell'ADMIN e completa la gestione amministrativa dell'archivio del Quotation Planner.

## Difetto corretto

Il backend autorizzava già l'ADMIN a recuperare i preventivi di tutti gli agenti. Il contenuto di ciascun preventivo autenticato, però, veniva cifrato nel browser con la chiave personale del suo autore. Il Planner tentava quindi di decifrare un preventivo agente usando la chiave dell'ADMIN e il caricamento falliva, pur essendo la richiesta autorizzata.

Con la 2.16.1:

- il preventivo proprio continua a essere decifrato con la chiave dell'utente;
- quando un ADMIN richiede il preventivo di un altro utente, il backend verifica prima ruolo e credenziali;
- soltanto dopo tale verifica restituisce all'ADMIN la copia JSON completa già archiviata nel record;
- un agente continua a vedere e caricare esclusivamente i propri preventivi;
- il payload JSON completo e la password storica non vengono più restituiti nel percorso autenticato ordinario.

La chiave account viene usata per autenticare la richiesta ma non viene più salvata nel record del preventivo. Durante l'upgrade, l'eventuale vecchia colonna aggiuntiva `agent_key` viene svuotata in modo mirato. Inoltre, il percorso pubblico con ID e password rifiuta i preventivi creati tramite login e restituisce per i preventivi manuali soltanto payload cifrato, salt e vettore di inizializzazione.

I preventivi esistenti creati dalle versioni recenti sono compatibili perché contengono già la copia completa utilizzata dal caricamento amministrativo. Un record storico privo di tale copia produce un errore esplicito e non viene aperto in modo insicuro.

## Nuovi strumenti ADMIN

La finestra `PREVENTIVI REGISTRATI` mostra all'ADMIN:

- filtro `Agente`, con scelta di un singolo autore oppure di tutti;
- ordinamento per `Data creazione` o `Agente`;
- ordine crescente o decrescente;
- badge `Creato da` su ogni preventivo;
- data e ora di creazione formattate in italiano.

Queste opzioni e l'attribuzione dell'autore non vengono costruite nella vista AGENTE.

Nel Planner integrato, elenco, caricamento ed eliminazione passano ora attraverso il collegamento persistente della Management Suite. Questo evita di creare una nuova richiesta JSONP per ogni azione e non inserisce le credenziali nell'URL durante il percorso normale. Il collegamento precedente resta disponibile come fallback quando il Planner viene eseguito autonomamente o il ponte non è raggiungibile.

## Installazione su un sistema 2.16.0

1. Sostituisci il contenuto del progetto Apps Script con `apps-script/Code.gs` della 2.16.1.
2. Salva ed esegui manualmente `upgradeSeemaxV2161()`.
3. Pubblica una nuova versione della Web App mantenendo lo stesso URL `/exec`.
4. Pubblica su GitHub Pages tutti i file frontend del pacchetto 2.16.1.
5. Attendi la distribuzione, quindi esegui un refresh forzato.
6. Verifica che frontend, backend e Service Worker riportino `2.16.1`.

`upgradeSeemaxV2161()` non elimina fogli, non azzera profili e non modifica il contenuto operativo di preventivi, clienti o pratiche. Aggiorna la versione, verifica gli schemi, riallinea i contatori persistenti e cancella soltanto eventuali chiavi account erroneamente archiviate nella colonna tecnica `agent_key`.

Se la versione 2.16.0 non è mai stata installata, applica prima la procedura descritta in `AGGIORNAMENTO_V2.16.0.md`, inclusa la relativa funzione di upgrade e il backup pre-rilascio.

## Collaudo consigliato

1. Accedi come un agente e salva un preventivo di prova.
2. Verifica che l'agente possa ricaricarlo dal proprio archivio.
3. Accedi come ADMIN e apri `Preventivi Registrati`.
4. Verifica la presenza del preventivo agente e del badge `Creato da`.
5. Filtra l'elenco per quell'agente.
6. Ordina prima per agente e poi per data di creazione, in entrambe le direzioni.
7. Carica il preventivo agente e verifica che anagrafica, Ledwall, prezzi e finanziaria vengano ripristinati.
8. Accedi con un secondo agente e verifica che il preventivo del primo non sia elencato né caricabile.

## File di verifica

- `scripts/test-quotation-admin-v2.16.1.js`;
- `scripts/test-release-v2.16.1.js`;
- `scripts/verify-v2.16.1.js`.

Le protezioni multiutente, i lock, i contatori, l'idempotenza dei salvataggi e il lavoro in background restano invariati.
