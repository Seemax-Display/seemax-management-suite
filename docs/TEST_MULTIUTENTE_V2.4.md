# Test operativo multiutente 2.4

Usare due finestre in incognito con due account differenti.

## Creazioni simultanee

1. Preparare una nuova pratica in entrambe le finestre.
2. Premere **Crea pratica** quasi contemporaneamente.
3. Verificare che entrambe esistano e abbiano identificativi differenti.
4. Ripetere con due clienti e verificare che siano presenti su righe differenti.

## Conflitto controllato

1. Aprire lo stesso cliente con il creatore e con un ADMIN.
2. Modificare e salvare dalla prima finestra.
3. Senza ricaricare, modificare e salvare dalla seconda.
4. La seconda deve ricevere l’avviso di conflitto; la prima modifica deve rimanere intatta.

## Magazzino

1. Aprire due pratiche che utilizzano lo stesso prodotto.
2. Impostarle su **Accettata** quasi contemporaneamente.
3. Controllare che gli scarichi siano progressivi. Se la seconda pratica eccede la disponibilità, deve essere salvata senza scarico, con `magazzino_in_attesa = SI` e relativo avviso; `PRODOTTI_LED` non deve mai diventare negativo.
4. Verificare una sola coppia coerente `giacenza_prima`/`giacenza_dopo` per ogni movimento.

## Richiesta ripetuta

1. Durante un salvataggio non è necessario premere nuovamente il pulsante: dalla 2.13 il client controlla e riprende automaticamente la richiesta.
2. Simulare una rete lenta e attendere la conferma.
3. Verificare che esista una sola riga con quel `request_token` e che il cliente/pratica non sia duplicato.
4. Ripetere anche con **Inserisci pratica** dal Quotation Planner e con un movimento manuale di magazzino.

## Agente del mese

1. Aprire **Dashboard → Agente del mese → Maggiori dettagli** come ADMIN.
2. Verificare che mese, agente, pratica principale e fatturato appartengano tutti allo stesso periodo di riferimento.
3. Per collaudare il messaggio iniziale senza attendere il primo del mese, usa la procedura amministrativa descritta nella guida della relativa versione; il vecchio pulsante **Prova messaggio** non fa più parte dell'interfaccia.
