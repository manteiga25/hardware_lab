// What each value means, how it is shown and, for comparisons, which side is better.
// Shared by the product page and the comparison page so both explain things the same way.
//
// key:     shown as a headline figure on the product page
// better:  'higher' | 'lower' decides the highlighted side in a comparison
// diff:    sentence for the "Diferença" column, receives the winner's short name
// compare: custom comparison for rows without a better side

import * as fmt from './format.js';
import * as m from './metrics.js';

const releaseRow = {
  label: 'Lançamento',
  help: 'Data de lançamento. Os mais recentes costumam suportar memória e ligações PCIe mais rápidas.',
  get: m.releaseOf,
  show: (v) => fmt.release(v),
  compare: (a, b, names) => {
    if (a === null || b === null) return { text: 'Sem dados para comparar', muted: true };
    const newer = a.date > b.date ? names[0] : names[1];
    // With only the year known, compare years; otherwise months.
    if (a.precision === 'YEAR' || b.precision === 'YEAR') {
      const years = fmt.yearsBetween(a.date, b.date);
      return years === 0
        ? { text: 'Lançados no mesmo ano', muted: true }
        : { text: `${newer} é ${fmt.plural(years, 'ano', 'anos')} mais recente` };
    }
    const months = fmt.monthsBetween(a.date, b.date);
    return months === 0
      ? { text: 'Lançados no mesmo mês', muted: true }
      : { text: `${newer} é ${fmt.duration(months)} mais recente` };
  },
};

const sameOrDifferent = (same, different) => (a, b) => {
  if (a === null || b === null) return { text: 'Sem dados para comparar', muted: true };
  return a === b ? { text: same, muted: true } : { text: different };
};

export const CPU_SPEC_GROUPS = [
  {
    title: 'Desempenho',
    rows: [
      {
        label: 'Índice de desempenho',
        key: true,
        help: 'A posição no ranking convertida numa escala de 0 a 100. Um índice de 90 quer dizer mais rápido do que cerca de 90% dos processadores registados.',
        get: (p, maxRank) => m.performanceIndex(p, maxRank),
        show: fmt.index,
        better: 'higher',
        diff: (d, w) => `${w} tem mais ${fmt.index(d)} pontos`,
      },
      {
        label: 'Posição no ranking',
        key: true,
        help: 'Lugar na lista de desempenho da base de dados, do mais rápido (#1) para o mais lento. Quanto menor, melhor.',
        get: (p) => m.rank(p),
        show: (v) => `#${fmt.number(v)}`,
        better: 'lower',
        diff: (d, w) => `${w} está ${fmt.plural(d, 'posição', 'posições')} acima`,
      },
      {
        label: 'Núcleos',
        help: 'Unidades de processamento independentes. Mais núcleos ajudam em trabalho que se divide em partes: renderização, compilação, edição de vídeo ou muitas aplicações abertas.',
        get: (p) => m.cores(p),
        show: (v) => fmt.number(v),
        better: 'higher',
        diff: (d, w) => `${w} tem mais ${fmt.plural(d, 'núcleo', 'núcleos')}`,
      },
      {
        label: 'Threads',
        help: 'Tarefas que o processador executa em simultâneo. Com SMT ou Hyper-Threading, cada núcleo trata de duas.',
        get: (p) => m.threads(p),
        show: (v) => fmt.number(v),
        better: 'higher',
        diff: (d, w) => `${w} tem mais ${fmt.plural(d, 'thread', 'threads')}`,
      },
      {
        label: 'Multithreading (SMT)',
        help: 'Indica se os núcleos executam mais do que uma thread ao mesmo tempo (a Intel chama-lhe Hyper-Threading). Calculado a partir do número de threads e de núcleos.',
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
        diff: (d, w) => `${w} tem mais ${fmt.ghz(d)}`,
      },
      {
        label: 'Frequência turbo',
        help: 'Velocidade máxima que um núcleo atinge durante pouco tempo, se houver margem de temperatura e energia. Conta mais em jogos e programas que usam poucos núcleos.',
        get: (p) => m.boostClock(p),
        show: fmt.ghz,
        better: 'higher',
        diff: (d, w) => `${w} tem mais ${fmt.ghz(d)}`,
      },
    ],
  },
  {
    title: 'Custo',
    rows: [
      {
        label: 'Preço',
        key: true,
        help: 'Preço registado na base de dados, em dólares americanos.',
        get: (p) => m.price(p),
        show: fmt.money,
        better: 'lower',
        diff: (d, w, _winner, loser) => `${w} custa menos ${fmt.money(d)} (${fmt.percent((d / loser) * 100)})`,
      },
      {
        label: 'Custo por ponto de índice',
        key: true,
        help: 'Preço a dividir pelo índice de desempenho. É a métrica principal de custo × performance: quanto mais baixo, mais desempenho por cada dólar.',
        get: (p, maxRank) => m.costPerPoint(p, maxRank),
        show: fmt.money,
        better: 'lower',
        diff: (d, w) => `${w} paga menos ${fmt.money(d)} por ponto`,
      },
      {
        label: 'Custo por núcleo',
        help: 'Preço a dividir pelo número de núcleos. Útil para trabalho que usa todos os núcleos, mas ignora a velocidade de cada um.',
        get: (p) => m.costPerCore(p),
        show: fmt.money,
        better: 'lower',
        diff: (d, w) => `${w} paga menos ${fmt.money(d)} por núcleo`,
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
        diff: (d, w) => `${w} liberta menos ${fmt.watts(d)}`,
      },
      {
        label: 'Socket',
        help: 'Encaixe na motherboard. Processadores com sockets diferentes precisam de motherboards diferentes.',
        get: (p) => m.socket(p),
        show: (v) => v,
        compare: sameOrDifferent('Mesmo socket', 'Sockets diferentes: não partilham motherboard'),
      },
      {
        label: 'Família',
        help: 'Linha de produto do fabricante.',
        get: (p) => p.family || null,
        show: (v) => v,
        compare: (a, b) => (a !== null && a === b ? { text: 'Mesma família', muted: true } : { text: '' }),
      },
      releaseRow,
    ],
  },
];

