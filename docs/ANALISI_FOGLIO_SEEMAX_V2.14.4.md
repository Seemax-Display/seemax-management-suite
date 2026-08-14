# Analisi del Foglio Seemax per la release 2.14.4

## File esaminato

È stata analizzata la copia Excel del Foglio Google fornita con il progetto. La struttura comprende, tra gli altri, i fogli:

```text
AGENTI
CLIENTI
PRATICHE
PRODOTTI_LED
MOVIMENTI_MAGAZZINO
DOCUMENTI
IMPOSTAZIONI
PATCH_NOTES
PATCH_ITEMS
```

## Compatibilità delle comunicazioni

### AGENTI

Sono già presenti le colonne:

```text
welcome_seen_revision
patch_seen_revision
```

La 2.14.4 le usa per ricordare la visualizzazione della comunicazione per account. Non è necessario aggiungerle manualmente.

### IMPOSTAZIONI

La tabella usa una struttura chiave/valore. Nel file sono presenti le chiavi originarie:

```text
welcome_message_enabled
welcome_message_frequency
welcome_message_revision
welcome_message_title
welcome_message_body
welcome_message_button
```

Questi valori sono la fonte prioritaria della migrazione 2.14.4. I campi grafici aggiuntivi vengono creati senza sovrascriverli.

Nel Foglio sono presenti anche chiavi duplicate introdotte dalle release precedenti. `upgradeSeemaxV2144()` ne migra gli eventuali valori utili e poi le elimina.

### PATCH_NOTES

È una tabella chiave/valore e contiene già titolo, versione, introduzione e testo finale. Nella copia più recente sono presenti anche stato, modalità e revisione di pubblicazione.

### PATCH_ITEMS

Usa le colonne:

```text
emoji
title
text
attivo
```

La struttura coincide con l'editor amministrativo. Le righe esistenti vengono conservate.

## Impatto della migrazione

La 2.14.4 non richiede modifiche alle tabelle operative:

- nessuna nuova colonna in `CLIENTI`;
- nessuna nuova colonna in `PRATICHE`;
- nessuna nuova colonna in `PRODOTTI_LED`;
- nessuna nuova colonna in `MOVIMENTI_MAGAZZINO`;
- nessuna reimportazione del file Excel.

La funzione di upgrade interviene soltanto sulla configurazione delle comunicazioni e sulla versione tecnica.

## Verifica post-upgrade

Dopo l'esecuzione di `upgradeSeemaxV2144()` è possibile eseguire:

```javascript
auditCommunicationsV2144()
```

Il risultato deve mostrare:

- un solo contenuto `welcome` basato sulle chiavi `welcome_message_*`;
- le Patch notes lette da `PATCH_NOTES` e `PATCH_ITEMS`;
- `obsolete_settings_still_present: []`.
