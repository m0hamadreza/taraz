import {
  CatalogSchema,
  HistoryResponseSchema,
  QuotesResponseSchema,
  type Catalog,
  type HistoryRange,
  type HistoryResponse,
  type Quote,
} from '@/api/contracts';
import { API_BASE_URL, type ApiClient } from '@/api/client';

/**
 * Real transport. Wired up and type-complete, but unused until the backend
 * exists — flip `EXPO_PUBLIC_API_MODE=http` to switch to it.
 *
 * Responses are parsed through the same Zod schemas the mock satisfies, so a
 * backend that drifts from the contract fails loudly at the boundary instead of
 * producing `undefined` deep inside a screen.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request(path: string, init?: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { Accept: 'application/json', ...init?.headers },
    });
  } catch (cause) {
    throw new ApiError('اتصال به سرور برقرار نشد.');
  }

  if (!response.ok) {
    throw new ApiError(`درخواست ناموفق بود (${response.status})`, response.status);
  }

  return response.json();
}

export const httpApiClient: ApiClient = {
  async getCatalog(): Promise<Catalog> {
    return CatalogSchema.parse(await request('/catalog'));
  },

  async getQuotes(): Promise<Quote[]> {
    return QuotesResponseSchema.parse(await request('/quotes'));
  },

  async getHistory(assetId: string, range: HistoryRange): Promise<HistoryResponse> {
    const query = new URLSearchParams({ range });
    return HistoryResponseSchema.parse(
      await request(`/assets/${encodeURIComponent(assetId)}/history?${query}`)
    );
  },
};
