import { API_MODE, type ApiClient } from '@/api/client';
import { httpApiClient } from '@/api/http';
import { mockApiClient } from '@/api/mock/client';

/** The single place the transport is chosen. */
export const api: ApiClient = API_MODE === 'http' ? httpApiClient : mockApiClient;

export { API_MODE };
export type { ApiClient };
