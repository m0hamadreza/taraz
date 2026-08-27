import { ArrowLeftRight, Trash2 } from 'lucide-react-native';
import * as React from 'react';
import { Alert, Platform, Pressable, View } from 'react-native';

import { ChangeBadge } from '@/components/common/change-badge';
import { StaleChip } from '@/components/common/stale-chip';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { RelocationAdvice } from '@/domain/ranking';
import { unitLabel } from '@/domain/units';
import type { ValuedHolding } from '@/domain/valuation';
import { formatMoney, formatMoneyCompact, formatPercent, formatQuantity } from '@/lib/format';
import type { Currency } from '@/lib/money';

/**
 * One position: what you hold, where, what it is worth, and — when the asset can
 * actually be moved — whether somewhere else would pay more for it.
 */
export function HoldingRow({
  item,
  currency,
  advice,
  onPress,
  onRemove,
}: {
  item: ValuedHolding;
  currency: Currency;
  advice: RelocationAdvice | null;
  onPress: () => void;
  onRemove: () => void;
}) {
  function confirmRemove() {
    const title = 'حذف دارایی';
    const message = `${item.asset.nameFa} از ${item.venue.nameFa} حذف شود؟`;

    if (Platform.OS === 'web') {
      // RN's Alert has no buttons on web; fall back to the browser confirm.
      // eslint-disable-next-line no-alert
      if (typeof window !== 'undefined' && window.confirm(`${title}\n${message}`)) onRemove();
      return;
    }

    Alert.alert(title, message, [
      { text: 'انصراف', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: onRemove },
    ]);
  }

  return (
    <View className="bg-card border-border mx-5 flex-row items-start gap-1 rounded-2xl border ps-2 pe-4 py-4">
      {/* The card body and the delete control are siblings rather than nested.
          react-native-web renders accessibilityRole="button" as a real <button>,
          and a <button> inside a <button> is invalid HTML. */}
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        className="active:opacity-70 flex-1 gap-3">
        <View className="flex-row items-start gap-3">
          <View className="flex-1">
            <Text className="font-semibold">{item.asset.nameFa}</Text>
            <Text className="text-muted-foreground mt-0.5 text-xs">
              {formatQuantity(item.holding.quantity, item.asset.decimals)} {unitLabel(item.asset)} ·{' '}
              {item.venue.nameFa}
            </Text>
          </View>

          <View className="items-start">
            <Text className="font-semibold">{formatMoney(item.grossIrr, currency)}</Text>
            <View className="mt-1 flex-row items-center gap-2">
              <ChangeBadge percent={item.changePct} size="sm" />
            </View>
          </View>
        </View>

        <View className="border-border flex-row items-center justify-between border-t pt-2.5">
          <Text className="text-muted-foreground text-[11px]">
            پس از کارمزد {formatMoney(item.netIrr, currency)}
          </Text>
          <StaleChip updatedAt={item.quote.updatedAt} />
        </View>

        {advice ? (
          <View className="bg-up/10 flex-row items-center gap-2 rounded-xl px-3 py-2">
            <Icon as={ArrowLeftRight} size={13} className="text-up" />
            <Text className="text-up flex-1 text-[11px] leading-5">
              فروش در {advice.to.venue.nameFa} حدود{' '}
              {formatMoneyCompact(advice.gainIrr, currency)} ({formatPercent(advice.gainPct)}) بیشتر
              عاید می‌کند.
            </Text>
          </View>
        ) : null}
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`حذف ${item.asset.nameFa} از ${item.venue.nameFa}`}
        hitSlop={8}
        onPress={confirmRemove}
        className="active:bg-secondary h-8 w-8 items-center justify-center rounded-full">
        <Icon as={Trash2} size={15} className="text-muted-foreground" />
      </Pressable>
    </View>
  );
}
