# Seemax Management Suite 2.14.0

## Comunicazioni controllate dall'amministratore

La pagina **Impostazioni** è ora divisa in tre tab:

- **Generale**: azienda, obiettivo e collegamento;
- **Comunicazioni**: messaggio di benvenuto e Patch Notes;
- **Pratiche**: obbligatorietà dei campi.

Per entrambe le comunicazioni l'ADMIN può scegliere:

- **Non mostrare**: disattivando l'interruttore;
- **Mostra una volta**: ogni utente vede la revisione una sola volta;
- **Mostra ad ogni avvio**: il messaggio appare dopo ogni apertura o refresh.

La lettura di una comunicazione impostata su **Mostra una volta** viene salvata
nel profilo dell'agente, nelle colonne `welcome_seen_revision` e
`patch_seen_revision`. Non dipende quindi dal singolo browser.

Modificare il contenuto, riattivare una comunicazione disabilitata o selezionare
**Ripubblica** aumenta la revisione. Tutti gli utenti vedranno nuovamente il
messaggio anche se avevano confermato la revisione precedente.

## Installazione

1. Sostituire `apps-script/Code.gs` nell'editor Apps Script.
2. Eseguire manualmente `upgradeSeemaxV2140()` e concedere le autorizzazioni.
3. Pubblicare una nuova versione del deployment Web App mantenendo lo stesso URL `/exec`.
4. Pubblicare tutti i file frontend su GitHub Pages.
5. Eseguire un refresh forzato della pagina.

Frontend, backend e Service Worker devono rispondere con la versione `2.14.0`.

## Formato degli elementi Patch Notes

Ogni riga utilizza:

```text
emoji | titolo | descrizione
```

Esempio:

```text
🚀 | Prestazioni migliorate | Le pratiche vengono salvate più rapidamente.
📦 | Magazzino sincronizzato | Le giacenze provengono da PRODOTTI_LED.
```

## Priorità degli avvisi

I popup non vengono sovrapposti. L'ordine è:

1. Agente del mese;
2. messaggio amministrativo di benvenuto;
3. Patch Notes;
4. tutorial di primo accesso.

