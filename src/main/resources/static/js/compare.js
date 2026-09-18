import { h } from './dom.js';
import * as fmt from './format.js';
import * as m from './metrics.js';

// Each row explains what the value means. `better` decides which side is highlighted;
// rows without it (socket, family, release) are informative only.
const SPEC_GROUPS = [
  {
    title: 'Desempenho',
    rows: [
      {
        label: 'Posição no ranking',
        help: 'Lugar na lista de desempenho da base de dados, do mais rápido (#1) para o mais lento. Quanto menor, melhor.',
        get: (p) => m.rank(p),
        show: (v) => `#${fmt.number(v)}`,
        better: 'lower',
        diff: (d, w) => `O ${w} está ${fmt.plural(d, 'posição', 'posições')} acima`,
      },
      {
        label: 'Índice de desempenho',
        help: 'A posição convertida numa escala de 0 a 100. Um índice de 90 quer dizer mais rápido do que cerca de 90% dos processadores registados.',
        get: (p, maxRank) => m.performanceIndex(p, maxRank),
        show: fmt.index,
        better: 'higher',
        diff: (d, w) => `O ${w} tem mais ${fmt.index(d)} pontos`,
      },
      {
        label: 'Núcleos',
        help: 'Unidades de processamento independentes. Mais núcleos ajudam em trabalho que se divide em partes: renderização, compilação, edição de vídeo ou muitas aplicações abertas.',
        get: (p) => m.cores(p),
        show: (v) => fmt.number(v),
        better: 'higher',
        diff: (d, w) => `O ${w} tem mais ${fmt.plural(d, 'núcleo', 'núcleos')}`,
      },
      {
        label: 'Threads',
        help: 'Tarefas que o processador executa em simultâneo. Com SMT ou Hyper-Threading, cada núcleo trata de duas.',
        get: (p) => m.threads(p),
        show: (v) => fmt.number(v),
        better: 'higher',
        diff: (d, w) => `O ${w} tem mais ${fmt.plural(d, 'thread', 'threads')}`,
      },
      {
        label: 'Multithreading (SMT ou Hyper-Threading)',
        help: 'Indica se os núcleos executam mais do que uma thread ao mesmo tempo. Calculado a partir do número de threads e de núcleos.',
        get: (p) => m.threadsPerCore(p),
        show: (v) => {
          if (v <= 1) return 'Não';
          return Number.isInteger(v) ? `Sim, ${fmt.number(v)} threads por núcleo` : 'Sim, em parte dos núcleos';
        },
      },
      {
        label: 'Frequência base',
        help: 'Velocidade de funcionamento garantida em carga, em gigahertz (GHz). Só é comparável entre processadores da mesma geração e arquitetura.',
        get: (p) => m.baseClock(p),
        show: fmt.ghz,
        better: 'higher',
        diff: (d, w) => `O ${w} tem mais ${fmt.ghz(d)}`,
      },
      {
        label: 'Frequência turbo',
        help: 'Velocidade máxima que um núcleo atinge durante pouco tempo, se houver margem de temperatura e energia. Conta mais em jogos e programas que usam poucos núcleos.',
        get: (p) => m.boostClock(p),
        show: fmt.ghz,
        better: 'higher',
        diff: (d, w) => `O ${w} tem mais ${fmt.ghz(d)}`,
      },
    ],
  },
  {
    title: 'Custo',
    rows: [
      {
        label: 'Preço',
        help: 'Preço registado na base de dados, em dólares americanos.',
        get: (p) => m.price(p),
        show: fmt.money,
        better: 'lower',
        diff: (d, w, _winner, loser) => `O ${w} custa menos ${fmt.money(d)} (${fmt.percent((d / loser) * 100)})`,
      },
      {
        label: 'Custo por ponto de índice',
        help: 'Preço a dividir pelo índice de desempenho. É a métrica principal de custo × performance: quanto mais baixo, mais desempenho por cada dólar.',
        get: (p, maxRank) => m.costPerPoint(p, maxRank),
        show: fmt.money,
        better: 'lower',
        diff: (d, w) => `O ${w} paga menos ${fmt.money(d)} por ponto`,
      },
      {
        label: 'Custo por núcleo',
        help: 'Preço a dividir pelo número de núcleos. Útil para trabalho que usa todos os núcleos, mas ignora a velocidade de cada um.',
        get: (p) => m.costPerCore(p),
        show: fmt.money,
        better: 'lower',
        diff: (d, w) => `O ${w} paga menos ${fmt.money(d)} por núcleo`,
      },
    ],
  },
  {
    title: 'Plataforma e consumo',
    rows: [
      {
        label: 'TDP',
        help: 'Calor que o processador liberta em carga, em watts. Dá uma ideia do consumo e do cooler necessário: mais baixo gasta menos energia e é mais fácil de arrefecer.',
        get: (p) => m.tdp(p),
        show: fmt.watts,
        better: 'lower',
        diff: (d, w) => `O ${w} liberta menos ${fmt.watts(d)}`,
      },
      {
        label: 'Socket',
        help: 'Encaixe na motherboard. Processadores com sockets diferentes precisam de motherboards diferentes.',
        get: (p) => m.socket(p),
        show: (v) => v,
        compare: (a, b) => {
          if (a === null || b === null) return { text: 'Socket desconhecido num dos lados', muted: true };
          return a === b ? { text: 'Mesmo socket' } : { text: 'Sockets diferentes: não partilham motherboard' };
        },
      },
      {
        label: 'Família',
        help: 'Linha de produto do fabricante.',
        get: (p) => p.family || null,
        show: (v) => v,
        compare: (a, b) => (a !== null && a === b ? { text: 'Mesma família', muted: true } : { text: '' }),
      },
      {
        label: 'Lançamento',
        help: 'Mês de lançamento. Os mais recentes costumam suportar memória e ligações PCIe mais rápidas.',
        get: (p) => p.releaseDate || null,
        show: fmt.month,
        compare: (a, b) => {
          if (a === null || b === null) return { text: 'Sem dados para comparar', muted: true };
          const months = fmt.monthsBetween(a, b);
          if (months === 0) return { text: 'Lançados no mesmo mês', muted: true };
          return { text: `O ${a > b ? 'A' : 'B'} é ${fmt.duration(months)} mais recente` };
        },
      },
    ],
  },
];

