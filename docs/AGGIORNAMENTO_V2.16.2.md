# Aggiornamento Seemax Management Suite 2.16.2

La versione 2.16.2 elimina le collisioni tra agenti con le stesse iniziali e impedisce che il numero mostrato in anteprima venga interpretato come identificativo definitivo di una pratica.

## Caso corretto

Michele Purgino e Mario Platania producevano entrambi il prefisso `MP`. Poiché `PR-MP0001` appartiene storicamente a Michele Purgino, la migrazione conserva quella serie e assegna a Mario Platania il primo prefisso esteso disponibile:

| Agente | Numero mostrato | ID tecnico |
|---|---|---|
| Michele Purgino | `MP0001`, `MP0002`, … | `PR-MP0001`, `PR-MP0002`, … |
| Mario Platania | `MPL0001`, `MPL0002`, … | `PR-MPL0001`, `PR-MPL0002`, … |

La stessa regola viene applicata automaticamente a eventuali collisioni future. Il proprietario della prima pratica storica conserva il prefisso breve; gli altri account ricevono un prefisso esteso univoco.

## Sicurezza della numerazione

Il numero visibile durante la compilazione è ora soltanto un'anteprima. Il browser usa un ID temporaneo collegato al `request_token`; numero e ID definitivi vengono generati dal backend mentre detiene lo `ScriptLock`.

Questo impedisce collisioni dovute a:

- stessa coppia di iniziali;
- cache locale non aggiornata;
- due pratiche create contemporaneamente;
- un'altra pratica registrata dopo l'apertura del modulo;
- ripetizione della richiesta dopo un timeout.

Le pratiche storiche non vengono rinumerate e non vengono modificate. La migrazione interviene soltanto sulla nuova colonna `prefisso_pratica` del foglio `AGENTI` e ricostruisce i contatori persistenti.

## Gestione ADMIN

Nell'anagrafica dell'agente è disponibile il campo `Prefisso pratiche`. Il valore deve contenere da 2 a 6 lettere o numeri ed essere univoco.

Dopo che un agente possiede almeno una pratica, il prefisso non può essere cambiato dall'interfaccia: questa protezione evita di dividere accidentalmente la sua sequenza storica.

## Installazione

1. Sostituisci il contenuto del progetto Apps Script con `apps-script/Code.gs` della versione 2.16.2.
2. Salva ed esegui manualmente `upgradeSeemaxV2162()`.
3. Controlla nel foglio `AGENTI` che Michele Purgino abbia `MP` e Mario Platania `MPL` nella colonna `prefisso_pratica`.
4. Pubblica una nuova versione della Web App Apps Script mantenendo lo stesso URL `/exec`.
5. Pubblica su GitHub Pages tutti i file frontend della versione 2.16.2.
6. Esegui `Ctrl+F5` oppure riapri l'applicazione.
7. Verifica che frontend, backend e Service Worker riportino `2.16.2`.

## Recupero della pratica “Da verificare”

Se la riga locale del tentativo fallito è ancora visibile, aprila dopo l'aggiornamento e salvala nuovamente. Il sistema conserva lo stesso token idempotente, sostituisce l'ID locale con un ID temporaneo e assegna sul server il primo numero `MPL` disponibile.

Se la pagina è stata già ricaricata e la riga locale è scomparsa, i dati non erano mai stati scritti sul Foglio e devono essere reinseriti.

## Verifiche incluse

- sintassi frontend e backend;
- assegnazione `MP` a Michele Purgino;
- assegnazione `MPL` a Mario Platania;
- collisioni con ulteriori agenti;
- riconoscimento di prefissi da 2 a 6 caratteri;
- contatori indipendenti per ogni prefisso;
- ID temporaneo nel browser;
- numero definitivo dentro il lock server;
- retry con lo stesso `request_token`;
- compatibilità con preventivi, documenti, trasporto nativo e operazioni in background.
