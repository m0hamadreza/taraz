import * as React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

/**
 * Standard screen chrome: safe-area-aware top padding and an optional large
 * title. Kept here so every route does not re-derive the same insets logic.
 */
export function Screen({
  children,
  className,
  edges = true,
}: React.PropsWithChildren<{ className?: string; edges?: boolean }>) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className={cn('bg-background flex-1', className)}
      style={edges ? { paddingTop: insets.top } : undefined}>
      {children}
    </View>
  );
}

/**
 * A header with no subtitle must still stand as tall as one with it. The tabs
 * are switched between screens that carry a subtitle (پرتفوی، بازار) and one
 * that does not (تنظیمات), and a header that collapses by a line drags the
 * whole screen up with it. The floor is the pair's own two line boxes:
 * `text-xl` is 28pt, `mt-0.5` is 2, `text-sm` is 20 — Tailwind's default
 * line-heights, which nothing here overrides. The block stays top-aligned, so
 * the title lands on the same baseline whether or not a subtitle follows it
 * and the reserved line is spent below; centring a lone title would move the
 * one element every screen has in common.
 */
const TITLE_BLOCK_MIN_HEIGHT = 50;

export function ScreenHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center justify-between gap-3 px-5 pb-3 pt-2">
      <View className="flex-1" style={{ minHeight: TITLE_BLOCK_MIN_HEIGHT }}>
        <Text className="text-xl font-bold">{title}</Text>
        {subtitle ? <Text className="text-muted-foreground mt-0.5 text-sm">{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}
