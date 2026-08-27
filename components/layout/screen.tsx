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
      <View className="flex-1">
        <Text className="text-2xl font-bold">{title}</Text>
        {subtitle ? <Text className="text-muted-foreground mt-0.5 text-sm">{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}
