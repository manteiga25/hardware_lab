import { h } from '../dom.js';
import * as api from '../api.js';
import * as fmt from '../format.js';
import * as m from '../metrics.js';
import { categoryOf } from '../categories.js';
import { createPicker } from '../picker.js';
import { go, paths } from '../router.js';
import { missingText } from '../specs.js';

const ALTERNATIVES_SHOWN = 3;
let renderId = 0;

export async function renderDetail(root, name, context) {
  const { maxRankReady, back, placeIllustration } = context;
  const current = ++renderId;
  root.replaceChildren(statusPage(back, 'A carregar…'));

  let product;
  let maxRank;
  try {
    [product, maxRank] = await Promise.all([api.getProduct(name), maxRankReady]);
  } catch {
    if (current === renderId) root.replaceChildren(statusPage(back, 'Não foi possível carregar esta página.', () => renderDetail(root, name, context)));
    return null;
  }
  if (current !== renderId) return null;

  if (!product) {
    root.replaceChildren(statusPage(back, `Não encontrámos “${name}”.`));
    return null;
  }

  const category = categoryOf(product);
  const illustrationSlot = h('div', { class: 'illustration-slot', 'aria-hidden': 'true' });
  const valueSection = h('section', { class: 'detail-section', 'aria-labelledby': 'value-title' },
    h('h2', { id: 'value-title', text: 'Custo × performance' }),
    h('div', { class: 'value-body' }, h('p', { class: 'muted', text: 'A procurar alternativas com desempenho parecido…' })));

  root.replaceChildren(h('div', { class: 'container page' },
    backLink(back),
    header(product, category, illustrationSlot),
    keyFigures(product, category, maxRank),
    valueSection,
    specSection(product, category, maxRank)));

  placeIllustration(illustrationSlot, category.illustration(product));
  document.title = `${product.productName} | ${fmt.SITE_NAME}`;

  loadSimilar(product, category, maxRank, valueSection.querySelector('.value-body'), current);
  return product;
}

function statusPage(back, message, onRetry) {
  return h('div', { class: 'container page' },
    backLink(back),
    h('div', { class: 'status-panel', role: 'status' },
      h('p', {}, h('strong', { text: message })),
      onRetry ? h('button', { type: 'button', class: 'btn btn-ghost', text: 'Tentar outra vez', onclick: onRetry }) : null));
}

export function backLink(back) {
  return h('a', {
    class: 'back-link',
    href: paths.list(),
    text: 'Voltar',
    onclick: (event) => {
      event.preventDefault();
      back();
    },
  });
}

function header(p, category, illustrationSlot) {
  const { g } = category;
  const meta = category.headerMeta(p).filter(Boolean).join(', ');

  const pickerHolder = h('div', { class: 'compare-with', hidden: true });
  const compareButton = h('button', {
    type: 'button',
    class: 'btn btn-primary',
    text: g.compareWith,
    'aria-expanded': 'false',
    onclick: () => {
      const opening = pickerHolder.hidden;
      pickerHolder.hidden = !opening;
      compareButton.setAttribute('aria-expanded', String(opening));
      if (!opening) return;
      if (!pickerHolder.firstChild) {
        const picker = createPicker({
          label: `Comparar ${g.The.toLowerCase()} ${fmt.shortName(p)} com`,
          placeholder: category.pickerPlaceholder,
          exclude: [p.productName],
          params: { isCpu: category.isCpu, sort: category.orders[0].sort },
          onPick: (other) => go(paths.compare(p.productName, other.productName)),
        });
        pickerHolder.append(picker.element);
        pickerHolder.focusPicker = picker.focus;
      }
      pickerHolder.focusPicker();
    },
  });

  return h('header', { class: 'detail-head', 'data-tilt-area': '' },
    h('div', { class: 'detail-intro' },
      p.family ? h('p', { class: 'detail-family', text: p.family }) : null,
      h('h1', { tabindex: '-1', text: p.productName }),
      meta ? h('p', { class: 'detail-meta', text: meta.charAt(0).toUpperCase() + meta.slice(1) }) : null,
      h('div', { class: 'detail-actions' }, compareButton),
      pickerHolder),
    illustrationSlot);
}

