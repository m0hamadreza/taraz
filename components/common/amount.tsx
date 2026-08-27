import * as React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { CURRENCY_LABEL, formatMoney } from '@/lib/format';
import type { Currency } from '@/lib/money';
import { cn } from '@/lib/utils';

/**
 * A headline money figure that fits.
 *
 * Rial amounts get long — a mixed portfolio is routinely ten digits, and with
 * Persian thousands separators that is thirteen characters. `adjustsFontSizeToFit`
 * would handle it on native but is a no-op in react-native-web, so the size is
 * chosen from the rendered length instead. Deterministic, no measurement pass,
 * and identical on all three platforms.
 */
function sizeForLength(length: number): string {
  if (length <= 10) return 'text-3xl';
  if (length <= 13) return 'text-2xl';
  if (length <= 16) return 'text-xl';
  return 'text-lg';
}

export function Amount({
  rial,
  currency,
  className,
}: {
  rial: number;
  currency: Currency;
  className?: string;
}) {
  const value = formatMoney(rial, currency, { withUnit: false });

  return (
    <View className={cn('flex-row items-baseline gap-1.5', className)}>
      <Text
        className={cn('shrink font-bold', sizeForLength(value.length))}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}>
        {value}
      </Text>
      <Text className="text-muted-foreground text-sm font-medium">
        {CURRENCY_LABEL[currency]}
      </Text>
    </View>
  );
}