function compareRow(row, va, vb) {
  if (row.compare) return { winner: null, ...row.compare(va, vb) };
  if (va === null || vb === null) return { winner: null, text: 'Sem dados para comparar', muted: true };
  if (!row.better) return { winner: null, text: '' };
  if (va === vb) return { winner: null, text: 'Iguais', muted: true };

  const aWins = row.better === 'higher' ? va > vb : va < vb;
  const [winner, wv, lv] = aWins ? ['A', va, vb] : ['B', vb, va];
  return { winner, text: row.diff(Math.abs(va - vb), winner, wv, lv) };
}

function valueCell(side, row, value, result) {
  const better = result.winner === side;
  return h('td', {
    class: ['val', better && 'is-better', value === null && 'is-missing'].filter(Boolean).join(' '),
    'data-side': side,
  },
  value === null ? 'Sem dados' : row.show(value),
  better ? h('span', { class: 'sr-only', text: ' (melhor)' }) : null);
}

function specTable(a, b, maxRank) {
  const headCell = (side, p) => h('th', { scope: 'col' },
    h('span', { class: 'side-tag', text: side }),
    h('span', { class: 'th-name', text: p.productName }));

  const body = h('tbody');
  for (const group of SPEC_GROUPS) {
    body.append(h('tr', { class: 'group-row' }, h('th', { colspan: 4, scope: 'colgroup', text: group.title })));

    for (const row of group.rows) {
      const va = row.get(a, maxRank);
      const vb = row.get(b, maxRank);
      const result = compareRow(row, va, vb);

      body.append(h('tr', {},
        h('th', { scope: 'row' },
          h('span', { class: 'metric-name', text: row.label }),
          h('span', { class: 'metric-help', text: row.help })),
        valueCell('A', row, va, result),
        valueCell('B', row, vb, result),
        h('td', { class: `diff${result.muted ? ' is-muted' : ''}`, text: result.text })));
    }
  }

  return h('table', { class: 'spec-table' },
    h('caption', { class: 'sr-only', text: 'Especificações lado a lado, com a explicação de cada valor' }),
    h('thead', {}, h('tr', {},
      h('th', { scope: 'col', text: 'Especificação' }),
      headCell('A', a),
      headCell('B', b),
      h('th', { scope: 'col', text: 'Diferença' }))),
    body);
}

