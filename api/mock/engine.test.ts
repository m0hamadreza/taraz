import { HISTORY_RANGE_DAYS } from '@/api/contracts';
import { allQuotes, historyFor, quoteFor } from '@/api/mock/engine';
import { ASSET_PRICING, PAIRS } from '@/api/mock/seed';

const NOW = new Date('2026-08-27T12:00:00.000Z').getTime();
const goldDigikala = PAIRS.find(
  (p) => p.assetId === 'gold-18k' && p.venueId === 'digikala-gold'
)!;

describe('quote generation', () => {
  it('is deterministic — the same instant yields the same price', () => {
    expect(quoteFor(goldDigikala, NOW)).toEqual(quoteFor(goldDigikala, NOW));
  });

  it('moves as the clock advances, which is what makes the total live', () => {
    const later = quoteFor(goldDigikala, NOW + 10 * 60_000);
    expect(later.bidIrr).not.toBe(quoteFor(goldDigikala, NOW).bidIrr);
  });

  it('always keeps the ask above the bid', () => {
    for (const quote of allQuotes(NOW)) {
      expect(quote.askIrr).toBeGreaterThan(quote.bidIrr);
    }
  });

  it('lands within a plausible distance of the seeded reference price', () => {
    const quote = quoteFor(goldDigikala, NOW);
    const mid = (quote.bidIrr + quote.askIrr) / 2;
    const target = ASSET_PRICING['gold-18k'].baseMidIrr * (1 + goldDigikala.premiumPct);
    expect(Math.abs(mid / target - 1)).toBeLessThan(0.02);
  });

  it('prices platform gold above the bazaar, so comparison has something to say', () => {
    const physical = PAIRS.find((p) => p.assetId === 'gold-18k' && p.venueId === 'physical')!;
    expect(quoteFor(goldDigikala, NOW).askIrr).toBeGreaterThan(quoteFor(physical, NOW).askIrr);
  });

  it('covers every seeded pair', () => {
    expect(allQuotes(NOW)).toHaveLength(PAIRS.length);
  });
});

