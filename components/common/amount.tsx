import * as React from 'react';
import { View } from 'react-native';

import { MONEY_UNIT_CLASS } from '@/components/common/money';
import { Text } from '@/components/ui/text';
import { formatMoneyParts } from '@/lib/format';
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
 *
 * The unit beside it is a sibling rather than nested text so that
 * `adjustsFontSizeToFit` shrinks only the number — see `<Money/>`, which gives
 * every other figure in the app this same pairing at a smaller scale.
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
  const { value, unit } = formatMoneyParts(rial, currency);

  return (
    <View className={cn('flex-row items-baseline gap-1.5', className)}>
      <Text
        className={cn('shrink font-bold', sizeForLength(value.length))}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}>
        {value}
      </Text>
      <Text className={cn('text-sm', MONEY_UNIT_CLASS)}>{unit}</Text>
    </View>
  );
}
