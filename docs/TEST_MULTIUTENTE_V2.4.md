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
3. Controllare che gli scarichi siano progressivi e che una richiesta eccedente venga respinta.
4. Verificare una sola coppia coerente `giacenza_prima`/`giacenza_dopo` per ogni movimento.

## Richiesta ripetuta

1. Durante un salvataggio non premere nuovamente il pulsante.
2. Se si verifica un timeout, riprovare dalla stessa schermata.
3. Il token deve impedire la creazione di un duplicato.

## Agente del mese

1. Aprire **Dashboard → Agente del mese → Maggiori dettagli** come ADMIN.
2. Premere **Prova messaggio iniziale**.
3. Verificare il nome dell’agente, la pratica principale e il fatturato.
4. Chiudere e ripetere: l’anteprima deve essere sempre disponibile e non deve modificare il database.

