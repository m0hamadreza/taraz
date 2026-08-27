import type { ApiClient } from '@/api/client';
import {
  CatalogSchema,
  HistoryResponseSchema,
  QuotesResponseSchema,
  type Catalog,
  type HistoryRange,
  type HistoryResponse,
  type Quote,
} from '@/api/contracts';
import { allQuotes, historyFor } from '@/api/mock/engine';
import { ASSETS, PAIRS, PAIRS_PLAIN, VENUES } from '@/api/mock/seed';

/**
 * Stand-in for the backend.
 *
 * It deliberately behaves like a network rather than like a local function:
 * variable latency, and an injectable failure rate so the error and retry paths
 * in the UI are exercised instead of being theoretical. Output is validated
 * against the same schemas the HTTP client uses, which keeps the mock honest.
 */

type MockConfig = {
  /** Inclusive bounds for simulated round-trip latency, in ms. */
  latencyMs: [number, number];
  /** Probability in [0,1] that any given request fails. */
  errorRate: number;
};

const config: MockConfig = {
  latencyMs: [150, 450],
  errorRate: 0,
};

export function configureMockApi(patch: Partial<MockConfig>): void {
  Object.assign(config, patch);
}

export function getMockApiConfig(): Readonly<MockConfig> {
  return config;
}

class MockNetworkError extends Error {
  constructor() {
    super('ارتباط با سرور قطع شد. دوباره تلاش کنید.');
    this.name = 'MockNetworkError';
  }
}

async function withNetwork<T>(produce: () => T): Promise<T> {
  const [min, max] = config.latencyMs;
  const delay = min + Math.random() * (max - min);
  await new Promise((resolve) => setTimeout(resolve, delay));

  if (config.errorRate > 0 && Math.random() < config.errorRate) {
    throw new MockNetworkError();
  }

  return produce();
}

export const mockApiClient: ApiClient = {
  async getCatalog(): Promise<Catalog> {
    return withNetwork(() =>
      CatalogSchema.parse({ assets: ASSETS, venues: VENUES, pairs: PAIRS_PLAIN })
    );
  },

  async getQuotes(): Promise<Quote[]> {
    return withNetwork(() => QuotesResponseSchema.parse(allQuotes(Date.now())));
  },

  async getHistory(assetId: string, range: HistoryRange): Promise<HistoryResponse> {
    return withNetwork(() => {
      const now = Date.now();
      const series = PAIRS.filter((pair) => pair.assetId === assetId).map((pair) => ({
        venueId: pair.venueId,
        points: historyFor(pair, range, now),
      }));
      return HistoryResponseSchema.parse({ assetId, range, series });
    });
  },
};
