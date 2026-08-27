import type { Asset, Holding, Quote, Venue } from '@/api/contracts';
import {
  exitCostIrr,
  indexQuotes,
  netOfFeesIrr,
  summarisePortfolio,
  valueHolding,
  valueHoldings,
} from '@/domain/valuation';

const gold18k: Asset = {
  id: 'gold-18k',
  kind: 'gold',
  nameFa: 'طلای ۱۸ عیار',
  symbol: '18K',
  unit: 'gram',
  decimals: 3,
  purity: 0.75,
};

const btc: Asset = {
  id: 'btc',
  kind: 'crypto',
  nameFa: 'بیت‌کوین',
  symbol: 'BTC',
  unit: 'unit',
  decimals: 8,
};

const digikala: Venue = {
  id: 'digikala-gold',
  nameFa: 'دیجی‌کالا طلا',
  kind: 'gold-platform',
  transferable: false,
  fees: { buyPct: 0.005, sellPct: 0.005 },
};

const nobitex: Venue = {
  id: 'nobitex',
  nameFa: 'نوبیتکس',
  kind: 'exchange',
  transferable: true,
  fees: { buyPct: 0.0025, sellPct: 0.0025, fixedSellIrr: 200_000 },
};

function quote(partial: Partial<Quote> & Pick<Quote, 'assetId' | 'venueId'>): Quote {
  return {
    bidIrr: 100,
    askIrr: 110,
    prevBidIrr: 100,
    updatedAt: '2026-08-27T10:00:00.000Z',
    ...partial,
  };
}

function holding(partial: Partial<Holding> & Pick<Holding, 'assetId' | 'venueId'>): Holding {
  return {
    id: 'h1',
    quantity: 1,
    createdAt: '2026-08-01T00:00:00.000Z',
    ...partial,
  };
}

describe('fee arithmetic', () => {
  it('charges the percentage and the flat exit fee together', () => {
    // 1,000,000 × 0.25% = 2,500, plus the 200,000 withdrawal.
    expect(exitCostIrr(1_000_000, nobitex)).toBe(202_500);
  });

  it('never lets fees drive proceeds below zero', () => {
    // A position smaller than the flat withdrawal fee is worth nothing to exit,
    // not a negative amount that would silently reduce the portfolio total.
    expect(netOfFeesIrr(50_000, nobitex)).toBe(0);
  });
});

describe('valueHolding', () => {
  it('values at the bid, not the ask', () => {
    const result = valueHolding(
      holding({ assetId: gold18k.id, venueId: digikala.id, quantity: 4 }),
      gold18k,
      digikala,
      quote({ assetId: gold18k.id, venueId: digikala.id, bidIrr: 94_000_000, askIrr: 96_600_000 })
    );

    // 4 × 94,000,000 — using the ask would overstate this by 10.4 million Rial.
    expect(result.grossIrr).toBe(376_000_000);
    expect(result.grossIrr).toBeLessThan(4 * 96_600_000);
  });

  it('reports net value after the venue takes its cut', () => {
    const result = valueHolding(
      holding({ assetId: gold18k.id, venueId: digikala.id, quantity: 4 }),
      gold18k,
      digikala,
      quote({ assetId: gold18k.id, venueId: digikala.id, bidIrr: 94_000_000, askIrr: 96_600_000 })
    );

    expect(result.feesIrr).toBe(1_880_000); // 0.5% of 376,000,000
    expect(result.netIrr).toBe(374_120_000);
    expect(result.netIrr + result.feesIrr).toBe(result.grossIrr);
  });

  it('computes the 24h change from the previous bid', () => {
    const result = valueHolding(
      holding({ assetId: btc.id, venueId: nobitex.id, quantity: 0.21 }),
      btc,
      nobitex,
      quote({
        assetId: btc.id,
        venueId: nobitex.id,
        bidIrr: 138_000_000_000,
        askIrr: 139_000_000_000,
        prevBidIrr: 132_000_000_000,
      })
    );

    expect(result.prevGrossIrr).toBe(Math.round(0.21 * 132_000_000_000));
    expect(result.changePct).toBeCloseTo(4.5454, 3);
  });

  it('keeps fractional crypto quantities intact', () => {
    const result = valueHolding(
      holding({ assetId: btc.id, venueId: nobitex.id, quantity: 0.21 }),
      btc,
      nobitex,
      quote({ assetId: btc.id, venueId: nobitex.id, bidIrr: 138_000_000_000 })
    );

    expect(result.grossIrr).toBe(28_980_000_000);
  });
});