describe('history generation', () => {
  it('returns one point per day in the requested range', () => {
    for (const range of ['1w', '1m', '3m', '1y'] as const) {
      expect(historyFor(goldDigikala, range, NOW)).toHaveLength(HISTORY_RANGE_DAYS[range]);
    }
  });

  it('is ordered oldest to newest', () => {
    const points = historyFor(goldDigikala, '1m', NOW);
    const times = points.map((p) => new Date(p.t).getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it('ends exactly at the live quote, so chart and ticker agree', () => {
    const points = historyFor(goldDigikala, '1m', NOW);
    const live = quoteFor(goldDigikala, NOW);
    expect(points[points.length - 1].bidIrr).toBe(live.bidIrr);
  });

  it('shares its tail with a longer range — the past does not change with zoom', () => {
    const week = historyFor(goldDigikala, '1w', NOW);
    const year = historyFor(goldDigikala, '1y', NOW);
    expect(year.slice(-week.length).map((p) => p.bidIrr)).toEqual(week.map((p) => p.bidIrr));
  });

  it('reproduces the same series on a second call', () => {
    expect(historyFor(goldDigikala, '3m', NOW)).toEqual(historyFor(goldDigikala, '3m', NOW));
  });

  it('keeps venues quoting the same asset moving together', () => {
    // Gold is one metal. If Digikala and Wallgold walked independently, the
    // comparison chart would be uncorrelated noise and the "where is it dearer"
    // feature would be measuring nothing.
    const wallgold = PAIRS.find((p) => p.assetId === 'gold-18k' && p.venueId === 'wallgold')!;
    const digikala = historyFor(goldDigikala, '3m', NOW).map((p) => p.bidIrr);
    const wall = historyFor(wallgold, '3m', NOW).map((p) => p.bidIrr);

    expect(correlationOfReturns(digikala, wall)).toBeGreaterThan(0.9);
  });

  it('moves 18k and 24k gold as one metal', () => {
    // Different fineness, same underlying. A market screen showing 24k up 3% on
    // a day 18k moved 0.3% would be nonsense.
    const k18 = PAIRS.find((p) => p.assetId === 'gold-18k' && p.venueId === 'physical')!;
    const k24 = PAIRS.find((p) => p.assetId === 'gold-24k' && p.venueId === 'physical')!;

    const a = historyFor(k18, '1y', NOW).map((p) => p.bidIrr);
    const b = historyFor(k24, '1y', NOW).map((p) => p.bidIrr);

    expect(correlationOfReturns(a, b)).toBeGreaterThan(0.98);
  });

  it('keeps Tether tracking the free-market dollar', () => {
    const usdt = PAIRS.find((p) => p.assetId === 'usdt' && p.venueId === 'free-market')!;
    const usd = PAIRS.find((p) => p.assetId === 'usd' && p.venueId === 'free-market')!;

    const a = historyFor(usdt, '1y', NOW).map((p) => p.bidIrr);
    const b = historyFor(usd, '1y', NOW).map((p) => p.bidIrr);

    expect(correlationOfReturns(a, b)).toBeGreaterThan(0.8);
  });

  it('lets a coin premium breathe against the metal it is made of', () => {
    // Correlated, because a coin is gold — but not perfectly, because حباب moves
    // on its own.
    const coin = PAIRS.find((p) => p.assetId === 'coin-emami' && p.venueId === 'physical')!;
    const gold = PAIRS.find((p) => p.assetId === 'gold-18k' && p.venueId === 'physical')!;

    const a = historyFor(coin, '1y', NOW).map((p) => p.bidIrr);
    const b = historyFor(gold, '1y', NOW).map((p) => p.bidIrr);

    const correlation = correlationOfReturns(a, b);
    expect(correlation).toBeGreaterThan(0.5);
    expect(correlation).toBeLessThan(0.99);
  });

  it('keeps unrelated assets uncorrelated', () => {
    const btc = PAIRS.find((p) => p.assetId === 'btc' && p.venueId === 'nobitex')!;
    const gold = historyFor(goldDigikala, '1y', NOW).map((p) => p.bidIrr);
    const crypto = historyFor(btc, '1y', NOW).map((p) => p.bidIrr);

    expect(Math.abs(correlationOfReturns(gold, crypto))).toBeLessThan(0.3);
  });

  it('holds the venue premium roughly steady rather than letting it drift away', () => {
    const physical = PAIRS.find((p) => p.assetId === 'gold-18k' && p.venueId === 'physical')!;
    const platform = historyFor(goldDigikala, '1y', NOW);
    const bazaar = historyFor(physical, '1y', NOW);

    // Platform gold trades above melt value on every single day of the year.
    for (let i = 0; i < platform.length; i++) {
      expect(platform[i].askIrr).toBeGreaterThan(bazaar[i].askIrr);
    }
  });

  it('is more volatile for crypto than for gold', () => {
    const btc = PAIRS.find((p) => p.assetId === 'btc' && p.venueId === 'nobitex')!;
    expect(dailySwing(btc)).toBeGreaterThan(dailySwing(goldDigikala));
  });
});

/** Mean absolute day-over-day return across a year. */
function dailySwing(pair: (typeof PAIRS)[number]): number {
  const points = historyFor(pair, '1y', NOW);
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.abs(points[i].bidIrr / points[i - 1].bidIrr - 1);
  }
  return total / (points.length - 1);
}

/** Pearson correlation of two series' day-over-day returns. */
function correlationOfReturns(a: number[], b: number[]): number {
  const ra: number[] = [];
  const rb: number[] = [];
  for (let i = 1; i < Math.min(a.length, b.length); i++) {
    ra.push(a[i] / a[i - 1] - 1);
    rb.push(b[i] / b[i - 1] - 1);
  }

  const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const ma = mean(ra);
  const mb = mean(rb);

  let cov = 0;
  let va = 0;
  let vb = 0;
  for (let i = 0; i < ra.length; i++) {
    cov += (ra[i] - ma) * (rb[i] - mb);
    va += (ra[i] - ma) ** 2;
    vb += (rb[i] - mb) ** 2;
  }

  return cov / Math.sqrt(va * vb);
}
