import { Tabs } from 'expo-router';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLLAPSED_SCALE, useTabBarCollapse } from '@/components/navigation/tab-bar-scroll';
import { Text } from '@/components/ui/text';
import { THEME } from '@/lib/theme';

type AppTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

const BAR_HEIGHT = 62;
const ICON_SIZE = 21;

/**
 * The dock's own margins. They live here as numbers rather than `pt-2`/`pb-2`
 * because `useTabBarSpace()` has to add up to exactly the same height a scene
 * needs to keep clear, and a className the hook cannot read would drift.
 */
const GAP_ABOVE = 8;
const MIN_GAP_BELOW = 8;

/**
 * How much of the bottom of a scene the floating dock covers.
 *
 * The bar is absolutely positioned, so it no longer takes a row of its own in
 * the tab view's column and content runs underneath it. Every scrollable inside
 * the tabs pads its content by this plus its own breathing room, otherwise the
 * last row is unreachable behind the dock.
 */
export function useTabBarSpace() {
  const insets = useSafeAreaInsets();
  return GAP_ABOVE + BAR_HEIGHT + Math.max(insets.bottom, MIN_GAP_BELOW);
}

/**
 * One navigation surface for native and web.
 *
 * React Navigation's stock bar has different height, spacing, and press-state
 * behaviour on every platform. This dock owns all of that chrome itself; the
 * only device-dependent value left is the safe-area inset below it.
 *
 * It is absolutely positioned so the strip around the pill can be transparent
 * and show the scene through it. `BottomTabView` renders the `tabBar` as a bare
 * sibling of the screens container, so taking it out of that column is enough —
 * the screens then fill the whole viewport. Scenes reserve the space it covers
 * with `useTabBarSpace()`.
 */
export function AppTabBar({ state, descriptors, navigation }: AppTabBarProps) {
  const { colorScheme } = useColorScheme();
  const theme = THEME[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const collapse = useTabBarCollapse();

  // Reads the value as it stands — it is already springing. Calling an
  // animation function in here is a Reanimated 3 habit that 4 drops silently:
  // the scale it produced was undrawable on Android and inert on web.
  const dockStyle = useAnimatedStyle(() => {
    const progress = collapse?.progress.value ?? 0;
    return { transform: [{ scale: 1 - progress * (1 - COLLAPSED_SCALE) }] };
  });

  return (
    <View
      // `box-none` because the wrapper spans the full width and its padding is
      // over live content: only the dock itself may take a touch.
      pointerEvents="box-none"
      className="absolute bottom-0 end-0 start-0 z-10 bg-transparent px-3"
      style={{
        paddingTop: GAP_ABOVE,
        paddingBottom: Math.max(insets.bottom, MIN_GAP_BELOW),
      }}>
      <Animated.View style={dockStyle}>
        <View
          className="flex-row rounded-[26px] border border-border bg-card p-1.5"
          style={{
            height: BAR_HEIGHT,
            boxShadow:
              colorScheme === 'dark'
                ? '0 10px 25px rgba(0, 0, 0, 0.4)'
                : '0 8px 20px rgba(0, 0, 0, 0.05)',
          }}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const focused = state.index === index;
            const label = getLabel(options.tabBarLabel, options.title, route.name);
            // `accentForeground`, not `primary`: the pill's background is `accent`,
            // and those two are the palette's contrasting pair. `primary` is only
            // legible as a foreground in palettes whose primary happens to be dark.
            const tintColor = focused ? theme.accentForeground : theme.mutedForeground;

            function onPress() {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            }

            function onLongPress() {
              navigation.emit({ type: 'tabLongPress', target: route.key });
            }

            return (
              <Pressable
                key={route.key}
                aria-selected={focused}
                accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                testID={options.tabBarButtonTestID}
                onPress={onPress}
                onLongPress={onLongPress}
                hitSlop={4}
                className="flex-1 items-center justify-center rounded-[20px] border px-1"
                style={{
                  backgroundColor: focused ? theme.accent : 'transparent',
                  borderColor: focused ? theme.border : 'transparent',
                }}>
                {options.tabBarIcon?.({ focused, color: tintColor, size: ICON_SIZE })}
                <Text
                  numberOfLines={1}
                  className="mt-1 text-[11px] font-medium"
                  style={{ color: tintColor }}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}

function getLabel(
  tabBarLabel: AppTabBarProps['descriptors'][string]['options']['tabBarLabel'],
  title: string | undefined,
  routeName: string
) {
  if (typeof tabBarLabel === 'string') return tabBarLabel;
  return title ?? routeName;
}
