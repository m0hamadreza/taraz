import { RefreshCw } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

/** Rows of shimmer sized like the content they stand in for. */
export function ListSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <View className={cn('gap-3 px-5', className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-[72px] w-full rounded-2xl" />
      ))}
    </View>
  );
}

export function ErrorState({
  message = 'دریافت اطلاعات ناموفق بود.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <View className="items-center gap-3 px-8 py-10">
      <Text className="text-center text-base font-medium">{message}</Text>
      <Text className="text-muted-foreground text-center text-sm">
        اتصال اینترنت خود را بررسی کنید و دوباره تلاش کنید.
      </Text>
      {onRetry ? (
        <Button variant="outline" onPress={onRetry} className="mt-1 flex-row gap-2">
          <Icon as={RefreshCw} size={15} />
          <Text>تلاش دوباره</Text>
        </Button>
      ) : null}
    </View>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <View className="items-center gap-2 px-8 py-12">
      <Text className="text-center text-base font-semibold">{title}</Text>
      {description ? (
        <Text className="text-muted-foreground text-center text-sm leading-6">{description}</Text>
      ) : null}
      {action ? <View className="mt-3">{action}</View> : null}
    </View>
  );
}
