# Aggiornamento 2.7.3

## Ripristino stampa Quotation Planner

La stampa è stata riallineata al vecchio Quotation Planner e ai PDF originali forniti come riferimento.

- Preventivo Grenke standard: 3 pagine A4 (preventivo, scheda tecnica, Grenke).
- Preventivo Grenke con conformità: 5 pagine A4, comprendendo dichiarazione ed etichetta CE.
- Ripristinate proporzioni, colori, tabelle, loghi, immagini, margini e interruzioni di pagina originali.
- Rimossa la compressione forzata della conformità e della stampa IFIS.
- La stampa IFIS dedicata resta invariata e continua a essere generata dalla sezione IFIS.
- Il documento viene isolato dall'interfaccia del Management Suite, trasferendo anche gli stili originali presenti nello Shadow DOM del Planner.

## Pubblicazione

Caricare il frontend su GitHub Pages, sostituire `Code.gs`, eseguire `upgradeSeemaxV24`, pubblicare una nuova versione del deployment Apps Script e aggiornare il sito con `Ctrl + F5`.
