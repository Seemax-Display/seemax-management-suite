# Seemax Management Suite 2.22.0

Pacchetto operativo essenziale per GitHub Pages e Google Apps Script.

## Installazione dell’aggiornamento

1. Nell’editor Apps Script sostituisci il contenuto del vecchio `Code.gs` con `apps-script/Code.gs`.
2. Salva ed esegui una sola volta:

   ```javascript
   upgradeSeemaxV2220()
   ```

3. Autorizza lo script se Google lo richiede.
4. Crea una nuova versione del deployment Web App, mantenendo lo stesso URL `/exec`.
5. Carica su GitHub il contenuto completo di questo pacchetto, conservando cartelle e nomi.
6. Attendi la pubblicazione di GitHub Pages, quindi esegui `Ctrl+F5`.
7. Se usi la PWA installata e appare ancora la vecchia interfaccia, chiudila completamente e riaprila online una volta.

Frontend, backend e Service Worker devono riportare tutti la versione `2.22.0`.

## Novità principali

- rimossa la vecchia Modalità Rapida globale;
- PWA offline avviata direttamente nel Quotation Planner;
- paginazione compatta `1 · 2 · 3 · … · ultima`;
- cliente apribile direttamente dalle pratiche operative;
- pratiche S.Q.P. con colore di stato standard e simbolo viola dedicato;
- importazione S.Q.P. guidata con anagrafica precompilata o pratica locale privata;
- documenti obbligatori soltanto quando la pratica resta `INSERITA`;
- Agenda personale locale con calendario, promemoria e stati `FATTO`, `SOSPESA`, `ANNULLATA`;
- nuova scheda Classifiche con profili, fatturato migliore, ultima pratica e trofei;
- Quotation Planner con scelta unica `OPERAZIONE COMMERCIALE`;
- modalità Classica e Rapida disponibili dentro la sola sezione Prodotti;
- memoria delle configurazioni quando si cambia scheda o categoria;
- caricamento e sovrascrittura controllata dei preventivi già registrati;
- numero preventivo modificabile manualmente soltanto dagli ADMIN;
- assistenza integrata per importi Noleggio/Leasing: `max(500 €, 25%)`, esclusa la provvigione;
- aggiornamenti in background non distruttivi: i moduli aperti non vengono azzerati;
- sincronizzazione automatica al ritorno da background su smartphone;
- lock, versioni record, token idempotenti e controlli magazzino invariati.

## Modalità offline

La modalità offline si attiva soltanto quando il gestionale viene avviato come PWA installata senza rete. In tale condizione sono disponibili:

- configurazione dei prodotti già memorizzati;
- calcolo commerciale;
- bozze locali;
- esportazione del preventivo.

Archivio online, salvataggio nel Foglio e invio delle pratiche tornano disponibili alla riconnessione.

## Struttura essenziale

```text
index.html                    Interfaccia principale
assets/                       Codice, immagini e dati necessari
quotation-planner/index.html  Quotation Planner
apps-script/Code.gs           Backend Google Apps Script
apps-script/appsscript.json   Manifest Apps Script
manifest.webmanifest          Installazione PWA
sw.js                         Cache offline
```

Non servono Node.js, npm o compilazioni per pubblicare il gestionale su GitHub Pages.

## Collaudo

La release è stata verificata con 126 controlli automatici su sintassi, versione, offline, pratiche, documenti, Agenda, Classifiche, Planner, assistenza, sovrascrittura preventivi, concorrenza e integrità delle risorse.
