import { h } from './dom.js';
import * as api from './api.js';
import * as fmt from './format.js';
import * as m from './metrics.js';

const PAGE_SIZE = 20;
const TYPING_DELAY_MS = 350;

// Maps the "Ordenar por" options to the backend's whitelisted sort keys.
const ORDERS = {
  performance: { sort: 'rank,asc' },
  value: { sort: 'value,asc', needsPrice: true },
  cheapest: { sort: 'cost,asc', needsPrice: true },
  cores: { sort: 'cores,desc' },
  newest: { sort: 'releaseDate,desc' },
};

export function initSearch({ form, results, pager, pagerStatus, errorEl, maxRankReady, onPick, sideOf }) {
  const priced = form.elements.priced;
  const order = form.elements.order;
  let page = 0;
  let controller = null;
  let typingTimer = 0;
  let pricedByUser = false;

  function syncPricedCheckbox() {
    if (ORDERS[order.value]?.needsPrice) {
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
    const values = Object.fromEntries(new FormData(form));
    const chosenOrder = ORDERS[values.order] ?? ORDERS.performance;
    const params = { page, size: PAGE_SIZE, sort: chosenOrder.sort };

    const name = values.name?.trim();
    if (name) params.name = name;
    if (values.brand) params.brand = values.brand;

    const coresInput = form.elements.minCoreCount;
    if (coresInput.validity.badInput || (coresInput.value && !(Number.isInteger(+coresInput.value) && +coresInput.value > 0))) {
      throw new RangeError('Os núcleos mínimos têm de ser um número inteiro maior do que zero.');
    }
    if (coresInput.value) params.minCoreCount = coresInput.value;

    const priceInput = form.elements.maxCost;
    if (priceInput.validity.badInput || (priceInput.value && !(+priceInput.value > 0))) {
      throw new RangeError('O preço máximo tem de ser um número maior do que zero.');
    }
    if (priceInput.value) params.maxCost = priceInput.value;

    // Price 0 means "unknown", so any price filter or price-based order excludes it.
    if (chosenOrder.needsPrice || priced.checked || params.maxCost) params.minCost = '0.01';

    if (values.tier && maxRank) params.maxComputeRank = Math.ceil((maxRank * Number(values.tier)) / 100);

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
    } catch (error) {
      if (error.name === 'AbortError') return;
      renderError();
    }
  }

  function renderLoading() {
    results.setAttribute('aria-busy', 'true');
    results.replaceChildren(h('div', { role: 'status' },
      h('span', { class: 'sr-only', text: 'A carregar resultados…' }),
      Array.from({ length: 6 }, () => h('div', { class: 'skeleton-row' }))));
  }

  function renderError() {
    results.removeAttribute('aria-busy');
    pager.hidden = true;
    results.replaceChildren(h('div', { class: 'status-panel' },
      h('p', {}, h('strong', { text: 'Não foi possível carregar os resultados.' })),
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
          h('p', {}, h('strong', { text: 'Nenhum processador corresponde a estes filtros.' })),
          h('p', { text: 'Experimenta subir o preço máximo, escolher outra marca ou baixar os núcleos mínimos.' }),
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
    pager.querySelector('[data-page="prev"]').disabled = page === 0;
    pager.querySelector('[data-page="next"]').disabled = count < PAGE_SIZE;
    pagerStatus.textContent = `Página ${page + 1}`;
  }

  function resultTable(products, maxRank) {
    const th = (text, right) => h('th', { scope: 'col', class: right ? 'is-right' : null, text });
    return h('table', { class: 'result-table' },
      h('caption', { class: 'sr-only', text: 'Resultados da pesquisa' }),
      h('thead', {}, h('tr', {},
        th('Processador'),
        th('Ranking', true),
        th('Índice', true),
        th('Núcleos / threads', true),
        th('Turbo', true),
        th('Preço', true),
        th('Custo por ponto', true),
        h('th', { scope: 'col' }, h('span', { class: 'sr-only', text: 'Comparar' })))),
      h('tbody', {}, products.map((p) => resultRow(p, maxRank))));
  }

  function resultRow(p, maxRank) {
    const cell = (label, value) => h('td', { class: 'is-right', 'data-label': label },
      value ?? h('span', { class: 'missing', text: 'Sem dados' }));

    const idx = m.performanceIndex(p, maxRank);
    const cpp = m.costPerPoint(p, maxRank);
    const sub = [p.family || p.brand, p.releaseDate && fmt.shortMonth(p.releaseDate)].filter(Boolean).join(', ');

    return h('tr', {},
      h('td', { class: 'result-main' },
        h('span', { class: 'result-name', text: p.productName }),
        h('span', { class: 'result-sub', text: sub })),
      cell('Ranking', `#${fmt.number(m.rank(p))}`),
      cell('Índice', idx !== null ? fmt.index(idx) : null),
      cell('Núcleos / threads', `${fmt.number(m.cores(p) ?? 0)} / ${fmt.number(m.threads(p) ?? 0)}`),
      cell('Turbo', m.boostClock(p) ? fmt.ghz(m.boostClock(p)) : null),
      cell('Preço', m.price(p) ? fmt.money(m.price(p)) : null),
      cell('Custo por ponto', cpp !== null ? fmt.money(cpp) : null),
      h('td', { class: 'result-actions-cell' },
        h('div', { class: 'result-actions' }, pickButton(p, 'A'), pickButton(p, 'B'))));
  }

  function pickButton(product, side) {
    return h('button', {
      type: 'button',
      class: 'btn btn-ghost btn-small pick-btn',
      'aria-pressed': String(sideOf(product.productName) === side),
      'aria-label': `Usar ${product.productName} como processador ${side}`,
      dataset: { name: product.productName, side },
      text: side,
      onclick: () => onPick(side.toLowerCase(), product),
    });
  }

  // Called by main.js whenever a comparison slot changes.
  function refreshPicked() {
    for (const button of results.querySelectorAll('.pick-btn')) {
      button.setAttribute('aria-pressed', String(sideOf(button.dataset.name) === button.dataset.side));
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    page = 0;
    run();
  });

  form.addEventListener('reset', () => {
    pricedByUser = false;
    // Form fields are restored after the reset event handlers run.
    setTimeout(() => {
      syncPricedCheckbox();
      page = 0;
      run();
    });
  });

  form.addEventListener('change', (event) => {
    if (event.target === priced) pricedByUser = priced.checked;
    if (event.target === order) syncPricedCheckbox();
    if (event.target.tagName === 'SELECT' || event.target.type === 'checkbox') {
      page = 0;
      run();
    }
  });

  form.addEventListener('input', (event) => {
    if (event.target.tagName !== 'INPUT' || event.target.type === 'checkbox') return;
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      page = 0;
      run();
    }, TYPING_DELAY_MS);
  });

  pager.addEventListener('click', (event) => {
    const button = event.target.closest('[data-page]');
    if (!button || button.disabled) return;
    page = Math.max(0, page + (button.dataset.page === 'next' ? 1 : -1));
    run().then(() => results.scrollIntoView({ block: 'start' }));
  });

  syncPricedCheckbox();
  run();

  return { refreshPicked };
}
