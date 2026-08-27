import { useFocusEffect } from 'expo-router';
import * as React from 'react';
import {
  useAnimatedScrollHandler,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

/**
 * How far the dock shrinks when the user is reading downwards. Small enough
 * that it still reads as the same control in the same place — the point is to
 * get out of the way of the list, not to become a different widget.
 */
export const COLLAPSED_SCALE = 0.85;

/** A little overshoot on the way back up; none of it should feel elastic. */
const COLLAPSE_SPRING = { damping: 16, stiffness: 220, mass: 0.6 } as const;

/**
 * Same-direction travel that counts as intent, in points.
 *
 * Accumulated rather than compared per event: a trackpad or a slow drag reports
 * deltas of a point or two, so any per-event threshold large enough to ignore
 * jitter would also ignore the whole gesture.
 */
const DIRECTION_RUN = 12;

/** Near the top of a list the dock is always full size, whatever the run says. */
const REVEAL_FLOOR = 24;

type TabBarCollapse = {
  /** 0 = dock at full size, 1 = collapsed. Already springing; read it as-is. */
  progress: SharedValue<number>;
  /** A worklet, so the scroll thread can call it without hopping to JS. */
  setProgress: (next: number) => void;
};

/**
 * A shared value rather than React state: it is written from the scroll thread
 * on every frame, and re-rendering the whole tab view that often would drop
 * frames on Android.
 */
const TabBarCollapseContext = React.createContext<TabBarCollapse | null>(null);

/**
 * Connects the scenes' scroll position to the dock.
 *
 * The two live in different subtrees — `BottomTabView` renders the `tabBar`
 * prop as a sibling of the screens container — so the value has to hang off a
 * provider above both, which is `app/(tabs)/_layout.tsx`.
 */
export function TabBarScrollProvider({ children }: React.PropsWithChildren) {
  const progress = useSharedValue(0);
  const target = useSharedValue(0);

  // The spring is assigned to the shared value here, not called inside the
  // dock's `useAnimatedStyle`. Reanimated 3 allowed the latter; Reanimated 4
  // does not, and it fails quietly — the transform it produced left the pill
  // undrawable on Android and simply never moved on web.
  //
  // Assigning re-targets a spring in flight, which is what makes a mid-gesture
  // reversal pick up from the current scale. It also means re-sending the value
  // it is already heading for would restart it from a standstill every frame,
  // so the target is remembered and repeats are dropped here rather than in
  // every caller.
  const setProgress = React.useCallback(
    (next: number) => {
      'worklet';
      // Shared values are mutable by contract, and the rule cannot model a
      // write that happens on the scroll thread. This is the only place the
      // dock's progress is written, so the exception stays here.
      /* eslint-disable react-hooks/immutability */
      if (target.value === next) return;
      target.value = next;
      progress.value = withSpring(next, COLLAPSE_SPRING);
      /* eslint-enable react-hooks/immutability */
    },
    [progress, target]
  );

  const value = React.useMemo(() => ({ progress, setProgress }), [progress, setProgress]);

  return <TabBarCollapseContext.Provider value={value}>{children}</TabBarCollapseContext.Provider>;
}

/** Read side, for `AppTabBar`. Null when rendered outside the tabs. */
export function useTabBarCollapse() {
  return React.useContext(TabBarCollapseContext);
}

/**
 * Write side: spread onto a scene's scrollable.
 *
 * Direction, not offset — the dock shrinks while the user pushes content up and
 * comes back the moment they pull down, which is what makes it feel like it is
 * yielding to the list rather than tracking a scrollbar. Returns the props
 * rather than a bare handler so a scene cannot forget `scrollEventThrottle`,
 * without which iOS reports scrolling roughly twice a second.
 */
export function useTabBarScrollProps() {
  const collapse = React.useContext(TabBarCollapseContext);
  const setProgress = collapse?.setProgress;

  const lastOffset = useSharedValue(0);
  const run = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll(event) {
      if (!setProgress) return;

      const offset = event.contentOffset.y;
      const delta = offset - lastOffset.value;
      lastOffset.value = offset;

      // Rubber-banding past the top reports negative offsets; treat that as top.
      if (offset <= REVEAL_FLOOR) {
        run.value = 0;
        setProgress(0);
        return;
      }

      // A change of direction starts a new run rather than eating into the old.
      if (delta > 0 !== run.value > 0) run.value = 0;
      run.value += delta;

      if (run.value > DIRECTION_RUN) setProgress(1);
      else if (run.value < -DIRECTION_RUN) setProgress(0);
    },
  });

  // Coming back to a tab that was left mid-scroll would otherwise show a
  // collapsed dock with no gesture to explain it.
  useFocusEffect(
    React.useCallback(() => {
      setProgress?.(0);
    }, [setProgress])
  );

  return { onScroll, scrollEventThrottle: 16 } as const;
}
