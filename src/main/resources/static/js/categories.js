// Everything that differs between processors and graphics cards: texts, grammatical
// gender, filters, sort orders, list columns and the illustration. The list, product and
// comparison pages are the same code for both.

import * as fmt from './format.js';
import * as m from './metrics.js';
import { CPU_SPEC_GROUPS, GPU_SPEC_GROUPS, formFactorLabel } from './specs.js';

const TIERS = [5, 10, 25, 50];

const PRICE_FIELD = { type: 'number', name: 'maxCost', label: 'Preço máximo (US$)', min: 1, step: 1, error: 'O preço máximo tem de ser um número maior do que zero.' };

const cpu = {
  key: 'cpu',
  isCpu: true,
  nav: 'Processadores',
  // Grammar: "o processador", "a placa gráfica".
  g: {
    The: 'O',
    of: 'do',
    in: 'no',
    Both: 'Os dois',
    ofBoth: 'dos dois processadores',
    faster: 'mais rápido',
    cheaper: 'mais barato',
    released: 'lançado',
    none: 'nenhum',
    they: 'Os',
    selected: 'Selecionado',
    these: 'estes são os',
    compareWith: 'Comparar com outro processador',
    aOne: 'um processador',
    one: 'processador',
    many: 'processadores',
    theMany: 'os processadores',
  },
  list: {
    title: 'Compara processadores pelo desempenho e pelo preço',
    lead: 'Abre um processador para ver as especificações explicadas, ou escolhe dois para saber qual compensa mais.',
    searchLabel: 'Pesquisar processador',
    placeholder: 'Ex.: Ryzen 5 5600X ou i5 12600K',
    nameColumn: 'Processador',
    note: 'Desempenho: índice de 0 a 100 e posição no ranking. Custo por ponto: preço a dividir pelo índice.',
  },
  pickerPlaceholder: 'Escreve o nome de outro processador',
  filters: [
    { type: 'select', name: 'brand', label: 'Marca', options: [['', 'Todas'], 'AMD', 'Intel', 'Apple', 'Qualcomm', 'MediaTek', 'Samsung'] },
    { type: 'select', name: 'tier', label: 'Desempenho', options: [['', 'Qualquer'], ...TIERS.map((t) => [String(t), `Entre os ${t}% mais rápidos`])] },
    { type: 'number', name: 'minCoreCount', label: 'Núcleos mínimos', min: 1, max: 256, step: 1, integer: true, error: 'Os núcleos mínimos têm de ser um número inteiro maior do que zero.' },
    PRICE_FIELD,
  ],
  checks: [],
  orders: [
    { value: 'performance', label: 'Mais rápidos', sort: 'rank,asc' },
    { value: 'value', label: 'Melhor custo × performance', sort: 'value,asc', needsPrice: true },
    { value: 'cheapest', label: 'Mais baratos', sort: 'cost,asc', needsPrice: true },
    { value: 'cores', label: 'Mais núcleos', sort: 'cores,desc' },
    { value: 'newest', label: 'Mais recentes', sort: 'releaseDate,desc' },
  ],
  toParams(values, maxRank) {
    const params = {};
    if (values.brand) params.brand = values.brand;
    if (values.minCoreCount) params.minCoreCount = values.minCoreCount;
    if (values.maxCost) params.maxCost = values.maxCost;
    // Ranking positions: the top 10% are positions 1 to maxRank / 10.
    if (values.tier && maxRank) params.maxComputeRank = Math.ceil((maxRank * Number(values.tier)) / 100);
    return params;
  },
  columns: [
    {
      label: 'Desempenho',
      cell: (p, maxRank) => [m.performanceIndex(p, maxRank), `#${fmt.number(m.rank(p))} no ranking`],
    },
    {
      label: 'Núcleos / threads',
      cell: (p) => [`${fmt.number(m.cores(p) ?? 0)} / ${fmt.number(m.threads(p) ?? 0)}`],
    },
  ],
  subline: (p) => [p.family || p.brand, m.releaseOf(p) && fmt.release(m.releaseOf(p), true)],
  headerMeta: (p) => [
    m.socket(p) && `Socket ${m.socket(p)}`,
    m.releaseOf(p) && `lançado em ${fmt.release(m.releaseOf(p))}`,
  ],
  specGroups: CPU_SPEC_GROUPS,
  intro(p, maxRank) {
    if (m.rank(p) === 1) return 'É o processador mais rápido da base de dados.';
    const idx = m.performanceIndex(p, maxRank);
    if (idx === null) return '';
    return `Está na posição #${fmt.number(m.rank(p))} de ${fmt.number(maxRank)}: é mais rápido do que cerca de ${fmt.number(Math.round(idx))}% dos processadores registados.`;
  },
  similarLabel: 'Entre os processadores com desempenho parecido',
  // Visual for the desktop-only illustration: one lit die cell per core.
  illustration(p) {
    if (!p) return { kind: 'chip', idle: true };
    const cores = m.cores(p) ?? 0;
    const detail = [fmt.plural(cores, 'núcleo', 'núcleos')];
    if (m.threads(p)) detail.push(fmt.plural(m.threads(p), 'thread', 'threads'));
    if (m.boostClock(p)) detail.push(`até ${fmt.ghz(m.boostClock(p))}`);
    return {
      kind: 'chip',
      lit: cores,
      clockGHz: m.boostClock(p) ?? m.baseClock(p) ?? 3,
      lanes: Math.round((m.threads(p) ?? 4) * 0.6),
      title: p.productName,
      detail: detail.join(', '),
    };
  },
};

