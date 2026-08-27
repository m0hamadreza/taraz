import { Check } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { VenueQuote } from '@/domain/ranking';
import { formatMoney, formatPercent } from '@/lib/format';
import type { Currency } from '@/lib/money';
import { cn } from '@/lib/utils';

/**
 * Venue-by-venue comparison.
 *
 * The two price columns are **effective** prices — ask plus entry fee, bid minus
 * exit fee — not the raw quotes. That is the only way the physical bazaar (tight
 * spread, 7% اجرت) and an exchange (wide spread, 0.25% fee) can be put in the
 * same table honestly.
 *
 * Fee and spread live under the venue name rather than in columns of their own:
 * a nine-digit Rial figure needs the width, and on web there is no
 * `adjustsFontSizeToFit` to fall back on.
 */
export function VenueComparison({
  rows,
  currency,
  bestBuyId,
  bestSellId,
}: {
  rows: VenueQuote[];
  currency: Currency;
  bestBuyId?: string;
  bestSellId?: string;
}) {
  return (
    <View className="bg-card border-border mx-5 overflow-hidden rounded-2xl border">
      <View className="border-border bg-secondary/60 flex-row gap-2 border-b px-4 py-2.5">
        <Text className="text-muted-foreground flex-[1.25] text-[11px] font-medium">منبع</Text>
        <Text className="text-muted-foreground flex-1 text-[11px] font-medium">خرید مؤثر</Text>
        <Text className="text-muted-foreground flex-1 text-[11px] font-medium">فروش مؤثر</Text>
      </View>

      {rows.map((row, position) => (
        <View
          key={row.venue.id}
          className={cn(
            'flex-row items-center gap-2 px-4 py-3',
            position < rows.length - 1 && 'border-border border-b'
          )}>
          <View className="flex-[1.25]">
            <Text className="text-[13px] font-medium">{row.venue.nameFa}</Text>
            <Text className="text-muted-foreground text-[10px]">
              کارمزد {formatPercent(row.venue.fees.sellPct * 100, { signed: false })} · اسپرد{' '}
              {formatPercent(row.spreadPct, { signed: false })}
            </Text>
          </View>

          <Cell
            value={formatMoney(row.effectiveBuyIrr, currency, { withUnit: false })}
            best={row.venue.id === bestBuyId}
            tone="down"
          />
          <Cell
            value={formatMoney(row.effectiveSellIrr, currency, { withUnit: false })}
            best={row.venue.id === bestSellId}
            tone="up"
          />
        </View>
      ))}
    </View>
  );
}

function Cell({ value, best, tone }: { value: string; best: boolean; tone: 'up' | 'down' }) {
  return (
    <View className="flex-1 flex-row items-center gap-1">
      {best ? (
        <Icon as={Check} size={11} className={tone === 'up' ? 'text-up' : 'text-down'} />
      ) : null}
      <Text
        className={cn(
          'shrink text-xs',
          best ? (tone === 'up' ? 'text-up font-semibold' : 'text-down font-semibold') : ''
        )}
        numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
