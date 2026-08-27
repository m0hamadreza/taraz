import type { Catalog, HistoryRange, HistoryResponse, Quote } from '@/api/contracts';

/**
 * The only surface the app talks to.
 *
 * Screens and hooks depend on this interface, never on a concrete transport.
 * Switching to the real backend is `EXPO_PUBLIC_API_MODE=http` plus filling in
 * `api/http.ts` — nothing above this line changes.
 */
export interface ApiClient {
  getCatalog(): Promise<Catalog>;
  getQuotes(): Promise<Quote[]>;
  getHistory(assetId: string, range: HistoryRange): Promise<HistoryResponse>;
}

export type ApiMode = 'mock' | 'http';

export const API_MODE: ApiMode =
  (process.env.EXPO_PUBLIC_API_MODE as ApiMode | undefined) ?? 'mock';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.taraz.app/v1';
