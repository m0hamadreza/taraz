import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronRight, Plus } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HISTORY_RANGE_LABEL, type HistoryRange } from '@/api/contracts';
import { useCurrency, useHistory, useMarketData } from '@/api/queries';
import { LineChart, type ChartSeries } from '@/components/charts/line-chart';
import { Amount } from '@/components/common/amount';
import { ChangeBadge } from '@/components/common/change-badge';
import { Money } from '@/components/common/money';
import { ErrorState } from '@/components/common/states';
import { Screen } from '@/components/layout/screen';
import { VenueComparison } from '@/components/market/venue-comparison';
import { useAddHoldingSheet } from '@/components/sheets/add-holding-sheet';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Text } from '@/components/ui/text';
import { bestToBuy, bestToSell, buildVenueQuotes, sortBySell } from '@/domain/ranking';
import { unitLabel } from '@/domain/units';
import { formatJalaliShort, formatMoneyCompact, formatPercent } from '@/lib/format';
import { pctChange } from '@/lib/money';
import { CHART_SERIES_COLORS, THEME } from '@/lib/theme';

const RANGES: HistoryRange[] = ['1w', '1m', '3m', '1y'];

/**
 * One asset across every venue that quotes it: where to buy, where to sell, and
 * how the gap between them has behaved.
 */
