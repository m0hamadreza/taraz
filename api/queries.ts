import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import * as React from 'react';

import { api } from '@/api';
import type {
  Asset,
  Catalog,
  Holding,
  HoldingDraft,
  HistoryRange,
  HistoryResponse,
  Quote,
  Venue,
} from '@/api/contracts';
import { indexQuotes, type QuoteKey } from '@/domain/valuation';
import {
  addHolding,
  clearHoldings,
  listHoldings,
  removeHolding,
  updateHoldingQuantity,
} from '@/store/holdings';
import { loadSettings, patchSettings, type Settings } from '@/store/settings';

/**
 * Query keys.
 *
 * Centralised so invalidation stays a compile-checked expression rather than a
 * hand-typed array that drifts from the key it is meant to match.
 */
export const queryKeys = {
  catalog: () => ['catalog'] as const,
  quotes: () => ['quotes'] as const,
  history: (assetId: string, range: HistoryRange) => ['history', assetId, range] as const,
  holdings: () => ['holdings'] as const,
  settings: () => ['settings'] as const,
};

/* -------------------------------------------------------------------------- */
/* Server data                                                                 */
/* -------------------------------------------------------------------------- */

/** The catalog is effectively static for a session. */
export function useCatalog(): UseQueryResult<Catalog> {
  return useQuery({
    queryKey: queryKeys.catalog(),
    queryFn: () => api.getCatalog(),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

/**
 * Live prices. The poll interval is user-configurable, and this is what makes
 * the portfolio total move on its own.
 */
export function useQuotes(): UseQueryResult<Quote[]> {
  const { data: settings } = useSettings();
  const interval = settings?.refreshIntervalMs ?? 20_000;

  return useQuery({
    queryKey: queryKeys.quotes(),
    queryFn: () => api.getQuotes(),
    // Half the poll interval: fresh enough that a remount does not refetch, but
    // never so long that a background refresh is skipped.
    staleTime: interval / 2,
    refetchInterval: interval,
    refetchIntervalInBackground: false,
  });
}

export function useHistory(
  assetId: string | undefined,
  range: HistoryRange
): UseQueryResult<HistoryResponse> {
  return useQuery({
    queryKey: queryKeys.history(assetId ?? '', range),
    queryFn: () => api.getHistory(assetId as string, range),
    enabled: Boolean(assetId),
    staleTime: 5 * 60_000,
  });
}

/* -------------------------------------------------------------------------- */
/* Holdings — local today, remote later                                        */
/* -------------------------------------------------------------------------- */

export function useHoldings(): UseQueryResult<Holding[]> {
  return useQuery({
    queryKey: queryKeys.holdings(),
    queryFn: () => listHoldings(),
    staleTime: Infinity,
  });
}

function useHoldingsMutation<TArgs>(mutationFn: (args: TArgs) => Promise<Holding[]>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    // The repository returns the full new list, so the cache can be set
    // directly instead of round-tripping through an invalidation.
    onSuccess: (holdings) => queryClient.setQueryData(queryKeys.holdings(), holdings),
  });
}

export function useAddHolding() {
  return useHoldingsMutation((draft: HoldingDraft) => addHolding(draft));
}

export function useUpdateHoldingQuantity() {
  return useHoldingsMutation(({ id, quantity }: { id: string; quantity: number }) =>
    updateHoldingQuantity(id, quantity)
  );
}

export function useRemoveHolding() {
  return useHoldingsMutation((id: string) => removeHolding(id));
}

export function useClearHoldings() {
  return useHoldingsMutation(() => clearHoldings());
}

/* -------------------------------------------------------------------------- */
/* Settings                                                                    */
/* -------------------------------------------------------------------------- */

export function useSettings(): UseQueryResult<Settings> {
  return useQuery({
    queryKey: queryKeys.settings(),
    queryFn: () => loadSettings(),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    // The merge happens inside patchSettings against freshly-read storage, not
    // against a value captured at render time — otherwise two changes fired in
    // the same tick would both start from the same base and one would be lost.
    mutationFn: (patch: Partial<Settings>) => patchSettings(patch),
    onSuccess: (settings) => queryClient.setQueryData(queryKeys.settings(), settings),
  });
}

/* -------------------------------------------------------------------------- */
/* Derived helpers                                                             */
/* -------------------------------------------------------------------------- */

export type CatalogIndex = {
  assets: Map<string, Asset>;
  venues: Map<string, Venue>;
  /** Venue ids that quote a given asset. */
  venuesByAsset: Map<string, string[]>;
};

const EMPTY_INDEX: CatalogIndex = {
  assets: new Map(),
  venues: new Map(),
  venuesByAsset: new Map(),
};

/** Lookup maps over the catalog, memoised against the fetched object. */
export function useCatalogIndex(): { index: CatalogIndex; catalog: Catalog | undefined } {
  const { data: catalog } = useCatalog();

  const index = React.useMemo<CatalogIndex>(() => {
    if (!catalog) return EMPTY_INDEX;

    const venuesByAsset = new Map<string, string[]>();
    for (const pair of catalog.pairs) {
      const list = venuesByAsset.get(pair.assetId);
      if (list) list.push(pair.venueId);
      else venuesByAsset.set(pair.assetId, [pair.venueId]);
    }

    return {
      assets: new Map(catalog.assets.map((a) => [a.id, a])),
      venues: new Map(catalog.venues.map((v) => [v.id, v])),
      venuesByAsset,
    };
  }, [catalog]);

  return { index, catalog };
}

export function useQuoteIndex(): { quotes: Quote[]; byKey: Map<QuoteKey, Quote> } {
  const { data } = useQuotes();
  const quotes = data ?? [];
  const byKey = React.useMemo(() => indexQuotes(quotes), [quotes]);
  return { quotes, byKey };
}

export type MarketStatus = {
  isLoading: boolean;
  isError: boolean;
  isRefreshing: boolean;
  message?: string;
  refetch: () => void;
};

export type MarketData = {
  index: CatalogIndex;
  catalog: Catalog | undefined;
  quotes: Quote[];
  byKey: Map<QuoteKey, Quote>;
  status: MarketStatus;
};

/**
 * Catalog and quotes as one thing, because every screen needs both and neither
 * is useful alone.
 *
 * Combining the statuses is the point. Deriving loading and error from the
 * quotes query alone means a failed catalog leaves the screen with an empty
 * asset list and no error — it renders "nothing found", which is a lie about a
 * network failure.
 */
export function useMarketData(): MarketData {
  const catalogQuery = useCatalog();
  const quotesQuery = useQuotes();
  const { index, catalog } = useCatalogIndex();
  const { quotes, byKey } = useQuoteIndex();

  const hasData = Boolean(catalog) && quotes.length > 0;
  const failed = catalogQuery.isError || quotesQuery.isError;

  return {
    index,
    catalog,
    quotes,
    byKey,
    status: {
      isLoading: !hasData && !failed && (catalogQuery.isLoading || quotesQuery.isLoading),
      // Keep showing the last good data through a transient failure; only
      // surface the error when there is nothing to fall back on.
      isError: failed && !hasData,
      isRefreshing:
        (catalogQuery.isFetching || quotesQuery.isFetching) &&
        !catalogQuery.isLoading &&
        !quotesQuery.isLoading,
      message: (catalogQuery.error ?? quotesQuery.error)?.message,
      refetch: () => {
        void catalogQuery.refetch();
        void quotesQuery.refetch();
      },
    },
  };
}

/** Shorthand for the display currency, which almost every screen needs. */
export function useCurrency() {
  const { data } = useSettings();
  return data?.currency ?? 'toman';
}
