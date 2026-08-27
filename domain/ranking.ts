import type { Quote, Venue } from '@/api/contracts';
import { netOfFeesIrr } from '@/domain/valuation';

/**
 * "Where is this cheapest to buy and dearest to sell?"
 *
 * A headline bid is not comparable across venues, because each one takes a
 * different cut on the way out. Everything below ranks on the **effective**
 * price — what actually lands in or leaves your account — so a venue with a
 * tempting bid and a 7% fee does not win a comparison it should lose.
 */

export type VenueQuote = {
  venue: Venue;
  quote: Quote;
  /** All-in cost per unit to acquire: ask plus entry fees. */
  effectiveBuyIrr: number;
  /** All-in proceeds per unit to liquidate: bid minus exit fees. */
  effectiveSellIrr: number;
  /** Quoted spread as a fraction of the bid. */
  spreadPct: number;
  /** Round-trip cost — buy here, sell here — as a fraction of the buy price. */
  roundTripPct: number;
};

/**
 * Effective prices are computed per single unit. The flat withdrawal fee is
 * therefore amortised over `referenceQuantity`; at one unit a 200,000 Rial
 * withdrawal would swamp a DOGE quote and produce nonsense rankings.
 */
export function toVenueQuote(venue: Venue, quote: Quote, referenceQuantity = 1): VenueQuote {
  const qty = referenceQuantity > 0 ? referenceQuantity : 1;

  const grossSell = quote.bidIrr * qty;
  const effectiveSellIrr = netOfFeesIrr(grossSell, venue) / qty;
  const effectiveBuyIrr = quote.askIrr * (1 + venue.fees.buyPct);

  const spreadPct = quote.bidIrr ? ((quote.askIrr - quote.bidIrr) / quote.bidIrr) * 100 : 0;
  const roundTripPct = effectiveBuyIrr
    ? ((effectiveBuyIrr - effectiveSellIrr) / effectiveBuyIrr) * 100
    : 0;

  return { venue, quote, effectiveBuyIrr, effectiveSellIrr, spreadPct, roundTripPct };
}

export function buildVenueQuotes(
  quotes: Quote[],
  venues: Map<string, Venue>,
  referenceQuantity = 1
): VenueQuote[] {
  const result: VenueQuote[] = [];
  for (const quote of quotes) {
    const venue = venues.get(quote.venueId);
    if (venue) result.push(toVenueQuote(venue, quote, referenceQuantity));
  }
  return result;
}

/** Cheapest place to acquire — lowest all-in cost. */
export function bestToBuy(rows: VenueQuote[]): VenueQuote | null {
  if (rows.length === 0) return null;
  return rows.reduce((best, row) => (row.effectiveBuyIrr < best.effectiveBuyIrr ? row : best));
}

/** Dearest place to liquidate — highest all-in proceeds. */
export function bestToSell(rows: VenueQuote[]): VenueQuote | null {
  if (rows.length === 0) return null;
  return rows.reduce((best, row) => (row.effectiveSellIrr > best.effectiveSellIrr ? row : best));
}

export function sortByBuy(rows: VenueQuote[]): VenueQuote[] {
  return [...rows].sort((a, b) => a.effectiveBuyIrr - b.effectiveBuyIrr);
}

export function sortBySell(rows: VenueQuote[]): VenueQuote[] {
  return [...rows].sort((a, b) => b.effectiveSellIrr - a.effectiveSellIrr);
}

export type RelocationAdvice = {
  from: VenueQuote;
  to: VenueQuote;
  /** Extra Rial obtained by selling at `to` instead of `from`, for `quantity`. */
  gainIrr: number;
  gainPct: number;
};

/**
 * Would this holding fetch more somewhere else?
 *
 * Gated on `transferable`: gold bought inside Digikala Gold cannot be moved to
 * Wallgold, so telling the user it sells for more there would be advice they
 * cannot act on. Crypto, physical metal and cash can all move, and for those the
 * comparison is real.
 */
export function relocationAdvice(
  currentVenueId: string,
  rows: VenueQuote[],
  quantity: number
): RelocationAdvice | null {
  const from = rows.find((row) => row.venue.id === currentVenueId);
  if (!from || !from.venue.transferable) return null;

  const candidates = rows.filter((row) => row.venue.id !== currentVenueId && row.venue.transferable);
  const to = bestToSell(candidates);
  if (!to || to.effectiveSellIrr <= from.effectiveSellIrr) return null;

  const gainIrr = (to.effectiveSellIrr - from.effectiveSellIrr) * quantity;
  const gainPct = from.effectiveSellIrr
    ? ((to.effectiveSellIrr - from.effectiveSellIrr) / from.effectiveSellIrr) * 100
    : 0;

  return { from, to, gainIrr, gainPct };
}
