import { ChevronRight } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

import type { Asset } from '@/api/contracts';
import { ChangeBadge } from '@/components/common/change-badge';
import { Money } from '@/components/common/money';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { VenueQuote } from '@/domain/ranking';
import { unitLabel } from '@/domain/units';
import type { Currency } from '@/lib/money';

/**
 * One asset in the market list, answering the two questions that matter before
 * you tap in: the best all-in price to buy, and the best all-in price to sell.
 * Both are net of the winning venue's fees, so they are comparable.
 */
export function AssetRow({
  asset,
  bestBuy,
  bestSell,
  changePct,
  currency,
  onPress,
}: {
  asset: Asset;
  bestBuy: VenueQuote | null;
  bestSell: VenueQuote | null;
  changePct: number;
  currency: Currency;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="bg-card border-border active:bg-muted mx-5 rounded-2xl border p-4">
      <View className="flex-row items-center gap-3">
        <View className="flex-1">
          <Text className="font-semibold">{asset.nameFa}</Text>
          <Text className="text-muted-foreground mt-0.5 text-[11px]">
            هر {unitLabel(asset)}
          </Text>
        </View>
        <ChangeBadge percent={changePct} size="sm" />
        <Icon as={ChevronRight} size={16} className="text-muted-foreground rotate-180" />
      </View>

      <View className="border-border mt-3 flex-row gap-3 border-t pt-3">
        <PriceCell
          label="ارزان‌ترین خرید"
          rial={bestBuy?.effectiveBuyIrr ?? null}
          currency={currency}
          venue={bestBuy?.venue.nameFa}
          tone="down"
        />
        <View className="bg-border w-px" />
        <PriceCell
          label="گران‌ترین فروش"
          rial={bestSell?.effectiveSellIrr ?? null}
          currency={currency}
          venue={bestSell?.venue.nameFa}
          tone="up"
        />
      </View>
    </Pressable>
  );
}

function PriceCell({
  label,
  rial,
  currency,
  venue,
  tone,
}: {
  label: string;
  /** `null` when no venue quotes this asset — the cell still holds its column. */
  rial: number | null;
  currency: Currency;
  venue?: string;
  tone: 'up' | 'down';
}) {
  return (
    <View className="flex-1 gap-0.5">
      <Text className="text-muted-foreground text-[11px]">{label}</Text>
      {rial === null ? (
        <Text className="text-sm font-semibold">—</Text>
      ) : (
        <Money rial={rial} currency={currency} size="sm" className="font-semibold" />
      )}
      {venue ? (
        <Text className={tone === 'up' ? 'text-up text-[11px]' : 'text-down text-[11px]'}>
          {venue}
        </Text>
      ) : null}
    </View>
  );
}