function productCard(side, p, maxRank, isWinner) {
  const cost = m.price(p);
  const idx = m.performanceIndex(p, maxRank);
  const platform = [p.family, m.socket(p) && `socket ${m.socket(p)}`].filter(Boolean).join(', ');

  return h('article', { class: 'vs-card' },
    h('p', { class: 'vs-side' },
      h('span', { class: 'side-tag', text: side }),
      isWinner ? h('span', { class: 'vs-winner', text: ' Melhor custo × performance' }) : null),
    h('h3', { text: p.productName }),
    platform ? h('p', { class: 'vs-meta', text: platform }) : null,
    p.releaseDate ? h('p', { class: 'vs-meta', text: `Lançado em ${fmt.month(p.releaseDate)}` }) : null,
    h('div', { class: 'vs-figures' },
      figure(cost ? fmt.money(cost) : 'Sem preço', 'Preço'),
      figure(`#${fmt.number(m.rank(p))}`, 'Posição no ranking'),
      idx !== null ? figure(fmt.index(idx), 'Índice de desempenho') : null));
}

function figure(value, label) {
  return h('p', { class: 'vs-figure' },
    h('span', { class: 'vs-figure-value', text: value }),
    h('span', { class: 'vs-figure-label', text: label }));
}

function barGroup(title, note, values, better, show) {
  const known = values.filter((v) => v !== null);
  const max = Math.max(...known);
  let winner = null;
  if (known.length === 2 && values[0] !== values[1]) {
    const aWins = better === 'higher' ? values[0] > values[1] : values[0] < values[1];
    winner = aWins ? 0 : 1;
  }

  return h('div', { class: 'bar-group' },
    h('h4', { text: title }),
    h('p', { class: 'bar-note', text: note }),
    ['A', 'B'].map((side, i) => {
      const value = values[i];
      if (value === null) {
        return h('div', { class: 'bar-row' },
          h('span', { class: 'side-tag', text: side }),
          h('span', { class: 'bar-missing', text: 'Sem dados' }),
          h('span'));
      }
      const bar = h('span', { class: `bar${winner === i ? ' is-better' : ''}` });
      bar.style.width = `${Math.max((value / max) * 100, 1)}%`;
      return h('div', { class: 'bar-row' },
        h('span', { class: 'side-tag', text: side }),
        h('span', {}, bar),
        h('span', { class: `bar-value${winner === i ? ' is-better' : ''}`, text: show(value) }));
    }));
}

function verdictPanel(a, b, maxRank, result) {
  return h('section', { class: 'verdict', 'aria-labelledby': 'verdict-title' },
    h('div', {},
      h('h3', { id: 'verdict-title', class: 'verdict-kicker', text: 'Custo × performance' }),
      h('p', { class: 'verdict-headline', text: result.headline })),
    h('ul', { class: 'verdict-points' }, result.points.map((text) => h('li', { text }))),
    h('div', { class: 'bars' },
      barGroup('Índice de desempenho', 'Mais alto é melhor',
        [m.performanceIndex(a, maxRank), m.performanceIndex(b, maxRank)], 'higher', fmt.index),
      barGroup('Preço', 'Mais baixo é melhor',
        [m.price(a), m.price(b)], 'lower', fmt.money),
      barGroup('Custo por ponto de índice', 'Mais baixo é melhor',
        [m.costPerPoint(a, maxRank), m.costPerPoint(b, maxRank)], 'lower', fmt.money)),
    h('p', { class: 'method-link' },
      'O índice vem da posição no ranking e não de um teste: mostra qual é mais rápido, mas não quanto. ',
      h('a', { href: '#metodo', text: 'Ver como calculamos' })));
}

export function renderComparison(container, a, b, maxRank) {
  const result = m.verdict(a, b, maxRank);

  container.replaceChildren(h('div', { class: 'reveal' },
    h('div', { class: 'vs' },
      productCard('A', a, maxRank, result.winner === 'A'),
      productCard('B', b, maxRank, result.winner === 'B')),
    verdictPanel(a, b, maxRank, result),
    h('div', { class: 'spec-wrap' },
      h('h3', { text: 'Especificações lado a lado' }),
      h('p', { text: 'Por baixo de cada nome está o que o valor significa. O lado destacado é o melhor nessa linha.' }),
      specTable(a, b, maxRank))));
}

export function renderComparisonLoading(container) {
  container.replaceChildren(h('div', { class: 'status-panel', role: 'status' },
    h('p', { text: 'A carregar a comparação…' })));
}

export function renderComparisonError(container, message, onRetry) {
  container.replaceChildren(h('div', { class: 'status-panel' },
    h('p', {}, h('strong', { text: message })),
    onRetry ? h('button', { type: 'button', class: 'btn btn-ghost', text: 'Tentar outra vez', onclick: onRetry }) : null));
}
