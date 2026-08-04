# Aggiornamento Seemax Management Suite 2.2.0

## Novità: Agente del mese

Il primo accesso di ogni nuovo mese mostra un messaggio celebrativo con il risultato del mese appena concluso. Il calcolo usa esclusivamente il valore delle pratiche in stato `Completata`; le provvigioni non vengono conteggiate.

La schermata mostra:

- nome dell’agente con il fatturato mensile più alto;
- pratica completata di maggior valore;
- fatturato complessivo e numero di pratiche completate nel mese;
- albo d’oro mensile;
- leader storici per Acquisto, Noleggio, Leasing e totale complessivo.

## Emblema Gold e bacheca trofei

L’agente premiato riceve per il mese successivo un accento Gold discreto nell’interfaccia e un emblema sul proprio profilo. La Bacheca trofei personale contiene obiettivi aggiornati automaticamente, con slot oscurati finché il requisito non viene raggiunto:

- Agente del mese e tre vittorie consecutive;
- pratica completata da 50.000 € e da 100.000 €;
- 10 clienti creati;
- 5 pratiche inserite per ciascuna tipologia: Acquisto, Noleggio e Leasing;
- 10 pratiche completate;
- 250.000 € di fatturato completato.

Il messaggio automatico viene mostrato una sola volta per utente e dispositivo nel mese. La scheda presente nella Dashboard permette di riaprire sempre i dettagli.

## Installazione

1. Sostituire i file pubblicati su GitHub con quelli della versione 2.2.0.
2. Sostituire `Code.gs` nell’editor Google Apps Script.
3. Eseguire una volta `setupSeemaxDatabase()` per aggiungere la colonna `completataIl` senza cancellare i dati esistenti.
4. Creare una nuova distribuzione dell’Applicazione Web mantenendo lo stesso livello di accesso.
5. Ricaricare GitHub Pages con `Ctrl + Shift + R`.

Le pratiche completate dopo l’aggiornamento registrano una data di completamento dedicata. Per le pratiche storiche prive di questa data viene utilizzata automaticamente la data dell’ultimo aggiornamento.
