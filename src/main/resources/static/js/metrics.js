// Every derived number shown on the page is computed here, in one place.
// A value of 0 (or null) in the database means "unknown", so it is treated as missing.
//
// Performance is stored differently per type:
//   CPU  spec.computeRank     ranking position, 1 is the fastest (up to maxRank)
//   GPU  gpuSpec.computeRank  score from 0 to 1000, 1000 is the fastest (0 = not scored)
// Both become the same 0-100 "índice de desempenho" below.

import * as fmt from './format.js';

const positive = (value) => {
  const n = Number(value);
  return value !== null && Number.isFinite(n) && n > 0 ? n : null;
};

export const isGpu = (p) => p.isCpu === false;

// Shared
export const price = (p) => positive(p.cost?.cost);
export const tdp = (p) => positive(isGpu(p) ? p.gpuSpec?.tdp : p.spec?.tdp);
export const releaseOf = (p) => (p.releaseDate ? { date: p.releaseDate, precision: p.releaseDatePrecision } : null);

// CPU
export const rank = (p) => positive(p.spec?.computeRank);
export const cores = (p) => positive(p.spec?.coreCount);
export const threads = (p) => positive(p.spec?.threadCount);
export const baseClock = (p) => positive(p.spec?.baseClock);
export const boostClock = (p) => positive(p.spec?.boostClock);
export const socket = (p) => (p.socketName && p.socketName !== 'Unknown' ? p.socketName : null);

// The "has_hyperthread" column is unreliable (0 for 16-core/32-thread Ryzen parts),
// so SMT is derived from the thread and core counts instead.
export function threadsPerCore(p) {
  const c = cores(p);
  const t = threads(p);
  return c && t ? t / c : null;
}

// GPU
const gpu = (p) => p.gpuSpec ?? {};
export const gpuScore = (p) => positive(gpu(p).computeRank);
export const formFactor = (p) => gpu(p).formFactor ?? null;
export const fp32Tflops = (p) => (positive(gpu(p).fp32Gflops) ? gpu(p).fp32Gflops / 1000 : null);
export const shadingUnits = (p) => positive(gpu(p).shadingUnits);
export const gpuBoostClock = (p) => positive(gpu(p).boostClock);
export const gpuBaseClock = (p) => positive(gpu(p).baseClock);
export const rtCores = (p) => positive(gpu(p).rtCores);
export const matrixCores = (p) => positive(gpu(p).matrixCores);
export const l2CacheKb = (p) => positive(gpu(p).l2CacheKb);
export const memoryShared = (p) => gpu(p).memoryShared === true;
export const memoryMb = (p) => positive(gpu(p).memorySizeMb);
export const memoryBus = (p) => positive(gpu(p).memoryBusBit);
export const bandwidth = (p) => positive(gpu(p).memoryBandwidthGbps);
export const suggestedPsu = (p) => positive(gpu(p).suggestedPsu);
export const lengthMm = (p) => positive(gpu(p).lengthMm);
export const busInterface = (p) => (p.socketName && p.socketName !== 'Unknown' ? p.socketName : null);

