import { h } from '../dom.js';
import * as api from '../api.js';
import * as fmt from '../format.js';
import * as m from '../metrics.js';
import { categoryOf } from '../categories.js';
import { createPicker } from '../picker.js';
import { go, paths } from '../router.js';
import { compareRow, missingText } from '../specs.js';
import { backLink } from './detail.js';

let renderId = 0;

export async function renderCompare(root, firstName, secondName, context) {
  const { maxRankReady, back } = context;
  const current = ++renderId;
  const status = (message, onRetry) => h('div', { class: 'container page' },
    backLink(back),
    h('div', { class: 'status-panel', role: 'status' },
      h('p', {}, h('strong', { text: message })),
      onRetry ? h('button', { type: 'button', class: 'btn btn-ghost', text: 'Tentar outra vez', onclick: onRetry }) : null));

  if (firstName === secondName) {
    root.replaceChildren(status('Escolhe dois produtos diferentes para comparar.'));
    return null;
  }

  root.replaceChildren(status('A carregar a comparação…'));

  let pair;
  let maxRank;
  try {
    [pair, maxRank] = await Promise.all([api.getPair(firstName, secondName), maxRankReady]);
  } catch (error) {
    if (current !== renderId) return null;
    root.replaceChildren(error.status === 400
      // The API refuses to compare a processor with a graphics card.
      ? status('Não é possível comparar um processador com uma placa gráfica. Escolhe dois do mesmo tipo.')
      : status('Não foi possível carregar a comparação.', () => renderCompare(root, firstName, secondName, context)));
    return null;
  }
  if (current !== renderId) return null;

  const byName = new Map(pair.map((p) => [p.productName, p]));
  const products = [byName.get(firstName), byName.get(secondName)];
  const missing = [firstName, secondName].filter((name) => !byName.has(name));
  if (missing.length) {
    root.replaceChildren(status(`Não encontrámos ${missing.map((name) => `“${name}”`).join(' nem ')}.`));
    return null;
  }

  const category = categoryOf(products[0]);

  // Short names ("Ryzen 5 5600X") read better side by side; fall back if they collide.
  let names = products.map(fmt.shortName);
  if (names[0] === names[1]) names = products.map((p) => p.productName);

  const result = m.verdict(products[0], products[1], maxRank, category.g);

  root.replaceChildren(h('div', { class: 'container page reveal' },
    backLink(back),
    h('h1', { class: 'compare-title', tabindex: '-1', text: `${names[0]} ou ${names[1]}` }),
    h('div', { class: 'duo' }, products.map((p, i) => duoItem(p, i, products, category, maxRank, result.winner === i))),
    verdictPanel(products, names, maxRank, result),
    specTable(products, names, category, maxRank)));

  document.title = `${names[0]} ou ${names[1]} | ${fmt.SITE_NAME}`;
  return products;
}

function duoItem(p, position, products, category, maxRank, isWinner) {
  const { g } = category;
  const cost = m.price(p);
  const idx = m.performanceIndex(p, maxRank);
  const meta = category.headerMeta(p).filter(Boolean).join(', ');
  const other = products[1 - position];
  // "Preço" for processors, "Preço de lançamento" for graphics cards.
  const priceLabel = category.specGroups.flatMap((group) => group.rows).find((row) => row.label.startsWith('Preço'))?.label;

  const pickerHolder = h('div', { class: 'compare-with', hidden: true });
  const swapButton = h('button', {
    type: 'button',
    class: 'link-button',
    text: 'Trocar',
    'aria-label': `Trocar ${g.The.toLowerCase()} ${fmt.shortName(p)}`,
    'aria-expanded': 'false',
    onclick: () => {
      const opening = pickerHolder.hidden;
      pickerHolder.hidden = !opening;
      swapButton.setAttribute('aria-expanded', String(opening));
      if (!opening) return;
      if (!pickerHolder.firstChild) {
        const picker = createPicker({
          label: `Comparar ${g.The.toLowerCase()} ${fmt.shortName(other)} com`,
          placeholder: category.pickerPlaceholder,
          exclude: products.map((x) => x.productName),
          params: { isCpu: category.isCpu, sort: category.orders[0].sort },
          onPick: (chosen) => go(position === 0
            ? paths.compare(chosen.productName, other.productName)
            : paths.compare(other.productName, chosen.productName)),
        });
        pickerHolder.append(picker.element);
        pickerHolder.focusPicker = picker.focus;
      }
      pickerHolder.focusPicker();
    },
  });

  return h('article', { class: `duo-item${isWinner ? ' is-winner' : ''}` },
    h('div', { class: 'duo-top' },
      isWinner ? h('p', { class: 'duo-winner', text: 'Melhor custo × performance' }) : h('span'),
      swapButton),
    h('h2', {}, h('a', { href: paths.detail(p), text: p.productName })),
    meta ? h('p', { class: 'duo-meta', text: meta.charAt(0).toUpperCase() + meta.slice(1) }) : null,
    h('dl', { class: 'duo-figures' },
      figure(cost ? fmt.money(cost) : 'Sem preço', priceLabel ?? 'Preço'),
      figure(idx !== null ? fmt.index(idx) : 'Sem índice', 'Índice de desempenho')),
    pickerHolder);
}

