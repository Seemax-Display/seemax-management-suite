# Aggiornamento Seemax Management Suite 2.18.0

La versione 2.18.0 estende il gestionale da catalogo esclusivamente Ledwall a catalogo multiprodotto, mantenendo invariati il database condiviso, i lock multiutente e il percorso di salvataggio in background.

## Nuove sezioni del Catalogo

Il Catalogo è organizzato in tre tab:

- `Ledwall`, con tutti i prodotti già presenti;
- `Croci ed Altri Led`, con Croci farmacia, Floor Led e Transparent Led;
- `Schermi LCD`, con il Totem LCD Indoor.

La ricerca generale continua a filtrare nome, categoria, descrizione e SKU. Ogni tab mostra il proprio numero di articoli. Le quattro immagini fornite sono incluse localmente nel pacchetto e non dipendono da collegamenti esterni.

## Prodotti aggiunti

| Prodotto | SKU | Calcolo pratica | Prezzo agente | Giacenza iniziale |
|---|---|---|---:|---:|
| Croce Farmacia P5 64×64 | `SMX-CROSS-P5-6464` | Pezzi | €999 | 0 |
| Croce Farmacia P10 96×96 | `SMX-CROSS-P10-9696` | Pezzi | €1.099 | 0 |
| Croce Farmacia P10 128×128 | `SMX-CROSS-P10-128128` | Pezzi | €1.449 | 0 |
| Floor Led P3.91 50×100 | `SMX-FLOOR-P391-50100` | Cabinet esatti 0,50×1,00 m | €1.800 | 0 |
| Transparent Led P3.91 100×100 | `SMX-TRANSPARENT-P391-100100` | Cabinet esatti 1,00×1,00 m | €1.200 | 0 |
| Totem LCD Indoor | `SMX-430-CP` | Pezzi | €2.000 | 0 |

I prezzi comunicati sono registrati come `prezzoAgente`, cioè il prezzo principale mostrato nel catalogo agli agenti. `prezzoCliente` e `prezzoCina` restano intenzionalmente non valorizzati, perché non sono stati forniti e non vengono inventati dal sistema.

Tutti i nuovi prodotti iniziano nello stato `DA CONFIGURARE`. Il primo carico manuale maggiore di zero imposta automaticamente lo stato su `DISPONIBILE`; l'ADMIN può comunque modificarlo direttamente dalla scheda prodotto.

## Calcolo nelle pratiche

Il selettore prodotti della pratica è suddiviso nelle stesse tre categorie del Catalogo.

- I Ledwall esistenti conservano il calcolo modulare attuale e il P3.91 unificato 50×100/50×50.
- Floor Led accetta multipli esatti di 0,50 m in larghezza e 1,00 m in altezza.
- Transparent Led accetta esclusivamente multipli esatti di 1,00 m su entrambi gli assi. Per esempio 2×3 m produce 6 cabinet 1×1.
- Croci e Totem usano un campo quantità intera e vengono movimentati in pezzi.

Quando una misura Floor o Transparent viene digitata fuori modulo, l'interfaccia la porta al modulo immediatamente successivo al rilascio del campo. Il backend ripete il controllo e ricalcola le quantità prima di scrivere la pratica: non si affida ai valori di magazzino inviati dal browser.

La giacenza zero non blocca l'inserimento. Come per i Ledwall, la pratica viene salvata con avviso di disponibilità insufficiente e l'eventuale scarico resta in attesa, senza generare quantità negative.

## Schede tecniche

Le schede tecniche delle Croci, di Floor Led e Transparent Led riportano i dati forniti, inclusi utilizzo, densità pixel, scala di grigi, temperature, consumi, durata, certificazioni, visibilità e luminosità. Il Totem riporta la descrizione SMX 430-CP, Capacitive Touch, vetro da 4 mm, compatibilità Android/Windows, Wi-Fi e Android 10.

Per la Croce P10 128×128, la terza misura tecnica ripetuta come 0,96×0,96 nella richiesta è stata coerentemente interpretata come `1,28×1,28 m`, in accordo con nome, misura commerciale e prezzo indicati.

## Compatibilità e multiutente

Non sono stati rimossi o rinominati i campi storici delle pratiche. I nuovi metadati vengono salvati accanto alla struttura esistente:

- `catalogo_tab`;
- `tipo_calcolo`;
- `unita_magazzino`;
- `formato_label`;
- `tech_misura`.

Restano attivi `ScriptLock`, `record_version`, token idempotenti, ricalcolo server-side, controllo della giacenza sotto lock e salvataggi non bloccanti. Il Quotation Planner continua a importare soltanto i Ledwall per i quali possiede un modello di calcolo compatibile; i nuovi articoli non alterano i suoi listini esistenti.

## Installazione

1. Sostituisci il contenuto del progetto Apps Script con `apps-script/Code.gs` della versione 2.18.0.
2. Salva ed esegui manualmente `upgradeSeemaxV2180()`.
3. Autorizza lo script, se richiesto.
4. Pubblica una nuova versione della Web App mantenendo lo stesso URL `/exec`.
5. Pubblica su GitHub Pages l'intero frontend 2.18.0, incluse le quattro immagini in `assets/catalog`.
6. Esegui `Ctrl+F5` oppure chiudi e riapri la PWA.
7. Verifica che frontend, backend e Service Worker riportino tutti la versione 2.18.0.

L'upgrade non elimina clienti, pratiche, documenti, preventivi o movimenti e non azzera le giacenze dei prodotti già presenti. Aggiunge i nuovi prodotti a zero e completa i metadati mancanti sui Ledwall esistenti.

## Collaudo consigliato

1. Controlla le tre tab del Catalogo con un account ADMIN e un account AGENTE.
2. Imposta una giacenza su uno dei nuovi articoli mediante `Carico / Scarico`.
3. Crea una pratica con Transparent 2×3 m e verifica 6 cabinet.
4. Digita 1,5 m sul Transparent e verifica l'allineamento a 2 m.
5. Crea una pratica con due Croci e verifica lo scarico di 2 pezzi.
6. Genera una commessa da una pratica Accettata e verifica che prodotto, formato e quantità siano descritti correttamente.

