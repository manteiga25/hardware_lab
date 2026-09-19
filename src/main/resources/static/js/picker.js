import { h } from './dom.js';
import * as api from './api.js';
import * as fmt from './format.js';
import * as m from './metrics.js';

const MIN_QUERY = 2;
const DEBOUNCE_MS = 200;
let pickerCount = 0;

function optionMeta(p) {
  const parts = [];
  if (m.isGpu(p)) {
    const idx = m.performanceIndex(p);
    parts.push(idx !== null ? `índice ${fmt.index(idx)}` : 'sem índice');
    if (m.memoryMb(p)) parts.push(fmt.memory(m.memoryMb(p)));
  } else {
    parts.push(`#${fmt.number(m.rank(p))} no ranking`);
    if (m.cores(p)) parts.push(fmt.plural(m.cores(p), 'núcleo', 'núcleos'));
  }
  parts.push(m.price(p) ? fmt.money(m.price(p)) : 'sem preço');
  return parts.join(', ');
}

/**
 * Search field with suggestions (ARIA 1.2 combobox) backed by /API/search.
 * Calls onPick(product) when a suggestion is chosen. `exclude` hides names already in use and
 * `params` narrows the search (for example { isCpu: false, sort: 'rank,desc' } for graphics cards).
 */
export function createPicker({ label, placeholder, exclude = [], params = {}, onPick }) {
  const id = `picker-${++pickerCount}`;
  const input = h('input', {
    id,
    type: 'text',
    role: 'combobox',
    autocomplete: 'off',
    spellcheck: 'false',
    'aria-autocomplete': 'list',
    'aria-expanded': 'false',
    'aria-controls': `${id}-list`,
    placeholder,
  });
  const list = h('ul', { id: `${id}-list`, class: 'listbox', role: 'listbox', 'aria-label': label, hidden: true });
  const element = h('div', { class: 'picker' },
    h('label', { for: id, text: label }),
    h('div', { class: 'combo' }, input, list));

  let options = [];
  let active = -1;
  let timer = 0;
  let controller = null;

  function open() {
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  function close() {
    list.hidden = true;
    active = -1;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }

  function showStatus(text) {
    active = -1;
    list.replaceChildren(h('li', { class: 'listbox-status', role: 'option', 'aria-disabled': 'true', text }));
    open();
  }

  function renderOptions() {
    if (!options.length) {
      showStatus('Nenhum processador com esse nome.');
      return;
    }
    active = -1;
    list.replaceChildren(...options.map((p, i) => h('li', {
      id: `${id}-option-${i}`,
      class: 'option',
      role: 'option',
      'aria-selected': 'false',
      onclick: () => choose(i),
    },
    h('span', { class: 'option-name', text: p.productName }),
    h('span', { class: 'option-meta', text: optionMeta(p) }))));
    open();
  }

  async function load(query) {
    controller?.abort();
    const current = new AbortController();
    controller = current;
    showStatus('A procurar…');

    try {
      const results = await api.searchProducts({ sort: 'rank,asc', ...params, name: query, size: 8 }, current.signal);
      if (current !== controller) return;
      options = results.filter((p) => !exclude.includes(p.productName));
      renderOptions();
    } catch (error) {
      if (error.name === 'AbortError') return;
      options = [];
      showStatus('Não foi possível carregar sugestões. Tenta outra vez.');
    }
  }

  function move(step) {
    active = (active + step + options.length) % options.length;
    [...list.children].forEach((li, i) => li.setAttribute('aria-selected', String(i === active)));
    const current = list.children[active];
    input.setAttribute('aria-activedescendant', current.id);
    current.scrollIntoView({ block: 'nearest' });
  }

  function choose(i) {
    const product = options[i];
    if (!product) return;
    input.value = product.productName;
    close();
    onPick(product);
  }

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const query = input.value.trim();
    if (query.length < MIN_QUERY) {
      controller?.abort();
      options = [];
      close();
      return;
    }
    timer = setTimeout(() => load(query), DEBOUNCE_MS);
  });

  input.addEventListener('keydown', (event) => {
    const isOpen = !list.hidden && options.length > 0;
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && isOpen) {
      event.preventDefault();
      move(event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Enter' && isOpen && active >= 0) {
      event.preventDefault();
      choose(active);
    } else if (event.key === 'Escape' && !list.hidden) {
      event.preventDefault();
      close();
    }
  });

  input.addEventListener('focus', () => { if (options.length) open(); });
  input.addEventListener('blur', close);
  // Keep focus in the input while clicking an option.
  list.addEventListener('mousedown', (event) => event.preventDefault());

  return { element, focus: () => input.focus() };
}
