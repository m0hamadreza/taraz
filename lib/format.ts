import { toJalaali } from 'jalaali-js';

import { roundRial, toDisplayAmount, type Currency } from '@/lib/money';

/* -------------------------------------------------------------------------- */
/* Digits                                                                      */
/* -------------------------------------------------------------------------- */

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const;

/** U+066C ARABIC THOUSANDS SEPARATOR */
const PERSIAN_THOUSANDS = '٬';
/** U+066B ARABIC DECIMAL SEPARATOR */
const PERSIAN_DECIMAL = '٫';

/**
 * Digit shaping is done by hand rather than through `Intl.NumberFormat('fa-IR')`
 * on purpose: Hermes' ICU coverage differs between iOS, Android and web, so the
 * same number can render three different ways. A lookup table cannot drift.
 */
export function toPersianDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

export function toLatinDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d as (typeof PERSIAN_DIGITS)[number])))
    // Arabic-Indic digits, which some Persian keyboards emit
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(new RegExp(PERSIAN_DECIMAL, 'g'), '.')
    .replace(new RegExp(PERSIAN_THOUSANDS, 'g'), '');
}

function groupThousands(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, PERSIAN_THOUSANDS);
}

/** Group, apply Persian separators, then shape the digits. */
export function formatNumber(
  value: number,
  { maximumFractionDigits = 0, minimumFractionDigits = 0 } = {}
): string {
  if (!Number.isFinite(value)) return '—';
  const negative = value < 0;
  const abs = Math.abs(value);

  const fixed = abs.toFixed(Math.max(maximumFractionDigits, minimumFractionDigits));
  let [intPart, fracPart = ''] = fixed.split('.');

  if (maximumFractionDigits > minimumFractionDigits) {
    fracPart = fracPart.replace(/0+$/, '');
    if (fracPart.length < minimumFractionDigits) {
      fracPart = fracPart.padEnd(minimumFractionDigits, '0');
    }
  }

  const grouped = groupThousands(intPart);
  const joined = fracPart ? `${grouped}${PERSIAN_DECIMAL}${fracPart}` : grouped;
  return toPersianDigits(negative ? `-${joined}` : joined);
}

/* -------------------------------------------------------------------------- */
/* Money                                                                       */
/* -------------------------------------------------------------------------- */

export const CURRENCY_LABEL: Record<Currency, string> = {
  toman: 'تومان',
  rial: 'ریال',
};

/**
 * Magnitude words, largest first. `همت` (هزار میلیارد تومان) is the standard
 * Iranian unit for the trillions.
 */
const MAGNITUDES = [
  { min: 1e12, divisor: 1e12, label: 'هزار میلیارد' },
  { min: 1e9, divisor: 1e9, label: 'میلیارد' },
  { min: 1e6, divisor: 1e6, label: 'میلیون' },
] as const;

export type MoneyParts = {
  /** The figure, digits only — already grouped and shaped. */
  value: string;
  /** Everything after it: the currency word, and a magnitude word when compact. */
  unit: string;
};

/**
 * The figure and its unit, kept apart.
 *
 * Every money figure in the UI sets the unit a step smaller and in the muted
 * colour — the number is the content, the unit is a label that repeats on every
 * row. That needs two `<Text>` nodes, so the split has to happen before
 * formatting rather than by picking the last word off a formatted string.
 * `<Money/>` and `<Amount/>` are the consumers; `formatMoney` below rejoins
 * them for the few places that genuinely need one string.
 */
export function formatMoneyParts(
  rial: number,
  currency: Currency,
  { compact = false }: { compact?: boolean } = {}
): MoneyParts {
  const amount = toDisplayAmount(rial, currency);
  const unit = CURRENCY_LABEL[currency];

  if (compact) {
    const abs = Math.abs(amount);
    const magnitude = MAGNITUDES.find((m) => abs >= m.min);
    if (magnitude) {
      const sign = rial < 0 ? '-' : '';
      const figure = formatNumber(abs / magnitude.divisor, { maximumFractionDigits: 2 });
      return { value: `${sign}${figure}`, unit: `${magnitude.label} ${unit}` };
    }
  }

  return { value: formatNumber(roundRial(amount)), unit };
}

