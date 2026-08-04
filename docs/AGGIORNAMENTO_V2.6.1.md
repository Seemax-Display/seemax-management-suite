# Aggiornamento Seemax Management Suite 2.6.1

Versione correttiva dedicata a transizioni, caricamento e conferme animate.

## Correzioni

- Il cerchio di caricamento mantiene sempre la rotazione, anche quando il dispositivo usa **Riduci movimento**.
- L'animazione del loader è isolata dalle regole decorative dell'interfaccia.
- Il caricamento scompare prima dell'avvio della conferma dell'operazione.
- Le conferme importanti vengono mostrate con una bubble centrale animata.
- Il precedente messaggio verde non viene duplicato quando è già presente la bubble.
- Il cambio sezione utilizza una transizione nativa quando supportata dal browser e un'animazione di riserva negli altri casi.
- Con **Riduci movimento** rimane una dissolvenza molto breve, senza spostamenti marcati o particelle.

## Installazione

1. Sostituisci i file del repository GitHub con quelli di questa versione.
2. Sostituisci integralmente `Code.gs` in Apps Script.
3. Esegui una volta `upgradeSeemaxV24`.
4. Pubblica una nuova distribuzione della Web App.
5. Attendi GitHub Pages e ricarica con `Ctrl+F5`.

Non sono richieste modifiche al database.
