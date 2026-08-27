import { BottomSheetModal } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { Pencil, Trash2, TriangleAlert } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Asset, Holding, Venue } from '@/api/contracts';
import { useRemoveHolding } from '@/api/queries';
import { useEditHoldingSheet } from '@/components/sheets/edit-holding-sheet';
import {
  SHEET_CONTAINER_STYLE,
  SheetBackdrop,
  SheetHeader,
  sheetTheme,
} from '@/components/sheets/sheet-chrome';
import { AssetKindAvatar } from '@/components/common/asset-kind-avatar';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { unitLabel } from '@/domain/units';
import { formatQuantity } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * "What do you want to do with this position?"
 *
 * One sheet for the whole list rather than a control pair on every row: a
 * permanently-red trash button eight rows deep is both noise and a misfire
 * waiting to happen. Confirmation lives *inside* this sheet, which is what lets
 * the row drop its `Platform.OS === 'web' ? window.confirm : Alert.alert` fork —
 * `Alert` has no buttons on web, so a confirmation built on it can never be the
 * same interaction on all three platforms.
 */

/** A snapshot, not an id — see `open()` below. */
export type HoldingActionTarget = {
  holding: Holding;
  asset: Asset;
  venue: Venue;
};

type HoldingActionsSheetApi = {
  /**
   * The target is captured by value on purpose. The delete path destroys the
   * record, so a live lookup would resolve to `undefined` partway through the
   * dismiss animation and render an empty header over the scrim.
   */
  open: (target: HoldingActionTarget) => void;
  close: () => void;
};

const HoldingActionsSheetContext = React.createContext<HoldingActionsSheetApi | null>(null);

export function useHoldingActionsSheet(): HoldingActionsSheetApi {
  const context = React.useContext(HoldingActionsSheetContext);
  if (!context) {
    throw new Error('useHoldingActionsSheet must be used inside <HoldingActionsSheetProvider>');
  }
  return context;
}

export function HoldingActionsSheetProvider({ children }: React.PropsWithChildren) {
  const sheetRef = React.useRef<BottomSheetModal>(null);
  const [target, setTarget] = React.useState<HoldingActionTarget | null>(null);

  const api = React.useMemo<HoldingActionsSheetApi>(
    () => ({
      open: (next) => {
        setTarget(next);
        sheetRef.current?.present();
      },
      close: () => sheetRef.current?.dismiss(),
    }),
    []
  );

  return (
    <HoldingActionsSheetContext.Provider value={api}>
      {children}
      <HoldingActionsSheet sheetRef={sheetRef} target={target} />
    </HoldingActionsSheetContext.Provider>
  );
}

/**
 * Both states are sized to the same height so the sheet needs one detent.
 *
 * A number rather than a percentage: the content is a fixed number of points
 * tall — handle, two-line header, two 56pt rows — and `topInset` makes a
 * percentage resolve against the box below the notch, so the same string would
 * be a different height on every device. `enableDynamicSizing={false}` is
 * mandatory alongside it: v5 *appends* a content-measured detent rather than
 * replacing ours (see add-holding-sheet).
 */
const SHEET_HEIGHT = 268;

