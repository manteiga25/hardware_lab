import * as api from './api.js';
import { CURRENCY_NOTE, number } from './format.js';
import { Picker } from './picker.js';
import { initSearch } from './search.js';
import { renderComparison, renderComparisonError, renderComparisonLoading } from './compare.js';

const $ = (id) => document.getElementById(id);

const state = {
  slots: { a: null, b: null },
  maxRank: null,
  comparedKey: null,
  lastPicked: null,
};

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const desktop = matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)');

const maxRankReady = api.getMaxRank()
  .then((value) => {
    state.maxRank = value;
    if (value) document.querySelector('[data-max-rank-note]').textContent = ` (neste momento, ${number(value)})`;
    return value;
  })
  .catch(() => null);

$('currency-note').textContent = CURRENCY_NOTE;

/* Desktop-only chip ---------------------------------------------------- */

let chip = null;
let chipLoading = null;

async function syncChip() {
  const wanted = desktop.matches;

  if (chip && (!wanted || chip.reducedMotion !== reduceMotion.matches)) {
    chip.instance.destroy();
    chip = null;
  }
  if (!wanted || chip || chipLoading) return;

  chipLoading = import('./chip.js');
  try {
    const { mountChip } = await chipLoading;
    if (!desktop.matches) return;
    chip = {
      reducedMotion: reduceMotion.matches,
      instance: mountChip($('hero-visual'), { reducedMotion: reduceMotion.matches }),
    };
    chip.instance.show(state.lastPicked);
  } finally {
    chipLoading = null;
  }
}

desktop.addEventListener('change', syncChip);
reduceMotion.addEventListener('change', syncChip);
syncChip();

/* Slots ---------------------------------------------------------------- */

const keyOf = (a, b) => (a && b ? `${a.productName}\n${b.productName}` : null);

const pickers = {
  a: new Picker($('pick-a'), { onChange: (p) => setSlot('a', p, { fromPicker: true }) }),
  b: new Picker($('pick-b'), { onChange: (p) => setSlot('b', p, { fromPicker: true }) }),
};

function setSlot(slot, product, { fromPicker = false } = {}) {
  state.slots[slot] = product;
  if (!fromPicker) pickers[slot].set(product);
  if (product) {
    state.lastPicked = product;
    chip?.instance.show(product);
  }
  hideCompareError();
  search.refreshPicked();
  updateTray();
}

function sideOf(name) {
  if (state.slots.a?.productName === name) return 'A';
  if (state.slots.b?.productName === name) return 'B';
  return null;
}

/* Comparison ----------------------------------------------------------- */

const compareResult = $('compare-result');
const compareEmpty = $('compare-empty');
const compareError = $('compare-error');

function showCompareError(message) {
  compareError.textContent = message;
  compareError.hidden = false;
}

function hideCompareError() {
  compareError.hidden = true;
}

// Resolves text typed without picking a suggestion, using the exact-name endpoint.
async function resolveTyped(slot) {
  if (state.slots[slot]) return;
  const typed = pickers[slot].text;
  if (!typed) return;
  const product = await api.getProduct(typed);
  if (product) setSlot(slot, product);
}

// `fetched` means the slots already hold fresh data from /API/products (examples and shared links).
async function compare({ scroll = true, fetched = false } = {}) {
  hideCompareError();

  try {
    await Promise.all([resolveTyped('a'), resolveTyped('b')]);
  } catch {
    showCompareError('Não foi possível contactar o servidor. Tenta outra vez.');
    return;
  }

  const { a, b } = state.slots;
  if (!a || !b) {
    const missing = !a && !b ? 'nos dois campos' : `no campo ${!a ? 'A' : 'B'}`;
    showCompareError(`Escolhe um processador ${missing}. Escreve parte do nome e seleciona uma sugestão.`);
    return;
  }
  if (a.productName === b.productName) {
    showCompareError('Escolheste o mesmo processador duas vezes. Escolhe dois diferentes.');
    return;
  }

  compareEmpty.hidden = true;
  renderComparisonLoading(compareResult);
  if (scroll) scrollToCompare();

  try {
    let productA = a;
    let productB = b;
    if (!fetched) {
      // Fresh data for both products from the dedicated comparison endpoint.
      const pair = await api.getPair(a.productName, b.productName);
      const byName = new Map(pair.map((p) => [p.productName, p]));
      productA = byName.get(a.productName) ?? a;
      productB = byName.get(b.productName) ?? b;
    }
    renderComparison(compareResult, productA, productB, await maxRankReady);

    state.comparedKey = keyOf(a, b);
    updateTray();
    writeUrl(a, b);
  } catch {
    renderComparisonError(compareResult, 'Não foi possível carregar a comparação.', () => compare({ scroll: false }));
  }
}

function scrollToCompare() {
  const section = $('comparar');
  section.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
  section.focus({ preventScroll: true });
}

$('compare-form').addEventListener('submit', (event) => {
  event.preventDefault();
  compare();
});

document.querySelectorAll('[data-example-a]').forEach((button) => {
  button.addEventListener('click', () => loadPair(button.dataset.exampleA, button.dataset.exampleB));
});

async function loadPair(nameA, nameB, { scroll = true } = {}) {
  hideCompareError();
  try {
    const pair = await api.getPair(nameA, nameB);
    const byName = new Map(pair.map((p) => [p.productName, p]));
    if (!byName.has(nameA) || !byName.has(nameB)) {
      showCompareError('Um dos processadores deste link já não existe na base de dados.');
      return;
    }
    setSlot('a', byName.get(nameA));
    setSlot('b', byName.get(nameB));
    await compare({ scroll, fetched: true });
  } catch {
    showCompareError('Não foi possível contactar o servidor. Tenta outra vez.');
  }
}

/* Shareable URL: ?a=<name>&b=<name>#comparar --------------------------- */

function writeUrl(a, b) {
  const url = new URL(location.href);
  url.searchParams.set('a', a.productName);
  url.searchParams.set('b', b.productName);
  url.hash = 'comparar';
  history.replaceState(null, '', url);
}

function readUrl() {
  const params = new URLSearchParams(location.search);
  const a = params.get('a');
  const b = params.get('b');
  if (a && b) loadPair(a, b, { scroll: false });
}

/* Floating compare tray ------------------------------------------------ */

const tray = $('tray');
const compareForm = $('compare-form');

// The observer only signals scroll changes; visibility is measured when the tray updates.
new IntersectionObserver(() => updateTray()).observe(compareForm);

function formInView() {
  const rect = compareForm.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < innerHeight;
}

function updateTray() {
  const { a, b } = state.slots;
  const pending = (a || b) && keyOf(a, b) !== state.comparedKey;
  tray.hidden = !(pending && !formInView());

  const fill = (el, product) => {
    el.textContent = product ? product.productName : 'Por escolher';
    el.classList.toggle('is-empty', !product);
  };
  fill($('tray-a'), a);
  fill($('tray-b'), b);

  const button = $('tray-compare');
  button.disabled = !(a && b);
  button.textContent = a && b ? 'Comparar' : `Escolhe o ${a ? 'B' : 'A'}`;
}

$('tray-compare').addEventListener('click', () => compare());

/* Search --------------------------------------------------------------- */

const search = initSearch({
  form: $('search-form'),
  results: $('search-results'),
  pager: $('pager'),
  pagerStatus: $('pager-status'),
  errorEl: $('filter-error'),
  maxRankReady,
  onPick: (slot, product) => setSlot(slot, product),
  sideOf,
});

readUrl();