const gpu = {
  key: 'gpu',
  isCpu: false,
  nav: 'Placas gráficas',
  g: {
    The: 'A',
    of: 'da',
    in: 'na',
    Both: 'As duas',
    ofBoth: 'das duas placas gráficas',
    faster: 'mais rápida',
    cheaper: 'mais barata',
    released: 'lançada',
    none: 'nenhuma',
    they: 'As',
    selected: 'Selecionada',
    these: 'estas são as',
    compareWith: 'Comparar com outra placa gráfica',
    aOne: 'uma placa gráfica',
    one: 'placa gráfica',
    many: 'placas gráficas',
    theMany: 'as placas gráficas',
  },
  list: {
    title: 'Compara placas gráficas pelo desempenho e pelo preço',
    lead: 'Abre uma placa para ver as especificações explicadas, ou escolhe duas para saber qual compensa mais.',
    searchLabel: 'Pesquisar placa gráfica',
    placeholder: 'Ex.: RTX 4060, RX 7800 XT ou Arc B580',
    nameColumn: 'Placa gráfica',
    note: 'Desempenho: índice de 0 a 100 e potência de cálculo FP32. Preço: o de lançamento. Custo por ponto: preço a dividir pelo índice.',
  },
  pickerPlaceholder: 'Escreve o nome de outra placa gráfica',
  filters: [
    { type: 'select', name: 'brand', label: 'Marca', options: [['', 'Todas'], 'NVIDIA', 'AMD', 'Intel', 'ATI', 'Matrox', '3dfx'] },
    { type: 'select', name: 'formFactor', label: 'Tipo', options: [['', 'Todos'], ['desktop', 'Placas dedicadas'], ['mobile', 'Portáteis'], ['integrated', 'Integradas']] },
    { type: 'select', name: 'tier', label: 'Desempenho', options: [['', 'Qualquer'], ...TIERS.map((t) => [String(t), `Entre as ${t}% mais rápidas`])] },
    { type: 'select', name: 'minMemoryMb', label: 'Memória mínima', options: [['', 'Qualquer'], ...[4, 6, 8, 12, 16, 24].map((gb) => [String(gb * 1024), `${gb} GB`])] },
    PRICE_FIELD,
  ],
  checks: [{ name: 'rayTracing', label: 'Com ray tracing' }],
  orders: [
    { value: 'performance', label: 'Mais rápidas', sort: 'rank,desc' },
    { value: 'value', label: 'Melhor custo × performance', sort: 'value,asc', needsPrice: true },
    { value: 'cheapest', label: 'Mais baratas', sort: 'cost,asc', needsPrice: true },
    { value: 'memory', label: 'Mais memória', sort: 'memory,desc' },
    { value: 'newest', label: 'Mais recentes', sort: 'releaseDate,desc' },
  ],
  toParams(values) {
    const params = {};
    if (values.brand) params.brand = values.brand;
    if (values.formFactor) params.formFactor = values.formFactor;
    if (values.minMemoryMb) params.minMemoryMb = values.minMemoryMb;
    if (values.maxCost) params.maxCost = values.maxCost;
    if (values.rayTracing) params.hasRayTracing = true;
    // Scores from 0 to 1000: the top 10% score 900 or more.
    if (values.tier) params.minComputeRank = 1000 - Number(values.tier) * 10;
    return params;
  },
  columns: [
    {
      label: 'Desempenho',
      cell: (p, maxRank) => [m.performanceIndex(p, maxRank), m.fp32Tflops(p) ? fmt.tflops(m.fp32Tflops(p)) : null],
    },
    {
      label: 'Memória',
      cell: (p) => {
        if (m.memoryShared(p)) return ['Partilhada'];
        if (!m.memoryMb(p)) return [null];
        return [fmt.memory(m.memoryMb(p)), p.gpuSpec?.memoryType || null];
      },
    },
  ],
  subline: (p) => [
    p.family || p.brand,
    formFactorLabel(m.formFactor(p))?.toLowerCase(),
    m.releaseOf(p) && fmt.release(m.releaseOf(p), true),
  ],
  headerMeta: (p) => [
    formFactorLabel(m.formFactor(p)),
    p.gpuSpec?.architecture && `arquitetura ${p.gpuSpec.architecture}`,
    m.releaseOf(p) && `lançada em ${fmt.release(m.releaseOf(p))}`,
  ],
  specGroups: GPU_SPEC_GROUPS,
  intro(p) {
    const score = m.gpuScore(p);
    if (!score) return 'Não tem pontuação de desempenho na base de dados (as placas mais antigas não foram avaliadas), por isso não tem índice.';
    return `Tem uma pontuação de ${fmt.number(score)} em 1000: é mais rápida do que cerca de ${fmt.number(Math.round(score / 10))}% das placas gráficas registadas.`;
  },
  similarLabel: 'Entre as placas do mesmo tipo com desempenho parecido',
  // Desktop cards are drawn as a card with fans (more fans and faster with a higher TDP);
  // laptop and integrated GPUs as a chip whose lit cells follow the performance index.
  illustration(p) {
    if (!p) return { kind: 'card', idle: true };
    const tdp = m.tdp(p);
    const detail = [
      m.memoryShared(p) ? 'memória partilhada' : m.memoryMb(p) && `${fmt.memory(m.memoryMb(p))}${p.gpuSpec?.memoryType ? ` ${p.gpuSpec.memoryType}` : ''}`,
      tdp && fmt.watts(tdp),
    ].filter(Boolean).join(', ');

    if (m.formFactor(p) === 'DESKTOP') {
      return {
        kind: 'card',
        fans: !tdp ? 2 : tdp <= 75 ? 1 : tdp <= 250 ? 2 : 3,
        revPerSecond: tdp ? Math.min(2.5, 0.4 + tdp / 200) : 0.8,
        title: p.productName,
        detail,
      };
    }

    const idx = m.performanceIndex(p) ?? 0;
    return {
      kind: 'chip',
      grid: 8,
      lit: Math.round((idx / 100) * 64),
      clockGHz: (m.gpuBoostClock(p) ?? 1000) / 1000,
      lanes: Math.round(6 + idx / 5),
      title: p.productName,
      detail,
    };
  },
};

export const CATEGORIES = { cpu, gpu };

export const categoryOf = (p) => (m.isGpu(p) ? gpu : cpu);