const FORM_FACTORS = {
  DESKTOP: 'Placa dedicada',
  MOBILE: 'Portátil',
  INTEGRATED: 'Integrada',
};

const SLOT_WIDTHS = {
  'Single-slot': '1 slot',
  'Dual-slot': '2 slots',
  'Triple-slot': '3 slots',
  'Quad-slot': '4 slots',
  IGP: 'Integrada (sem slot)',
  'MXM Module': 'Módulo MXM (portáteis)',
  'SXM Module': 'Módulo SXM (servidores)',
  'OAM Module': 'Módulo OAM (servidores)',
};

const PRODUCTION = {
  Active: 'Em produção',
  'End-of-life': 'Descontinuada',
  Unreleased: 'Não lançada',
};

export const formFactorLabel = (value) => FORM_FACTORS[value] ?? null;

function apis(p) {
  const g = p.gpuSpec ?? {};
  // Version numbers keep their dot ("11.2"), they are not decimal amounts.
  const list = [
    g.directx && `DirectX ${Number(g.directx)}`,
    g.opengl && `OpenGL ${Number(g.opengl).toFixed(1)}`,
    g.vulkan && `Vulkan ${g.vulkan}`,
    g.cuda && `CUDA ${g.cuda}`,
  ].filter(Boolean);
  return list.length ? list.join(', ') : null;
}

function chip(p) {
  const g = p.gpuSpec ?? {};
  if (!g.gpuChip) return null;
  return g.gpuVariant && g.gpuVariant !== g.gpuChip ? `${g.gpuChip} (${g.gpuVariant})` : g.gpuChip;
}

function process(p) {
  const g = p.gpuSpec ?? {};
  if (!g.processSizeNm) return null;
  return g.foundry ? `${fmt.number(g.processSizeNm)} nm (${g.foundry})` : `${fmt.number(g.processSizeNm)} nm`;
}