function keyFigures(p, category, maxRank) {
  const rows = category.specGroups.flatMap((group) => group.rows).filter((row) => row.key);
  return h('dl', { class: 'figures' }, rows.map((row) => {
    const value = row.get(p, maxRank);
    return h('div', { class: 'figure' },
      h('dt', { text: row.label }),
      h('dd', { class: `figure-value${value === null ? ' is-missing' : ''}`, text: value === null ? missingText(row, p) : row.show(value) }),
      h('dd', { class: 'figure-help', text: row.help }));
  }));
}

function specSection(p, category, maxRank) {
  return h('section', { class: 'detail-section', 'aria-labelledby': 'spec-title' },
    h('h2', { id: 'spec-title', text: 'Especificações' }),
    category.specGroups.map((group) => {
      const rows = group.rows.filter((row) => !row.key);
      if (!rows.length) return null;
      return h('div', { class: 'spec-group' },
        h('h3', { text: group.title }),
        h('dl', { class: 'spec-list' }, rows.map((row) => {
          const value = row.get(p, maxRank);
          return h('div', { class: 'spec-item' },
            h('dt', { text: row.label }),
            h('dd', { class: `spec-value${value === null ? ' is-missing' : ''}`, text: value === null ? missingText(row, p) : row.show(value) }),
            h('dd', { class: 'spec-help', text: row.help }));
        })));
    }));
}

// Where this product stands against others of the same type with similar performance.
async function loadSimilar(p, category, maxRank, body, current) {
  const { g } = category;
  const band = m.similarBand(p, maxRank);
  const cpp = m.costPerPoint(p, maxRank);
  const intro = [category.intro(p, maxRank)];

  intro.push(cpp !== null
    ? `Cada ponto de índice custa ${fmt.money(cpp)}.`
    : m.price(p) === null ? 'Não há preço registado, por isso não é possível calcular o custo × performance.' : '');

  const introText = intro.filter(Boolean).join(' ');

  if (!band) {
    body.replaceChildren(h('p', { text: introText }));
    return;
  }

  let similar;
  try {
    similar = await api.searchProducts({ ...band.params, minCost: '0.01', sort: 'value,asc', size: 50 });
  } catch {
    if (current !== renderId) return;
    body.replaceChildren(
      h('p', { text: introText }),
      h('p', { class: 'muted', text: 'Não foi possível carregar alternativas com desempenho parecido.' }));
    return;
  }
  if (current !== renderId) return;

  const others = similar.filter((s) => s.productName !== p.productName);
  const cheaper = cpp === null ? others : others.filter((s) => m.costPerPoint(s, maxRank) < cpp);
  const where = `${category.similarLabel} (índice entre ${fmt.index(band.low)} e ${fmt.index(band.high)})`;

  let comparison;
  if (cpp === null) {
    comparison = cheaper.length ? `${where}, ${g.these} que compensam mais:` : '';
  } else if (!cheaper.length) {
    comparison = `${where}, ${g.none} tem custo por ponto mais baixo: é das melhores compras nesta gama.`;
  } else {
    // The search is capped at 50 results, sorted from best value.
    const count = cheaper.length === others.length && similar.length === 50
      ? 'pelo menos 50 têm'
      : `${fmt.number(cheaper.length)} ${cheaper.length === 1 ? 'tem' : 'têm'}`;
    comparison = `${where}, ${count} custo por ponto mais baixo. ${g.they} que compensam mais:`;
  }

  body.replaceChildren(
    h('p', { text: introText }),
    comparison ? h('p', { text: comparison }) : null,
    cheaper.length ? alternativesList(p, cheaper.slice(0, ALTERNATIVES_SHOWN), maxRank) : null);
}

function alternativesList(p, alternatives, maxRank) {
  return h('ul', { class: 'alternatives' }, alternatives.map((alt) => {
    const idx = m.performanceIndex(alt, maxRank);
    const meta = [
      idx !== null && `índice ${fmt.index(idx)}`,
      fmt.money(m.price(alt)),
      `${fmt.money(m.costPerPoint(alt, maxRank))} por ponto`,
    ].filter(Boolean).join(', ');

    return h('li', { class: 'alternative' },
      h('div', {},
        h('a', { class: 'alternative-name', href: paths.detail(alt), text: alt.productName }),
        h('span', { class: 'alternative-meta', text: meta })),
      h('a', {
        class: 'btn btn-ghost btn-small',
        href: paths.compare(p.productName, alt.productName),
        text: 'Comparar',
        'aria-label': `Comparar com ${alt.productName}`,
      }));
  }));
}
