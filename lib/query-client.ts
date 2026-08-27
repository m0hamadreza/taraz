import { QueryClient } from '@tanstack/react-query';

/**
 * Defaults are tuned for a price feed: retry a couple of times because a dropped
 * quote poll is worth another attempt, but never retry mutations, which here
 * write to local storage and would double-apply.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
