# Aggiornamento 2.7.1

## Modifiche incluse

- L'opzione **Condividi cliente** rimane sempre visibile, indipendentemente dalla tab aperta.
- Le **Note commerciali** sono state spostate nella nuova tab neutra **Altro**.
- Gli indicatori di obbligatorietà di **SDI** e **PEC** si aggiornano dinamicamente: compilando uno dei due, l'altro diventa facoltativo.
- Rimosso il controllo periodico che mostrava l'avviso relativo a un nuovo listino. I dati aggiornati vengono caricati automaticamente al refresh e le patch notes vengono mostrate solo per una versione effettivamente nuova.
- La stampa S.Q.P. viene generata in un documento isolato: menu, sidebar e interfaccia del Management Suite non entrano più nel PDF.
- Le sezioni di stampa sono vincolate a pagine A4 autonome: preventivo, scheda tecnica, finanziaria e dichiarazione di conformità.
- Il riepilogo IFIS concentra nella pagina finanziaria anche costi e tassi prima distribuiti nella seconda pagina.

## Pubblicazione

1. Carica tutti i file del pacchetto frontend nel repository GitHub Pages.
2. Sostituisci `Code.gs` nel progetto Apps Script.
3. Esegui una volta `upgradeSeemaxV24`.
4. Pubblica una nuova versione del deployment Apps Script.
5. Aggiorna il gestionale con `Ctrl + F5`.
