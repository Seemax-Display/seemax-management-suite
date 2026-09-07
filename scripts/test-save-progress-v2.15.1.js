const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'assets/js/app.js'), 'utf8');
const start = source.indexOf('  function backgroundProgressDescriptor');
const end = source.indexOf('  function haptic', start);
if (start < 0 || end < 0) throw new Error('Funzioni del progresso non trovate.');

function classList() {
  return {
    values: new Set(['is-hidden']),
    toggle(name, force) {
      const enabled = force === undefined ? !this.values.has(name) : force;
      if (enabled) this.values.add(name); else this.values.delete(name);
    },
    contains(name) { return this.values.has(name); }
  };
}

const elements = {};
for (const id of ['saveProgressCenter', 'saveProgressIcon', 'saveProgressTitle', 'saveProgressSubtitle', 'saveProgressPercent', 'saveProgressBar', 'saveProgressTrack', 'saveProgressItems']) {
  elements[id] = {
    classList: classList(), textContent: '', style: {}, attrs: {}, innerHTML: '',
    setAttribute(key, value) { this.attrs[key] = value; }
  };
}

const sandbox = {
  Map, Math, Date, String, Number, Array,
  window: { setTimeout: () => 0, clearTimeout, setInterval, clearInterval },
  saveProgressState: { items: new Map() },
  $: (id) => elements[id],
  esc: (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]))
};
vm.createContext(sandbox);
vm.runInContext(source.slice(start, end), sandbox);

function check(condition, message) {
  if (!condition) throw new Error(message);
}

(async () => {
  const first = sandbox.startSaveProgress('clients', { ragioneSociale: 'Cliente Prova' });
  await new Promise((resolve) => setTimeout(resolve, 900));
  const firstProgress = Number(elements.saveProgressPercent.textContent.replace('%', ''));
  check(!elements.saveProgressCenter.classList.contains('is-hidden'), 'Pannello singolo non visibile.');
  check(elements.saveProgressTitle.textContent.includes('cliente'), 'Etichetta cliente non visibile.');
  check(firstProgress > 9 && firstProgress <= 92, 'Avanzamento intermedio fuori intervallo.');
  check(Number(elements.saveProgressTrack.attrs['aria-valuenow']) === firstProgress, 'Valore accessibile non allineato.');

  const second = sandbox.startSaveProgress('practices', { numero: 'DF0099' });
  check(elements.saveProgressCenter.classList.contains('multiple'), 'Modalità multipla non attiva.');
  check(elements.saveProgressTitle.textContent.includes('2 operazioni'), 'Conteggio simultaneo errato.');

  sandbox.completeSaveProgress(first, { ragioneSociale: 'Cliente Prova' });
  check(elements.saveProgressTitle.textContent.includes('pratica'), 'La seconda operazione non resta attiva.');
  sandbox.completeSaveProgress(second, { numero: 'DF0099' });
  check(elements.saveProgressCenter.classList.contains('complete'), 'Stato completato assente.');
  check(elements.saveProgressPercent.textContent === '100%', 'Il completamento non raggiunge il 100%.');

  sandbox.failSaveProgress(second, { numero: 'DF0099' }, new Error('Errore tardivo'));
  check(elements.saveProgressCenter.classList.contains('complete'), 'Un errore tardivo ha sostituito una conferma valida.');

  const third = sandbox.startSaveProgress('clients', { ragioneSociale: '<Cliente & Test>' });
  sandbox.failSaveProgress(third, { ragioneSociale: '<Cliente & Test>' }, new Error('Errore simulato'));
  check(elements.saveProgressCenter.classList.contains('failed'), 'Stato errore assente.');
  check(elements.saveProgressItems.innerHTML.includes('&lt;Cliente &amp; Test&gt;'), 'Testo dinamico non sottoposto a escaping.');

  const deletion = sandbox.startDeleteProgress('documents', { id: 'DOC-1', nome: 'Contratto.pdf' });
  check(sandbox.hasActiveBackgroundProgress('delete', 'documents', 'DOC-1'), 'Eliminazione attiva non rilevata.');
  check(elements.saveProgressItems.innerHTML.includes('Contratto.pdf'), 'File in eliminazione non visibile.');
  sandbox.completeBackgroundProgress(deletion, { id: 'DOC-1', nome: 'Contratto.pdf' });

  const stock = sandbox.startInventoryProgress({ operazione: 'SCARICO', quantita: 12, product_id: 'p25' }, { nome: 'P2.5' });
  check(elements.saveProgressItems.innerHTML.includes('Scarico merce'), 'Movimento magazzino non visibile.');
  check(elements.saveProgressItems.innerHTML.includes('12 cabinet'), 'Quantità movimento non visibile.');
  sandbox.failBackgroundProgress(stock, { operazione: 'SCARICO', quantita: 12, product_name: 'P2.5' }, new Error('Giacenza insufficiente'));
  check(elements.saveProgressItems.innerHTML.includes('Da verificare'), 'Errore magazzino non segnalato.');

  for (const item of sandbox.saveProgressState.items.values()) clearInterval(item.timer);
  console.log(`Test operazioni UI 2.15.1 OK: avanzamento ${firstProgress}%, salvataggi, eliminazioni, magazzino, concorrenza ed errori.`);
})().catch((error) => {
  for (const item of sandbox.saveProgressState.items.values()) clearInterval(item.timer);
  console.error(error);
  process.exit(1);
});
