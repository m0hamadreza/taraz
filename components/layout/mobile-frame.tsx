import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Platform, View } from 'react-native';

import { THEME } from '@/lib/theme';

/**
 * Width of the phone column on web.
 *
 * Duplicated as `max-w-[430px]` below because NativeWind needs the arbitrary
 * value as a literal at build time. Anything rendered outside the frame — a
 * portalled bottom sheet, say — has to read it from here to line up.
 */
export const MOBILE_FRAME_WIDTH = 430;

/**
 * Constrains the web build to a phone-width column.
 *
 * A pass-through on iOS and Android — there the viewport is already the frame.
 * On web it caps the app at 430pt (iPhone Pro Max width), centres it, and gives
 * it card edges so a desktop browser reads as "a phone app being previewed"
 * rather than a broken responsive site.
 */
export function MobileFrame({ children }: React.PropsWithChildren) {
  useBodyBackdrop();

  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <View className="bg-background border-border mx-auto w-full max-w-[430px] flex-1 overflow-hidden sm:border-x">
      {children}
    </View>
  );
}

/** Backdrop tones, a step away from the app background so the frame reads. */
const BACKDROP = {
  light: 'hsl(75 11% 92.9%)',
  dark: 'hsl(231.4 88.6% 2.1%)',
} as const;

/**
 * Paints the area either side of the column.
 *
 * It has to follow the *app's* resolved theme rather than a
 * `prefers-color-scheme` media query: the theme is a user setting, so someone
 * running the app in light mode on a dark-mode OS would otherwise get a light
 * page floating on a black page.
 */
function useBodyBackdrop() {
  const { colorScheme } = useColorScheme();

  React.useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.body.style.backgroundColor = BACKDROP[colorScheme ?? 'light'];
  }, [colorScheme]);
}
