// Every derived number shown on the page is computed here, in one place.
// A value of 0 in the database means "unknown", so it is treated as missing.

import * as fmt from './format.js';

const positive = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export const rank = (p) => positive(p.spec?.computeRank);
export const cores = (p) => positive(p.spec?.coreCount);
export const threads = (p) => positive(p.spec?.threadCount);
export const baseClock = (p) => positive(p.spec?.baseClock);
export const boostClock = (p) => positive(p.spec?.boostClock);
export const tdp = (p) => positive(p.spec?.tdp);
export const price = (p) => positive(p.cost?.cost);
export const socket = (p) => (p.socketName && p.socketName !== 'Unknown' ? p.socketName : null);

// The "has_hyperthread" column is unreliable (0 for 16-core/32-thread Ryzen parts),
// so SMT is derived from the thread and core counts instead.
export function threadsPerCore(p) {
  const c = cores(p);
  const t = threads(p);
  return c && t ? t / c : null;
}

// 0-100 scale from the ranking position: #1 is 100, the last position is close to 0.
export function performanceIndex(p, maxRank) {
  const r = rank(p);
  if (!r || !maxRank) return null;
  return (100 * (maxRank + 1 - r)) / maxRank;
}

export function costPerPoint(p, maxRank) {
  const cost = price(p);
  const idx = performanceIndex(p, maxRank);
  return cost && idx ? cost / idx : null;
}

export function costPerCore(p) {
  const cost = price(p);
  const c = cores(p);
  return cost && c ? cost / c : null;
}

function describe(key, p, maxRank) {
  return {
    key,
    name: p.productName,
    rank: rank(p),
    price: price(p),
    index: performanceIndex(p, maxRank),
    cpp: costPerPoint(p, maxRank),
  };
}

function cheaperLine(cheap, dear) {
  const diff = dear.price - cheap.price;
  return `O ${cheap.key} custa menos ${fmt.money(diff)} (${fmt.percent((diff / dear.price) * 100)} mais barato).`;
}

function missingPriceText(sides) {
  const missing = sides.filter((s) => s.price === null);
  if (missing.length === 2) return 'dos dois processadores';
  return `do ${missing[0].key} (${missing[0].name})`;
}

/**
 * Plain-language cost x performance verdict for two products.
 * Returns { headline, points[], winner: 'A' | 'B' | null }.
 */
export function verdict(productA, productB, maxRank) {
  const A = describe('A', productA, maxRank);
  const B = describe('B', productB, maxRank);
  const sides = [A, B];
  const hasPrices = A.price !== null && B.price !== null;
  const points = [];

  if (A.rank === B.rank) {
    points.push(`Os dois ocupam a mesma posição no ranking (#${fmt.number(A.rank)}), por isso o desempenho é equivalente.`);

    if (!hasPrices) {
      return { headline: `Desempenho equivalente. Falta o preço ${missingPriceText(sides)} para comparar o custo.`, points, winner: null };
    }
    if (A.price === B.price) {
      return { headline: 'Mesmo desempenho e mesmo preço: em custo × performance são equivalentes.', points, winner: null };
    }

    const [cheap, dear] = A.price < B.price ? [A, B] : [B, A];
    points.push(cheaperLine(cheap, dear));
    return { headline: `${cheap.name} compensa mais: tem o mesmo desempenho e custa menos.`, points, winner: cheap.key };
  }

  const [fast, slow] = A.rank < B.rank ? [A, B] : [B, A];
  const positions = slow.rank - fast.rank;
  let performance = `O ${fast.key} é mais rápido: está ${fmt.plural(positions, 'posição', 'posições')} acima no ranking (#${fmt.number(fast.rank)} contra #${fmt.number(slow.rank)})`;
  if (fast.index !== null) performance += `, com índice ${fmt.index(fast.index)} contra ${fmt.index(slow.index)}`;
  points.push(`${performance}.`);

  if (!hasPrices) {
    return {
      headline: `${fast.name} é mais rápido, mas falta o preço ${missingPriceText(sides)} para comparar o custo × performance.`,
      points,
      winner: null,
    };
  }

  if (fast.price <= slow.price) {
    if (fast.price < slow.price) points.push(cheaperLine(fast, slow));
    if (A.cpp !== null) points.push(`Cada ponto de índice custa ${fmt.money(A.cpp)} no A e ${fmt.money(B.cpp)} no B.`);
    const how = fast.price < slow.price ? 'mais barato' : 'custa o mesmo';
    return { headline: `${fast.name} é mais rápido e ${how}: é a melhor escolha em custo × performance.`, points, winner: fast.key };
  }

  // The faster one is more expensive: decide by cost per performance point.
  points.push(cheaperLine(slow, fast));

  if (fast.cpp === null || slow.cpp === null) {
    return { headline: `${fast.name} é mais rápido, mas custa mais ${fmt.money(fast.price - slow.price)}.`, points, winner: null };
  }

  points.push(`Cada ponto de índice custa ${fmt.money(A.cpp)} no A e ${fmt.money(B.cpp)} no B.`);

  const extraPoints = fast.index - slow.index;
  const marginal = (fast.price - slow.price) / extraPoints;
  points.push(`Os ${fmt.index(extraPoints)} pontos de índice a mais do ${fast.key} custam ${fmt.money(marginal)} cada, contra ${fmt.money(slow.cpp)} por ponto no ${slow.key}.`);

  if (fast.cpp <= slow.cpp) {
    return {
      headline: `${fast.name} custa mais, mas compensa: cada ponto de desempenho sai mais barato do que no ${slow.name}.`,
      points,
      winner: fast.key,
    };
  }

  return {
    headline: `${slow.name} compensa mais em custo × performance. ${fast.name} só vale a pena se precisares do desempenho extra.`,
    points,
    winner: slow.key,
  };
}
