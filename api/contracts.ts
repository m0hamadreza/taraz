import { z } from 'zod';

/**
 * The wire contract.
 *
 * This file is the single source of truth shared by the mock and the eventual
 * HTTP client. Both validate against these schemas, so the day the backend is
 * real, any drift shows up as a parse error at the boundary instead of an
 * `undefined` three components deep.
 *
 * All monetary fields are **integer Rial**. All timestamps are ISO-8601 UTC.
 */

/* -------------------------------------------------------------------------- */
/* Catalog                                                                     */
/* -------------------------------------------------------------------------- */

export const AssetKindSchema = z.enum(['gold', 'coin', 'crypto', 'fiat']);
export type AssetKind = z.infer<typeof AssetKindSchema>;

export const AssetUnitSchema = z.enum(['gram', 'piece', 'unit']);
export type AssetUnit = z.infer<typeof AssetUnitSchema>;

export const AssetSchema = z.object({
  id: z.string(),
  kind: AssetKindSchema,
  nameFa: z.string(),
  /** Ticker or short label shown in dense rows. */
  symbol: z.string(),
  unit: AssetUnitSchema,
  /** Display precision for user-entered quantities. */
  decimals: z.number().int().min(0).max(8),
  /** Gold fineness as a fraction, e.g. 0.750 for 18 karat. Gold/coin only. */
  purity: z.number().positive().max(1).optional(),
});
export type Asset = z.infer<typeof AssetSchema>;

export const VenueKindSchema = z.enum(['gold-platform', 'exchange', 'physical', 'market']);
export type VenueKind = z.infer<typeof VenueKindSchema>;

export const VenueFeesSchema = z.object({
  /** Fraction of notional charged when buying, e.g. 0.005 for 0.5%. */
  buyPct: z.number().min(0).max(1),
  /** Fraction of notional charged when selling back. */
  sellPct: z.number().min(0).max(1),
  /** Flat Rial cost to get money out (withdrawal, settlement). */
  fixedSellIrr: z.number().min(0).optional(),
});
export type VenueFees = z.infer<typeof VenueFeesSchema>;

export const VenueSchema = z.object({
  id: z.string(),
  nameFa: z.string(),
  kind: VenueKindSchema,
  /**
   * Whether a holding can leave this venue.
   *
   * This gates the whole "you could sell it for more elsewhere" feature. BTC can
   * move from Nobitex to Bitpin; four grams of Digikala gold cannot move to
   * Wallgold, so suggesting it would be noise.
   */
  transferable: z.boolean(),
  fees: VenueFeesSchema,
});
export type Venue = z.infer<typeof VenueSchema>;

/** Which assets each venue actually quotes. */
export const PairSchema = z.object({
  assetId: z.string(),
  venueId: z.string(),
});
export type Pair = z.infer<typeof PairSchema>;

export const CatalogSchema = z.object({
  assets: z.array(AssetSchema),
  venues: z.array(VenueSchema),
  pairs: z.array(PairSchema),
});
export type Catalog = z.infer<typeof CatalogSchema>;

/* -------------------------------------------------------------------------- */
/* Quotes                                                                      */
/* -------------------------------------------------------------------------- */

export const QuoteSchema = z.object({
  assetId: z.string(),
  venueId: z.string(),
  /** What the venue pays YOU. Holdings are valued at this. */
  bidIrr: z.number().nonnegative(),
  /** What YOU pay the venue. Always >= bid. */
  askIrr: z.number().nonnegative(),
  /** Bid 24 hours ago, for the change indicators. */
  prevBidIrr: z.number().nonnegative(),
  updatedAt: z.string(),
});
export type Quote = z.infer<typeof QuoteSchema>;

export const QuotesResponseSchema = z.array(QuoteSchema);

/* -------------------------------------------------------------------------- */
/* History                                                                     */
/* -------------------------------------------------------------------------- */

export const HistoryRangeSchema = z.enum(['1w', '1m', '3m', '1y']);
export type HistoryRange = z.infer<typeof HistoryRangeSchema>;

export const HISTORY_RANGE_DAYS: Record<HistoryRange, number> = {
  '1w': 7,
  '1m': 30,
  '3m': 90,
  '1y': 365,
};

export const HISTORY_RANGE_LABEL: Record<HistoryRange, string> = {
  '1w': '۱ هفته',
  '1m': '۱ ماه',
  '3m': '۳ ماه',
  '1y': '۱ سال',
};

export const HistoryPointSchema = z.object({
  /** ISO date (day resolution). */
  t: z.string(),
  bidIrr: z.number().nonnegative(),
  askIrr: z.number().nonnegative(),
});
export type HistoryPoint = z.infer<typeof HistoryPointSchema>;

export const VenueHistorySchema = z.object({
  venueId: z.string(),
  points: z.array(HistoryPointSchema),
});
export type VenueHistory = z.infer<typeof VenueHistorySchema>;

export const HistoryResponseSchema = z.object({
  assetId: z.string(),
  range: HistoryRangeSchema,
  series: z.array(VenueHistorySchema),
});
export type HistoryResponse = z.infer<typeof HistoryResponseSchema>;

/* -------------------------------------------------------------------------- */
/* Holdings                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Held on-device for now. The shape already matches what `POST /holdings` will
 * accept, so moving to server-side portfolios is a change of storage adapter
 * rather than a change of model.
 */
export const HoldingSchema = z.object({
  id: z.string(),
  assetId: z.string(),
  venueId: z.string(),
  quantity: z.number().positive(),
  createdAt: z.string(),
});
export type Holding = z.infer<typeof HoldingSchema>;

export const HoldingDraftSchema = HoldingSchema.omit({ id: true, createdAt: true });
export type HoldingDraft = z.infer<typeof HoldingDraftSchema>;
