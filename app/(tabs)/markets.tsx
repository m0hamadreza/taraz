import { useRouter } from 'expo-router';
import { Search, X } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AssetKind } from '@/api/contracts';
import { useCurrency, useMarketData } from '@/api/queries';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/common/states';
import { Screen, ScreenHeader } from '@/components/layout/screen';
import { AssetRow } from '@/components/market/asset-row';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { bestToBuy, bestToSell, buildVenueQuotes } from '@/domain/ranking';
import { ASSET_KIND_LABEL } from '@/domain/valuation';
import { FONT_FAMILY } from '@/lib/fonts';
import { pctChange } from '@/lib/money';
import { THEME } from '@/lib/theme';
import { cn } from '@/lib/utils';

const KIND_FILTERS: (AssetKind | 'all')[] = ['all', 'gold', 'coin', 'crypto', 'fiat'];

/**
 * Market overview — every asset with its best buy and best sell across venues.
 */
export default function MarketsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currency = useCurrency();
  const { colorScheme } = useColorScheme();
  const palette = THEME[colorScheme ?? 'light'];

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
          asset.nameFa.includes(needle) ||
          asset.symbol.toLowerCase().includes(needle.toLowerCase())
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
        <View className="bg-secondary flex-row items-center gap-2 rounded-xl px-3">
          <Icon as={Search} size={16} className="text-muted-foreground" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="جستجوی طلا، تتر، بیت‌کوین…"
            placeholderTextColor={palette.mutedForeground}
            className="native:text-right flex-1 py-2.5 text-sm"
            style={{ color: palette.foreground, fontFamily: FONT_FAMILY.regular }}
          />
          {search ? (
            <Pressable accessibilityLabel="پاک کردن" hitSlop={8} onPress={() => setSearch('')}>
              <Icon as={X} size={15} className="text-muted-foreground" />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View className="pb-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
          {KIND_FILTERS.map((option) => {
            const active = option === kind;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                onPress={() => setKind(option)}
                className={cn(
                  'rounded-full px-3.5 py-1.5',
                  active ? 'bg-primary' : 'bg-secondary'
                )}>
                <Text
                  className={cn(
                    'text-xs font-medium',
                    active ? 'text-primary-foreground' : 'text-muted-foreground'
                  )}>
                  {option === 'all' ? 'همه' : ASSET_KIND_LABEL[option]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {status.isError ? (
        <ErrorState message={status.message} onRetry={status.refetch} />
      ) : status.isLoading ? (
        <ListSkeleton rows={5} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row) => row.asset.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24, gap: 10 }}
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
