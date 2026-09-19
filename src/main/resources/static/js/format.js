export const SITE_NAME = 'Hardware Lab';

// Prices in the database are stored without a currency; they match US dollar list prices.
export const CURRENCY = 'USD';
export const CURRENCY_NOTE = 'Os preços estão em dólares americanos (US$) e são os registados na base de dados; nas placas gráficas, é o preço de lançamento. Podem não corresponder ao preço atual numa loja.';

const LOCALE = 'pt-PT';

const moneyFormat = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY });
const monthFormat = new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' });
const shortMonthFormat = new Intl.DateTimeFormat(LOCALE, { month: 'short', year: 'numeric' });
const numberFormats = new Map();

export function number(value, digits = 0) {
  if (!numberFormats.has(digits)) {
    numberFormats.set(digits, new Intl.NumberFormat(LOCALE, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }));
  }
  return numberFormats.get(digits).format(value);
}

export const money = (value) => moneyFormat.format(value);

export const ghz = (value) => `${number(value, 2)} GHz`;

export const mhz = (value) => `${number(value)} MHz`;

export const watts = (value) => `${number(value)} W`;

export const tflops = (value) => `${number(value, value < 10 ? 2 : 1)} TFLOPS`;

// 8192 MB -> "8 GB", 1536 MB -> "1,5 GB", 256 MB -> "256 MB"
export function memory(mb) {
  if (mb < 1024) return `${number(mb)} MB`;
  const gb = mb / 1024;
  return `${number(gb, Number.isInteger(gb) ? 0 : 1)} GB`;
}

// 24576 KB -> "24 MB", 512 KB -> "512 KB"
export function kilobytes(kb) {
  if (kb < 1024) return `${number(kb)} KB`;
  const mb = kb / 1024;
  return `${number(mb, Number.isInteger(mb) ? 0 : 1)} MB`;
}

export const index = (value) => number(value, 1);

// Percentages below 10 keep one decimal so small differences stay visible.
export const percent = (value) => `${number(value, Math.abs(value) < 10 ? 1 : 0)}%`;

const toDate = (iso) => new Date(`${iso}T00:00:00`);

export const month = (iso) => monthFormat.format(toDate(iso));

// Some GPUs only have a known year (or month); the stored date is the first day of that period.
export function release({ date, precision }, short = false) {
  if (precision === 'YEAR') return String(toDate(date).getFullYear());
  return (short ? shortMonthFormat : monthFormat).format(toDate(date));
}

// "AMD Ryzen 5 5600X" -> "Ryzen 5 5600X", "Intel Xeon Gold 6130 @ 2.10GHz" -> "Xeon Gold 6130".
// Used wherever two names sit side by side, so the part that differs is what stands out.
export function shortName(product) {
  let name = product.productName.replace(/\s*@.*$/, '').trim();
  const brand = product.brand?.trim();
  if (brand && name.toLowerCase().startsWith(`${brand.toLowerCase()} `)) name = name.slice(brand.length + 1);
  return name || product.productName;
}

export function plural(count, singular, pluralForm) {
  return `${number(count)} ${count === 1 ? singular : pluralForm}`;
}

export function monthsBetween(isoA, isoB) {
  const a = toDate(isoA);
  const b = toDate(isoB);
  return Math.abs((a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth()));
}

export function yearsBetween(isoA, isoB) {
  return Math.abs(toDate(isoA).getFullYear() - toDate(isoB).getFullYear());
}

export function duration(months) {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts = [];
  if (years) parts.push(plural(years, 'ano', 'anos'));
  if (rest) parts.push(plural(rest, 'mês', 'meses'));
  return parts.join(' e ');
}
