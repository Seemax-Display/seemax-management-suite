# Aggiornamento Seemax Management Suite 2.19.0

La versione 2.19.0 estende il Quotation Planner a tutti i gruppi prodotto introdotti nel Catalogo 2.18.0. Il calcolatore Ledwall originale, Grenke, IFIS, archivio preventivi, PDF e creazione pratica mantengono lo stesso flusso operativo.

## Nuova tab PRODOTTI

La precedente tab `LEDWALL` del Planner è ora denominata `PRODOTTI`. Quando viene aperta, propone tre categorie:

- `LEDWALL`;
- `CROCI E LED EXTRA`;
- `SCHERMI LCD`.

Scegliendo `LEDWALL` il Planner utilizza il calcolo precedente senza variazioni. Nelle altre categorie è obbligatorio selezionare esplicitamente un articolo: nessun prodotto viene scelto automaticamente.

È possibile continuare a configurare fino a tre prodotti nello stesso preventivo, anche appartenenti a categorie differenti.

## Listini del Planner

| Prodotto | Regola di calcolo | Prezzo agente | Prezzo cliente |
|---|---|---:|---:|
| Croce Farmacia P5 0,64×0,64 | Quantità, formato fisso | €999 | €1.099 |
| Croce Farmacia P10 0,96×0,96 | Quantità, formato fisso | €1.099 | €1.299 |
| Croce Farmacia P10 1,28×1,28 | Quantità, formato fisso | €1.449 | €1.799 |
| Transparent Led P3.91 | Cabinet 1,00×1,00 m | €1.200 | €1.500 |
| Floor Led P3.91 | Cabinet 0,50×1,00 m | €1.800 | €2.000 |
| Totem LCD Indoor SMX 430-CP | Quantità | €2.000 | €2.200 |

I valori sono salvati anche in `PRODOTTI_LED`. Durante l'upgrade, un prezzo cliente già personalizzato e non vuoto viene conservato; il valore predefinito viene inserito quando il campo è ancora vuoto.

## Regole di configurazione

### Croci farmacia

Le tre Croci hanno misure fisse. L'utente sceglie soltanto il modello e il numero di pezzi; base e altezza non sono modificabili.

### Transparent Led

Base e altezza avanzano a multipli esatti di 100 cm. Una configurazione 3×2 m richiede 6 cabinet 1×1 m. Una misura come 2,50×2 m non viene accettata.

### Floor Led

La base avanza a multipli di 50 cm e l'altezza a multipli di 100 cm. Una configurazione 1,50×2 m richiede 6 cabinet 0,50×1 m.

### Totem LCD

Il Totem viene calcolato a quantità. La voce installazione viene nascosta e il suo valore è sempre zero.

## Installazione, trasferta e provvigione

- l'installazione resta disponibile per Ledwall, Croci, Transparent e Floor Led;
- l'installazione non viene applicata agli Schermi LCD;
- trasferta e provvigione restano disponibili per ogni categoria;
- un LCD non occupa una posizione nella progressione dell'installazione multiprodotto: il successivo prodotto installabile mantiene l'impatto corretto;
- l'installazione autonoma continua a usare il valore manuale senza applicare riduzioni aggiuntive.

## Preventivi, PDF e pratiche

I nuovi prodotti sono inclusi in tutti i percorsi già presenti:

- salvataggio e riapertura del preventivo online;
- bozze locali;
- archivio ADMIN e attribuzione all'agente;
- importazione del totale in Grenke e IFIS;
- PDF cliente e schede tecniche;
- creazione di pratiche Acquisto, Noleggio o Leasing;
- righe di magazzino con l'ID esatto del prodotto.

La dichiarazione di conformità automatica resta limitata ai Ledwall per i quali sono presenti i relativi modelli ufficiali. Non viene aggiunto un certificato generico a Croci, LED Extra o LCD.

## Compatibilità e sicurezza

Restano invariati:

- sessione condivisa tra gestionale e Planner;
- trasporto nativo e fallback esistente;
- salvataggi in background senza refresh della pagina;
- token idempotenti;
- `ScriptLock` per le scritture concorrenti;
- `record_version`;
- controllo server-side dei prodotti e delle quantità prima della creazione pratica;
- controllo giacenze senza bloccare la creazione del preventivo.

## Installazione

1. Sostituisci il contenuto del progetto Apps Script con `apps-script/Code.gs` della versione 2.19.0.
2. Salva ed esegui manualmente `upgradeSeemaxV2190()`.
3. Autorizza lo script, se richiesto.
4. Pubblica una nuova versione della Web App mantenendo lo stesso URL `/exec`.
5. Pubblica su GitHub Pages l'intero frontend 2.19.0.
6. Esegui `Ctrl+F5` oppure chiudi e riapri la PWA.
7. Verifica che frontend, backend e Service Worker riportino tutti la versione 2.19.0.

L'upgrade non elimina clienti, pratiche, documenti, preventivi, movimenti o giacenze. Completa i prezzi cliente dei prodotti introdotti nella 2.18.0 e conserva le personalizzazioni già presenti.

## Collaudo consigliato

1. Apri `PRODOTTI` e verifica che compaia la scelta delle tre categorie.
2. Controlla che il percorso `LEDWALL` restituisca gli stessi risultati della 2.18.0.
3. Seleziona due Croci P5 e verifica €1.998 agente / €2.198 cliente, prima di installazione, trasferta e provvigione.
4. Verifica Transparent 3×2 m = 6 cabinet.
5. Verifica Floor 1,50×2 m = 6 cabinet.
6. Verifica che Transparent 2,50×2 m venga ricondotto a un multiplo valido al rilascio del campo o rifiutato prima del calcolo.
7. Seleziona un Totem LCD e controlla che installazione non compaia, mentre trasferta e provvigione restino disponibili.
8. Salva, riapri e stampa un preventivo contenente prodotti di categorie diverse.
9. Inserisci una pratica dal riepilogo e verifica gli ID prodotto nelle righe di magazzino.
