import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Currency } from '@/lib/money';
import { serialize } from '@/store/serialize';

/** User preferences. Small enough to live in one blob. */
export type Settings = {
  currency: Currency;
  colorScheme: 'light' | 'dark' | 'system';
  /** Quote poll interval in ms. */
  refreshIntervalMs: number;
  /** Dev affordance: probability in [0,1] that a mock request fails. */
  mockErrorRate: number;
};

export const DEFAULT_SETTINGS: Settings = {
  currency: 'toman',
  colorScheme: 'system',
  refreshIntervalMs: 20_000,
  mockErrorRate: 0,
};

export const REFRESH_OPTIONS = [
  { ms: 10_000, label: '۱۰ ثانیه' },
  { ms: 20_000, label: '۲۰ ثانیه' },
  { ms: 60_000, label: '۱ دقیقه' },
  { ms: 300_000, label: '۵ دقیقه' },
] as const;

const STORAGE_KEY = 'taraz.settings.v1';

export async function loadSettings(): Promise<Settings> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_SETTINGS;
  try {
    // Merge over defaults so a settings key added in a later build does not
    // arrive as undefined for existing users.
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings): Promise<Settings> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  return settings;
}

/**
 * Apply a partial change. The load-merge-save runs inside the key's write
 * queue, so flipping currency and theme in the same moment keeps both instead
 * of the second overwriting the first.
 */
export function patchSettings(patch: Partial<Settings>): Promise<Settings> {
  return serialize(STORAGE_KEY, async () => {
    const current = await loadSettings();
    return saveSettings({ ...current, ...patch });
  });
}
