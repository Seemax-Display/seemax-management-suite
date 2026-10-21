# Seemax Management Suite — interfaccia 2.23.0

Aggiornamento Pixel Lab basato sul pacchetto operativo 2.22.3.

## Come aggiornare

1. Estrai lo ZIP e carica il contenuto della cartella su GitHub, mantenendo nomi e percorsi. Non caricare lo ZIP come singolo file.
2. Mantieni la configurazione del tuo collegamento in assets/js/config.js se hai cambiato l’URL Apps Script rispetto alla versione precedente.
3. Dopo la pubblicazione di GitHub Pages, riapri il gestionale online ed esegui Ctrl+F5. Per la PWA installata, chiudi e riapri online una volta: il Service Worker deve acquisire i file nuovi.
4. Apri Quotation Planner e premi PARAGONA · Apri Pixel Lab. Il pulsante è disponibile anche nel Catalogo Ledwall / Altri LED.

Non serve modificare il Foglio né distribuire una nuova versione Apps Script. Il protocollo e il backend rimangono 2.22.3; uiVersion identifica l’interfaccia 2.23.0. Il file apps-script/Code.gs incluso è identico a quello della release di partenza. Se il backend non è ancora 2.22.3, aggiorna prima la release di partenza secondo le sue istruzioni.

## Pixel Lab

- Animazione iniziale: due schermi convergono al centro e si pixelizzano.
- Apertura a tutto schermo sopra il lavoro corrente, senza ricreare il Planner.
- Chiusura tramite Torna al lavoro o Esc.
- Riapertura con immagini e configurazione mantenute nella stessa sessione.
- P1.9, P2.5, P3, P3.91, P4, Floor Led e Transparent Led.
- P3.91 in una sola voce, con passi di 50 cm e composizione automatica 50×100 + 50×50.
- Confronto della stessa fotografia, grafica di test, testi oppure immagine personale.
- Matrici native, scala fisica comune, dettagli pixel ingranditi, schede tecniche e consumi stimati.
- Esportazione PNG del confronto.
- Catalogo già caricato dal gestionale: nessuna chiamata aggiuntiva a Google Sheets e nessuna scrittura.
- Funzionamento offline dopo l’acquisizione completa dei nuovi file.
- Pulizia dell’immagine personale e dell’istanza del laboratorio al logout o al cambio utente.
- Animazione ridotta quando il dispositivo richiede meno movimento.

## Matrici di riferimento

| Modello | Passo di composizione | Matrice per passo |
| --- | --- | --- |
| P1.9 | 50×100 cm | 264×526 px |
| P2.5 | 64×64 cm | 256×256 px |
| P3 | 57×57 cm | 190×190 px |
| P3.91 unico | 50×50 cm | 128×128 px |
| P4 | 96×96 cm | 240×240 px |
| Floor Led | 50×100 cm | 128×256 px |
| Transparent Led | 100×100 cm | 256×256 px |

Le matrici sono riprese dal Quotation Planner già esistente, senza modificarne il calcolo commerciale. P2.5 e P3.91 corrispondono ai valori forniti da SEEMAX per il primo prototipo. La matrice P1.9 va confermata sulla variante del produttore.

Esempio P3.91 100×100 cm: 256×256 pixel, con 2 cabinet fisici 50×100. Esempio 150×150 cm: 384×384 pixel, con 3 cabinet 50×100 e 3 cabinet 50×50. La griglia visiva mostra i passi da 50 cm e non tutti i giunti reali.

## Dati tecnici e limiti

I campi tecnici presenti nel catalogo già caricato prevalgono sui riferimenti inclusi nel laboratorio. Dati mancanti o ambigui sono segnalati: un consumo non noto non viene trasformato in zero. La densità P3 dichiarata nella scheda può differire da quella calcolata da dimensioni e matrice; entrambe restano leggibili. Peso con più valori e scala di grigi “16” richiedono conferma della variante.

Si tratta di una simulazione digitale della risoluzione. Non riproduce luminosità, calibrazione, refresh, distanza visiva, trasparenza o struttura ottica del display reale. Una fotografia di partenza con pochi pixel limita il dettaglio anche su una matrice più ampia.

Sono ammessi fino a 8×8 passi per schermo, su una sola faccia. Le immagini personali restano in memoria nella pagina e non vengono inviate a un server; devono essere riselezionate dopo un riavvio o logout.

## Verifiche eseguite

- Sintassi dei file JavaScript e del codice inline del Planner.
- 178 controlli di regressione della suite precedente, con la cache aggiornata.
- Calcoli delle sette matrici, composizioni P3.91 pari e dispari, potenze, dati mancanti e limiti.
- Test dei comandi in DOM simulato, rasterizzazione delle immagini ed esportazione PNG.
- Apertura, chiusura, riapertura, conservazione della bozza sottostante e isolamento delle sessioni.
- Messaggi limitati alla stessa origine e all’istanza corretta, con soli dati tecnici del catalogo.
- Test del Service Worker: precache completo, URL versionati offline e separazione tra HTML del laboratorio e shell del gestionale.
- Integrità dell’archivio e riferimenti locali.

Il collaudo visivo in un browser reale non è stato disponibile nell’ambiente di lavoro. Dopo il caricamento su GitHub va quindi verificato su PC, iPhone e Android, insieme alla prima acquisizione online della nuova cache. Non sono stati eseguiti test sul database operativo privato.

## File essenziali

Il pacchetto contiene solo i file di esecuzione, il backend di riferimento, il README e le licenze già necessarie. Non contiene cartelle di sviluppo, test, duplicati o dipendenze npm. Non sono richieste compilazioni.
