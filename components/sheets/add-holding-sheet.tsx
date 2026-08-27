import { BottomSheetFlatList, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { ChevronRight, Search } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Asset, Quote, Venue } from '@/api/contracts';
import { useAddHolding, useCatalogIndex, useCurrency, useQuoteIndex } from '@/api/queries';
import {
  SHEET_CONTAINER_STYLE,
  SheetBackdrop,
  SheetHeader,
  SheetTextInput,
  sheetTheme,
} from '@/components/sheets/sheet-chrome';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { unitLabel, VENUE_KIND_LABEL } from '@/domain/units';
import { ASSET_KIND_LABEL, quoteKey } from '@/domain/valuation';
import { formatMoney, formatQuantity, toLatinDigits } from '@/lib/format';
import { FONT_FAMILY } from '@/lib/fonts';
import { THEME } from '@/lib/theme';
import { cn } from '@/lib/utils';

/**
 * "Add a holding", as one sheet with three steps rather than three screens.
 *
 * Asset → venue → quantity. Keeping it in a sheet matters because the whole
 * flow is a detour from looking at the portfolio; a pushed screen would lose
 * that context.
 *
 * Exposed through a context so the asset detail screen can open it pre-filled
 * without the portfolio screen having to own the state.
 */

type Prefill = { assetId?: string; venueId?: string };

type AddHoldingSheetApi = { open: (prefill?: Prefill) => void; close: () => void };

const AddHoldingSheetContext = React.createContext<AddHoldingSheetApi | null>(null);

export function useAddHoldingSheet(): AddHoldingSheetApi {
  const context = React.useContext(AddHoldingSheetContext);
  if (!context) {
    throw new Error('useAddHoldingSheet must be used inside <AddHoldingSheetProvider>');
  }
  return context;
}

type Step = 'asset' | 'venue' | 'quantity';

export function AddHoldingSheetProvider({ children }: React.PropsWithChildren) {
  const sheetRef = React.useRef<BottomSheetModal>(null);
  const [step, setStep] = React.useState<Step>('asset');
  const [assetId, setAssetId] = React.useState<string | null>(null);
  const [venueId, setVenueId] = React.useState<string | null>(null);
  const [quantity, setQuantity] = React.useState('');
  const [search, setSearch] = React.useState('');

  const api = React.useMemo<AddHoldingSheetApi>(
    () => ({
      open: (prefill) => {
        setAssetId(prefill?.assetId ?? null);
        setVenueId(prefill?.venueId ?? null);
        setQuantity('');
        setSearch('');
        // Jump straight to the furthest step the prefill already satisfies.
        setStep(prefill?.venueId ? 'quantity' : prefill?.assetId ? 'venue' : 'asset');
        sheetRef.current?.present();
      },
      close: () => sheetRef.current?.dismiss(),
    }),
    []
  );

  return (
    <AddHoldingSheetContext.Provider value={api}>
      {children}
      <AddHoldingSheet
        sheetRef={sheetRef}
        step={step}
        setStep={setStep}
        assetId={assetId}
        setAssetId={setAssetId}
        venueId={venueId}
        setVenueId={setVenueId}
        quantity={quantity}
        setQuantity={setQuantity}
        search={search}
        setSearch={setSearch}
      />
    </AddHoldingSheetContext.Provider>
  );
}

const SNAP_POINTS = ['82%'];

