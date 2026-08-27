import type { Asset, Pair, Venue } from '@/api/contracts';

/**
 * Static market definition plus base prices for the simulator.
 *
 * Prices are integer Rial and are internally consistent with each other
 * (24k gram ≈ ounce ÷ 31.1035 × USD; 18k ≈ 24k × 0.750), so the venue
 * comparison and the bubble-style premiums read as plausible rather than
 * arbitrary. They are a starting point for the walk, not a claim about any
 * particular trading day.
 */

export const ASSETS: Asset[] = [
  { id: 'gold-18k', kind: 'gold', nameFa: 'طلای ۱۸ عیار', symbol: '18K', unit: 'gram', decimals: 3, purity: 0.75 },
  { id: 'gold-24k', kind: 'gold', nameFa: 'طلای ۲۴ عیار', symbol: '24K', unit: 'gram', decimals: 3, purity: 0.995 },
  { id: 'coin-emami', kind: 'coin', nameFa: 'سکه تمام امامی', symbol: 'سکه', unit: 'piece', decimals: 0 },
  { id: 'coin-half', kind: 'coin', nameFa: 'نیم سکه', symbol: 'نیم', unit: 'piece', decimals: 0 },
  { id: 'coin-quarter', kind: 'coin', nameFa: 'ربع سکه', symbol: 'ربع', unit: 'piece', decimals: 0 },
  { id: 'btc', kind: 'crypto', nameFa: 'بیت‌کوین', symbol: 'BTC', unit: 'unit', decimals: 8 },
  { id: 'usdt', kind: 'crypto', nameFa: 'تتر', symbol: 'USDT', unit: 'unit', decimals: 2 },
  { id: 'doge', kind: 'crypto', nameFa: 'دوج‌کوین', symbol: 'DOGE', unit: 'unit', decimals: 2 },
  { id: 'usd', kind: 'fiat', nameFa: 'دلار آمریکا', symbol: 'USD', unit: 'unit', decimals: 2 },
];

export const VENUES: Venue[] = [
  {
    id: 'digikala-gold',
    nameFa: 'دیجی‌کالا طلا',
    kind: 'gold-platform',
    transferable: false,
    fees: { buyPct: 0.005, sellPct: 0.005 },
  },
  {
    id: 'wallgold',
    nameFa: 'وال‌گلد',
    kind: 'gold-platform',
    transferable: false,
    fees: { buyPct: 0.004, sellPct: 0.004 },
  },
  {
    id: 'physical',
    nameFa: 'بازار فیزیکی',
    kind: 'physical',
    transferable: true,
    // Buying physical carries اجرت و مالیات; selling back is close to melt value.
    fees: { buyPct: 0.07, sellPct: 0.01 },
  },
  {
    id: 'nobitex',
    nameFa: 'نوبیتکس',
    kind: 'exchange',
    transferable: true,
    fees: { buyPct: 0.0025, sellPct: 0.0025, fixedSellIrr: 200_000 },
  },
  {
    id: 'wallex',
    nameFa: 'والکس',
    kind: 'exchange',
    transferable: true,
    fees: { buyPct: 0.002, sellPct: 0.002, fixedSellIrr: 150_000 },
  },
  {
    id: 'bitpin',
    nameFa: 'بیت‌پین',
    kind: 'exchange',
    transferable: true,
    fees: { buyPct: 0.003, sellPct: 0.003, fixedSellIrr: 200_000 },
  },
  {
    id: 'free-market',
    nameFa: 'بازار آزاد',
    kind: 'market',
    transferable: true,
    fees: { buyPct: 0, sellPct: 0 },
  },
];

/**
 * What each asset is actually a claim on.
 *
 * This is the part that makes the simulation behave like a market rather than a
 * random number generator. 18-karat and 24-karat gold are the same metal at
 * different fineness, and the coins are that metal plus a premium — they must
 * rise and fall together. Tether in Iran is a dollar proxy, so it tracks the
 * free-market rate. Assets that shared no underlying would produce a market
 * screen where 24k jumped 3% on a day 18k moved 0.3%, which is nonsense.
 */
export type Underlying = 'gold' | 'btc' | 'usd';

export const UNDERLYING_VOLATILITY: Record<Underlying, number> = {
  gold: 0.011,
  btc: 0.031,
  usd: 0.008,
};

/** Gentle upward drift per day — Rial-denominated assets trend up over time. */
export const UNDERLYING_DRIFT: Record<Underlying, number> = {
  gold: 0.0011,
  btc: 0.0009,
  usd: 0.001,
};

export type AssetPricing = {
  underlying: Underlying;
  /** Today's reference mid, in Rial, per the asset's own unit. */
  baseMidIrr: number;
  /**
   * Own-price movement on top of the underlying, as a fraction. Zero means the
   * asset is a pure multiple of its underlying: 24k gold is just 18k gold at a
   * different fineness. Coins get a non-zero value because their premium over
   * melt value — حباب — genuinely breathes independently of the metal, and
   * Dogecoin gets a large one because it only loosely follows Bitcoin.
   */
  idiosyncratic: number;
};

