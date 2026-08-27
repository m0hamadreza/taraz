import AsyncStorage from '@react-native-async-storage/async-storage';

import { HoldingSchema, type Holding, type HoldingDraft } from '@/api/contracts';
import { serialize } from '@/store/serialize';

/**
 * On-device portfolio storage.
 *
 * Deliberately shaped as a repository with the same operations a
 * `/holdings` REST resource would expose, so moving portfolios server-side
 * later means swapping this module for an HTTP one — the React Query hooks that
 * call it do not change.
 *
 * AsyncStorage is used rather than MMKV because it is the only option that
 * works unchanged on iOS, Android and web.
 */

const STORAGE_KEY = 'taraz.holdings.v1';

function newId(): string {
  // Enough entropy for a device-local list; the server will assign real ids.
  return `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function writeAll(holdings: Holding[]): Promise<Holding[]> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
  return holdings;
}

export async function listHoldings(): Promise<Holding[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Drop anything that no longer matches the schema rather than crashing the
    // portfolio screen on a stale record from an older build.
    return parsed.flatMap((entry) => {
      const result = HoldingSchema.safeParse(entry);
      return result.success ? [result.data] : [];
    });
  } catch {
    return [];
  }
}

/** Every mutation runs through the key's write queue — see store/serialize.ts. */
export function addHolding(draft: HoldingDraft): Promise<Holding[]> {
  return serialize(STORAGE_KEY, () => addHoldingUnsafe(draft));
}

async function addHoldingUnsafe(draft: HoldingDraft): Promise<Holding[]> {
  const holdings = await listHoldings();
  const holding: Holding = {
    ...draft,
    id: newId(),
    createdAt: new Date().toISOString(),
  };

  // Same asset at the same venue merges into one position instead of stacking
  // duplicate rows — that is what a user adding to a position expects.
  const existing = holdings.findIndex(
    (h) => h.assetId === draft.assetId && h.venueId === draft.venueId
  );

  if (existing >= 0) {
    holdings[existing] = {
      ...holdings[existing],
      quantity: holdings[existing].quantity + draft.quantity,
    };
    return writeAll(holdings);
  }

  return writeAll([...holdings, holding]);
}

export function updateHoldingQuantity(id: string, quantity: number): Promise<Holding[]> {
  if (quantity <= 0) return removeHolding(id);
  return serialize(STORAGE_KEY, async () => {
    const holdings = await listHoldings();
    return writeAll(holdings.map((h) => (h.id === id ? { ...h, quantity } : h)));
  });
}

export function removeHolding(id: string): Promise<Holding[]> {
  return serialize(STORAGE_KEY, async () => {
    const holdings = await listHoldings();
    return writeAll(holdings.filter((h) => h.id !== id));
  });
}

export function clearHoldings(): Promise<Holding[]> {
  return serialize(STORAGE_KEY, () => writeAll([]));
}
