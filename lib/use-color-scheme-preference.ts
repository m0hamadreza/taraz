import { colorScheme as nativewindColorScheme } from 'nativewind';
import * as React from 'react';
import { Appearance, Platform } from 'react-native';

export type ColorSchemePreference = 'light' | 'dark' | 'system';

/**
 * Applies the user's theme preference to NativeWind.
 *
 * The 'system' case needs special handling on web. With `darkMode: 'class'`,
 * NativeWind only adds or removes the `dark` class inside an explicit
 * `set('light' | 'dark')`; `set('system')` takes the remove branch while the JS
 * observable still falls back to the OS value. The result is a split brain —
 * `useColorScheme()` reports dark, the stylesheet renders light, and anything
 * themed from JS (the tab bar, chart strokes) clashes with everything themed
 * from CSS.
 *
 * So on web we resolve 'system' to a concrete scheme ourselves and keep
 * following the OS. Native has no such problem and gets 'system' directly.
 */
export function useColorSchemePreference(preference: ColorSchemePreference | undefined): void {
  React.useEffect(() => {
    if (!preference) return;

    if (preference !== 'system') {
      nativewindColorScheme.set(preference);
      return;
    }

    if (Platform.OS !== 'web') {
      nativewindColorScheme.set('system');
      return;
    }

    // Appearance can also report 'unspecified'; treat anything but dark as light.
    const apply = () =>
      nativewindColorScheme.set(Appearance.getColorScheme() === 'dark' ? 'dark' : 'light');
    apply();

    const subscription = Appearance.addChangeListener(apply);
    return () => subscription.remove();
  }, [preference]);
}