export default function AssetDetailScreen() {
  const { assetId } = useLocalSearchParams<{ assetId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currency = useCurrency();
  const addSheet = useAddHoldingSheet();
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme ?? 'light';
  const palette = THEME[scheme];

  const [range, setRange] = React.useState<HistoryRange>('1m');

  const { index, quotes: allQuotes, status } = useMarketData();
  const historyQuery = useHistory(assetId, range);

  const asset = assetId ? index.assets.get(assetId) : undefined;
  const quotes = React.useMemo(
    () => allQuotes.filter((q) => q.assetId === assetId),
    [allQuotes, assetId]
  );

  const venueRows = React.useMemo(
    () => sortBySell(buildVenueQuotes(quotes, index.venues)),
    [quotes, index.venues]
  );

  const best = React.useMemo(
    () => ({ buy: bestToBuy(venueRows), sell: bestToSell(venueRows) }),
    [venueRows]
  );

  /** One line per venue, coloured from the shared chart ramp. */
  const series = React.useMemo<ChartSeries[]>(() => {
    if (!historyQuery.data) return [];
    return historyQuery.data.series.map((entry, position) => ({
      id: entry.venueId,
      label: index.venues.get(entry.venueId)?.nameFa ?? entry.venueId,
      color: palette[CHART_SERIES_COLORS[position % CHART_SERIES_COLORS.length]],
      points: entry.points.map((point) => ({ x: new Date(point.t).getTime(), y: point.bidIrr })),
    }));
  }, [historyQuery.data, index.venues, palette]);

  /** Move over the selected window, from the deepest venue's own series. */
  const rangeChangePct = React.useMemo(() => {
    const reference = series.find((s) => s.id === best.sell?.venue.id) ?? series[0];
    if (!reference || reference.points.length < 2) return 0;
    return pctChange(reference.points[0].y, reference.points[reference.points.length - 1].y);
  }, [series, best.sell]);

  if (!asset) {
    return (
      <Screen>
        <DetailHeader title="دارایی" onBack={() => router.back()} />
        {status.isLoading ? (
          <Skeleton className="mx-5 h-40 rounded-2xl" />
        ) : status.isError ? (
          <ErrorState message={status.message} onRetry={status.refetch} />
        ) : (
          <ErrorState message="این دارایی پیدا نشد." />
        )}
      </Screen>
    );
  }

  return (
    <Screen>
      <DetailHeader
        title={asset.nameFa}
        subtitle={`هر ${unitLabel(asset)}`}
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32, gap: 18 }}
        showsVerticalScrollIndicator={false}>
        {/* Headline: the price you could actually sell at right now. */}
        <View className="px-5">
          <View className="bg-card border-border rounded-3xl border p-5">
            <View className="flex-row items-center justify-between gap-2">
              <Text className="text-muted-foreground text-xs">
                بهترین قیمت فروش {best.sell ? `· ${best.sell.venue.nameFa}` : ''}
              </Text>
              {/* The badge below shows the move over the selected window, not
                  24h — say so, or it reads as a daily change. */}
              <Text className="text-muted-foreground text-[10px]">
                تغییر {HISTORY_RANGE_LABEL[range]}
              </Text>
            </View>
            <View className="mt-1 flex-row items-end justify-between gap-3">
              {best.sell ? (
                <Amount rial={best.sell.effectiveSellIrr} currency={currency} className="flex-1" />
              ) : (
                <Text className="flex-1 text-2xl font-bold">—</Text>
              )}
              <ChangeBadge percent={rangeChangePct} />
            </View>

            {best.buy ? (
              <Text className="text-muted-foreground border-border mt-3 border-t pt-3 text-xs">
                ارزان‌ترین خرید:{' '}
                <Money
                  rial={best.buy.effectiveBuyIrr}
                  currency={currency}
                  size="xs"
                  inline
                  className="text-foreground font-semibold"
                />{' '}
                در {best.buy.venue.nameFa}
              </Text>
            ) : null}

            {best.buy && best.sell ? (
              <Text className="text-muted-foreground mt-1 text-[11px]">
                هزینه رفت‌وبرگشت در بهترین حالت{' '}
                {formatPercent(
                  ((best.buy.effectiveBuyIrr - best.sell.effectiveSellIrr) /
                    best.buy.effectiveBuyIrr) *
                    100,
                  { signed: false }
                )}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Trend */}
        <View className="gap-3">
          <View className="px-5">
            <Tabs value={range} onValueChange={(value) => setRange(value as HistoryRange)}>
              <TabsList className="w-full">
                {RANGES.map((option) => (
                  <TabsTrigger key={option} value={option} className="flex-1">
                    <Text>{HISTORY_RANGE_LABEL[option]}</Text>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </View>

          <View className="px-5">
            {historyQuery.isError ? (
              <ErrorState
                message="نمودار بارگذاری نشد."
                onRetry={() => historyQuery.refetch()}
              />
            ) : historyQuery.isLoading || series.length === 0 ? (
              <Skeleton className="h-[200px] w-full rounded-2xl" />
            ) : (
              <LineChart
                series={series}
                height={200}
                gridColor={palette.border}
                labelColor={palette.mutedForeground}
                crosshairColor={palette.mutedForeground}
                formatY={(value) => formatMoneyCompact(value, currency).replace(/\s\S+$/, '')}
                formatX={(value) => formatJalaliShort(value)}
              />
            )}
          </View>

          {series.length > 0 ? (
            <View className="flex-row flex-wrap gap-x-4 gap-y-2 px-5">
              {series.map((entry) => (
                <View key={entry.id} className="flex-row items-center gap-1.5">
                  <View
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <Text className="text-muted-foreground text-[11px]">{entry.label}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {/* Venue table */}
        <View className="gap-3">
          <Text className="px-5 text-sm font-semibold">مقایسه منابع</Text>
          <VenueComparison
            rows={venueRows}
            currency={currency}
            bestBuyId={best.buy?.venue.id}
            bestSellId={best.sell?.venue.id}
          />
          <Text className="text-muted-foreground px-5 text-[11px] leading-5">
            قیمت مؤثر شامل کارمزد هر منبع است؛ خرید مؤثر یعنی آنچه می‌پردازید و فروش مؤثر یعنی
            آنچه دریافت می‌کنید.
          </Text>
        </View>

        <View className="px-5">
          <Button
            variant="outline"
            className="flex-row gap-2"
            onPress={() => addSheet.open({ assetId: asset.id })}>
            <Icon as={Plus} size={16} />
            <Text>افزودن {asset.nameFa} به پرتفوی</Text>
          </Button>
        </View>
      </ScrollView>
    </Screen>
  );
}

function DetailHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
}) {
  return (
    <View className="flex-row items-center gap-3 px-5 pb-4 pt-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="بازگشت"
        onPress={onBack}
        hitSlop={8}
        className="bg-muted h-9 w-9 items-center justify-center rounded-full">
        {/* In RTL, "back" points right. */}
        <Icon as={ChevronRight} size={18} />
      </Pressable>
      <View className="flex-1">
        <Text className="text-lg font-bold">{title}</Text>
        {subtitle ? <Text className="text-muted-foreground text-xs">{subtitle}</Text> : null}
      </View>
    </View>
  );
}
