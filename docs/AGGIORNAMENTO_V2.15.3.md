# Aggiornamento Seemax Management Suite 2.15.3

La versione 2.15.3 corregge la nomenclatura del PDF esportato, rende affidabile la pubblicazione delle Patch Notes e prepara i profili degli agenti alla partenza operativa.

## Correzioni incluse

### Nome del PDF

Durante la stampa il sistema imposta il nome sia nel documento dedicato al preventivo sia nel documento principale del browser. Questo evita il ripiego `Seemax Management Suite.pdf` che alcuni browser applicavano al Planner integrato.

Il modello è:

```text
Prev. n. NUMERO-ANNO - del GG-MM-AAAA - INTESTAZIONE CLIENTE - Ledwall Display PITCH - BASExALTEZZA - MONOFACCIALE/BIFACCIALE.pdf
```

Esempio:

```text
Prev. n. 151-26 - del 07-09-2026 - Azienda Test Srl - Ledwall Display P2.5 - 2,00x1,50 - BIFACCIALE.pdf
```

Il titolo originale della pagina viene ripristinato automaticamente dopo la stampa.

### Patch Notes

Ogni modifica salvata dall'editor Patch Notes genera una nuova revisione pubblica e una nuova chiave di pubblicazione. Non è quindi più possibile aggiornare il contenuto lasciando involontariamente tutti gli utenti sulla revisione già letta.

Il pulsante è ora `Salva e pubblica`. Dopo la risposta positiva del backend:

- lo stato locale viene aggiornato con i dati realmente riletti dal Foglio;
- la revisione già vista viene riarmata;
- l'ADMIN visualizza subito il popup appena pubblicato;
- gli altri utenti lo vedono al successivo avvio o refresh, secondo `Solo una volta` o `Sempre`;
- una comunicazione disattivata resta salvata ma non viene mostrata.

Il backend applica la stessa garanzia anche se una versione precedente del frontend invia il vecchio comando `Salva`.

### Reset di lancio dei profili

L'upgrade esegue una sola volta il reset degli account con ruolo diverso da `ADMIN`:

- nome pubblico del profilo;
- descrizione;
- tema e colore;
- icona;
- bacheca trofei.

La migrazione aggiunge `trofei_reset_il` ad `AGENTI`. I progressi dei trofei vengono calcolati esclusivamente usando clienti e pratiche successivi a tale istante, quindi i dati storici di test non possono sbloccare immediatamente i riconoscimenti.

Non vengono modificati:

- username e Chiave ID;
- nome ufficiale, email o telefono;
- ruolo e stato account;
- clienti, pratiche, documenti o magazzino;
- preferenze e personalizzazioni dell'ADMIN.

L'ADMIN continua ad avere tutti i trofei disponibili per verifica. Lo sblocco globale della fase beta viene invece disattivato per gli agenti.

## Procedura di installazione

1. Sostituisci il contenuto di Apps Script con `apps-script/Code.gs` della 2.15.3.
2. Salva il progetto Apps Script.
3. Esegui manualmente `upgradeSeemaxV2153()`.
4. Autorizza lo script se Google lo richiede.
5. Controlla il messaggio restituito, che indica quanti profili agente sono stati azzerati.
6. Crea una nuova versione del deployment Web App mantenendo lo stesso URL `/exec`.
7. Pubblica su GitHub tutti i file del pacchetto 2.15.3.
8. Attendi GitHub Pages ed esegui un refresh forzato.

Frontend, backend e Service Worker devono mostrare la versione `2.15.3`.

## Collaudo rapido

1. Apri un preventivo completo e scegli Stampa/Esporta PDF.
2. Verifica che il nome suggerito rispetti il modello e non sia `Seemax Management Suite.pdf`.
3. In ADMIN apri Impostazioni → Patch Notes, modifica titolo o una voce, abilita il messaggio e premi `Salva e pubblica`.
4. Verifica che il popup aggiornato appaia immediatamente all'ADMIN.
5. Accedi con un agente e verifica che profilo e bacheca siano iniziali e che nessun trofeo storico risulti sbloccato.
6. Verifica che l'ADMIN disponga ancora di tutti i trofei.

L'upgrade è idempotente: una seconda esecuzione non azzera nuovamente i profili già entrati in produzione.
