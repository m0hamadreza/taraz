import {
  formatMoney,
  formatMoneyCompact,
  formatMoneyParts,
  formatNumber,
  formatPercent,
  formatQuantity,
  formatRelativeTime,
  parseQuantity,
  toLatinDigits,
  toPersianDigits,
} from '@/lib/format';
import { pctChange, rialToToman, toDisplayAmount } from '@/lib/money';

describe('digit shaping', () => {
  it('maps every Latin digit to its Persian counterpart', () => {
    expect(toPersianDigits('0123456789')).toBe('۰۱۲۳۴۵۶۷۸۹');
  });

  it('round-trips back to Latin, including Persian separators', () => {
    expect(toLatinDigits('۱٬۲۳۴٫۵۶')).toBe('1234.56');
  });

  it('also accepts Arabic-Indic digits, which Persian keyboards emit', () => {
    expect(toLatinDigits('٤٢')).toBe('42');
  });
});

describe('formatNumber', () => {
  it('groups thousands with the Persian separator', () => {
    expect(formatNumber(4_823_000)).toBe('۴٬۸۲۳٬۰۰۰');
  });

  it('drops trailing zeros but honours the minimum', () => {
    expect(formatNumber(1.5, { maximumFractionDigits: 3 })).toBe('۱٫۵');
    expect(formatNumber(1.5, { maximumFractionDigits: 3, minimumFractionDigits: 2 })).toBe('۱٫۵۰');
  });

  it('keeps the sign in front of a negative value', () => {
    expect(formatNumber(-250)).toBe('-۲۵۰');
  });

  it('renders a dash rather than NaN for a non-finite input', () => {
    expect(formatNumber(Number.NaN)).toBe('—');
  });
});

describe('money', () => {
  it('divides Rial by ten to reach Toman', () => {
    expect(rialToToman(482_300_000)).toBe(48_230_000);
    expect(toDisplayAmount(482_300_000, 'rial')).toBe(482_300_000);
  });

  it('renders the brief example: 4 grams plus the rest, in Toman', () => {
    expect(formatMoney(482_300_000, 'toman')).toBe('۴۸٬۲۳۰٬۰۰۰ تومان');
    expect(formatMoney(482_300_000, 'rial')).toBe('۴۸۲٬۳۰۰٬۰۰۰ ریال');
  });

  it('omits the unit when asked, for table columns', () => {
    expect(formatMoney(482_300_000, 'toman', { withUnit: false })).toBe('۴۸٬۲۳۰٬۰۰۰');
  });

  it('shortens headline sums to میلیون / میلیارد', () => {
    expect(formatMoneyCompact(482_300_000, 'toman')).toBe('۴۸٫۲۳ میلیون تومان');
    expect(formatMoneyCompact(48_230_000_000, 'toman')).toBe('۴٫۸۲ میلیارد تومان');
  });

  // `<Money/>` sets the unit a step smaller and muted, so it needs the two
  // halves separately — and the magnitude word belongs with the unit, not with
  // the figure, or "میلیون" would render at the number's size.
  it('splits the figure from its unit', () => {
    expect(formatMoneyParts(482_300_000, 'toman')).toEqual({
      value: '۴۸٬۲۳۰٬۰۰۰',
      unit: 'تومان',
    });
    expect(formatMoneyParts(482_300_000, 'toman', { compact: true })).toEqual({
      value: '۴۸٫۲۳',
      unit: 'میلیون تومان',
    });
    expect(formatMoneyParts(-48_230_000_000, 'rial', { compact: true })).toEqual({
      value: '-۴۸٫۲۳',
      unit: 'میلیارد ریال',
    });
  });

  it('leaves a sum below a میلیون uncompacted', () => {
    expect(formatMoneyParts(4_823_000, 'toman', { compact: true })).toEqual({
      value: '۴۸۲٬۳۰۰',
      unit: 'تومان',
    });
  });
});

describe('percentages', () => {
  it('signs the value and uses the Persian percent sign', () => {
    expect(formatPercent(2.4)).toBe('+۲٫۴٪');
    expect(formatPercent(-1.15)).toBe('−۱٫۱۵٪');
    expect(formatPercent(3.2, { signed: false })).toBe('۳٫۲٪');
  });

  it('treats a zero base as no change instead of Infinity', () => {
    expect(pctChange(0, 100)).toBe(0);
  });
});

describe('quantities', () => {
  it('keeps enough precision for a fractional bitcoin', () => {
    expect(formatQuantity(0.21, 8)).toBe('۰٫۲۱');
    expect(formatQuantity(4, 3)).toBe('۴');
  });

  it('parses whatever a Persian keyboard emits', () => {
    expect(parseQuantity('۲')).toBe(2);
    expect(parseQuantity('۰٫۲۱')).toBe(0.21);
    expect(parseQuantity('١٢')).toBe(12);
    expect(parseQuantity('۱٬۵۰۰')).toBe(1500);
    expect(parseQuantity('2.5')).toBe(2.5);
  });

  it('distinguishes an empty field from a deliberate zero', () => {
    // Zero clears a position, so it must not collapse into "nothing typed".
    expect(parseQuantity('0')).toBe(0);
    expect(parseQuantity('۰')).toBe(0);
    expect(parseQuantity('')).toBeNull();
    expect(parseQuantity('  ')).toBeNull();
    expect(parseQuantity('-2')).toBeNull();
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-08-27T12:00:00.000Z').getTime();

  it('describes recent quotes in Persian', () => {
    expect(formatRelativeTime('2026-08-27T11:58:00.000Z', now)).toBe('۲ دقیقه پیش');
    expect(formatRelativeTime('2026-08-27T09:00:00.000Z', now)).toBe('۳ ساعت پیش');
    expect(formatRelativeTime('2026-08-27T11:59:57.000Z', now)).toBe('همین الان');
  });

  it('falls back to a Jalali date once the quote is over a month old', () => {
    expect(formatRelativeTime('2026-01-01T12:00:00.000Z', now)).toContain('۱۴۰');
  });
});
