import { h } from './dom.js';
import * as api from './api.js';
import * as fmt from './format.js';
import * as m from './metrics.js';

const MIN_QUERY = 2;
const DEBOUNCE_MS = 200;

function optionMeta(p) {
  const parts = [`#${fmt.number(m.rank(p))} no ranking`];
  if (m.cores(p)) parts.push(fmt.plural(m.cores(p), 'núcleo', 'núcleos'));
  parts.push(m.price(p) ? fmt.money(m.price(p)) : 'sem preço');
  return parts.join(', ');
}

// Accessible combobox (ARIA 1.2 pattern) backed by /API/search.
export class Picker {
  constructor(input, { onChange }) {
    this.input = input;
    this.list = document.getElementById(input.getAttribute('aria-controls'));
    this.onChange = onChange;
    this.product = null;
    this.options = [];
    this.active = -1;
    this.timer = 0;
    this.controller = null;

    input.addEventListener('input', () => this.handleInput());
    input.addEventListener('keydown', (event) => this.handleKey(event));
    input.addEventListener('focus', () => { if (!this.product && this.options.length) this.open(); });
    input.addEventListener('blur', () => this.close());
    // Keep focus in the input while clicking an option.
    this.list.addEventListener('mousedown', (event) => event.preventDefault());
  }

  get text() {
    return this.input.value.trim();
  }

  set(product) {
    this.product = product;
    this.input.value = product ? product.productName : '';
    this.options = [];
    this.close();
  }

  handleInput() {
    if (this.product) {
      this.product = null;
      this.onChange(null);
    }

    clearTimeout(this.timer);
    const query = this.text;

    if (query.length < MIN_QUERY) {
      this.controller?.abort();
      this.options = [];
      this.close();
      return;
    }

    this.timer = setTimeout(() => this.load(query), DEBOUNCE_MS);
  }

  async load(query) {
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.showStatus('A procurar…');

    try {
      const results = await api.searchProducts({ name: query, size: 8, sort: 'rank,asc' }, controller.signal);
      if (controller !== this.controller) return;
      this.options = results;
      this.renderOptions();
    } catch (error) {
      if (error.name === 'AbortError') return;
      this.options = [];
      this.showStatus('Não foi possível carregar sugestões. Tenta outra vez.');
    }
  }

  renderOptions() {
    if (!this.options.length) {
      this.showStatus('Nenhum processador com esse nome.');
      return;
    }

    this.active = -1;
    this.list.replaceChildren(...this.options.map((p, i) => h('li', {
      id: `${this.list.id}-${i}`,
      class: 'option',
      role: 'option',
      'aria-selected': 'false',
      onclick: () => this.choose(i),
    },
    h('span', { class: 'option-name', text: p.productName }),
    h('span', { class: 'option-meta', text: optionMeta(p) }))));
    this.open();
  }

  showStatus(text) {
    this.active = -1;
    this.list.replaceChildren(h('li', { class: 'listbox-status', role: 'option', 'aria-disabled': 'true', text }));
    this.open();
  }

  handleKey(event) {
    const isOpen = !this.list.hidden && this.options.length > 0;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        if (!isOpen) return;
        event.preventDefault();
        this.move(event.key === 'ArrowDown' ? 1 : -1);
        break;
      case 'Enter':
        if (isOpen && this.active >= 0) {
          event.preventDefault();
          this.choose(this.active);
        }
        break;
      case 'Escape':
        if (!this.list.hidden) {
          event.preventDefault();
          this.close();
        }
        break;
    }
  }

  move(step) {
    const count = this.options.length;
    this.active = (this.active + step + count) % count;

    [...this.list.children].forEach((li, i) => li.setAttribute('aria-selected', String(i === this.active)));
    const current = this.list.children[this.active];
    this.input.setAttribute('aria-activedescendant', current.id);
    current.scrollIntoView({ block: 'nearest' });
  }

  choose(i) {
    const product = this.options[i];
    if (!product) return;
    this.set(product);
    this.onChange(product);
  }

  open() {
    this.list.hidden = false;
    this.input.setAttribute('aria-expanded', 'true');
  }

  close() {
    this.list.hidden = true;
    this.active = -1;
    this.input.setAttribute('aria-expanded', 'false');
    this.input.removeAttribute('aria-activedescendant');
  }
}
