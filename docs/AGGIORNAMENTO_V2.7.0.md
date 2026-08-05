# Aggiornamento 2.7.0

## Anagrafica cliente a tab

La creazione e modifica dei clienti è suddivisa in Identificazione, Contatti, Dati Bancari e Localizzazione. Un indicatore rosso segnala le sezioni con obblighi non soddisfatti; la tab diventa verde quando i dati della categoria sono completi.

Sono obbligatori:

- Ragione sociale;
- Numero di cellulare valido;
- almeno uno tra Codice SDI e PEC.

La barra **Anagrafica completa al** misura la quantità complessiva di informazioni registrate. Prefissi internazionali e bandiere, VIES, Agenzia delle Entrate, IBAN e localizzazione guidata restano disponibili.

## Pratiche a tab

Acquisto utilizza Destinatario Ordine, Prodotto, Valore, Indirizzo di Installazione e Dettagli Tecnici. Noleggio e Leasing utilizzano Cliente, Prodotto, Valore, Condizioni Finanziaria, Indirizzo, Dettagli Tecnici e Documenti.

Quando un cliente selezionato non possiede Codice fiscale, P.IVA, e-mail oppure IBAN nei flussi finanziari, i dati vengono richiesti nella pratica e aggiunti automaticamente all’anagrafica senza sovrascrivere valori esistenti.

Gli indirizzi di installazione usano gli elenchi Regione → Provincia → Comune → CAP. Se viene dichiarata la coincidenza con la sede legale e l’anagrafica non contiene ancora un indirizzo, i dati vengono trasferiti al cliente.

Nei dettagli tecnici sono disponibili anche SIM per il traffico rete e predisposizione elettrica, entrambi configurabili come obbligatori dalle Impostazioni.

## Aggiornamento database

Dopo aver sostituito `Code.gs`, eseguire una volta `upgradeSeemaxV24` e pubblicare una nuova versione dello stesso deployment. Verranno aggiunte automaticamente le colonne SDI, PEC, SIM richiesta e predisposizione elettrica.
