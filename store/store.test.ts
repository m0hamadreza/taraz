import AsyncStorage from '@react-native-async-storage/async-storage';

import { addHolding, clearHoldings, listHoldings, removeHolding, updateHoldingQuantity } from '@/store/holdings';
import { loadSettings, patchSettings } from '@/store/settings';

/**
 * A minimal in-memory AsyncStorage with a deliberate async gap between read and
 * write. The gap is the point: it is where an interleaved mutation slips in, so
 * these tests fail loudly if the serialisation in store/serialize.ts is removed.
 */
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  const tick = () => new Promise((resolve) => setTimeout(resolve, 1));
  return {
    __esModule: true,
    default: {
      async getItem(key: string) {
        await tick();
        return store.get(key) ?? null;
      },
      async setItem(key: string, value: string) {
        await tick();
        store.set(key, value);
      },
      async clear() {
        store.clear();
      },
    },
  };
});

beforeEach(async () => {
  await (AsyncStorage as unknown as { clear: () => Promise<void> }).clear();
});

describe('holdings store', () => {
  it('keeps both positions when two adds are fired in the same tick', async () => {
    await Promise.all([
      addHolding({ assetId: 'gold-18k', venueId: 'digikala-gold', quantity: 4 }),
      addHolding({ assetId: 'btc', venueId: 'nobitex', quantity: 0.21 }),
    ]);

    const holdings = await listHoldings();
    expect(holdings).toHaveLength(2);
  });

  it('merges a repeat add into the existing position rather than duplicating it', async () => {
    await addHolding({ assetId: 'gold-18k', venueId: 'digikala-gold', quantity: 4 });
    await addHolding({ assetId: 'gold-18k', venueId: 'digikala-gold', quantity: 2 });

    const holdings = await listHoldings();
    expect(holdings).toHaveLength(1);
    expect(holdings[0].quantity).toBe(6);
  });

  it('treats the same asset at a different venue as a separate position', async () => {
    await addHolding({ assetId: 'gold-18k', venueId: 'digikala-gold', quantity: 4 });
    await addHolding({ assetId: 'gold-18k', venueId: 'wallgold', quantity: 2 });

    expect(await listHoldings()).toHaveLength(2);
  });

  it('sets a quantity rather than adding to it, so a partial sale can be recorded', async () => {
    // The bug this covers: adding the same asset+venue again *sums*, so there
    // was no way to take 4g of gold down to the 2g still held after a sale.
    const [holding] = await addHolding({ assetId: 'gold18', venueId: 'digikala', quantity: 4 });
    const holdings = await updateHoldingQuantity(holding.id, 2);

    expect(holdings).toHaveLength(1);
    expect(holdings[0].quantity).toBe(2);
    expect(holdings[0].id).toBe(holding.id);
  });

  it('removes a position when its quantity is set to zero', async () => {
    const [holding] = await addHolding({ assetId: 'usdt', venueId: 'wallex', quantity: 100 });
    await updateHoldingQuantity(holding.id, 0);

    expect(await listHoldings()).toHaveLength(0);
  });

  it('drops records that no longer match the schema instead of crashing', async () => {
    await AsyncStorage.setItem(
      'taraz.holdings.v1',
      JSON.stringify([
        { id: 'ok', assetId: 'btc', venueId: 'nobitex', quantity: 1, createdAt: '2026-08-27T00:00:00.000Z' },
        { id: 'stale', assetId: 'btc' },
        'not an object',
      ])
    );

    const holdings = await listHoldings();
    expect(holdings.map((h) => h.id)).toEqual(['ok']);
  });

  it('returns an empty list for unparseable storage', async () => {
    await AsyncStorage.setItem('taraz.holdings.v1', '{oh no');
    expect(await listHoldings()).toEqual([]);
  });

  it('survives a remove racing an add', async () => {
    const [first] = await addHolding({ assetId: 'usd', venueId: 'free-market', quantity: 500 });
    await Promise.all([
      removeHolding(first.id),
      addHolding({ assetId: 'doge', venueId: 'bitpin', quantity: 10 }),
    ]);

    const holdings = await listHoldings();
    expect(holdings.map((h) => h.assetId)).toEqual(['doge']);
  });

  it('clears everything', async () => {
    await addHolding({ assetId: 'btc', venueId: 'nobitex', quantity: 1 });
    await clearHoldings();
    expect(await listHoldings()).toEqual([]);
  });
});

describe('settings store', () => {
  it('keeps both changes when two patches are fired in the same tick', async () => {
    // The regression this guards: flipping currency and theme together used to
    // drop one, because both merged onto the same pre-update snapshot.
    await Promise.all([
      patchSettings({ currency: 'rial' }),
      patchSettings({ colorScheme: 'light' }),
    ]);

    const settings = await loadSettings();
    expect(settings.currency).toBe('rial');
    expect(settings.colorScheme).toBe('light');
  });

  it('falls back to defaults for missing and malformed storage', async () => {
    expect((await loadSettings()).currency).toBe('toman');

    await AsyncStorage.setItem('taraz.settings.v1', 'not json');
    expect((await loadSettings()).currency).toBe('toman');
  });

  it('fills in keys added after a value was written', async () => {
    await AsyncStorage.setItem('taraz.settings.v1', JSON.stringify({ currency: 'rial' }));

    const settings = await loadSettings();
    expect(settings.currency).toBe('rial');
    expect(settings.refreshIntervalMs).toBe(20_000);
  });
});
