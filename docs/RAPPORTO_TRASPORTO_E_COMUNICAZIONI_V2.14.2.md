# Rapporto tecnico — Trasporto e comunicazioni amministrative 2.14.2

## Risultato osservato

Il campione del 13 agosto 2026 mostra:

```text
client_total_ms        7001
backend_total_ms       1476
transport_overhead_ms  5525
post_wait_ms           2608
status_poll_ms         4390
write CLIENTI             4
transport_mode         status_poll
```

La somma `post_wait_ms + status_poll_ms` è 6.998 ms, praticamente uguale al tempo totale di 7.001 ms. Questo dimostra che il ritardo non è prodotto dalla scrittura su Google Fogli nel campione analizzato.

La scrittura della riga ha richiesto 4 ms. Anche apertura dello Spreadsheet, letture, lookup e lock rimangono molto inferiori all'attesa di trasporto.

## Perché la risposta diretta non basta

Il backend restituisce una piccola pagina HTML che tenta di inviare l'esito al sito GitHub tramite `postMessage`. Nel browser testato il messaggio non è stato ricevuto entro il limite della 2.14.1. Il salvataggio è comunque rimasto sicuro perché:

- il backend memorizza temporaneamente l'esito con `requestId`;
- il record contiene un `request_token` idempotente;
- il frontend interroga `management_mutation_status` prima di ripetere qualsiasi mutazione.

La 2.14.2 non presume più che la risposta iframe debba essere immediata. Avvia presto un secondo canale e mantiene il primo in ascolto.

## Strategia 2.14.2

```text
POST salvataggio
      │
      ├── risposta iframe diretta ───────────────┐
      │                                          │
      └── dopo 700 ms: conferma stato ───────────┤
                                                 ▼
                                    vince la prima risposta valida
```

Il controllo di stato può attendere sul server per un massimo di 2.500 ms. In questo modo una singola esecuzione può intercettare il completamento del POST senza una sequenza di polling ravvicinati.

## Limite residuo

Se anche nella 2.14.2 il risultato arriva tramite `status_poll_race`, una parte del tempo resta dovuta all'avvio e alla risposta di una seconda esecuzione Apps Script. Nello stesso ambiente del test è ragionevole aspettarsi un miglioramento rispetto ai 7 secondi, ma non è corretto garantire una risposta sub-secondo.

Se il tempo residuo restasse vicino a 4–5 secondi, le opzioni successive sarebbero:

1. interfaccia ottimistica: mostrare subito il record come in sincronizzazione e confermarlo in seguito;
2. endpoint intermedio più rapido, per esempio Cloudflare Worker;
3. migrazione del database/API a Supabase/PostgreSQL.

La diagnostica 2.14.2 serve a scegliere sulla base di misure reali.

## Origine delle funzioni amministrative mancanti

Il confronto con l'archivio `seemax-management-suite-v2.13.0-completo(1).zip` ha mostrato che:

- `renderSettings()` non conteneva un editor di benvenuto o patch notes;
- il testo del benvenuto era codificato direttamente in `assets/js/app.js`;
- il backend leggeva `PATCH_NOTES` e `PATCH_ITEMS`, ma non esponeva un endpoint amministrativo per salvarli;
- non erano presenti chiavi configurabili `welcome_*`.

Di conseguenza la funzione ricordata dall'amministratore non era inclusa nello ZIP usato per costruire le release 2.14.0/2.14.1. È plausibile che fosse una personalizzazione presente nel repository pubblicato, in un commit o branch diverso, oppure in una copia successiva del progetto.

La pubblicazione del pacchetto completo ha quindi probabilmente sovrascritto quella personalizzazione non compresa nell'archivio sorgente.

## Implementazione ripristinata

### Backend

Nuove azioni:

```text
management_admin_content
management_save_admin_content
```

Nuove chiavi in `IMPOSTAZIONI`:

```text
welcome_enabled
welcome_kicker
welcome_title
welcome_message
welcome_primary_button
admin_content_revision
```

Le patch notes continuano a usare:

```text
PATCH_NOTES
PATCH_ITEMS
```

### Frontend

L'editor appare esclusivamente agli ADMIN in **Impostazioni** e usa gli stessi dati caricati dal bootstrap. Il messaggio di primo accesso non è più hardcoded: viene composto dai valori salvati nel database.

### Concorrenza

`admin_content_revision` protegge l'editor da sovrascritture silenziose. Se un altro amministratore salva prima, il secondo riceve un conflitto e deve ricaricare i contenuti aggiornati.

## Collaudo eseguito

Sono stati verificati:

- sintassi backend e frontend;
- allineamento versione 2.14.2;
- assenza di funzioni duplicate;
- endpoint amministrativi;
- conservazione dei contenuti esistenti durante l'upgrade;
- scrittura di benvenuto, patch notes e voci;
- rilevamento delle revisioni concorrenti;
- rendering dell'editor desktop e responsive;
- risposta diretta, risposta iframe tardiva e conferma tramite stato;
- idempotenza dei salvataggi.

Il collaudo contro il Foglio aziendale reale richiede il deployment e un nuovo campione di `SeemaxApi.getLastPerformance()`.