function HoldingActionsSheet({
  sheetRef,
  target,
}: {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  target: HoldingActionTarget | null;
}) {
  const { colorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();
  const editSheet = useEditHoldingSheet();
  const removeHolding = useRemoveHolding();

  const [confirming, setConfirming] = React.useState(false);

  /**
   * Handing off to the edit sheet has to be a dismiss-then-present, never a
   * present-on-top: `BottomSheetModal`'s `stackBehavior` defaults to `'switch'`,
   * which *minimises* this sheet and keeps it queued, and the provider then
   * restores it when the edit sheet closes — so the menu would spring back up
   * after the user saved.
   *
   * A ref rather than state because `onDismiss` has to read it synchronously.
   */
  const pendingEditRef = React.useRef<Holding | null>(null);

  function requestEdit() {
    if (!target) return;
    pendingEditRef.current = target.holding;
    sheetRef.current?.dismiss();
  }

  /**
   * `onDismiss` fires for *every* dismissal — backdrop tap and pan-down
   * included — so the pending edit is a one-shot latch. Without it, cancelling
   * the menu would open the edit sheet. No timeout is needed: the library fires
   * this from `unmount()`, after the close animation has resolved.
   */
  function handleDismiss() {
    const pending = pendingEditRef.current;
    pendingEditRef.current = null;
    setConfirming(false);
    if (pending) editSheet.open(pending);
  }

  async function remove() {
    if (!target) return;
    try {
      await removeHolding.mutateAsync(target.holding.id);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } finally {
      sheetRef.current?.dismiss();
    }
  }

  const theme = sheetTheme(colorScheme ?? 'light');
  const snapPoints = React.useMemo(() => [SHEET_HEIGHT + insets.bottom], [insets.bottom]);

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      topInset={insets.top}
      containerStyle={SHEET_CONTAINER_STYLE}
      backdropComponent={SheetBackdrop}
      backgroundStyle={theme.backgroundStyle}
      handleIndicatorStyle={theme.handleIndicatorStyle}
      onDismiss={handleDismiss}
      enablePanDownToClose>
      <SheetHeader
        title={target?.asset.nameFa ?? 'دارایی'}
        description={
          target
            ? `${formatQuantity(target.holding.quantity, target.asset.decimals)} ${unitLabel(target.asset)} · ${target.venue.nameFa}`
            : undefined
        }
        leading={
          target ? (
            <AssetKindAvatar kind={target.asset.kind} assetId={target.asset.id} />
          ) : undefined
        }
      />

      <View
        className="flex-1 justify-center gap-2 px-5 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}>
        {confirming ? (
          <>
            <View className="flex-row items-start gap-2 rounded-xl bg-destructive/10 p-3">
              <Icon as={TriangleAlert} size={14} className="mt-0.5 text-destructive" />
              <Text className="flex-1 text-xs leading-5 text-destructive">
                این دارایی از پرتفوی حذف می‌شود و از مجموع ارزش کنار می‌رود. برای اصلاح مقدار، از
                «ویرایش مقدار» استفاده کنید.
              </Text>
            </View>

            <View className="flex-row gap-2">
              <Button
                variant="secondary"
                size="lg"
                className="flex-1"
                onPress={() => setConfirming(false)}>
                <Text>انصراف</Text>
              </Button>
              <Button
                variant="destructive"
                size="lg"
                className="flex-1"
                disabled={removeHolding.isPending}
                onPress={remove}>
                <Text>حذف دارایی</Text>
              </Button>
            </View>
          </>
        ) : (
          <>
            <ActionRow
              icon={Pencil}
              label="ویرایش مقدار"
              description="جایگزینی مقدار ثبت‌شده — برای فروش بخشی از دارایی"
              onPress={requestEdit}
            />
            <ActionRow
              icon={Trash2}
              label="حذف دارایی"
              description="حذف کامل این موقعیت از پرتفوی"
              destructive
              onPress={() => setConfirming(true)}
            />
          </>
        )}
      </View>
    </BottomSheetModal>
  );
}

function ActionRow({
  icon,
  label,
  description,
  destructive = false,
  onPress,
}: {
  icon: React.ComponentProps<typeof Icon>['as'];
  label: string;
  description: string;
  destructive?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="min-h-14 flex-row items-center gap-3 rounded-xl bg-muted px-4 py-3 active:opacity-70">
      <View
        className={cn(
          'h-8 w-8 items-center justify-center rounded-full',
          destructive ? 'bg-destructive/10' : 'bg-background'
        )}>
        <Icon
          as={icon}
          size={15}
          className={destructive ? 'text-destructive' : 'text-foreground'}
        />
      </View>
      <View className="flex-1">
        <Text className={cn('text-sm font-medium', destructive && 'text-destructive')}>
          {label}
        </Text>
        <Text className="mt-0.5 text-[11px] text-muted-foreground">{description}</Text>
      </View>
    </Pressable>
  );
}