/**
 * Format an internal Rial amount for display in the user's chosen currency.
 * Pass `withUnit: false` when the unit is already shown alongside (e.g. a column
 * header) so it is not repeated on every row.
 *
 * Prefer `<Money/>` in the UI: this returns one flat string, so the unit cannot
 * be de-emphasised. It is for strings that are consumed as strings —
 * accessibility labels, a sheet row's subtitle, a chart tick.
 */
export function formatMoney(
  rial: number,
  currency: Currency,
  { withUnit = true }: { withUnit?: boolean } = {}
): string {
  const { value, unit } = formatMoneyParts(rial, currency);
  return withUnit ? `${value} ${unit}` : value;
}

/**
 * Shorten large sums to میلیون / میلیارد / هزار میلیارد for headline positions
 * where the full number would wrap.
 */
export function formatMoneyCompact(rial: number, currency: Currency): string {
  const { value, unit } = formatMoneyParts(rial, currency, { compact: true });
  return `${value} ${unit}`;
}

/** Signed percentage, e.g. `+۲٫۴٪` / `−۱٫۱٪`. */
export function formatPercent(value: number, { signed = true } = {}): string {
  const text = formatNumber(Math.abs(value), { maximumFractionDigits: 2 });
  if (!signed) return `${text}٪`;
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${text}٪`;
}

/** Quantities keep more precision than money: 0.21 BTC must not round to 0. */
export function formatQuantity(value: number, decimals: number): string {
  return formatNumber(value, { maximumFractionDigits: decimals });
}

/**
 * A quantity as typed into a field: Persian, Arabic-Indic or Latin digits,
 * either decimal separator, grouping dropped.
 *
 * `null` — not 0 — for anything unusable, so a caller can tell an empty field
 * from a deliberate zero. Zero is never a valid new holding, but it is a
 * meaningful edit: it clears the position.
 */
export function parseQuantity(input: string): number | null {
  const parsed = Number.parseFloat(toLatinDigits(input).replace(/,/g, ''));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/* -------------------------------------------------------------------------- */
/* Dates                                                                       */
/* -------------------------------------------------------------------------- */

const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
] as const;

/**
 * Jalali conversion goes through `jalaali-js` — a small CommonJS library — in
 * preference to a dayjs calendar plugin. The plugin chain is ESM-only, which
 * Metro handles but Jest does not without extra transform config, and the month
 * names are a twelve-entry table either way.
 */
function toJalaliParts(input: string | number | Date) {
  const date = input instanceof Date ? input : new Date(input);
  const { jy, jm, jd } = toJalaali(date.getFullYear(), date.getMonth() + 1, date.getDate());
  return { jy, jm, jd, date };
}

/** e.g. `۵ شهریور ۱۴۰۵` */
export function formatJalaliDate(input: string | number | Date): string {
  const { jy, jm, jd } = toJalaliParts(input);
  return toPersianDigits(`${jd} ${JALALI_MONTHS[jm - 1]} ${jy}`);
}

/** e.g. `۵ شهریور` — for chart axis ticks, where the year is redundant. */
export function formatJalaliShort(input: string | number | Date): string {
  const { jm, jd } = toJalaliParts(input);
  return toPersianDigits(`${jd} ${JALALI_MONTHS[jm - 1]}`);
}

export function formatJalaliDateTime(input: string | number | Date): string {
  const { jy, jm, jd, date } = toJalaliParts(input);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return toPersianDigits(`${jd} ${JALALI_MONTHS[jm - 1]} ${jy}، ${hh}:${mm}`);
}

/**
 * Staleness label for a quote. Prices move fast enough here that "how old is
 * this number" is part of the number's meaning.
 */
export function formatRelativeTime(iso: string | number | Date, now: number = Date.now()): string {
  const diffSeconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));

  if (diffSeconds < 10) return 'همین الان';
  if (diffSeconds < 60) return `${toPersianDigits(diffSeconds)} ثانیه پیش`;

  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return `${toPersianDigits(minutes)} دقیقه پیش`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${toPersianDigits(hours)} ساعت پیش`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${toPersianDigits(days)} روز پیش`;

  return formatJalaliDate(iso);
}
