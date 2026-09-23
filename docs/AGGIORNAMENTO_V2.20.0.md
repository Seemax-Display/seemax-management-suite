# Aggiornamento Seemax Management Suite 2.20.0

La versione 2.20.0 inserisce tre nuovi Schermi LCD nel Catalogo e nel Quotation Planner, mantenendo invariati il calcolo Ledwall, Grenke, IFIS, archivio preventivi, PDF e creazione pratica.

## Nuovi prodotti LCD

| Prodotto | Prezzo Cina | Prezzo agente | Prezzo cliente | Giacenza iniziale |
|---|---:|---:|---:|---:|
| Window Shop LCD | €1.000 | €1.500 | €1.800 | 0 |
| LCD Rotating Display 32" | Non comunicato | €1.300 | €1.500 | 0 |
| LCD Wall Board | Non comunicato | €1.800 | €2.300 | 0 |

I valori sono IVA esclusa. Il Totem LCD Indoor resta a €2.000 agente e €2.200 cliente. Prezzi e giacenze esistenti non vengono sovrascritti dall'upgrade.

### Window Shop LCD

- Full HD;
- Android;
- luminosità 2.000 cd/m²;
- larghezza 65 cm;
- altezza totale 176 cm;
- area schermo 112 cm;
- base 44 cm;
- spessore 7 cm;
- utilizzo Indoor per vetrine, negozi e showroom.

### LCD Rotating Display

- display touch Full HD da 32 pollici;
- orientamento verticale e orizzontale;
- Android 13;
- 8 GB RAM;
- 128 GB di memoria;
- batteria integrata;
- base circolare mobile con ruote.

### LCD Wall Board

- doppio ambiente Android 13 / Windows 10 Pro 64 bit 22H2;
- Intel Core i7-8550U;
- 16 GB RAM;
- Intel UHD Graphics 620;
- DirectX 12;
- touch fino a 20 punti;
- USB Touch, HDMI, tre USB e USB-C;
- utilizzo a parete per scuole, sale riunioni e ambienti informativi.

## Modalità di posa nel Quotation Planner

| Prodotto | Scelta mostrata | Costo |
|---|---|---:|
| Totem LCD Indoor | `POSIZIONATO A TERRA` | €0 |
| Window Shop LCD | `POSIZIONATO A TERRA` | €0 |
| LCD Rotating Display | `POSIZIONATO A TERRA` | €0 |
| LCD Wall Board | `SOLO FORNITURA` | €0 |
| LCD Wall Board | `A PARETE` | €350 |

Le opzioni vengono lette da `PRODOTTI_LED`, tramite le colonne:

- `installazione_opzioni_json`;
- `installazione_predefinita`.

Il costo `A PARETE` è fisso sulla configurazione del prodotto. Non viene ridotto dagli scaglioni multiprodotto 100% / 50% / 30% e gli LCD non consumano una posizione di quella progressione. Trasferta e provvigione restano sempre disponibili.

## Catalogo e immagini

I tre prodotti compaiono nella tab `Schermi LCD` con immagini WebP ottimizzate:

- `assets/catalog/window-shop-lcd.webp`;
- `assets/catalog/lcd-rotating-display.webp`;
- `assets/catalog/lcd-wall-board.webp`.

Le schede tecniche sono incluse anche nel Quotation Planner e nel materiale di stampa. Il nome dei prodotti può essere cambiato successivamente dall'ADMIN: l'identificativo tecnico resta stabile.

## Compatibilità e sicurezza

Restano invariati:

- salvataggi in background senza refresh della pagina;
- token idempotenti;
- `ScriptLock` per le scritture concorrenti;
- `record_version`;
- controllo giacenze;
- preventivi multiprodotto fino a tre configurazioni;
- PDF, Grenke, IFIS e creazione pratica;
- trasferta e provvigione;
- calcolo storico dei Ledwall e dei LED Extra.

## Installazione

1. Pubblica su GitHub Pages l'intero frontend 2.20.0, comprese le tre immagini in `assets/catalog`.
2. Sostituisci il contenuto del progetto Apps Script con `apps-script/Code.gs` della versione 2.20.0.
3. Salva ed esegui manualmente `upgradeSeemaxV2200()`.
4. Autorizza lo script, se richiesto.
5. Pubblica una nuova versione della Web App mantenendo lo stesso URL `/exec`.
6. Esegui `Ctrl+F5` oppure chiudi e riapri la PWA.
7. Verifica che frontend, backend e Service Worker riportino tutti la versione 2.20.0.

La funzione di upgrade è idempotente: se i prodotti sono già presenti nel Foglio Google, li consolida senza duplicarli e conserva prezzi, promozioni e giacenze già valorizzati.

## Collaudo consigliato

1. Apri `Catalogo > Schermi LCD` e verifica la presenza di quattro prodotti.
2. Controlla immagini e schede tecniche dei tre nuovi LCD.
3. Nel Planner seleziona Window Shop e verifica `POSIZIONATO A TERRA · €0`.
4. Seleziona Rotating Display e verifica `POSIZIONATO A TERRA · €0`.
5. Seleziona Wall Board con `SOLO FORNITURA`: attesi €1.800 agente / €2.300 cliente, prima di trasferta e provvigione.
6. Seleziona `A PARETE`: attesi €2.150 agente / €2.650 cliente, prima di trasferta e provvigione.
7. Inserisci prima un LCD e poi due prodotti installabili: verifica che gli scaglioni dei prodotti installabili restino 100% e 50%.
8. Salva, riapri e stampa il preventivo; controlla la dicitura della posa nel PDF.
9. Crea una pratica e verifica che l'ID prodotto e la quantità siano corretti.