describe('valueHoldings', () => {
  const assets = new Map([
    [gold18k.id, gold18k],
    [btc.id, btc],
  ]);
  const venues = new Map([
    [digikala.id, digikala],
    [nobitex.id, nobitex],
  ]);

  it('separates holdings it cannot price instead of valuing them at zero', () => {
    const quotes = indexQuotes([
      quote({ assetId: gold18k.id, venueId: digikala.id, bidIrr: 94_000_000 }),
    ]);

    const { valued, unpriced } = valueHoldings(
      [
        holding({ id: 'a', assetId: gold18k.id, venueId: digikala.id, quantity: 4 }),
        holding({ id: 'b', assetId: btc.id, venueId: nobitex.id, quantity: 1 }),
      ],
      assets,
      venues,
      quotes
    );

    expect(valued.map((v) => v.holding.id)).toEqual(['a']);
    expect(unpriced.map((h) => h.id)).toEqual(['b']);
  });
});

describe('summarisePortfolio', () => {
  it('adds up the mixed portfolio from the brief', () => {
    const assets = new Map([
      [gold18k.id, gold18k],
      [btc.id, btc],
    ]);
    const venues = new Map([
      [digikala.id, digikala],
      [nobitex.id, nobitex],
    ]);
    const quotes = indexQuotes([
      quote({ assetId: gold18k.id, venueId: digikala.id, bidIrr: 94_000_000 }),
      quote({ assetId: btc.id, venueId: nobitex.id, bidIrr: 138_000_000_000 }),
    ]);

    const { valued } = valueHoldings(
      [
        holding({ id: 'a', assetId: gold18k.id, venueId: digikala.id, quantity: 4 }),
        holding({ id: 'b', assetId: btc.id, venueId: nobitex.id, quantity: 0.21 }),
      ],
      assets,
      venues,
      quotes
    );

    const summary = summarisePortfolio(valued);

    expect(summary.grossIrr).toBe(376_000_000 + 28_980_000_000);
    // Net is strictly smaller — that gap is the point of showing both.
    expect(summary.netIrr).toBeLessThan(summary.grossIrr);
    expect(summary.netIrr + summary.feesIrr).toBe(summary.grossIrr);
  });

  it('reports allocation shares that sum to 100%', () => {
    const assets = new Map([
      [gold18k.id, gold18k],
      [btc.id, btc],
    ]);
    const venues = new Map([
      [digikala.id, digikala],
      [nobitex.id, nobitex],
    ]);
    const quotes = indexQuotes([
      quote({ assetId: gold18k.id, venueId: digikala.id, bidIrr: 100 }),
      quote({ assetId: btc.id, venueId: nobitex.id, bidIrr: 300 }),
    ]);

    const { valued } = valueHoldings(
      [
        holding({ id: 'a', assetId: gold18k.id, venueId: digikala.id, quantity: 1 }),
        holding({ id: 'b', assetId: btc.id, venueId: nobitex.id, quantity: 1 }),
      ],
      assets,
      venues,
      quotes
    );

    const summary = summarisePortfolio(valued);
    const total = summary.allocation.reduce((sum, slice) => sum + slice.sharePct, 0);

    expect(total).toBeCloseTo(100, 6);
    expect(summary.allocation.find((s) => s.kind === 'gold')?.sharePct).toBeCloseTo(25, 6);
  });

  it('reports the stalest contributing quote, not the freshest', () => {
    const assets = new Map([[gold18k.id, gold18k]]);
    const venues = new Map([[digikala.id, digikala]]);
    const quotes = indexQuotes([
      quote({
        assetId: gold18k.id,
        venueId: digikala.id,
        updatedAt: '2026-08-27T09:00:00.000Z',
      }),
    ]);

    const { valued } = valueHoldings(
      [holding({ assetId: gold18k.id, venueId: digikala.id })],
      assets,
      venues,
      quotes
    );

    expect(summarisePortfolio(valued).oldestQuoteAt).toBe('2026-08-27T09:00:00.000Z');
  });

  it('returns a zeroed summary for an empty portfolio without dividing by zero', () => {
    const summary = summarisePortfolio([]);
    expect(summary.grossIrr).toBe(0);
    expect(summary.changePct).toBe(0);
    expect(summary.allocation).toEqual([]);
  });
});
