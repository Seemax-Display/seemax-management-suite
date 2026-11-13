# Seemax Management Suite — Quotation Planner 2.25.0

Aggiornamento dell’interfaccia basato sul pacchetto 2.24.1. Il backend e il protocollo rimangono **2.24.0**. Non sono richiesti compilazione, nuove dipendenze o modifiche al Foglio.

## Installazione

1. Estrai lo ZIP.
2. Carica su GitHub il contenuto della cartella `seemax-management-suite-v2.25.0`, rispettando i percorsi e sostituendo i file esistenti. Non caricare la cartella esterna come sottocartella aggiuntiva.
3. Conserva il tuo URL Apps Script in `assets/js/config.js` se differisce da quello incluso. Le impostazioni sono `version: "2.24.0"` e `uiVersion: "2.25.0"`.
4. Attendi la pubblicazione di GitHub Pages e riapri con **Ctrl+F5**. Per l’app installata, chiudila e riaprila online per acquisire la nuova cache.

**Se il backend è già 2.24.0, non occorre ripubblicare Apps Script né eseguire upgrade.** I file `apps-script/Code.gs` e `appsscript.json` sono conservati dalla versione di partenza.

Se il backend è precedente: sostituisci Code.gs con quello incluso, esegui una volta `upgradeSeemaxV2240()` e distribuisci una nuova versione mantenendo il deployment esistente e il relativo URL /exec. Conserva quindi quell’URL nella configurazione del frontend.

## Apertura del Planner

La schermata iniziale mostra **“Seleziona un opzione per continuare.”** e quattro scelte:

- **NUOVO PREVENTIVO:** aggiorna catalogo e impostazioni, richiede al database il prossimo numero disponibile e poi ripulisce il calcolatore. Il server considera il massimo effettivo dell’archivio. Se le letture falliscono, il lavoro corrente viene conservato.
- **CONTINUA A MODIFICARE:** riprende il preventivo nella sessione corrente, con cliente, prodotti, configurazioni e identità del documento. È disabilitato se non c’è lavoro da riprendere.
- **CALCOLO RAPIDO NOLEGGIO:** apre Grenke per una simulazione libera.
- **CALCOLO RAPIDO LEASING:** apre IFIS per una simulazione libera.

I calcoli rapidi mantengono separati importi e condizioni finanziarie dal preventivo in lavorazione. Il ritorno alle opzioni ripristina il lavoro precedente.

Il pulsante **Opzioni Planner** riapre questa schermata. L’archivio rimane disponibile nella barra del Planner. Sono rimossi i tre tag di stato richiesti e la precedente modalità rapida del configuratore prodotti.

Il lavoro corrente viene conservato passando tra le sezioni della suite. Non viene introdotto un ripristino automatico dei vecchi preventivi dopo la chiusura completa dell’app: per conservare un documento occorre salvarlo nell’archivio.

## Percorso prodotti

1. **Prodotti:** scelta da uno a tre prodotti e della tipologia di ciascuno: Ledwall, Croci e LED Extra, Schermi LCD.
2. **Misure:** base e altezza in centimetri, configurazione Monofacciale/Bifacciale dall’elenco a discesa, oppure quantità per prodotti a formato fisso. I vincoli modulari esistenti restano applicati. Compaiono le card delle soluzioni.
3. **Gestione:** staffaggio e scelta tra Spedizione, Installazione e Ritiro cliente per ogni prodotto.
4. **Provvigione:** importo in euro per ciascun prodotto; zero è consentito.
5. **Riepilogo prodotti:** card con immagine, misure, configurazione, servizi, provincia e importi. Le tre azioni finali sono CALCOLA NOLEGGIO, CALCOLA LEASING e PROCEDI CON LA VENDITA.

Le tab permettono di passare tra i prodotti nella fase corrente. Il percorso controlla la completezza prima di avanzare. La scelta del modello e i prezzi cliente personalizzati dall’ADMIN vengono mantenuti quando si modificano servizi e provvigione.

Sono incluse animazioni di costruzione e accensione del display, rotazione per il bifacciale, ingresso delle card e reazione al passaggio del mouse. Le animazioni rispettano la preferenza del dispositivo per il movimento ridotto.

## Prezzi provvisori

I seguenti importi sono **placeholder richiesti per l’aggiornamento**, tutti IVA esclusa, e non costituiscono il listino definitivo.

| Staffaggio | Prezzo provvisorio per prodotto |
| --- | ---: |
| Per parete | € 200 |
| Per bandiera | € 350 |
| Per totem | € 450 |
| Su palo | € 300 |
| Nessuno | € 0 |

