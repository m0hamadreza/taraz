import { Info } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { View } from 'react-native';

import type { Currency } from '@/lib/money';
import { ChangeBadge } from '@/components/common/change-badge';
import { Amount } from '@/components/common/amount';
import { Money } from '@/components/common/money';
import { DonutChart } from '@/components/charts/donut-chart';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ASSET_KIND_LABEL, type PortfolioSummary } from '@/domain/valuation';
import { ASSET_KIND_COLOR_KEY, THEME } from '@/lib/theme';

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
    color: palette[ASSET_KIND_COLOR_KEY[slice.kind]],
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
            <Money
              rial={summary.netIrr}
              currency={currency}
              size="xs"
              inline
              className="text-foreground font-semibold"
            />
          </Text>
        </View>

        {summary.feesIrr > 0 ? (
          <Text className="text-muted-foreground mt-1 text-[11px]">
            کارمزد خروج از همه منابع:{' '}
            <Money rial={summary.feesIrr} currency={currency} size="xxs" inline compact />
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
                  style={{ backgroundColor: palette[ASSET_KIND_COLOR_KEY[slice.kind]] }}
                />
                <Text className="flex-1 text-sm">{ASSET_KIND_LABEL[slice.kind]}</Text>
                <Money
                  rial={slice.grossIrr}
                  currency={currency}
                  size="xs"
                  compact
                  className="text-muted-foreground font-medium"
                />
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
