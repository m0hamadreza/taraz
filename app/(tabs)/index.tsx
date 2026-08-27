import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import * as React from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCurrency, useHoldings, useMarketData, useRemoveHolding } from '@/api/queries';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/common/states';
import { Screen, ScreenHeader } from '@/components/layout/screen';
import { HoldingRow } from '@/components/portfolio/holding-row';
import { PortfolioHeader } from '@/components/portfolio/portfolio-header';
import { useAddHoldingSheet } from '@/components/sheets/add-holding-sheet';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { buildVenueQuotes, relocationAdvice, type RelocationAdvice } from '@/domain/ranking';
import { summarisePortfolio, valueHoldings } from '@/domain/valuation';
import { formatRelativeTime } from '@/lib/format';

/**
 * The portfolio: everything the user owns, valued at what it would actually
 * fetch today, refreshing on its own as the mock feed moves.
 */
export default function PortfolioScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currency = useCurrency();
  const addSheet = useAddHoldingSheet();

  const { index, quotes, byKey, status } = useMarketData();
  const holdingsQuery = useHoldings();
  const removeHolding = useRemoveHolding();

  const holdings = holdingsQuery.data ?? [];

  const { valued, summary, adviceById } = React.useMemo(() => {
    const { valued, unpriced } = valueHoldings(holdings, index.assets, index.venues, byKey);
    const summary = summarisePortfolio(valued, unpriced.length);

    // "You could get more elsewhere" is computed per holding against every
    // venue that quotes the same asset, and only surfaces when the asset can
    // actually be moved.
    const adviceById = new Map<string, RelocationAdvice | null>();
    for (const item of valued) {
      const siblings = quotes.filter((q) => q.assetId === item.asset.id);
      const rows = buildVenueQuotes(siblings, index.venues, item.holding.quantity);
      adviceById.set(
        item.holding.id,
        relocationAdvice(item.venue.id, rows, item.holding.quantity)
      );
    }

    return { valued, summary, adviceById };
  }, [quotes, byKey, holdings, index]);

  const loading = status.isLoading || holdingsQuery.isLoading;

  return (
    <Screen>
      <ScreenHeader
        title="پرتفوی"
        subtitle={
          summary.oldestQuoteAt
            ? `قیمت‌ها ${formatRelativeTime(summary.oldestQuoteAt)}`
            : 'دارایی‌های شما در یک نگاه'
        }
        action={
          <Button
            size="sm"
            onPress={() => addSheet.open()}
            className="flex-row gap-1.5"
            accessibilityLabel="افزودن دارایی">
            <Icon as={Plus} size={15} className="text-primary-foreground" />
            <Text>افزودن</Text>
          </Button>
        }
      />

      {status.isError ? (
        <ErrorState message={status.message} onRetry={status.refetch} />
      ) : loading ? (
        <ListSkeleton rows={4} />
      ) : (
        <FlatList
          data={valued}
          keyExtractor={(item) => item.holding.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24, gap: 10 }}
          refreshControl={
            <RefreshControl refreshing={status.isRefreshing} onRefresh={status.refetch} />
          }
          ListHeaderComponent={
            valued.length > 0 ? (
              <PortfolioHeader summary={summary} currency={currency} />
            ) : null
          }
          renderItem={({ item }) => (
            <HoldingRow
              item={item}
              currency={currency}
              advice={adviceById.get(item.holding.id) ?? null}
              onPress={() => router.push(`/asset/${item.asset.id}`)}
              onRemove={() => removeHolding.mutate(item.holding.id)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title="هنوز داراییی ثبت نکرده‌اید"
              description="طلای دیجی‌کالا، تتر نوبیتکس، سکه فیزیکی یا هر دارایی دیگری را اضافه کنید تا ارزش ریالی مجموع آن‌ها را ببینید."
              action={
                <Button onPress={() => addSheet.open()} className="flex-row gap-1.5">
                  <Icon as={Plus} size={16} className="text-primary-foreground" />
                  <Text>افزودن اولین دارایی</Text>
                </Button>
              }
            />
          }
          ListFooterComponent={
            summary.unpricedCount > 0 ? (
              <View className="px-5 pt-3">
                <Text className="text-muted-foreground text-center text-xs">
                  قیمت {summary.unpricedCount} دارایی در دسترس نیست و در مجموع لحاظ نشده است.
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </Screen>
  );
}
