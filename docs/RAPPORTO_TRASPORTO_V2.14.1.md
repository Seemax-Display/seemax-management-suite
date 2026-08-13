# Rapporto tecnico trasporto POST — Seemax 2.14.1

## Evidenza misurata

La rilevazione del 13 agosto 2026 mostra che il backend conclude `management_upsert` in 1.698 ms, mentre il browser termina dopo 24.572 ms. La differenza di 22.874 ms coincide con il timeout di 22.000 ms presente nella funzione `postForm()` della 2.14.0, più il tempo necessario alla successiva richiesta JSONP di conferma.

La scrittura della nuova riga CLIENTI richiede solo 9 ms nella misurazione. Le operazioni Google osservate sono quindi migliorabili, ma non spiegano l'attesa di 24,5 secondi.

## Catena precedente

```text
Browser
  → form POST in iframe nascosto
  → Google Apps Script elabora in 1,7 s
  → HtmlService prova parent.postMessage(...)
  → il messaggio non raggiunge GitHub Pages
  → il browser attende 22 s
  → parte management_mutation_status
  → salvataggio confermato
```

## Cause tecniche affrontate

### Incorporamento della risposta

`HtmlOutput` usa la modalità X-Frame predefinita se non viene specificato altro. La risposta 2.14.1 imposta `HtmlService.XFrameOptionsMode.ALLOWALL` soltanto sulla piccola pagina tecnica restituita dal POST. La pagina non contiene pulsanti, moduli o contenuti amministrativi: esegue esclusivamente l'invio dell'esito al chiamante.

### Iframe intermedio di Apps Script

Il servizio HTML di Apps Script può eseguire il contenuto in un iframe sandbox. Per questo `parent` può indicare un contenitore Google intermedio anziché la pagina GitHub. La risposta viene ora inviata sia a `parent` sia a `top`.

### Origine destinataria

GitHub Pages passa `window.location.origin` nel campo `response_origin`. Apps Script accetta solo origini HTTPS oppure localhost HTTP per lo sviluppo e usa tale valore come `targetOrigin`. Un valore non valido ricade sul comportamento compatibile `*`.

### Recupero indipendente dal postMessage

La sicurezza del salvataggio non dipende dal messaggio iframe. Il risultato resta memorizzato temporaneamente con `requestId`, mentre il record contiene un `request_token` idempotente. Dopo 2,6 secondi il browser può quindi confermare l'operazione senza ripeterla alla cieca.

## Prestazioni backend ancora osservabili

Nel campione ricevuto:

```text
Apertura Spreadsheet             183 ms
Lookup AGENTI autenticazione      80 ms
Lettura riga AGENTI                2 ms
Lettura intestazioni CLIENTI      83 ms
Lookup request_token CLIENTI      82 ms
Lookup id CLIENTI                118 ms
Secondo lookup AGENTI             98 ms
Scrittura riga CLIENTI              9 ms
Attesa lock                       119 ms
Durata lock                       869 ms
Totale backend                  1.698 ms
```

La 2.14.1 elimina il secondo lookup AGENTI quando il nuovo cliente viene assegnato allo stesso amministratore autenticato. Gli altri tempi sono compatibili con un backend Apps Script che apre un Foglio e svolge controlli di unicità e idempotenza.

## Obiettivo di collaudo

La correzione è riuscita quando il nuovo campione non presenta più un `transport_overhead_ms` vicino a 22–23 secondi.

Esito preferito:

```text
transport_mode       post_message
fallback_triggered   false
status_poll_count     0
```

Esito di sicurezza comunque corretto:

```text
transport_mode       status_poll
post_wait_ms          circa 2600
fallback_triggered   true
```

Il collaudo reale deve essere eseguito sul deployment aziendale, perché le policy del browser, gli eventuali blocchi dei cookie di terze parti e la latenza dei server Google non sono riproducibili completamente in una verifica statica locale.