// 0-100 scale. CPU: #1 is 100, the last position is close to 0. GPU: score / 10.
export function performanceIndex(p, maxRank) {
  if (isGpu(p)) {
    const score = gpuScore(p);
    return score ? score / 10 : null;
  }
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

export function costPerTflops(p) {
  const cost = price(p);
  const tf = fp32Tflops(p);
  return cost && tf ? cost / tf : null;
}

// "Similar performance" = within 5 index points either way. Returns the search parameters
// for that band plus its index limits; GPUs also stay within the same type (desktop, mobile...).
export const SIMILAR_INDEX_POINTS = 5;

export function similarBand(p, maxRank) {
  if (isGpu(p)) {
    const score = gpuScore(p);
    if (!score) return null;
    const min = Math.max(1, score - SIMILAR_INDEX_POINTS * 10);
    const max = Math.min(1000, score + SIMILAR_INDEX_POINTS * 10);
    return {
      params: { isCpu: false, minComputeRank: min, maxComputeRank: max, formFactor: formFactor(p)?.toLowerCase() },
      low: min / 10,
      high: max / 10,
    };
  }

  const r = rank(p);
  if (!r || !maxRank) return null;
  const spread = Math.ceil((maxRank * SIMILAR_INDEX_POINTS) / 100);
  const min = Math.max(1, r - spread);
  const max = Math.min(maxRank, r + spread);
  return {
    params: { isCpu: true, minComputeRank: min, maxComputeRank: max },
    low: performanceIndex({ spec: { computeRank: max } }, maxRank),
    high: performanceIndex({ spec: { computeRank: min } }, maxRank),
  };
}

function describe(position, p, maxRank) {
  const index = performanceIndex(p, maxRank);
  return {
    position,
    product: p,
    name: fmt.shortName(p),
    rank: rank(p),
    price: price(p),
    index,
    cpp: costPerPoint(p, maxRank),
    // Higher is faster. CPUs fall back to the ranking position if the index is unavailable.
    speed: index ?? (rank(p) ? -rank(p) : null),
  };
}

/**
 * Plain-language cost x performance verdict for two products of the same type, written with
 * their names and the right grammatical gender (g comes from categories.js).
 * Returns { headline, points[], winner: 0 | 1 | null } where winner is the position of the better buy.
 */
export function verdict(first, second, maxRank, g) {
  const one = describe(0, first, maxRank);
  const two = describe(1, second, maxRank);
  const sides = [one, two];
  const points = [];

  const missing = (field) => {
    const without = sides.filter((s) => s[field] === null);
    return without.length === 2 ? g.ofBoth : `${g.of} ${without[0].name}`;
  };
  const cheaperLine = (cheap, dear) => {
    const diff = dear.price - cheap.price;
    return `${g.The} ${cheap.name} custa menos ${fmt.money(diff)} (${fmt.percent((diff / dear.price) * 100)} ${g.cheaper}).`;
  };
  const costPerPointLine = () =>
    `Cada ponto de índice custa ${fmt.money(one.cpp)} ${g.in} ${one.name} e ${fmt.money(two.cpp)} ${g.in} ${two.name}.`;

  if (one.speed === null || two.speed === null) {
    return { headline: `Falta a pontuação de desempenho ${missing('speed')} para comparar.`, points, winner: null };
  }

  const hasPrices = one.price !== null && two.price !== null;

  if (one.speed === two.speed) {
    points.push(isGpu(first)
      ? `${g.Both} têm a mesma pontuação de desempenho (${fmt.number(gpuScore(first))} em 1000), por isso o desempenho é equivalente.`
      : `Os dois ocupam a mesma posição no ranking (#${fmt.number(one.rank)}), por isso o desempenho é equivalente.`);

    if (!hasPrices) {
      return { headline: `Desempenho equivalente. Falta o preço ${missing('price')} para comparar o custo.`, points, winner: null };
    }
    if (one.price === two.price) {
      return { headline: 'Mesmo desempenho e mesmo preço: em custo × performance são equivalentes.', points, winner: null };
    }

    const [cheap, dear] = one.price < two.price ? [one, two] : [two, one];
    points.push(cheaperLine(cheap, dear));
    return { headline: `${g.The} ${cheap.name} compensa mais: tem o mesmo desempenho e custa menos.`, points, winner: cheap.position };
  }

  const [fast, slow] = one.speed > two.speed ? [one, two] : [two, one];
  points.push(performanceLine(fast, slow, g));

  if (!hasPrices) {
    return {
      headline: `${g.The} ${fast.name} é ${g.faster}, mas falta o preço ${missing('price')} para comparar o custo × performance.`,
      points,
      winner: null,
    };
  }

  if (fast.price <= slow.price) {
    if (fast.price < slow.price) points.push(cheaperLine(fast, slow));
    if (one.cpp !== null && two.cpp !== null) points.push(costPerPointLine());
    const how = fast.price < slow.price ? g.cheaper : 'custa o mesmo';
    return { headline: `${g.The} ${fast.name} é ${g.faster} e ${how}: é a melhor escolha em custo × performance.`, points, winner: fast.position };
  }

  // The faster one is more expensive: decide by cost per performance point.
  points.push(cheaperLine(slow, fast));

  if (fast.cpp === null || slow.cpp === null) {
    return { headline: `${g.The} ${fast.name} é ${g.faster}, mas custa mais ${fmt.money(fast.price - slow.price)}.`, points, winner: null };
  }

  points.push(costPerPointLine());

  const extraPoints = fast.index - slow.index;
  const marginal = (fast.price - slow.price) / extraPoints;
  points.push(`Os ${fmt.index(extraPoints)} pontos de índice a mais ${g.of} ${fast.name} custam ${fmt.money(marginal)} cada, contra ${fmt.money(slow.cpp)} por ponto ${g.in} ${slow.name}.`);

  if (fast.cpp <= slow.cpp) {
    return {
      headline: `${g.The} ${fast.name} custa mais, mas compensa: cada ponto de desempenho sai mais barato do que ${g.in} ${slow.name}.`,
      points,
      winner: fast.position,
    };
  }

  return {
    headline: `${g.The} ${slow.name} compensa mais em custo × performance. ${g.The} ${fast.name} só vale a pena se precisares do desempenho extra.`,
    points,
    winner: slow.position,
  };
}

function performanceLine(fast, slow, g) {
  if (isGpu(fast.product)) {
    let line = `${g.The} ${fast.name} é ${g.faster}: índice ${fmt.index(fast.index)} contra ${fmt.index(slow.index)}`;
    const [tfFast, tfSlow] = [fp32Tflops(fast.product), fp32Tflops(slow.product)];
    if (tfFast && tfSlow) line += ` (${fmt.number(tfFast, 1)} contra ${fmt.number(tfSlow, 1)} TFLOPS em FP32)`;
    return `${line}.`;
  }

  const positions = slow.rank - fast.rank;
  let line = `${g.The} ${fast.name} é ${g.faster}: está ${fmt.plural(positions, 'posição', 'posições')} acima no ranking (#${fmt.number(fast.rank)} contra #${fmt.number(slow.rank)})`;
  if (fast.index !== null) line += `, com índice ${fmt.index(fast.index)} contra ${fmt.index(slow.index)}`;
  return `${line}.`;
}