export const ASSET_PRICING: Record<string, AssetPricing> = {
  'gold-18k': { underlying: 'gold', baseMidIrr: 94_000_000, idiosyncratic: 0 },
  'gold-24k': { underlying: 'gold', baseMidIrr: 125_000_000, idiosyncratic: 0 },
  'coin-emami': { underlying: 'gold', baseMidIrr: 1_050_000_000, idiosyncratic: 0.035 },
  'coin-half': { underlying: 'gold', baseMidIrr: 560_000_000, idiosyncratic: 0.045 },
  'coin-quarter': { underlying: 'gold', baseMidIrr: 350_000_000, idiosyncratic: 0.055 },
  btc: { underlying: 'btc', baseMidIrr: 138_000_000_000, idiosyncratic: 0 },
  doge: { underlying: 'btc', baseMidIrr: 402_500, idiosyncratic: 0.06 },
  usdt: { underlying: 'usd', baseMidIrr: 1_152_000, idiosyncratic: 0.004 },
  usd: { underlying: 'usd', baseMidIrr: 1_150_000, idiosyncratic: 0 },
};

export type PairConfig = Pair & {
  /** Venue's deviation from the reference mid, as a fraction. */
  premiumPct: number;
  /** Full bid/ask spread, as a fraction of the mid. */
  spreadPct: number;
};

/**
 * Which venue quotes what, and how each one is priced relative to the
 * reference. The premiums are the reason the comparison screen has something to
 * say: platform gold sits above melt value, the bazaar sits closest to it, and
 * the crypto exchanges differ by only a few basis points.
 */
export const PAIRS: PairConfig[] = [
  // Gold, 18 karat
  { assetId: 'gold-18k', venueId: 'digikala-gold', premiumPct: 0.021, spreadPct: 0.028 },
  { assetId: 'gold-18k', venueId: 'wallgold', premiumPct: 0.014, spreadPct: 0.019 },
  { assetId: 'gold-18k', venueId: 'physical', premiumPct: 0.002, spreadPct: 0.012 },

  // Gold, 24 karat
  { assetId: 'gold-24k', venueId: 'wallgold', premiumPct: 0.012, spreadPct: 0.018 },
  { assetId: 'gold-24k', venueId: 'physical', premiumPct: 0.001, spreadPct: 0.011 },

  // Coins carry their own premium (حباب) over melt value
  { assetId: 'coin-emami', venueId: 'physical', premiumPct: 0.004, spreadPct: 0.014 },
  { assetId: 'coin-emami', venueId: 'free-market', premiumPct: 0.011, spreadPct: 0.017 },
  { assetId: 'coin-half', venueId: 'physical', premiumPct: 0.005, spreadPct: 0.016 },
  { assetId: 'coin-half', venueId: 'free-market', premiumPct: 0.013, spreadPct: 0.019 },
  { assetId: 'coin-quarter', venueId: 'physical', premiumPct: 0.006, spreadPct: 0.018 },
  { assetId: 'coin-quarter', venueId: 'free-market', premiumPct: 0.015, spreadPct: 0.022 },

  // Crypto
  { assetId: 'btc', venueId: 'nobitex', premiumPct: 0.004, spreadPct: 0.006 },
  { assetId: 'btc', venueId: 'wallex', premiumPct: 0.002, spreadPct: 0.005 },
  { assetId: 'btc', venueId: 'bitpin', premiumPct: 0.006, spreadPct: 0.008 },
  { assetId: 'usdt', venueId: 'nobitex', premiumPct: 0.002, spreadPct: 0.004 },
  { assetId: 'usdt', venueId: 'wallex', premiumPct: 0.001, spreadPct: 0.003 },
  { assetId: 'usdt', venueId: 'bitpin', premiumPct: 0.003, spreadPct: 0.005 },
  { assetId: 'usdt', venueId: 'free-market', premiumPct: -0.001, spreadPct: 0.006 },
  { assetId: 'doge', venueId: 'nobitex', premiumPct: 0.005, spreadPct: 0.009 },
  { assetId: 'doge', venueId: 'wallex', premiumPct: 0.003, spreadPct: 0.008 },
  { assetId: 'doge', venueId: 'bitpin', premiumPct: 0.007, spreadPct: 0.011 },

  // Currency
  { assetId: 'usd', venueId: 'free-market', premiumPct: 0, spreadPct: 0.007 },
];

export const PAIRS_PLAIN: Pair[] = PAIRS.map(({ assetId, venueId }) => ({ assetId, venueId }));

export const ASSET_BY_ID = new Map(ASSETS.map((a) => [a.id, a]));
export const VENUE_BY_ID = new Map(VENUES.map((v) => [v.id, v]));