function figure(value, label) {
  return h('div', {},
    h('dt', { text: label }),
    h('dd', { text: value }));
}

function barGroup(title, note, values, names, better, show) {
  const known = values.filter((v) => v !== null);
  const max = Math.max(...known);
  let winner = null;
  if (known.length === 2 && values[0] !== values[1]) {
    const firstWins = better === 'higher' ? values[0] > values[1] : values[0] < values[1];
    winner = firstWins ? 0 : 1;
  }

  return h('div', { class: 'bar-group' },
    h('h3', { text: title }),
    h('p', { class: 'bar-note', text: note }),
    values.map((value, i) => {
      const label = h('span', { class: 'bar-name', text: names[i] });
      if (value === null) {
        return h('div', { class: 'bar-row' }, label, h('span', { class: 'bar-missing', text: 'Sem dados' }));
      }
      const bar = h('span', { class: `bar${winner === i ? ' is-better' : ''}` });
      bar.style.width = `${Math.max((value / max) * 100, 1)}%`;
      return h('div', { class: 'bar-row' },
        label,
        h('span', { class: 'bar-track' }, bar),
        h('span', { class: `bar-value${winner === i ? ' is-better' : ''}`, text: show(value) }));
    }));
}

function verdictPanel(products, names, maxRank, result) {
  const [a, b] = products;
  return h('section', { class: 'verdict', 'aria-labelledby': 'verdict-title' },
    h('div', {},
      h('h2', { id: 'verdict-title', class: 'verdict-title', text: 'Custo × performance' }),
      h('p', { class: 'verdict-headline', text: result.headline })),
    result.points.length ? h('ul', { class: 'verdict-points' }, result.points.map((text) => h('li', { text }))) : null,
    h('div', { class: 'bars' },
      barGroup('Índice de desempenho', 'Mais alto é melhor',
        [m.performanceIndex(a, maxRank), m.performanceIndex(b, maxRank)], names, 'higher', fmt.index),
      barGroup('Preço', 'Mais baixo é melhor',
        [m.price(a), m.price(b)], names, 'lower', fmt.money),
      barGroup('Custo por ponto de índice', 'Mais baixo é melhor',
        [m.costPerPoint(a, maxRank), m.costPerPoint(b, maxRank)], names, 'lower', fmt.money)),
    h('p', { class: 'method-link' },
      'O índice vem de uma posição ou pontuação na base de dados e não de um teste feito aqui: mostra qual é mais rápido, mas não exatamente quanto. ',
      h('a', { href: paths.method(), text: 'Ver como calculamos' })));
}

function specTable(products, names, category, maxRank) {
  const body = h('tbody');

  for (const group of category.specGroups) {
    body.append(h('tr', { class: 'group-row' }, h('th', { colspan: 4, scope: 'colgroup', text: group.title })));

    for (const row of group.rows) {
      const values = products.map((p) => row.get(p, maxRank));
      const result = compareRow(row, values, names);

      body.append(h('tr', {},
        h('th', { scope: 'row' },
          h('span', { class: 'metric-name', text: row.label }),
          h('span', { class: 'metric-help', text: row.help })),
        values.map((value, i) => h('td', {
          class: ['val', result.winner === i && 'is-better', value === null && 'is-missing'].filter(Boolean).join(' '),
          'data-name': names[i],
        },
        value === null ? missingText(row, products[i]) : row.show(value),
        result.winner === i ? h('span', { class: 'sr-only', text: ' (melhor)' }) : null)),
        h('td', { class: `diff${result.muted ? ' is-muted' : ''}`, text: result.text })));
    }
  }

  return h('section', { class: 'detail-section', 'aria-labelledby': 'compare-spec-title' },
    h('h2', { id: 'compare-spec-title', text: 'Especificações lado a lado' }),
    h('p', { class: 'section-lead', text: 'Por baixo de cada nome está o que o valor significa. O valor destacado é o melhor nessa linha.' }),
    h('table', { class: 'spec-table' },
      h('caption', { class: 'sr-only', text: 'Especificações lado a lado, com a explicação de cada valor' }),
      h('thead', {}, h('tr', {},
        h('th', { scope: 'col', text: 'Especificação' }),
        products.map((p, i) => h('th', { scope: 'col' }, h('a', { href: paths.detail(p), text: names[i] }))),
        h('th', { scope: 'col', text: 'Diferença' }))),
      body));
}
