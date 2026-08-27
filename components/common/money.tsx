import * as React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { formatMoneyParts } from '@/lib/format';
import type { Currency } from '@/lib/money';
import { cn } from '@/lib/utils';

/**
 * A money figure: the number in the surrounding voice, the unit a step smaller
 * and muted.
 *
 * The unit repeats on every row and every card — تومان after each of eight
 * holdings is eight words the eye has to skip past to compare the numbers. It
 * is a label, not content, so it is set down a size and in
 * `text-muted-foreground` wherever a figure appears. `<Amount/>` established
 * that treatment for the portfolio headline; this is the same thing for
 * everywhere else, which is why the pairs below are a fixed table rather than
 * something each call site sizes by hand.
 *
 * The number keeps the call site's own typography (`className`); only the unit
 * is prescribed.
 */
const SIZE = {
  /** The third-tier lines inside a card. */
  xxs: { value: 'text-[11px]', unit: 'text-[10px]' },
  xs: { value: 'text-xs', unit: 'text-[10px]' },
  sm: { value: 'text-sm', unit: 'text-[11px]' },
  /** `<Text/>`'s own default size. */
  base: { value: 'text-base', unit: 'text-xs' },
  xl: { value: 'text-xl', unit: 'text-sm' },
} as const;

export type MoneySize = keyof typeof SIZE;

type MoneyProps = {
  rial: number;
  currency: Currency;
  /** Shorten to میلیون / میلیارد — the unit then carries the magnitude word. */
  compact?: boolean;
  size?: MoneySize;
  /**
   * Render as one `<Text>` with the unit nested, for a figure sitting inside a
   * sentence. The default is a `flex-row` pair, which lets the number shrink to
   * the space it has without dragging the unit down with it — `<Text>` cannot
   * do that, because `adjustsFontSizeToFit` scales a whole run including its
   * nested children.
   */
  inline?: boolean;
  /** Typography for the number. */
  className?: string;
  /** Layout for the pair. Block mode only — `inline` has no wrapper. */
  containerClassName?: string;
  /** Escape hatch for a figure inside toned prose, where muted would break it. */
  unitClassName?: string;
};

export function Money({
  rial,
  currency,
  compact = false,
  size = 'base',
  inline = false,
  className,
  containerClassName,
  unitClassName,
}: MoneyProps) {
  const { value, unit } = formatMoneyParts(rial, currency, { compact });
  const scale = SIZE[size];

  const unitClass = cn(scale.unit, 'text-muted-foreground font-medium', unitClassName);

  if (inline) {
    return (
      <Text className={cn(scale.value, className)}>
        {value}
        <Text className={unitClass}>{` ${unit}`}</Text>
      </Text>
    );
  }

  return (
    // `items-baseline`, not `items-center`: the two sizes have to sit on one
    // line, and Persian digits have no descenders to centre against.
    <View className={cn('flex-row items-baseline gap-1', containerClassName)}>
      <Text
        className={cn('shrink', scale.value, className)}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}>
        {value}
      </Text>
      <Text className={unitClass}>{unit}</Text>
    </View>
  );
}

/** The unit's own treatment, for the one figure that sizes itself: `<Amount/>`. */
export const MONEY_UNIT_CLASS = 'text-muted-foreground font-medium';
