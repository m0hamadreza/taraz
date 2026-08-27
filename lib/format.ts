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
 * Format an internal Rial amount for display in the user's chosen currency.
 * Pass `withUnit: false` when the unit is already shown alongside (e.g. a column
 * header) so it is not repeated on every row.
 */
export function formatMoney(
  rial: number,
  currency: Currency,
  { withUnit = true }: { withUnit?: boolean } = {}
): string {
  const amount = roundRial(toDisplayAmount(rial, currency));
  const text = formatNumber(amount);
  return withUnit ? `${text} ${CURRENCY_LABEL[currency]}` : text;
}

/**
 * Shorten large sums to میلیون / میلیارد / همت for headline positions where the
 * full number would wrap. `همت` (هزار میلیارد تومان) is the standard Iranian
 * unit for the trillions.
 */
export function formatMoneyCompact(rial: number, currency: Currency): string {
  const amount = Math.abs(toDisplayAmount(rial, currency));
  const sign = rial < 0 ? '-' : '';
  const unit = CURRENCY_LABEL[currency];

  if (amount >= 1e12) return `${sign}${formatNumber(amount / 1e12, { maximumFractionDigits: 2 })} هزار میلیارد ${unit}`;
  if (amount >= 1e9) return `${sign}${formatNumber(amount / 1e9, { maximumFractionDigits: 2 })} میلیارد ${unit}`;
  if (amount >= 1e6) return `${sign}${formatNumber(amount / 1e6, { maximumFractionDigits: 2 })} میلیون ${unit}`;
  return formatMoney(rial, currency);
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
