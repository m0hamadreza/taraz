import type { Quote, Venue } from '@/api/contracts';
import { bestToBuy, bestToSell, relocationAdvice, toVenueQuote } from '@/domain/ranking';

/** Tight spread, but a punishing entry fee — the bazaar. */
const physical: Venue = {
  id: 'physical',
  nameFa: 'بازار فیزیکی',
  kind: 'physical',
  transferable: true,
  fees: { buyPct: 0.07, sellPct: 0.01 },
};

/** Wide spread, negligible fee — a gold platform. */
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

const bitpin: Venue = {
  id: 'bitpin',
  nameFa: 'بیت‌پین',
  kind: 'exchange',
  transferable: true,
  fees: { buyPct: 0.003, sellPct: 0.003, fixedSellIrr: 200_000 },
};

function q(venueId: string, bidIrr: number, askIrr: number): Quote {
  return {
    assetId: 'gold-18k',
    venueId,
    bidIrr,
    askIrr,
    prevBidIrr: bidIrr,
    updatedAt: '2026-08-27T10:00:00.000Z',
  };
}

describe('toVenueQuote', () => {
  it('folds entry and exit fees into the effective prices', () => {
    const row = toVenueQuote(physical, q('physical', 100_000_000, 101_200_000));

    expect(row.effectiveBuyIrr).toBeCloseTo(101_200_000 * 1.07, 0);
    expect(row.effectiveSellIrr).toBeCloseTo(100_000_000 * 0.99, 0);
  });

  it('amortises the flat exit fee over the quantity being sold', () => {
    const one = toVenueQuote(nobitex, q('nobitex', 1_000_000, 1_010_000), 1);
    const hundred = toVenueQuote(nobitex, q('nobitex', 1_000_000, 1_010_000), 100);

    // The same 200,000 withdrawal costs 20% of a single unit but 0.2% of a
    // hundred; ranking one unit against a large position would be meaningless.
    expect(one.effectiveSellIrr).toBeLessThan(hundred.effectiveSellIrr);
    expect(hundred.effectiveSellIrr).toBeCloseTo(1_000_000 * 0.9975 - 2_000, 0);
  });

  it('quotes the round trip as a fraction of the buy price', () => {
    const row = toVenueQuote(digikala, q('digikala-gold', 100_000_000, 103_000_000));
    expect(row.roundTripPct).toBeGreaterThan(3);
    expect(row.roundTripPct).toBeLessThan(5);
  });
});

describe('best venue selection', () => {
  it('ranks on effective price, so a tight spread does not beat a heavy fee', () => {
    const rows = [
      // Physical looks cheapest on the raw ask, but 7% اجرت loses it the race.
      toVenueQuote(physical, q('physical', 100_000_000, 101_000_000)),
      toVenueQuote(digikala, q('digikala-gold', 98_500_000, 102_000_000)),
    ];

    expect(bestToBuy(rows)?.venue.id).toBe('digikala-gold');
    // ...while physical still pays the most on the way out.
    expect(bestToSell(rows)?.venue.id).toBe('physical');
  });

  it('returns null rather than throwing when nothing quotes the asset', () => {
    expect(bestToBuy([])).toBeNull();
    expect(bestToSell([])).toBeNull();
  });
});

describe('relocationAdvice', () => {
  it('suggests moving when the asset is transferable and another venue pays more', () => {
    const rows = [
      toVenueQuote(nobitex, q('nobitex', 1_000_000_000, 1_006_000_000), 2),
      toVenueQuote(bitpin, q('bitpin', 1_030_000_000, 1_038_000_000), 2),
    ];

    const advice = relocationAdvice('nobitex', rows, 2);

    expect(advice?.to.venue.id).toBe('bitpin');
    expect(advice?.gainIrr).toBeGreaterThan(0);
    expect(advice?.gainPct).toBeGreaterThan(2);
  });

  it('stays silent for a non-transferable venue even when another pays more', () => {
    // Gold held inside Digikala cannot be moved to the bazaar, so the fact that
    // the bazaar pays more is not actionable advice.
    const rows = [
      toVenueQuote(digikala, q('digikala-gold', 95_000_000, 99_000_000)),
      toVenueQuote(physical, q('physical', 100_000_000, 101_000_000)),
    ];

    expect(relocationAdvice('digikala-gold', rows, 4)).toBeNull();
  });

  it('stays silent when the current venue already pays the most', () => {
    const rows = [
      toVenueQuote(nobitex, q('nobitex', 1_050_000_000, 1_056_000_000), 2),
      toVenueQuote(bitpin, q('bitpin', 1_000_000_000, 1_008_000_000), 2),
    ];

    expect(relocationAdvice('nobitex', rows, 2)).toBeNull();
  });

  it('stays silent when the holding is at a venue that does not appear in the rows', () => {
    const rows = [toVenueQuote(bitpin, q('bitpin', 1_000_000_000, 1_008_000_000))];
    expect(relocationAdvice('wallex', rows, 1)).toBeNull();
  });
});
