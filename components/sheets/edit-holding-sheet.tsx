import { BottomSheetModal } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import * as React from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';

import type { Holding } from '@/api/contracts';
import {
  useCatalogIndex,
  useCurrency,
  useQuoteIndex,
  useUpdateHoldingQuantity,
} from '@/api/queries';
import { AssetKindAvatar } from '@/components/common/asset-kind-avatar';
import { QuantityStep } from '@/components/sheets/quantity-step';
import {
  SHEET_CONTAINER_STYLE,
  SheetBackdrop,
  SheetHeader,
  sheetTheme,
} from '@/components/sheets/sheet-chrome';
import { Text } from '@/components/ui/text';
import { unitLabel } from '@/domain/units';
import { quoteKey } from '@/domain/valuation';
import { formatQuantity, parseQuantity } from '@/lib/format';

/**
 * "Correct the amount" — the counterpart to the add sheet.
 *
 * Adding the same asset at the same venue twice *sums* into one position
 * (store/holdings.ts), which is right for buying more and useless for selling
 * some: there was no way to take a position from 4g down to 2g. This sheet
 * **sets** the quantity instead, and setting it to zero removes the holding —
 * that is what `updateHoldingQuantity` already does with a non-positive value.
 *
 * Same provider-plus-context shape as the add sheet, so the row that opens it
 * does not have to own any of this state.
 */

type EditHoldingSheetApi = { open: (holding: Holding) => void; close: () => void };

const EditHoldingSheetContext = React.createContext<EditHoldingSheetApi | null>(null);

export function useEditHoldingSheet(): EditHoldingSheetApi {
  const context = React.useContext(EditHoldingSheetContext);
  if (!context) {
    throw new Error('useEditHoldingSheet must be used inside <EditHoldingSheetProvider>');
  }
  return context;
}

export function EditHoldingSheetProvider({ children }: React.PropsWithChildren) {
  const sheetRef = React.useRef<BottomSheetModal>(null);
  // A snapshot rather than an id: the sheet needs the quantity it opened with
  // to seed the field and to show what is changing, and a live lookup would
  // move that baseline under the user on the next quote refetch.
  const [holding, setHolding] = React.useState<Holding | null>(null);
  const [value, setValue] = React.useState('');

  const api = React.useMemo<EditHoldingSheetApi>(
    () => ({
      open: (next) => {
        setHolding(next);
        setValue(String(next.quantity));
        sheetRef.current?.present();
      },
      close: () => sheetRef.current?.dismiss(),
    }),
    []
  );

  return (
    <EditHoldingSheetContext.Provider value={api}>
      {children}
      <EditHoldingSheet sheetRef={sheetRef} holding={holding} value={value} setValue={setValue} />
    </EditHoldingSheetContext.Provider>
  );
}

const SNAP_POINTS = ['80%'];

function EditHoldingSheet({
  sheetRef,
  holding,
  value,
  setValue,
}: {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  holding: Holding | null;
  value: string;
  setValue: (value: string) => void;
}) {
  const { colorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();
  const { index } = useCatalogIndex();
  const { byKey } = useQuoteIndex();
  const currency = useCurrency();
  const updateQuantity = useUpdateHoldingQuantity();

  const asset = holding ? index.assets.get(holding.assetId) : undefined;
  const venue = holding ? index.venues.get(holding.venueId) : undefined;
  const quote = holding ? byKey.get(quoteKey(holding.assetId, holding.venueId)) : undefined;

  const parsed = parseQuantity(value);
  const decimals = asset?.decimals ?? 2;
  const unit = unitLabel(asset);

  // `null` is an empty or malformed field — neither a save nor a delete.
  const removing = parsed === 0;
  const unchanged = parsed !== null && holding !== null && parsed === holding.quantity;
  const delta = parsed !== null && holding ? parsed - holding.quantity : 0;

  async function submit() {
    if (!holding || parsed === null || unchanged) return;
    await updateQuantity.mutateAsync({ id: holding.id, quantity: parsed });
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    sheetRef.current?.dismiss();
  }

  const theme = sheetTheme(colorScheme ?? 'light');

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={SNAP_POINTS}
      // Explicit snap points: v5 would otherwise append a second detent
      // measured from the content alone — see add-holding-sheet.
      enableDynamicSizing={false}
      topInset={insets.top}
      containerStyle={SHEET_CONTAINER_STYLE}
      backdropComponent={SheetBackdrop}
      backgroundStyle={theme.backgroundStyle}
      handleIndicatorStyle={theme.handleIndicatorStyle}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      enablePanDownToClose>
      <SheetHeader
        title="ویرایش مقدار"
        description={holding ? `${asset?.nameFa} · ${venue?.nameFa}` : undefined}
        leading={asset ? <AssetKindAvatar kind={asset.kind} assetId={asset.id} /> : null}
      />

      <QuantityStep
        asset={asset}
        venue={venue}
        quote={quote}
        currency={currency}
        value={value}
        onChangeValue={setValue}
        quantity={parsed ?? 0}
        destructive={removing}
        submitDisabled={parsed === null || unchanged || updateQuantity.isPending}
        submitLabel={
          removing
            ? 'حذف از پرتفوی'
            : parsed !== null && !unchanged
              ? `ذخیره ${formatQuantity(parsed, decimals)} ${unit}`
              : 'ذخیره مقدار'
        }
        onSubmit={submit}>
        {holding ? (
          <View className="gap-2">
            <Pressable
              accessibilityRole="button"
              onPress={() => setValue(String(holding.quantity))}
              className="active:opacity-70 flex-row items-center justify-between">
              <Text className="text-muted-foreground text-xs">مقدار ثبت‌شده</Text>
              <Text className="text-xs font-medium">
                {formatQuantity(holding.quantity, decimals)} {unit}
              </Text>
            </Pressable>

            {removing ? (
              <Text className="text-destructive text-[11px] leading-5">
                با مقدار صفر، این دارایی از پرتفوی حذف می‌شود.
              </Text>
            ) : delta !== 0 ? (
              <Text className="text-muted-foreground text-[11px] leading-5">
                {delta < 0 ? 'کاهش' : 'افزایش'} {formatQuantity(Math.abs(delta), decimals)} {unit}
              </Text>
            ) : null}
          </View>
        ) : null}
      </QuantityStep>
    </BottomSheetModal>
  );
}