export const GPU_SPEC_GROUPS = [
  {
    title: 'Desempenho',
    rows: [
      {
        label: 'Índice de desempenho',
        key: true,
        help: 'A pontuação de desempenho da base de dados (0 a 1000) convertida numa escala de 0 a 100. Um índice de 90 quer dizer mais rápida do que cerca de 90% das placas gráficas registadas.',
        get: (p, maxRank) => m.performanceIndex(p, maxRank),
        show: fmt.index,
        better: 'higher',
        diff: (d, w) => `${w} tem mais ${fmt.index(d)} pontos`,
      },
      {
        label: 'Potência de cálculo (FP32)',
        key: true,
        help: 'Operações por segundo em precisão simples, o tipo de cálculo usado em jogos e na maior parte das aplicações gráficas. É um máximo teórico: entre arquiteturas diferentes, o desempenho real pode variar bastante.',
        get: (p) => m.fp32Tflops(p),
        show: fmt.tflops,
        better: 'higher',
        diff: (d, w) => `${w} tem mais ${fmt.tflops(d)}`,
      },
      {
        label: 'Unidades de shading',
        help: 'Os pequenos processadores que fazem o trabalho gráfico em paralelo (CUDA cores na NVIDIA, stream processors na AMD). Só são comparáveis dentro da mesma arquitetura.',
        get: (p) => m.shadingUnits(p),
        show: (v) => fmt.number(v),
        better: 'higher',
        diff: (d, w) => `${w} tem mais ${fmt.number(d)}`,
      },
      {
        label: 'Frequência boost',
        help: 'Velocidade típica do chip gráfico em carga, em megahertz (MHz).',
        get: (p) => m.gpuBoostClock(p),
        show: fmt.mhz,
        better: 'higher',
        diff: (d, w) => `${w} tem mais ${fmt.mhz(d)}`,
      },
      {
        label: 'Frequência base',
        help: 'Velocidade mínima garantida do chip gráfico em carga.',
        get: (p) => m.gpuBaseClock(p),
        show: fmt.mhz,
        better: 'higher',
        diff: (d, w) => `${w} tem mais ${fmt.mhz(d)}`,
      },
      {
        label: 'Núcleos de ray tracing',
        help: 'Unidades dedicadas a calcular reflexos, sombras e iluminação realistas. Sem elas, o ray tracing é muito lento ou não existe. “Não indicado” quer dizer que a base de dados não tem este valor.',
        get: (p) => m.rtCores(p),
        show: (v) => fmt.number(v),
        missing: 'Não indicado',
        better: 'higher',
        diff: (d, w) => `${w} tem mais ${fmt.number(d)}`,
      },
      {
        label: 'Núcleos de IA (tensor)',
        help: 'Unidades para cálculos de inteligência artificial, usadas por exemplo no DLSS para subir a resolução com pouca perda de qualidade.',
        get: (p) => m.matrixCores(p),
        show: (v) => fmt.number(v),
        missing: 'Não indicado',
        better: 'higher',
        diff: (d, w) => `${w} tem mais ${fmt.number(d)}`,
      },
      {
        label: 'Cache L2',
        help: 'Memória muito rápida dentro do chip. Mais cache reduz os acessos à memória gráfica.',
        get: (p) => m.l2CacheKb(p),
        show: fmt.kilobytes,
        better: 'higher',
        diff: (d, w) => `${w} tem mais ${fmt.kilobytes(d)}`,
      },
    ],
  },
  {
    title: 'Memória',
    rows: [
      {
        label: 'Memória gráfica',
        help: 'Memória própria da placa para texturas e outros dados. Jogos recentes em resoluções altas usam cada vez mais; quando falta, é preciso baixar a qualidade das texturas. As integradas usam a memória do sistema.',
        get: (p) => (m.memoryShared(p) ? null : m.memoryMb(p)),
        show: fmt.memory,
        missingFor: (p) => (m.memoryShared(p) ? 'Partilhada com o sistema' : null),
        better: 'higher',
        diff: (d, w) => `${w} tem mais ${fmt.memory(d)}`,
      },
      {
        label: 'Tipo de memória',
        help: 'Geração da memória (por exemplo GDDR6, GDDR7 ou HBM). Gerações mais recentes transferem mais dados por segundo.',
        get: (p) => p.gpuSpec?.memoryType || null,
        show: (v) => v,
        compare: sameOrDifferent('Mesmo tipo', ''),
      },
      {
        label: 'Barramento de memória',
        help: 'Largura da ligação entre o chip e a memória, em bits. Junto com o tipo de memória, define a largura de banda.',
        get: (p) => m.memoryBus(p),
        show: (v) => `${fmt.number(v)} bits`,
        better: 'higher',
        diff: (d, w) => `${w} tem mais ${fmt.number(d)} bits`,
      },
      {
        label: 'Largura de banda',
        help: 'Quantidade de dados que a memória entrega por segundo. Conta muito em resoluções altas.',
        get: (p) => m.bandwidth(p),
        show: (v) => `${fmt.number(v, 0)} GB/s`,
        better: 'higher',
        diff: (d, w) => `${w} tem mais ${fmt.number(d, 0)} GB/s`,
      },
    ],
  },
  {
    title: 'Custo',
    rows: [
      {
        label: 'Preço de lançamento',
        key: true,
        help: 'Preço sugerido pelo fabricante quando a placa foi lançada, em dólares americanos. O preço atual numa loja pode ser muito diferente.',
        get: (p) => m.price(p),
        show: fmt.money,
        better: 'lower',
        diff: (d, w, _winner, loser) => `${w} custa menos ${fmt.money(d)} (${fmt.percent((d / loser) * 100)})`,
      },
      {
        label: 'Custo por ponto de índice',
        key: true,
        help: 'Preço a dividir pelo índice de desempenho. É a métrica principal de custo × performance: quanto mais baixo, mais desempenho por cada dólar.',
        get: (p, maxRank) => m.costPerPoint(p, maxRank),
        show: fmt.money,
        better: 'lower',
        diff: (d, w) => `${w} paga menos ${fmt.money(d)} por ponto`,
      },
      {
        label: 'Custo por TFLOPS',
        help: 'Preço a dividir pela potência FP32. Mostra quanto custa cada unidade de cálculo teórico; é mais fiável entre placas da mesma geração.',
        get: (p) => m.costPerTflops(p),
        show: fmt.money,
        better: 'lower',
        diff: (d, w) => `${w} paga menos ${fmt.money(d)} por TFLOPS`,
      },
    ],
  },
  {
    title: 'Consumo e montagem',
    rows: [
      {
        label: 'TDP',
        help: 'Energia que a placa consome em carga, em watts. Define o calor a dissipar e a fonte de alimentação necessária.',
        get: (p) => m.tdp(p),
        show: fmt.watts,
        better: 'lower',
        diff: (d, w) => `${w} consome menos ${fmt.watts(d)}`,
      },
      {
        label: 'Fonte recomendada',
        help: 'Potência mínima da fonte de alimentação sugerida pelo fabricante para o computador inteiro.',
        get: (p) => m.suggestedPsu(p),
        show: fmt.watts,
        better: 'lower',
        diff: (d, w) => `${w} pede menos ${fmt.watts(d)}`,
      },
      {
        label: 'Conectores de alimentação',
        help: 'Cabos da fonte de alimentação que a placa precisa. Confirma se a tua fonte os tem.',
        get: (p) => p.gpuSpec?.powerConnectors || null,
        show: (v) => v,
        compare: sameOrDifferent('Mesmos conectores', ''),
      },
      {
        label: 'Espaço ocupado',
        help: 'Quantos slots da caixa a placa tapa. Placas mais grossas podem tapar outras ligações da motherboard.',
        get: (p) => p.gpuSpec?.slotWidth || null,
        show: (v) => SLOT_WIDTHS[v] ?? v,
        compare: sameOrDifferent('Mesmo espaço', ''),
      },
      {
        label: 'Comprimento',
        help: 'Comprimento da placa. Confirma se cabe na tua caixa.',
        get: (p) => m.lengthMm(p),
        show: (v) => `${fmt.number(v)} mm`,
        compare: (a, b, names) => {
          if (a === null || b === null) return { text: 'Sem dados para comparar', muted: true };
          if (a === b) return { text: 'Mesmo comprimento', muted: true };
          return { text: `${a < b ? names[0] : names[1]} tem menos ${fmt.number(Math.abs(a - b))} mm` };
        },
      },
      {
        label: 'Interface',
        help: 'Ligação à motherboard. Uma placa PCIe funciona em qualquer slot PCIe x16; uma versão de PCIe mais antiga na motherboard pode limitar um pouco o desempenho.',
        get: (p) => m.busInterface(p),
        show: (v) => v,
        compare: sameOrDifferent('Mesma interface', ''),
      },
      {
        label: 'Saídas de vídeo',
        help: 'Ligações para monitores disponíveis na placa.',
        get: (p) => p.gpuSpec?.outputs || null,
        show: (v) => v,
        compare: () => ({ text: '' }),
      },
    ],
  },
  {
    title: 'Chip e compatibilidade',
    rows: [
      {
        label: 'Tipo',
        help: 'Placa dedicada: instala-se num computador de secretária. Portátil: versão para portáteis, só existe já montada. Integrada: faz parte do processador ou da motherboard e usa a memória do sistema.',
        get: (p) => m.formFactor(p),
        show: (v) => FORM_FACTORS[v] ?? v,
        compare: sameOrDifferent('Mesmo tipo', 'Tipos diferentes'),
      },
      {
        label: 'Arquitetura',
        help: 'Geração do desenho do chip. Arquiteturas mais recentes costumam fazer mais com a mesma energia e suportam mais funcionalidades.',
        get: (p) => p.gpuSpec?.architecture || null,
        show: (v) => v,
        compare: sameOrDifferent('Mesma arquitetura', ''),
      },
      {
        label: 'Chip gráfico',
        help: 'Nome interno do chip usado nesta placa.',
        get: chip,
        show: (v) => v,
        compare: sameOrDifferent('Mesmo chip', ''),
      },
      {
        label: 'Processo de fabrico',
        help: 'Tamanho dos transístores, em nanómetros (nm), e a fábrica que produz o chip. Processos mais pequenos costumam gastar menos energia.',
        get: process,
        show: (v) => v,
        compare: () => ({ text: '' }),
      },
      {
        label: 'Transístores',
        help: 'Quantidade de transístores no chip. Indica a complexidade do chip, não o desempenho.',
        get: (p) => (p.gpuSpec?.transistorsMillions > 0 ? p.gpuSpec.transistorsMillions : null),
        show: (v) => (v >= 1000 ? `${fmt.number(v / 1000, 1)} mil milhões` : `${fmt.number(v)} milhões`),
        compare: () => ({ text: '' }),
      },
      {
        label: 'APIs suportadas',
        help: 'Versões das interfaces gráficas que a placa suporta. Jogos recentes pedem DirectX 12 ou Vulkan; CUDA só existe nas placas NVIDIA.',
        get: apis,
        show: (v) => v,
        compare: () => ({ text: '' }),
      },
      {
        label: 'Estado',
        help: 'Se o fabricante ainda produz esta placa.',
        get: (p) => p.gpuSpec?.productionStatus || null,
        show: (v) => PRODUCTION[v] ?? v,
        compare: () => ({ text: '' }),
      },
      releaseRow,
    ],
  },
];

// The text shown when a row has no value for a product.
export function missingText(row, product) {
  return row.missingFor?.(product) ?? row.missing ?? 'Sem dados';
}

// Compares one row for two products. `winner` is 0, 1 or null.
export function compareRow(row, values, names) {
  const [a, b] = values;
  if (row.compare) return { winner: null, ...row.compare(a, b, names) };
  if (a === null || b === null) return { winner: null, text: 'Sem dados para comparar', muted: true };
  if (!row.better) return { winner: null, text: '' };
  if (a === b) return { winner: null, text: 'Iguais', muted: true };

  const firstWins = row.better === 'higher' ? a > b : a < b;
  const winner = firstWins ? 0 : 1;
  const [wv, lv] = firstWins ? [a, b] : [b, a];
  return { winner, text: row.diff(Math.abs(a - b), names[winner], wv, lv) };
}
