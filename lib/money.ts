/**
 * Money handling.
 *
 * Everything is stored and transported as **integer Rial** — that is what the
 * backend will serve and it avoids a currency ambiguity at the boundary. Toman
 * exists only as a display transform (1 Toman = 10 Rial).
 *
 * Quantities are decimal `number`s (0.21 BTC, 4 grams) and values are computed
 * in float, rounded to whole Rial at the edge. A whole-Rial portfolio total sits
 * many orders of magnitude inside Number.MAX_SAFE_INTEGER, so no decimal
 * library is warranted.
 */

export type Currency = 'toman' | 'rial';

export const RIAL_PER_TOMAN = 10;

export function rialToToman(rial: number): number {
  return rial / RIAL_PER_TOMAN;
}

export function tomanToRial(toman: number): number {
  return toman * RIAL_PER_TOMAN;
}

/** Convert an internal Rial amount into whatever the user has chosen to see. */
export function toDisplayAmount(rial: number, currency: Currency): number {
  return currency === 'toman' ? rialToToman(rial) : rial;
}

export function roundRial(value: number): number {
  return Math.round(value);
}

/** Percentage change from `from` to `to`, guarding the zero-base case. */
export function pctChange(from: number, to: number): number {
  if (!from) return 0;
  return ((to - from) / from) * 100;
}
