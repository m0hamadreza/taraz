import { Info } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { View } from 'react-native';

import type { Currency } from '@/lib/money';
import { ChangeBadge } from '@/components/common/change-badge';
import { Amount } from '@/components/common/amount';
import { DonutChart } from '@/components/charts/donut-chart';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ASSET_KIND_LABEL, type PortfolioSummary } from '@/domain/valuation';
import { formatMoney, formatMoneyCompact } from '@/lib/format';
import { THEME } from '@/lib/theme';

const KIND_COLOR_KEY = {
  gold: 'chart1',
  coin: 'chart5',
  crypto: 'chart2',
  fiat: 'chart4',
} as const;

/**
 * The headline.
 *
 * Two totals, deliberately: **ارزش بازار** is the sum of bids, and
 * **ارزش نقدشوندگی** is what would actually reach the user's account after every
 * venue took its cut. Showing only the first is the flattering lie most
 * portfolio apps tell; the gap between them is often several percent.
 */
export function PortfolioHeader({
  summary,
  currency,
}: {
  summary: PortfolioSummary;
  currency: Currency;
}) {
  const { colorScheme } = useColorScheme();
  const palette = THEME[colorScheme ?? 'light'];

  const slices = summary.allocation.map((slice) => ({
    id: slice.kind,
    value: slice.grossIrr,
    color: palette[KIND_COLOR_KEY[slice.kind]],
  }));

  return (
    <View className="px-5 pb-5">
      <View className="bg-card border-border rounded-3xl border p-5">
        <Text className="text-muted-foreground text-xs">ارزش بازار</Text>

        <View className="mt-1 flex-row items-end justify-between gap-3">
          <Amount rial={summary.grossIrr} currency={currency} className="flex-1" />
          <ChangeBadge percent={summary.changePct} />
        </View>

        <View className="border-border mt-4 flex-row items-center gap-2 border-t pt-3">
          <Icon as={Info} size={13} className="text-muted-foreground" />
          <Text className="text-muted-foreground flex-1 text-xs">
            نقدشوندگی پس از کارمزد:{' '}
            <Text className="text-foreground text-xs font-semibold">
              {formatMoney(summary.netIrr, currency)}
            </Text>
          </Text>
        </View>

        {summary.feesIrr > 0 ? (
          <Text className="text-muted-foreground mt-1 text-[11px]">
            کارمزد خروج از همه منابع: {formatMoneyCompact(summary.feesIrr, currency)}
          </Text>
        ) : null}
      </View>

      {slices.length > 0 ? (
        <View className="mt-4 flex-row items-center gap-5">
          <DonutChart slices={slices} size={116} thickness={15} />
          <View className="flex-1 gap-2.5">
            {summary.allocation.map((slice) => (
              <View key={slice.kind} className="flex-row items-center gap-2">
                <View
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: palette[KIND_COLOR_KEY[slice.kind]] }}
                />
                <Text className="flex-1 text-sm">{ASSET_KIND_LABEL[slice.kind]}</Text>
                <Text className="text-muted-foreground text-xs font-medium">
                  {formatMoneyCompact(slice.grossIrr, currency)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
