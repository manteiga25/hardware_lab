// Prices in the database are stored without a currency; they match US dollar list prices.
export const CURRENCY = 'USD';
export const CURRENCY_NOTE = 'Os preços estão em dólares americanos (US$) e são os registados na base de dados. Podem não corresponder ao preço atual numa loja.';

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

export const watts = (value) => `${number(value)} W`;

export const index = (value) => number(value, 1);

// Percentages below 10 keep one decimal so small differences stay visible.
export const percent = (value) => `${number(value, Math.abs(value) < 10 ? 1 : 0)}%`;

const toDate = (iso) => new Date(`${iso}T00:00:00`);

export const month = (iso) => monthFormat.format(toDate(iso));

export const shortMonth = (iso) => shortMonthFormat.format(toDate(iso));

export function plural(count, singular, pluralForm) {
  return `${number(count)} ${count === 1 ? singular : pluralForm}`;
}

export function monthsBetween(isoA, isoB) {
  const a = toDate(isoA);
  const b = toDate(isoB);
  return Math.abs((a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth()));
}

export function duration(months) {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts = [];
  if (years) parts.push(plural(years, 'ano', 'anos'));
  if (rest) parts.push(plural(rest, 'mês', 'meses'));
  return parts.join(' e ');
}
