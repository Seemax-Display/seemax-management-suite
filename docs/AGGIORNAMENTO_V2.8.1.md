# Seemax Management Suite 2.8.1

Questo aggiornamento separa la personalizzazione del profilo dalla gestione della bacheca trofei.

## Novità

- La bacheca può essere salvata completamente vuota senza il reinserimento automatico di quattro trofei.
- Il pulsante **Modifica bacheca** gestisce esclusivamente scelta e ordine dei trofei.
- Il pulsante **Personalizza profilo** gestisce alias pubblico, descrizione, tema, colore e icona della card.
- Sono disponibili quattro temi, sei colori e nove opzioni per l'icona, incluse le iniziali automatiche.
- Le preferenze sono validate sia nel browser sia nel backend.
- Il nome ufficiale dell'agente resta invariato: l'eventuale alias viene usato solo nella pagina profilo.

## Aggiornamento GitHub Pages

Sostituisci i file del repository con quelli presenti nel pacchetto frontend e attendi il completamento della pubblicazione GitHub Pages.

## Aggiornamento Apps Script

1. Sostituisci il contenuto di `Code.gs` con il file aggiornato.
2. Esegui una volta `upgradeSeemaxV281()` e autorizza lo script se richiesto.
3. Crea una **nuova versione** del deployment Web App.
4. Mantieni l'esecuzione come proprietario e l'accesso consentito a chiunque utilizzi il gestionale.
5. Ricarica il sito con `Ctrl+F5`.

L'upgrade aggiunge automaticamente al foglio `AGENTI` le colonne mancanti senza eliminare o spostare i dati esistenti.