function AddHoldingSheet({
  sheetRef,
  step,
  setStep,
  assetId,
  setAssetId,
  venueId,
  setVenueId,
  quantity,
  setQuantity,
  search,
  setSearch,
}: {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  step: Step;
  setStep: (step: Step) => void;
  assetId: string | null;
  setAssetId: (id: string | null) => void;
  venueId: string | null;
  setVenueId: (id: string | null) => void;
  quantity: string;
  setQuantity: (value: string) => void;
  search: string;
  setSearch: (value: string) => void;
}) {
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme ?? 'light';
  const insets = useSafeAreaInsets();
  const { index } = useCatalogIndex();
  const { byKey } = useQuoteIndex();
  const currency = useCurrency();
  const addHolding = useAddHolding();

  const asset = assetId ? index.assets.get(assetId) : undefined;
  const venue = venueId ? index.venues.get(venueId) : undefined;
  const quote = assetId && venueId ? byKey.get(quoteKey(assetId, venueId)) : undefined;

  const assets = React.useMemo(() => {
    const all = [...index.assets.values()];
    const needle = search.trim();
    if (!needle) return all;
    const latin = needle.toLowerCase();
    return all.filter((a) => a.nameFa.includes(needle) || a.symbol.toLowerCase().includes(latin));
  }, [index.assets, search]);

  const venues = React.useMemo(() => {
    if (!assetId) return [];
    return (index.venuesByAsset.get(assetId) ?? [])
      .map((id) => index.venues.get(id))
      .filter((v): v is Venue => Boolean(v));
  }, [assetId, index]);

  const numericQuantity = React.useMemo(() => {
    const parsed = Number.parseFloat(toLatinDigits(quantity).replace(/,/g, ''));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [quantity]);

  const previewIrr = quote ? numericQuantity * quote.bidIrr : 0;

  function pickAsset(next: Asset) {
    setAssetId(next.id);
    setVenueId(null);
    setStep('venue');
  }

  function pickVenue(next: Venue) {
    setVenueId(next.id);
    setStep('quantity');
  }

  async function submit() {
    if (!assetId || !venueId || numericQuantity <= 0) return;
    await addHolding.mutateAsync({ assetId, venueId, quantity: numericQuantity });
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    sheetRef.current?.dismiss();
  }

  const theme = sheetTheme(scheme);
  const palette = THEME[scheme];

  const header = (
    <SheetHeader
      title={step === 'asset' ? 'کدام دارایی؟' : step === 'venue' ? 'از کجا؟' : 'چه مقدار؟'}
      description={
        step === 'asset'
          ? 'دارایی مورد نظر را انتخاب کنید'
          : step === 'venue'
            ? `${asset?.nameFa} در کدام منبع نگهداری می‌شود؟`
            : `${asset?.nameFa} · ${venue?.nameFa}`
      }
      leading={
        step !== 'asset' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="بازگشت"
            onPress={() => setStep(step === 'quantity' ? 'venue' : 'asset')}
            className="bg-secondary h-9 w-9 items-center justify-center rounded-full">
            {/* ChevronRight points "back" in an RTL layout. */}
            <Icon as={ChevronRight} size={18} />
          </Pressable>
        ) : null
      }
    />
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={SNAP_POINTS}
      /*
       * v5 turns `enableDynamicSizing` on by default, and it does not replace
       * `snapPoints` — it appends a *second* detent measured from the content.
       * That measurement comes from the scrollable's `onContentSizeChange`, so
       * it counts the list rows and nothing else: not the handle, not
       * `SheetHeader`, not the search field. The sheet then opens at that
       * short detent while its content box is still laid out for the tallest
       * one (82%), so the chrome it did not measure hangs below the viewport —
       * unscrollable, and on native straight through the home indicator.
       * The snap point is deliberate; the extra detent is not.
       */
      enableDynamicSizing={false}
      /*
       * Caps how far up the sheet can ever travel. `topInset` shifts gorhom's
       * hosting container down and shrinks it by the same amount, so the 82%
       * above resolves against the space *below* the notch and the sheet — even
       * over-dragged — stops at the status bar instead of running under it.
       * The backdrop is a full-screen sibling of that container, so the scrim
       * still covers the inset. Zero on web, where the browser reports no
       * `env(safe-area-inset-top)`.
       */
      topInset={insets.top}
      containerStyle={SHEET_CONTAINER_STYLE}
      backdropComponent={SheetBackdrop}
      backgroundStyle={theme.backgroundStyle}
      handleIndicatorStyle={theme.handleIndicatorStyle}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      enablePanDownToClose>
      {step === 'asset' ? (
        <>
          {header}
          <View className="px-5 py-3">
            <View className="bg-secondary flex-row items-center gap-2 rounded-xl px-3">
              <Icon as={Search} size={16} className="text-muted-foreground" />
              <SheetTextInput
                value={search}
                onChangeText={setSearch}
                placeholder="جستجوی دارایی…"
                placeholderTextColor={palette.mutedForeground}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  color: palette.foreground,
                  fontFamily: FONT_FAMILY.regular,
                  fontSize: 14,
                  textAlign: 'right',
                }}
              />
            </View>
          </View>
          <BottomSheetFlatList
            data={assets}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            renderItem={({ item }) => (
              <OptionRow
                title={item.nameFa}
                subtitle={`${ASSET_KIND_LABEL[item.kind]} · ${item.symbol}`}
                onPress={() => pickAsset(item)}
              />
            )}
            ListEmptyComponent={
              <Text className="text-muted-foreground px-5 py-8 text-center text-sm">
                داراییی با این نام پیدا نشد.
              </Text>
            }
          />
        </>
      ) : null}

      {step === 'venue' ? (
        <>
          {header}
          <BottomSheetFlatList
            data={venues}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 24 }}
            renderItem={({ item }) => {
              const venueQuote = assetId ? byKey.get(quoteKey(assetId, item.id)) : undefined;
              return (
                <OptionRow
                  title={item.nameFa}
                  subtitle={venueSubtitle(item, venueQuote, currency)}
                  onPress={() => pickVenue(item)}
                />
              );
            }}
          />
        </>
      ) : null}

      {step === 'quantity' ? (
        <>
          {header}
          {/*
           * A scrollable rather than a `BottomSheetView`: the sheet is a fixed
           * 82% tall, so a plain view would leave the submit button floating in
           * the middle of the card with the bottom inset padding stranded
           * below it. `flexGrow` lets the column fill the sheet so `mt-auto`
           * can push the button onto the bottom edge, and it still scrolls
           * when the keyboard shortens the sheet on native.
           */}
          <BottomSheetScrollView
            contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 16 }}
            keyboardShouldPersistTaps="handled">
            <View className="flex-1 gap-5 px-5 pt-5">
              <View>
                <Text className="text-muted-foreground mb-2 text-xs">
                  مقدار به {unitLabel(asset)}
                </Text>
                <View className="border-input bg-background flex-row items-center gap-2 rounded-xl border px-4">
                  <SheetTextInput
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="decimal-pad"
                    inputMode="decimal"
                    autoFocus
                    placeholder="۰"
                    placeholderTextColor={palette.mutedForeground}
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      color: palette.foreground,
                      fontFamily: FONT_FAMILY.semibold,
                      fontSize: 22,
                      textAlign: 'right',
                    }}
                  />
                  <Text className="text-muted-foreground text-sm">{unitLabel(asset)}</Text>
                </View>
              </View>

              {quote ? (
                <View className="bg-secondary gap-1 rounded-xl p-4">
                  <Text className="text-muted-foreground text-xs">
                    ارزش تقریبی به قیمت فروش {venue?.nameFa}
                  </Text>
                  <Text className="text-xl font-bold">{formatMoney(previewIrr, currency)}</Text>
                  <Text className="text-muted-foreground text-[11px]">
                    هر {unitLabel(asset)} {formatMoney(quote.bidIrr, currency)}
                  </Text>
                </View>
              ) : null}

              <Button
                className="mt-auto"
                size="lg"
                disabled={numericQuantity <= 0 || addHolding.isPending}
                onPress={submit}>
                <Text>
                  {numericQuantity > 0 && asset
                    ? `افزودن ${formatQuantity(numericQuantity, asset.decimals)} ${unitLabel(asset)}`
                    : 'افزودن به پرتفوی'}
                </Text>
              </Button>
            </View>
          </BottomSheetScrollView>
        </>
      ) : null}
    </BottomSheetModal>
  );
}

function OptionRow({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={cn(
        'flex-row items-center justify-between gap-3 px-5 py-3.5',
        'active:bg-secondary'
      )}>
      <View className="flex-1">
        <Text className="font-medium">{title}</Text>
        <Text className="text-muted-foreground mt-0.5 text-xs">{subtitle}</Text>
      </View>
      <Icon as={ChevronRight} size={16} className="text-muted-foreground rotate-180" />
    </Pressable>
  );
}

function venueSubtitle(venue: Venue, quote: Quote | undefined, currency: 'toman' | 'rial') {
  const kind = VENUE_KIND_LABEL[venue.kind];
  if (!quote) return kind;
  return `${kind} · فروش ${formatMoney(quote.bidIrr, currency)}`;
}
