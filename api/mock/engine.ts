import {
  HISTORY_RANGE_DAYS,
  type HistoryPoint,
  type HistoryRange,
  type Quote,
} from '@/api/contracts';
import {
  ASSET_PRICING,
  PAIRS,
  UNDERLYING_DRIFT,
  UNDERLYING_VOLATILITY,
  type PairConfig,
  type Underlying,
} from '@/api/mock/seed';

/**
 * Deterministic price simulator.
 *
 * Two requirements shape this:
 *
 *  1. History must be *stable* — reopening the app must not redraw a different
 *     past — so every series is derived from a seed, never from Math.random().
 *  2. History must *agree with the live price*. The daily walk is generated
 *     backwards from today and normalised so its final point is today's base
 *     mid, which means the chart always terminates where the ticker is.
 *
 * Live movement is layered on top as smooth value noise keyed to the wall clock,
 * so the portfolio total genuinely drifts while the app is open.
 */

const DAY_MS = 86_400_000;
/** How often the intraday component advances. */
const TICK_MS = 20_000;
const HISTORY_DAYS = 366;

/* -------------------------------------------------------------------------- */
/* Deterministic noise                                                         */
/* -------------------------------------------------------------------------- */

function hashString(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stateless [0,1) hash-noise at an integer coordinate. */
function noiseAt(seed: number, x: number): number {
  let t = (seed ^ Math.imul(x | 0, 0x9e3779b1)) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Smoothstep-interpolated value noise, so ticks glide instead of jumping. */
function smoothNoise(seed: number, x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const a = noiseAt(seed, i);
  const b = noiseAt(seed, i + 1);
  const t = f * f * (3 - 2 * f);
  return a + (b - a) * t;
}

/** Three octaves of value noise mapped to roughly [-1, 1]. */
function fbm(seed: number, x: number): number {
  const v = smoothNoise(seed, x) * 0.6 + smoothNoise(seed ^ 0x5bf03635, x * 2.3) * 0.28 + smoothNoise(seed ^ 0x27d4eb2f, x * 5.1) * 0.12;
  return v * 2 - 1;
}

/* -------------------------------------------------------------------------- */
/* Daily walk                                                                  */
/* -------------------------------------------------------------------------- */

const pairSeeds = new Map<string, number>();

function pairKey(assetId: string, venueId: string): string {
  return `${assetId}@${venueId}`;
}

function seedFor(key: string): number {
  let seed = pairSeeds.get(key);
  if (seed === undefined) {
    seed = hashString(`taraz:${key}`);
    pairSeeds.set(key, seed);
  }
  return seed;
}

export function startOfUtcDay(ms: number): number {
  return Math.floor(ms / DAY_MS) * DAY_MS;
}

const underlyingCache = new Map<string, { day: number; shape: Float64Array }>();
const assetCache = new Map<string, { day: number; mids: Float64Array }>();
const pairCache = new Map<string, { day: number; mids: Float64Array }>();

/**
 * The shared factor every asset built on it inherits: one series for gold, one
 * for Bitcoin, one for the dollar. Normalised to end at 1 so each asset can
 * scale it to its own price level.
 */
function underlyingShape(underlying: Underlying, todayStart: number): Float64Array {
  const cached = underlyingCache.get(underlying);
  if (cached && cached.day === todayStart) return cached.shape;

  const vol = UNDERLYING_VOLATILITY[underlying];
  const drift = UNDERLYING_DRIFT[underlying];
  const rand = mulberry32(seedFor(`underlying:${underlying}`));
  const shape = new Float64Array(HISTORY_DAYS);

  let level = 1;
  for (let i = 0; i < HISTORY_DAYS; i++) {
    // Box-Muller for a normal step, so the series has realistic tails rather
    // than the flat distribution a raw uniform would give.
    const u1 = Math.max(rand(), 1e-9);
    const u2 = rand();
    const gauss = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    level *= 1 + drift + gauss * vol;
    shape[i] = level;
  }

  const last = shape[HISTORY_DAYS - 1];
  for (let i = 0; i < HISTORY_DAYS; i++) shape[i] /= last;

  underlyingCache.set(underlying, { day: todayStart, shape });
  return shape;
}

/**
 * The reference price series for an asset: its underlying, plus whatever own
 * movement it has (a coin's premium over melt value, Tether's basis against the
 * free-market dollar), rescaled so the final point is the seeded price.
 */
function assetDailyMids(assetId: string, todayStart: number): Float64Array {
  const cached = assetCache.get(assetId);
  if (cached && cached.day === todayStart) return cached.mids;

  const pricing = ASSET_PRICING[assetId];
  const shape = underlyingShape(pricing.underlying, todayStart);
  const idioSeed = seedFor(`idio:${assetId}`);

  const mids = new Float64Array(HISTORY_DAYS);
  for (let i = 0; i < HISTORY_DAYS; i++) {
    mids[i] = shape[i] * (1 + fbm(idioSeed, i / 17) * pricing.idiosyncratic);
  }

  const scale = pricing.baseMidIrr / mids[HISTORY_DAYS - 1];
  for (let i = 0; i < HISTORY_DAYS; i++) mids[i] *= scale;

  assetCache.set(assetId, { day: todayStart, mids });
  return mids;
}

/** How far a venue's premium drifts from its nominal value, as a fraction. */
const PREMIUM_WOBBLE = 0.3;

/**
 * A venue's own series: the asset's reference walk, marked up by that venue's
 * premium. The premium itself breathes a little over time — spreads on the gold
 * platforms genuinely widen and narrow — which is what gives the comparison
 * screen something that changes rather than a constant offset.
 */
function dailyMids(pair: PairConfig, todayStart: number): Float64Array {
  const key = pairKey(pair.assetId, pair.venueId);
  const cached = pairCache.get(key);
  if (cached && cached.day === todayStart) return cached.mids;

  const base = assetDailyMids(pair.assetId, todayStart);
  const seed = seedFor(key);
  const mids = new Float64Array(HISTORY_DAYS);

  for (let i = 0; i < HISTORY_DAYS; i++) {
    const wobble = 1 + fbm(seed, i / 21) * PREMIUM_WOBBLE;
    mids[i] = base[i] * (1 + pair.premiumPct * wobble);
  }

  pairCache.set(key, { day: todayStart, mids });
  return mids;
}

/**
 * Smooth intraday wobble, dominated by the underlying so everything built on it
 * ticks in the same direction at the same moment.
 */
function intradayFactor(pair: PairConfig, now: number): number {
  const pricing = ASSET_PRICING[pair.assetId];
  const vol = UNDERLYING_VOLATILITY[pricing.underlying];
  // Divide the bucket so a full oscillation spans several minutes.
  const bucket = now / TICK_MS / 9;

  // Layered the same way the daily series is: the underlying leads, the asset
  // adds its own move, the venue only trembles.
  const market = fbm(seedFor(`underlying:${pricing.underlying}`) ^ 0x1b873593, bucket);
  const own = fbm(seedFor(`idio:${pair.assetId}`) ^ 0xc2b2ae35, bucket * 1.3);
  const local = fbm(seedFor(pairKey(pair.assetId, pair.venueId)) ^ 0x85ebca6b, bucket * 1.7);

  return (market * 0.8 + own * pricing.idiosyncratic * 6 + local * 0.15) * vol * 0.55;
}

/* -------------------------------------------------------------------------- */
/* Public surface                                                              */
/* -------------------------------------------------------------------------- */

function bidAsk(mid: number, spreadPct: number): { bidIrr: number; askIrr: number } {
  return {
    bidIrr: Math.round(mid * (1 - spreadPct / 2)),
    askIrr: Math.round(mid * (1 + spreadPct / 2)),
  };
}

export function quoteFor(pair: PairConfig, now: number): Quote {
  const todayStart = startOfUtcDay(now);
  const mids = dailyMids(pair, todayStart);

  const todayMid = mids[HISTORY_DAYS - 1] * (1 + intradayFactor(pair, now));
  const yesterdayMid = mids[HISTORY_DAYS - 2];

  const today = bidAsk(todayMid, pair.spreadPct);
  const yesterday = bidAsk(yesterdayMid, pair.spreadPct);

  return {
    assetId: pair.assetId,
    venueId: pair.venueId,
    bidIrr: today.bidIrr,
    askIrr: today.askIrr,
    prevBidIrr: yesterday.bidIrr,
    // Quotes look a little stale by design, the way a real feed does — this is
    // what the "به‌روزرسانی ۲ دقیقه پیش" chips display.
    updatedAt: new Date(now - (seedFor(pairKey(pair.assetId, pair.venueId)) % 90_000)).toISOString(),
  };
}

export function allQuotes(now: number): Quote[] {
  return PAIRS.map((pair) => quoteFor(pair, now));
}

export function historyFor(pair: PairConfig, range: HistoryRange, now: number): HistoryPoint[] {
  const todayStart = startOfUtcDay(now);
  const mids = dailyMids(pair, todayStart);
  const days = HISTORY_RANGE_DAYS[range];

  const points: HistoryPoint[] = [];
  for (let i = HISTORY_DAYS - days; i < HISTORY_DAYS; i++) {
    const { bidIrr, askIrr } = bidAsk(mids[i], pair.spreadPct);
    points.push({
      t: new Date(todayStart - (HISTORY_DAYS - 1 - i) * DAY_MS).toISOString(),
      bidIrr,
      askIrr,
    });
  }

  // Pin the final point to the live quote so the chart and the ticker agree.
  const live = quoteFor(pair, now);
  points[points.length - 1] = { t: points[points.length - 1].t, bidIrr: live.bidIrr, askIrr: live.askIrr };

  return points;
}
