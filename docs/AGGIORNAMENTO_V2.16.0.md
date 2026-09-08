# Aggiornamento Seemax Management Suite 2.16.0

La versione 2.16.0 è il pacchetto di preparazione al rilascio ufficiale. Ordina il database Google Sheets senza rimuovere tabelle ancora utilizzate, azzera in modo definitivo i progressi di prova degli agenti e rifinisce le pagine Pratiche e Clienti.

## Prima dell'aggiornamento

Esegui l'upgrade in una breve finestra di manutenzione, quando gli agenti non stanno salvando dati. La funzione utilizza lo stesso `ScriptLock` delle mutazioni ordinarie e impedisce scritture concorrenti durante backup, pulizia e reset.

Non è necessario creare manualmente una copia del Foglio: `upgradeSeemaxV2160()` genera automaticamente su Google Drive una copia integrale denominata:

```text
NOME DATABASE - BACKUP PRE-RILASCIO 2.16.0 - AAAA-MM-GG_HH-MM-SS
```

L'identificativo, il collegamento e la data del backup vengono registrati in `IMPOSTAZIONI`. Se la copia non riesce, la funzione si interrompe prima di eliminare fogli o azzerare profili.

## Pulizia sicura di Google Sheets

L'elenco delle tabelle attive deriva direttamente da `SHEET_SCHEMAS`, la stessa struttura usata dal backend per leggere e scrivere i dati. Dopo il backup completo, vengono eliminate esclusivamente le schede non appartenenti a questo elenco.

Restano visibili:

- `AGENTI`;
- `PRODOTTI_LED`;
- `CLIENTI`;
- `PRATICHE`;
- `DOCUMENTI`;
- `IMPOSTAZIONI`;
- `MOVIMENTI_MAGAZZINO`.

Restano attive ma vengono nascoste per semplificare il Foglio:

- `PATCH_NOTES` e `PATCH_ITEMS`;
- `ARCHIVIO_PREVENTIVI`;
- `NOTIFICHE`;
- `EMAIL_CODA`;
- `LOG`.

Queste sei schede non sono inutilizzate: continuano a gestire comunicazioni, archivio preventivi, notifiche, email differite e diagnostica. Possono essere mostrate manualmente da Google Sheets in qualsiasi momento senza modificare il funzionamento.

La funzione pubblica `auditSheetStructureV2160()` restituisce l'elenco aggiornato di schede attive, estranee, visibili e tecniche nascoste.

Se l'upgrade viene ripetuto e nel frattempo è comparsa una nuova scheda estranea, viene prodotta una nuova copia integrale prima della sua rimozione. Il backup originale precedente al reset rimane comunque disponibile su Drive.

## Reset definitivo degli agenti

L'upgrade azzera una sola volta tutti gli account con ruolo diverso da `ADMIN`, inclusi quelli momentaneamente inattivi:

- nome pubblico e descrizione del profilo;
- tema, colore e icona;
- bacheca dei trofei;
- punto di partenza usato dal calcolo degli obiettivi.

Identità, credenziali, ruolo, stato, contatti, clienti, pratiche e documenti non vengono modificati. Gli account `ADMIN` mantengono personalizzazioni e bacheca e continuano ad avere accesso a tutti i trofei.

La colonna `trofei_reset_il` impedisce ai dati storici di test di sbloccare obiettivi dopo il rilascio. Ogni agente dovrà quindi raggiungerli con clienti e pratiche creati dopo l'upgrade. `record_version` viene incrementata per rendere il reset riconoscibile anche da sessioni aperte su altri dispositivi.

Il marcatore `reset_profili_v2160_eseguito` rende l'operazione idempotente: ripetere l'upgrade non cancella progressi maturati successivamente.

## Interfaccia rifinita

Le due modalità della pagina Pratiche sono ora:

- `IN DETTAGLIO`;
- `PER TIPOLOGIA`.

Nella pagina Clienti non viene più mostrato alcun testo sostitutivo quando il referente è vuoto. Un referente reale continua a essere visualizzato normalmente.

I conteggi per stato, tipologia e cliente vengono costruiti una sola volta per rendering. Il costo passa da più scansioni ripetute degli stessi array a un singolo passaggio, senza nuove chiamate a Google Sheets e senza modificare lock, idempotenza o autorizzazioni.

La cache locale del bootstrap include ora la versione dell'applicazione. Al primo avvio della 2.16.0 non viene quindi riutilizzato un profilo memorizzato dalla fase di test; dopo la prima lettura autorevole, gli avvii successivi mantengono il caricamento rapido già introdotto.

Anche la cache breve di `IMPOSTAZIONI` in Apps Script è separata per versione, evitando che un nuovo deployment possa riutilizzare per pochi secondi configurazioni conservate dal backend precedente.

## Procedura di installazione

1. Sostituisci il contenuto del progetto Apps Script con `apps-script/Code.gs` della 2.16.0.
2. Salva il progetto.
3. Esegui manualmente `upgradeSeemaxV2160()`.
4. Concedi l'autorizzazione a Google Drive se viene richiesta: serve per la copia integrale di sicurezza.
5. Attendi il messaggio finale della funzione e annota il collegamento `backup_pre_rilascio_v2160_url` presente in `IMPOSTAZIONI`.
6. Esegui `auditSheetStructureV2160()` e verifica che `unused` sia vuoto.
7. Pubblica una nuova versione della Web App mantenendo lo stesso URL `/exec`.
8. Pubblica su GitHub Pages tutti i file frontend del pacchetto 2.16.0.
9. Attendi la distribuzione ed esegui un refresh forzato.

Frontend, backend e Service Worker devono indicare la versione `2.16.0`.

## Collaudo pre-rilascio

1. Accedi come ADMIN e verifica che il profilo e tutti i trofei siano disponibili.
2. Accedi con almeno un agente e verifica profilo iniziale, bacheca vuota e trofei non sbloccati dai dati di test.
3. Crea un nuovo cliente, poi una pratica, e attendi la conferma delle rispettive barre di avanzamento.
4. Verifica che il nuovo lavoro inizi ad aggiornare i progressi dell'agente.
5. Controlla le modalità `IN DETTAGLIO` e `PER TIPOLOGIA`.
6. Apri un cliente senza referente e verifica che non compaia alcun placeholder.
7. Modifica e pubblica le Patch Notes; controlla il popup ADMIN e poi la visualizzazione per un agente.
8. Carica ed elimina un documento, salva ed esporta un preventivo, esegui un movimento di magazzino di prova.
9. Accedi contemporaneamente con due agenti su un foglio di collaudo e verifica che numeri, giacenze e versioni record restino coerenti.

## Ripristino

Il backup è una copia completa e indipendente del database precedente alla pulizia e al reset. In caso di necessità non sovrascrivere il database operativo durante l'attività degli agenti: interrompi il servizio, verifica la copia e ripubblica Apps Script soltanto dopo aver scelto il Foglio corretto.
