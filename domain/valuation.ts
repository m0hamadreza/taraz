import type { Asset, AssetKind, Holding, Quote, Venue } from '@/api/contracts';
import { pctChange, roundRial } from '@/lib/money';

/**
 * Portfolio valuation.
 *
 * The load-bearing decision here: a holding is worth what the venue will
 * actually **pay you for it** — the bid — minus that venue's exit fees. Valuing
 * at the ask is the intuitive mistake and it overstates a Digikala gold position
 * by the full spread, roughly 3%, before fees. Both figures are surfaced so the
 * gap is visible rather than hidden:
 *
 *   gross = quantity × bid                       "ارزش بازار"
 *   net   = gross × (1 − sellPct) − fixedSell    "ارزش نقدشوندگی"
 */

export type QuoteKey = string;

export function quoteKey(assetId: string, venueId: string): QuoteKey {
  return `${assetId}@${venueId}`;
}

export function indexQuotes(quotes: Quote[]): Map<QuoteKey, Quote> {
  return new Map(quotes.map((q) => [quoteKey(q.assetId, q.venueId), q]));
}

/** Exit cost of liquidating `grossIrr` at `venue`, in Rial. */
export function exitCostIrr(grossIrr: number, venue: Venue): number {
  return grossIrr * venue.fees.sellPct + (venue.fees.fixedSellIrr ?? 0);
}

/** Net proceeds of selling `grossIrr` at `venue`. Never negative. */
export function netOfFeesIrr(grossIrr: number, venue: Venue): number {
  return Math.max(0, grossIrr - exitCostIrr(grossIrr, venue));
}

export type ValuedHolding = {
  holding: Holding;
  asset: Asset;
  venue: Venue;
  quote: Quote;
  /** quantity × bid */
  grossIrr: number;
  /** gross minus this venue's exit fees */
  netIrr: number;
  feesIrr: number;
  /** Gross value 24h ago, for the change indicator. */
  prevGrossIrr: number;
  changeIrr: number;
  changePct: number;
};

export function valueHolding(
  holding: Holding,
  asset: Asset,
  venue: Venue,
  quote: Quote
): ValuedHolding {
  const grossIrr = roundRial(holding.quantity * quote.bidIrr);
  const feesIrr = roundRial(exitCostIrr(grossIrr, venue));
  const netIrr = Math.max(0, grossIrr - feesIrr);
  const prevGrossIrr = roundRial(holding.quantity * quote.prevBidIrr);

  return {
    holding,
    asset,
    venue,
    quote,
    grossIrr,
    netIrr,
    feesIrr,
    prevGrossIrr,
    changeIrr: grossIrr - prevGrossIrr,
    changePct: pctChange(prevGrossIrr, grossIrr),
  };
}

/**
 * Value every holding we can price. A holding whose (asset, venue, quote) is
 * missing is returned separately rather than silently dropped or valued at
 * zero — a portfolio total that quietly omits a position is worse than one that
 * admits it is incomplete.
 */
export function valueHoldings(
  holdings: Holding[],
  assets: Map<string, Asset>,
  venues: Map<string, Venue>,
  quotes: Map<QuoteKey, Quote>
): { valued: ValuedHolding[]; unpriced: Holding[] } {
  const valued: ValuedHolding[] = [];
  const unpriced: Holding[] = [];

  for (const holding of holdings) {
    const asset = assets.get(holding.assetId);
    const venue = venues.get(holding.venueId);
    const quote = quotes.get(quoteKey(holding.assetId, holding.venueId));

    if (!asset || !venue || !quote) {
      unpriced.push(holding);
      continue;
    }
    valued.push(valueHolding(holding, asset, venue, quote));
  }

  return { valued, unpriced };
}

export type AllocationSlice = {
  kind: AssetKind;
  grossIrr: number;
  sharePct: number;
};

export type PortfolioSummary = {
  grossIrr: number;
  netIrr: number;
  feesIrr: number;
  prevGrossIrr: number;
  changeIrr: number;
  changePct: number;
  allocation: AllocationSlice[];
  /** Oldest `updatedAt` across the contributing quotes — the portfolio is only
   *  as fresh as its stalest input. */
  oldestQuoteAt: string | null;
  unpricedCount: number;
};

const KIND_ORDER: AssetKind[] = ['gold', 'coin', 'crypto', 'fiat'];

export function summarisePortfolio(
  valued: ValuedHolding[],
  unpricedCount = 0
): PortfolioSummary {
  let grossIrr = 0;
  let netIrr = 0;
  let feesIrr = 0;
  let prevGrossIrr = 0;
  let oldest: number | null = null;

  const byKind = new Map<AssetKind, number>();

  for (const item of valued) {
    grossIrr += item.grossIrr;
    netIrr += item.netIrr;
    feesIrr += item.feesIrr;
    prevGrossIrr += item.prevGrossIrr;

    byKind.set(item.asset.kind, (byKind.get(item.asset.kind) ?? 0) + item.grossIrr);

    const updated = new Date(item.quote.updatedAt).getTime();
    if (oldest === null || updated < oldest) oldest = updated;
  }

  const allocation = KIND_ORDER.filter((kind) => (byKind.get(kind) ?? 0) > 0).map((kind) => {
    const value = byKind.get(kind) ?? 0;
    return { kind, grossIrr: value, sharePct: grossIrr ? (value / grossIrr) * 100 : 0 };
  });

  return {
    grossIrr,
    netIrr,
    feesIrr,
    prevGrossIrr,
    changeIrr: grossIrr - prevGrossIrr,
    changePct: pctChange(prevGrossIrr, grossIrr),
    allocation,
    oldestQuoteAt: oldest === null ? null : new Date(oldest).toISOString(),
    unpricedCount,
  };
}

export const ASSET_KIND_LABEL: Record<AssetKind, string> = {
  gold: 'طلا',
  coin: 'سکه',
  crypto: 'رمزارز',
  fiat: 'ارز',
};
