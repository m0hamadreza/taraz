import { useRouter } from 'expo-router';
import * as React from 'react';
import { RefreshControl, View } from 'react-native';
import Animated from 'react-native-reanimated';

import type { AssetKind } from '@/api/contracts';
import { useCurrency, useMarketData } from '@/api/queries';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/common/states';
import { Screen, ScreenHeader } from '@/components/layout/screen';
import { useTabBarSpace } from '@/components/navigation/app-tab-bar';
import { useTabBarScrollProps } from '@/components/navigation/tab-bar-scroll';
import { AssetRow } from '@/components/market/asset-row';
import { SearchInput } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Text } from '@/components/ui/text';
import { bestToBuy, bestToSell, buildVenueQuotes } from '@/domain/ranking';
import { ASSET_KIND_LABEL } from '@/domain/valuation';
import { pctChange } from '@/lib/money';

const KIND_FILTERS: (AssetKind | 'all')[] = ['all', 'gold', 'coin', 'crypto', 'fiat'];

/**
 * Market overview — every asset with its best buy and best sell across venues.
 */
export default function MarketsScreen() {
  const router = useRouter();
  const tabBarSpace = useTabBarSpace();
  const tabBarScroll = useTabBarScrollProps();
  const currency = useCurrency();

  const { index, catalog, quotes, status } = useMarketData();

  const [search, setSearch] = React.useState('');
  const [kind, setKind] = React.useState<AssetKind | 'all'>('all');

  const rows = React.useMemo(() => {
    if (!catalog) return [];

    // One reference quantity of 1 unit: fees are compared per unit so venues
    // with a flat withdrawal fee are not unfairly punished or flattered.
    return catalog.assets
      .filter((asset) => kind === 'all' || asset.kind === kind)
      .filter((asset) => {
        const needle = search.trim();
        if (!needle) return true;
        return (
          asset.nameFa.includes(needle) || asset.symbol.toLowerCase().includes(needle.toLowerCase())
        );
      })
      .map((asset) => {
        const assetQuotes = quotes.filter((q) => q.assetId === asset.id);
        const venueRows = buildVenueQuotes(assetQuotes, index.venues);

        // Headline move uses the deepest venue's bid — the one users are most
        // likely to transact against — rather than an average that no one trades.
        const reference = bestToSell(venueRows);
        const changePct = reference
          ? pctChange(reference.quote.prevBidIrr, reference.quote.bidIrr)
          : 0;

        return {
          asset,
          bestBuy: bestToBuy(venueRows),
          bestSell: reference,
          changePct,
        };
      });
  }, [catalog, quotes, index.venues, kind, search]);

  return (
    <Screen>
      <ScreenHeader title="بازار" subtitle="مقایسه قیمت خرید و فروش بین منابع" />

      <View className="px-5 pb-3">
        <SearchInput
          value={search}
          onChangeText={setSearch}
          onClear={() => setSearch('')}
          placeholder="جستجوی طلا، تتر، بیت‌کوین…"
        />
      </View>

      <View className="px-5 pb-3">
        <Tabs value={kind} onValueChange={(value) => setKind(value as AssetKind | 'all')}>
          <TabsList className="w-full">
            {KIND_FILTERS.map((option) => (
              <TabsTrigger key={option} value={option} className="flex-1">
                <Text>{option === 'all' ? 'همه' : ASSET_KIND_LABEL[option]}</Text>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </View>

      {status.isError ? (
        <ErrorState message={status.message} onRetry={status.refetch} />
      ) : status.isLoading ? (
        <ListSkeleton rows={5} />
      ) : (
        <Animated.FlatList
          {...tabBarScroll}
          data={rows}
          keyExtractor={(row) => row.asset.id}
          contentContainerStyle={{ paddingBottom: tabBarSpace + 24, gap: 10 }}
          refreshControl={
            <RefreshControl refreshing={status.isRefreshing} onRefresh={status.refetch} />
          }
          renderItem={({ item }) => (
            <AssetRow
              asset={item.asset}
              bestBuy={item.bestBuy}
              bestSell={item.bestSell}
              changePct={item.changePct}
              currency={currency}
              onPress={() => router.push(`/asset/${item.asset.id}`)}
            />
          )}
          ListEmptyComponent={<EmptyState title="نتیجه‌ای پیدا نشد" />}
        />
      )}
    </Screen>
  );
}
