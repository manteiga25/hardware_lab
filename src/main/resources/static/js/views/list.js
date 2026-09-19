import { h } from '../dom.js';
import * as api from '../api.js';
import * as fmt from '../format.js';
import * as m from '../metrics.js';
import { paths } from '../router.js';
import { selection } from '../selection.js';

const PAGE_SIZE = 20;
const TYPING_DELAY_MS = 300;

// Builds the list page of one category (see categories.js). Each category keeps its own
// filters, page and results, so switching between processors and graphics cards loses nothing.
export function createList(category, { maxRankReady, onResults }) {
  const id = (name) => `${category.key}-${name}`;
  const orderOf = (value) => category.orders.find((o) => o.value === value) ?? category.orders[0];

  /* Markup --------------------------------------------------------------- */

  const query = h('input', {
    id: id('q'),
    type: 'search',
    autocomplete: 'off',
    spellcheck: 'false',
    placeholder: category.list.placeholder,
  });
  const illustrationSlot = h('div', { class: 'illustration-slot', 'aria-hidden': 'true' });

  const hero = h('div', { class: 'hero', 'data-tilt-area': '' },
    h('div', { class: 'container hero-grid' },
      h('div', { class: 'hero-copy' },
        h('h1', { id: id('title'), tabindex: '-1', text: category.list.title }),
        h('p', { class: 'lead', text: category.list.lead }),
        h('div', { class: 'search-field' },
          h('label', { for: query.id, text: category.list.searchLabel }),
          query)),
      illustrationSlot));

  const field = (def) => {
    const control = def.type === 'select'
      ? h('select', { id: id(def.name), name: def.name }, def.options.map((option) => {
        const [value, label] = Array.isArray(option) ? option : [option, option];
        return h('option', { value, text: label });
      }))
      : h('input', {
        id: id(def.name),
        name: def.name,
        type: 'number',
        inputmode: def.integer ? 'numeric' : 'decimal',
        min: def.min,
        max: def.max,
        step: def.step,
      });
    return h('div', { class: 'field' }, h('label', { for: control.id, text: def.label }), control);
  };

  const check = (name, label) => h('div', { class: 'field-check' },
    h('input', { id: id(name), name, type: 'checkbox' }),
    h('label', { for: id(name), text: label }));

  const fields = h('div', { id: id('filters'), class: 'filter-fields' },
    category.filters.map(field),
    field({ type: 'select', name: 'order', label: 'Ordenar por', options: category.orders.map((o) => [o.value, o.label]) }),
    h('div', { class: 'filter-footer' },
      h('div', { class: 'filter-checks' },
        check('priced', 'Só com preço registado'),
        category.checks.map((c) => check(c.name, c.label))),
      h('button', { type: 'reset', class: 'link-button', text: 'Limpar filtros' })));

  // Filters plus "Ordenar por", all in one row on wide screens.
  fields.style.setProperty('--filter-columns', String(category.filters.length + 1));

  const toggle = h('button', {
    type: 'button',
    class: 'btn btn-ghost filters-toggle',
    'aria-expanded': 'false',
    'aria-controls': fields.id,
    text: 'Filtros',
  });
  const errorEl = h('p', { class: 'form-error', role: 'alert', hidden: true });
  const form = h('form', { class: 'filters', novalidate: true, 'aria-label': 'Filtros' }, toggle, fields, errorEl);

  const results = h('div', { class: 'results', 'aria-live': 'polite' });
  const pagerStatus = h('span', { class: 'pager-status' });
  const prev = h('button', { type: 'button', class: 'btn btn-ghost', text: 'Anterior' });
  const next = h('button', { type: 'button', class: 'btn btn-ghost', text: 'Seguinte' });
  const pager = h('nav', { class: 'pager', 'aria-label': 'Páginas de resultados', hidden: true }, prev, pagerStatus, next);

  const root = h('section', { class: 'view', 'data-view': `list-${category.key}`, 'aria-labelledby': id('title'), hidden: true },
    hero,
    h('div', { class: 'container catalog' },
      form,
      h('p', { class: 'results-note' }, `${category.list.note} `, h('a', { href: paths.method(), text: 'Como calculamos' })),
      results,
      pager));

  const priced = form.elements.priced;
  const order = form.elements.order;

  /* Behaviour ------------------------------------------------------------ */

  let page = 0;
  let controller = null;
  let typingTimer = 0;
  let pricedByUser = false;
  let loaded = false;

  // Price-based orders only make sense with a known price, so they force the checkbox on.
  function syncPricedCheckbox() {
    if (orderOf(order.value).needsPrice) {
      priced.checked = true;
      priced.disabled = true;
    } else {
      priced.disabled = false;
      priced.checked = pricedByUser;
    }
  }

  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = !message;
  }

  function readParams(maxRank) {
    for (const def of category.filters.filter((d) => d.type === 'number')) {
      const input = form.elements[def.name];
      const value = input.value;
      const valid = !input.validity.badInput && (!value || (+value > 0 && (!def.integer || Number.isInteger(+value))));
      if (!valid) throw new RangeError(def.error);
    }

    const values = Object.fromEntries(new FormData(form));
    const chosenOrder = orderOf(values.order);
    const params = {
      isCpu: category.isCpu,
      page,
      size: PAGE_SIZE,
      sort: chosenOrder.sort,
      ...category.toParams(values, maxRank),
    };

    const name = query.value.trim();
    if (name) params.name = name;

    // Price 0 means "unknown", so any price filter or price-based order excludes it.
    if (chosenOrder.needsPrice || priced.checked || params.maxCost) params.minCost = '0.01';

    return params;
  }

  async function run() {
    clearTimeout(typingTimer);
    controller?.abort();
    const current = new AbortController();
    controller = current;

    const maxRank = await maxRankReady;
    let params;
    try {
      params = readParams(maxRank);
      showError('');
    } catch (error) {
      showError(error.message);
      return;
    }

    renderLoading();

    try {
      const products = await api.searchProducts(params, current.signal);
      if (current !== controller) return;
      render(products, maxRank);
      onResults(products, params.name ?? '');
    } catch (error) {
      if (error.name === 'AbortError') return;
      renderError();
    }
  }

  function runFromStart() {
    page = 0;
    run();
  }

  function renderLoading() {
    results.setAttribute('aria-busy', 'true');
    results.replaceChildren(h('div', { role: 'status' },
      h('span', { class: 'sr-only', text: 'A carregar…' }),
      Array.from({ length: 6 }, () => h('div', { class: 'skeleton-row' }))));
  }

  function renderError() {
    results.removeAttribute('aria-busy');
    pager.hidden = true;
    results.replaceChildren(h('div', { class: 'status-panel' },
      h('p', {}, h('strong', { text: `Não foi possível carregar ${category.g.theMany}.` })),
      h('p', { text: 'Verifica se o servidor está a correr e tenta outra vez.' }),
      h('button', { type: 'button', class: 'btn btn-ghost', text: 'Tentar outra vez', onclick: run })));
  }

  function render(products, maxRank) {
    results.removeAttribute('aria-busy');

    if (!products.length) {
      pager.hidden = page === 0;
      updatePager(0);
      results.replaceChildren(page === 0
        ? h('div', { class: 'status-panel' },
          h('p', {}, h('strong', { text: 'Nada corresponde a esta pesquisa.' })),
          h('p', { text: 'Experimenta outro nome, subir o preço máximo ou limpar os filtros.' }),
          h('button', { type: 'button', class: 'btn btn-ghost', text: 'Limpar filtros', onclick: () => form.reset() }))
        : h('div', { class: 'status-panel' },
          h('p', {}, h('strong', { text: 'Não há mais resultados nesta pesquisa.' }))));
      return;
    }

    pager.hidden = false;
    updatePager(products.length);
    results.replaceChildren(resultTable(products, maxRank));
  }

  function updatePager(count) {
    prev.disabled = page === 0;
    next.disabled = count < PAGE_SIZE;
    pagerStatus.textContent = `Página ${page + 1}`;
  }

  function resultTable(products, maxRank) {
    const th = (text, right) => h('th', { scope: 'col', class: right ? 'is-right' : null, text });
    return h('table', { class: 'result-table' },
      h('caption', { class: 'sr-only', text: 'Resultados' }),
      h('thead', {}, h('tr', {},
        th(category.list.nameColumn),
        category.columns.map((column) => th(column.label, true)),
        th('Preço', true),
        th('Custo por ponto', true),
        h('th', { scope: 'col' }, h('span', { class: 'sr-only', text: 'Comparar' })))),
      h('tbody', {}, products.map((p) => resultRow(p, maxRank))));
  }

  function resultRow(p, maxRank) {
    const missing = () => h('span', { class: 'missing', text: 'Sem dados' });
    const cpp = m.costPerPoint(p, maxRank);

    return h('tr', {},
      h('td', { class: 'result-main' },
        h('a', { class: 'result-name', href: paths.detail(p), text: p.productName }),
        h('span', { class: 'result-sub', text: category.subline(p).filter(Boolean).join(', ') })),
      category.columns.map((column) => {
        const [main, sub] = column.cell(p, maxRank);
        return h('td', { class: 'is-right', 'data-label': column.label },
          main === null || main === undefined
            ? missing()
            : h('span', { class: sub ? 'result-strong' : null, text: typeof main === 'number' ? fmt.index(main) : main }),
          sub ? h('span', { class: 'result-sub', text: sub }) : null);
      }),
      h('td', { class: 'is-right', 'data-label': 'Preço' }, m.price(p) ? fmt.money(m.price(p)) : missing()),
      h('td', { class: 'is-right', 'data-label': 'Custo por ponto' }, cpp !== null ? fmt.money(cpp) : missing()),
      h('td', { class: 'result-actions' }, compareToggle(p)));
  }

  function compareToggle(product) {
    const button = h('button', {
      type: 'button',
      class: 'btn btn-ghost btn-small compare-toggle',
      'aria-label': `Comparar ${product.productName}`,
      dataset: { name: product.productName },
      onclick: () => selection.toggle(category.key, product),
    });
    updateToggle(button);
    return button;
  }

  function updateToggle(button) {
    const selected = selection.has(category.key, button.dataset.name);
    button.setAttribute('aria-pressed', String(selected));
    button.textContent = selected ? category.g.selected : 'Comparar';
    // Only two at a time; the bar at the bottom explains how to swap one.
    button.disabled = !selected && selection.isFull(category.key);
  }

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    fields.classList.toggle('is-open', open);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    runFromStart();
  });

  form.addEventListener('reset', () => {
    pricedByUser = false;
    // Fields are restored after the reset event; the search box lives outside the form.
    setTimeout(() => {
      query.value = '';
      syncPricedCheckbox();
      runFromStart();
    });
  });

  form.addEventListener('change', (event) => {
    if (event.target === priced) pricedByUser = priced.checked;
    if (event.target === order) syncPricedCheckbox();
    if (event.target.tagName === 'SELECT' || event.target.type === 'checkbox') runFromStart();
  });

  const typed = () => {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(runFromStart, TYPING_DELAY_MS);
  };
  form.addEventListener('input', (event) => {
    if (event.target.type === 'number') typed();
  });
  query.addEventListener('input', typed);
  query.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      runFromStart();
    }
  });

  const turnPage = (step) => {
    page = Math.max(0, page + step);
    run().then(() => results.scrollIntoView({ block: 'start' }));
  };
  prev.addEventListener('click', () => turnPage(-1));
  next.addEventListener('click', () => turnPage(1));

  syncPricedCheckbox();

  return {
    root,
    illustrationSlot,
    // The first visit loads the list; later visits keep filters, page and scroll as they were.
    enter() {
      if (!loaded) {
        loaded = true;
        run();
      }
    },
    refreshSelection() {
      results.querySelectorAll('.compare-toggle').forEach(updateToggle);
    },
  };
}
