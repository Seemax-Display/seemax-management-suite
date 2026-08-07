# Seemax Management Suite 2.8.2

Questo aggiornamento corregge il primo accesso, rende più fluida la bacheca trofei e introduce una stampa dedicata a Safari su iPhone e iPad.

## Novità

- L'accesso mostra un comando a forma di occhio per visualizzare o nascondere la Chiave ID.
- Il benvenuto automatico viene mostrato esclusivamente quando `AGENTI.ultimo_accesso` era vuoto prima del login; i refresh successivi non lo riaprono.
- Aggiunta e rimozione dei trofei aggiornano solo gli elementi interessati, senza ricreare o far lampeggiare la finestra della bacheca.
- Su smartphone il pulsante Tutorial scompare mentre è aperta una finestra del gestionale.
- Su smartphone la modalità Standard/Rapida è gestita nel menu laterale e non occupa più la parte inferiore della schermata.
- In Modalità Rapida, il menu laterale mostra anche **SALVA TUTTO** con il numero di modifiche ancora da sincronizzare.
- Su iPhone e iPad il preventivo viene aperto in un documento di stampa isolato: nessun elemento del Management Suite e nessuna pagina bianca alternata.

## Aggiornamento GitHub Pages

Sostituisci i file del repository con quelli presenti nel pacchetto frontend e attendi il completamento della pubblicazione GitHub Pages.

## Aggiornamento Apps Script

1. Sostituisci il contenuto di `Code.gs` con il file aggiornato.
2. Esegui una volta `upgradeSeemaxV282()` e autorizza lo script se richiesto.
3. Crea una **nuova versione** del deployment Web App.
4. Mantieni l'esecuzione come proprietario e l'accesso consentito a chiunque utilizzi il gestionale.
5. Ricarica il sito con `Ctrl+F5`.

La funzione di upgrade mantiene i dati esistenti e assicura che la colonna `ultimo_accesso` sia presente nel foglio `AGENTI`.

## Primo test su iPhone

Safari apre una pagina temporanea contenente soltanto il preventivo e richiama da lì la stampa. Se i popup sono stati bloccati manualmente per il sito, consentili nelle impostazioni di Safari e ripeti il comando **Stampa / Salva PDF**.
