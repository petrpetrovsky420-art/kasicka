import { toUTCDate } from './dates';

const LOCALE = 'cs-CZ';

const czk = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'CZK',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const inputNumber = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits: 0 });
const shortDate = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});
const longDate = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Celé koruny, „30 000 Kč“. Nikdy nevrátí „-0 Kč“. */
export function formatKc(amount: number): string {
  const rounded = Math.round(amount);
  return czk.format(rounded === 0 ? 0 : rounded);
}

/** Kolik je potřeba odložit: zaokrouhlujeme nahoru, aby to opravdu stačilo. */
export function formatKcUp(amount: number): string {
  return formatKc(Math.ceil(amount - 1e-9));
}

/** „+500 Kč“ / „−500 Kč“ (s opravdovým znaménkem minus). */
export function formatKcSigned(amount: number): string {
  return `${amount < 0 ? '−' : '+'}${formatKc(Math.abs(amount))}`;
}

/** Hodnota do pole s částkou: „30 000“, „1 250,5“. */
export function formatInputAmount(amount: number): string {
  return inputNumber.format(amount);
}

/** Popisky osy grafu: „10 tis.“, „1,5 mil.“ */
export function formatCompact(amount: number): string {
  return compact.format(amount);
}

/** Procenta zaokrouhlená dolů, ať nesplněný cíl neukazuje „100 %“. */
export function formatPercent(pct: number): string {
  return percent.format(Math.floor(pct * 100 + 1e-9) / 100);
}

/** „21. 11. 2026“ */
export function formatDate(iso: string): string {
  return shortDate.format(toUTCDate(iso));
}

/** „21. listopadu 2026“ */
export function formatDateLong(iso: string): string {
  return longDate.format(toUTCDate(iso));
}

/** Česká množná čísla: 1 den, 2–4 dny, 5 a víc dní. */
export function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n);
  if (abs === 1) return one;
  if (abs >= 2 && abs <= 4) return few;
  return many;
}

const MONTH_IN = [
  'v lednu',
  'v únoru',
  'v březnu',
  'v dubnu',
  'v květnu',
  'v červnu',
  'v červenci',
  'v srpnu',
  'v září',
  'v říjnu',
  'v listopadu',
  'v prosinci',
];

/** „v listopadu“ */
export function inMonth(iso: string): string {
  return MONTH_IN[Number(iso.slice(5, 7)) - 1] ?? '';
}
