import { Banknote, Bitcoin, Coins, Gem, type LucideIcon } from 'lucide-react-native';
import * as React from 'react';
import { Image, View, type ImageSourcePropType } from 'react-native';

import type { AssetKind } from '@/api/contracts';
import { Icon } from '@/components/ui/icon';
import { ASSET_KIND_COLOR_KEY, CHART_CLASS } from '@/lib/theme';
import { cn } from '@/lib/utils';

/**
 * The icon half of the kind coding. The colour half lives in `lib/theme.ts`,
 * which the donut legend shares; only this map is React-dependent, so only this
 * map lives in a component file.
 */
const ASSET_KIND_ICON: Record<AssetKind, LucideIcon> = {
  gold: Gem,
  coin: Coins,
  crypto: Bitcoin,
  fiat: Banknote,
};

/**
 * The few assets that have artwork of their own, keyed by `Asset.id`.
 *
 * A logo *replaces* the kind disc rather than sitting on it: these are
 * illustrations with their own silhouette, palette and transparent margin — a
 * tinted circle behind one reads as a second, mismatched background. Anything
 * not listed falls back to its kind, so the map can stay as short as the assets
 * that actually ship an image.
 *
 * `require` rather than a `{ uri }`: Metro has to see a literal path to bundle
 * the file and to pick the right `@2x`/`@3x` variant, so this cannot be built
 * from the id at runtime.
 */
const ASSET_LOGO: Record<string, ImageSourcePropType | undefined> = {
  btc: require('@/assets/images/bitcoin.png'),
  doge: require('@/assets/images/dogecoin.png'),
  // One bar illustration for both purities: 18k and 24k differ in price, not in
  // what they look like sitting in a vault. `Asset.nameFa` on the row beside it
  // is what tells them apart.
  'gold-18k': require('@/assets/images/gold.png'),
  'gold-24k': require('@/assets/images/gold.png'),
  'coin-half': require('@/assets/images/half-coin.png'),
  usd: require('@/assets/images/usd.png'),
  usdt: require('@/assets/images/tether.png'),
};

/**
 * A row's scan anchor: the asset's own logo when there is one, otherwise its
 * kind as a tinted disc, in the same colour its slice has in the portfolio
 * donut.
 *
 * Deliberately not built on `components/ui/avatar.tsx` — that is
 * `@rn-primitives/avatar`, whose `Fallback` only renders once an `<Image>` has
 * errored. The fallback here is chosen up front, not recovered from.
 */
export function AssetKindAvatar({
  kind,
  assetId,
  className,
}: {
  kind: AssetKind;
  /** Opts this avatar into the asset's own artwork when one exists. */
  assetId?: string;
  className?: string;
}) {
  const logo = assetId ? ASSET_LOGO[assetId] : undefined;

  if (logo) {
    return (
      // The box is a `View` and the artwork fills it, rather than the `<Image/>`
      // being the box itself. On web react-native-web resolves the asset's
      // *natural* dimensions once it loads and writes them onto the image's root
      // node as an **inline** style — `style="height: 251px; width: 251px"`.
      // NativeWind compiles a className to real CSS classes there (through
      // react-native-web's `{ $$css: true }` escape hatch, not inline styles), an
      // inline declaration beats a class whatever the source order, and so
      // `h-10 w-10` lost and every logo drew at its full 250pt. The `style` below
      // lands after RNW's own entry in the same style array, so it wins; native,
      // which never sets those dimensions, resolves the percentages against the
      // same 40pt parent and is unchanged.
      //
      // `contain` keeps the aspect ratio inside that box, so a row's layout holds
      // whichever branch it takes and whatever shape the artwork is. Each file
      // carries its own padding, and cropping to a circle would clip both a coin
      // drawn tilted and a landscape stack of bars.
      <View className={cn('h-10 w-10', className)}>
        <Image
          source={logo}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
          style={{ width: '100%', height: '100%' }}
        />
      </View>
    );
  }

  const colors = CHART_CLASS[ASSET_KIND_COLOR_KEY[kind]];

  return (
    <View
      className={cn('h-10 w-10 items-center justify-center rounded-full', colors.tint, className)}>
      <Icon as={ASSET_KIND_ICON[kind]} size={18} className={colors.text} />
    </View>
  );
}
