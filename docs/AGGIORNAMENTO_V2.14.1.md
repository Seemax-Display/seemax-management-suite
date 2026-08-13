# Aggiornamento Seemax Management Suite 2.14.1

## Perché esiste questa correzione

La diagnostica reale di un nuovo cliente ha registrato:

```text
Tempo totale browser       24.572 ms
Tempo backend Apps Script   1.698 ms
Tempo esterno al backend   22.874 ms
Scrittura CLIENTI               9 ms
```

Il backend aveva quindi terminato il lavoro in circa 1,7 secondi. Il ritardo non proveniva dalla scrittura su Google Fogli: il frontend stava aspettando una risposta `postMessage` dall'iframe nascosto e, non ricevendola, lasciava trascorrere un timer fisso di 22 secondi prima di controllare lo stato del salvataggio.

La versione 2.14.1 corregge questo canale di risposta e mantiene un recupero alternativo rapido nel caso in cui un browser continui a bloccare il messaggio diretto.

## Modifiche incluse

1. La pagina HTML restituita da `doPost()` usa `XFrameOptionsMode.ALLOWALL`, necessario per poter essere caricata nell'iframe tecnico creato dalla pagina GitHub.
2. La risposta viene inviata sia a `window.parent` sia a `window.top`, perché Apps Script può inserire un livello iframe intermedio.
3. Il frontend comunica al backend l'origine esatta della pagina tramite `response_origin`; il backend la valida e la usa come `targetOrigin` di `postMessage`.
4. Il timer di sicurezza scende da 22.000 a 2.600 millisecondi.
5. Se il messaggio diretto non arriva, la verifica per `requestId` parte immediatamente e viene ripetuta ogni 700 millisecondi.
6. La diagnostica distingue ora:
   - `post_message`: risposta diretta ricevuta;
   - `status_poll`: conferma ottenuta interrogando lo stato;
   - `record_recovery`: recupero finale tramite `request_token`;
   - `post_message_retry`: risposta diretta ricevuta dopo il reinvio idempotente.
7. Quando un amministratore assegna un nuovo cliente a sé stesso, il backend riusa l'utente già autenticato e non esegue una seconda ricerca in `AGENTI`.

## File da aggiornare

### Google Apps Script

Sostituisci:

```text
Code.gs
```

Non sono richieste nuove colonne o nuovi fogli.

### GitHub Pages

Sostituisci almeno:

```text
assets/js/api.js
assets/js/config.js
sw.js
```

Il pacchetto GitHub completo contiene già tutti i file corretti.

## Installazione

1. Crea una copia del Foglio Google e conserva il precedente `Code.gs`.
2. In **Foglio Google → Estensioni → Apps Script**, sostituisci completamente `Code.gs`.
3. Salva il progetto.
4. Esegui una volta:

```javascript
upgradeSeemaxV2141
```

5. Autorizza lo script, se richiesto.
6. Aggiorna il deployment esistente della Web App scegliendo **Nuova versione**. Modificando il deployment esistente, l'URL `/exec` normalmente resta invariato.
7. Carica su GitHub i file della versione 2.14.1.
8. Attendi il completamento di GitHub Pages.
9. Esegui un aggiornamento forzato del browser. Per la PWA, chiudila completamente e riaprila; se necessario cancella la cache del sito una sola volta.

## Collaudo

Crea un nuovo cliente e poi esegui nella console:

```javascript
SeemaxApi.getLastPerformance()
```

Il risultato deve ora contenere anche:

```javascript
{
  transport_mode: "post_message",
  post_wait_ms: 1900,
  status_poll_count: 0,
  fallback_triggered: false
}
```

I numeri sono solo un esempio. Con il backend misurato a circa 1,7 secondi, un salvataggio diretto dovrebbe normalmente concludersi in pochi secondi, non dopo 24–25 secondi.

Se il browser continua a impedire il messaggio diretto, è comunque accettabile ottenere:

```javascript
{
  transport_mode: "status_poll",
  post_wait_ms: 2600,
  status_poll_count: 1,
  fallback_triggered: true
}
```

In quel caso il salvataggio dovrebbe essere confermato poco dopo i 2,6 secondi, senza l'attesa artificiale di 22 secondi.

## Interpretazione rapida

- `backend_total_ms` alto: intervenire su Apps Script o Google Fogli.
- `post_wait_ms` vicino al tempo totale e `post_message`: il backend sta semplicemente lavorando; il messaggio arriva direttamente.
- `post_wait_ms` vicino a 2600 e `status_poll`: il messaggio iframe è stato bloccato, ma il recupero rapido ha funzionato.
- `status_poll_count` elevato: il POST originale sta impiegando più tempo del normale oppure Apps Script è sotto carico.
- `lock_wait_ms` elevato: più utenti stanno scrivendo contemporaneamente.

## Ripristino

Per tornare alla 2.14.0:

1. ripristina il precedente `Code.gs` e pubblica una nuova versione della Web App;
2. ripristina `assets/js/api.js`, `assets/js/config.js` e `sw.js` della 2.14.0;
3. esegui un aggiornamento forzato della pagina.

Nessun dato del Foglio viene trasformato dalla 2.14.1, quindi il ripristino non richiede una migrazione inversa.
