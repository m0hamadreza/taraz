import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Asset, Quote, Venue } from '@/api/contracts';
import { Money } from '@/components/common/money';
import { Button } from '@/components/ui/button';
import { Input, useInputFocus } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { unitLabel } from '@/domain/units';
import type { Currency } from '@/lib/money';
import { cn } from '@/lib/utils';

/**
 * "How much?" — the one step the add and edit sheets have in common.
 *
 * Shared rather than duplicated because both sheets ask it the same way: the
 * same `<Input/>` at the same scale inside the same bordered row, over the same
 * live preview.
 */
export function QuantityStep({
  asset,
  venue,
  quote,
  currency,
  value,
  onChangeValue,
  quantity,
  submitLabel,
  onSubmit,
  submitDisabled,
  destructive = false,
  children,
}: {
  asset: Asset | undefined;
  venue: Venue | undefined;
  quote: Quote | undefined;
  currency: Currency;
  value: string;
  onChangeValue: (value: string) => void;
  /** The parsed value of `value`, for the live preview. */
  quantity: number;
  submitLabel: string;
  onSubmit: () => void;
  submitDisabled: boolean;
  /** Submitting will delete the holding rather than change it. */
  destructive?: boolean;
  /** Extra content between the preview and the submit button. */
  children?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const unit = unitLabel(asset);
  const { focused, ...focusProps } = useInputFocus();

  return (
    /*
     * A scrollable rather than a `BottomSheetView`: the sheet is a fixed
     * height, so a plain view would leave the submit button floating in the
     * middle of the card with the bottom inset padding stranded below it.
     * `flexGrow` lets the column fill the sheet so `mt-auto` can push the
     * button onto the bottom edge, and it still scrolls when the keyboard
     * shortens the sheet on native.
     */
    <BottomSheetScrollView
      contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 16 }}
      keyboardShouldPersistTaps="handled">
      <View className="flex-1 gap-5 px-5 pt-5">
        <View>
          <Text className="text-muted-foreground mb-2 text-xs">مقدار به {unit}</Text>
          <View
            className={cn(
              'border-input bg-background flex-row items-center gap-2 rounded-xl border px-4',
              focused && 'border-ring'
            )}>
            <Input
              inSheet
              size="lg"
              value={value}
              onChangeText={onChangeValue}
              keyboardType="decimal-pad"
              inputMode="decimal"
              autoFocus
              selectTextOnFocus
              placeholder="۰"
              {...focusProps}
            />
            <Text className="text-muted-foreground text-sm">{unit}</Text>
          </View>
        </View>

        {quote ? (
          <View className="bg-muted gap-1 rounded-xl p-4">
            <Text className="text-muted-foreground text-xs">
              ارزش تقریبی به قیمت فروش {venue?.nameFa}
            </Text>
            <Money
              rial={quantity * quote.bidIrr}
              currency={currency}
              size="xl"
              className="font-bold"
            />
            <Text className="text-muted-foreground text-[11px]">
              هر {unit}{' '}
              <Money rial={quote.bidIrr} currency={currency} size="xxs" inline />
            </Text>
          </View>
        ) : null}

        {children}

        <Button
          className="mt-auto"
          size="lg"
          variant={destructive ? 'destructive' : 'default'}
          disabled={submitDisabled}
          onPress={onSubmit}>
          <Text>{submitLabel}</Text>
        </Button>
      </View>
    </BottomSheetScrollView>
  );
}