| Gestione ordine | Calcolo provvisorio |
| --- | --- |
| Spedizione | € 45 + € 0,18 × distanza convenzionale della provincia da Catania |
| Installazione | € 300 + € 75 × superficie del prodotto in m², più € 1 × distanza convenzionale |
| Ritiro cliente | Nessun costo di spedizione, installazione o trasferta |

La scelta di uno staffaggio mantiene il suo prezzo anche con ritiro cliente. Per Spedizione e Installazione è obbligatorio selezionare la provincia.

Le province sono quelle dell’anagrafica italiana già inclusa nel gestionale. Le distanze sono parametri indicativi per il listino provvisorio, non percorsi stradali o preventivi di un corriere. La tariffa cresce con la distanza.

I parametri sono concentrati in `PLANNER_ORDER_PRICING`, nel file `quotation-planner/index.html`. Anche il documento stampabile segnala i prezzi provvisori dei servizi.

Staffaggio, installazione, spedizione/trasferta e provvigione sono sommati una sola volta. Il calcolo dell’assistenza finanziaria continua a considerare il valore dei prodotti, escludendo questi servizi e la provvigione.

## Confronto Pixel Lab

L’icona **COMPARA** sulle card Ledwall apre la selezione di due soluzioni. Non è possibile selezionarne più di due. Pixel Lab riceve i modelli e le dimensioni, i pixel e i conteggi cabinet effettivi del Planner, comprese le composizioni miste P3.91.

Il render del laboratorio rappresenta una faccia; per un bifacciale il conteggio cabinet importato è indicato come complessivo. Le dimensioni importate sono mantenute nel confronto. Cambiare modello nel laboratorio avvia una simulazione libera.

Il confronto non cambia la soluzione scelta nel preventivo. L’accesso già presente dal Catalogo continua a funzionare.

## Riepilogo e salvataggio

Nel riepilogo stampa sono rimossi i pulsanti Modifica dati, Modifica prodotti, Operazione commerciale e Stampa / Salva PDF.

**SALVA PREVENTIVO** mostra l’animazione del floppy dal computer al mondo e una finestra di caricamento bloccante. Il dialogo nativo blocca l’interazione con il Planner e la navigazione della suite; Escape non lo chiude. Il browser può richiedere conferma se si tenta di chiudere o ricaricare durante il salvataggio.

Solo dopo la conferma del database compaiono:

- **Inserisci Pratica**
- **Stampa / Genera PDF**
- **Modifica ancora**

Il pulsante diventa **ALTRE OPZIONI** e riapre queste azioni senza risalvare. Una modifica ai dati del documento lo trasforma in **SOVRASCRIVI PREVENTIVO**. La sovrascrittura conserva l’identità del documento e usa il controllo di versione esistente, evitando di sovrascrivere modifiche più recenti di altri utenti.

Un errore di rete o un conflitto non mostra il menu di successo e non elimina il lavoro. I clic ripetuti durante il salvataggio non inviano ulteriori comandi.

La stampa locale rimane disponibile quando si utilizza il Planner offline. Numerazione ufficiale, archivio online e invio pratiche richiedono la connessione.

## Compatibilità e controlli

- I preventivi precedenti si possono caricare mantenendo le loro tariffe di posa e trasferta. I nuovi prezzi provvisori vengono applicati quando si modifica esplicitamente la gestione del prodotto.
- I nuovi campi sono conservati nei payload preventivo e nelle righe JSON esistenti. Non occorrono nuove colonne nel Foglio.
- Le formule e i coefficienti Grenke/IFIS e i file del backend non sono modificati.
- Eseguiti test funzionali in DOM simulato, anche con il montaggio reale nel Shadow DOM della suite: apertura, calcoli rapidi, percorso con tre famiglie, prezzi, province, salvataggio, errore, retry, sovrascrittura, conflitto, caricamento archivio e ritorno tra sezioni.
- Verificati il motore Pixel Lab con dimensioni importate e le regressioni dei modelli esistenti, la sintassi dei sorgenti, i riferimenti locali, il contenuto della cache e l’integrità del pacchetto.

L’anteprima nel browser locale è stata bloccata dall’ambiente. Non è stato eseguito un collaudo sul Foglio operativo né su browser/dispositivi reali. Dopo il caricamento su GitHub, verificare sul proprio account un preventivo completo, il confronto Pixel Lab, il salvataggio, la sovrascrittura e la stampa.

Il pacchetto contiene solo file di esecuzione, backend, istruzioni e licenze: non include test, dipendenze npm o archivi annidati.
