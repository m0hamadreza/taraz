import { TriangleAlert } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { formatRelativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';

export const STALE_AFTER_MS = 5 * 60_000;

/**
 * How old the price is.
 *
 * In a market that moves this fast, the age of a quote is part of its meaning —
 * a number with no timestamp invites the user to trust it more than they should.
 * Past five minutes the label turns amber and picks up a warning glyph, because
 * a colour shift alone is a weak signal at 11px.
 *
 * `onlyWhenStale` renders nothing while the quote is fresh. That is the mode the
 * portfolio rows use: `ScreenHeader` already prints the portfolio's oldest quote
 * age once, so repeating it per row is noise until one row is actually behind.
 * The test stays *inside* this component rather than at the call site because
 * the 30s interval below is what makes the chip appear on crossing the
 * threshold; a caller deciding for itself would need its own timer, or the chip
 * would only show up at the next price poll.
 */
export function StaleChip({
  updatedAt,
  onlyWhenStale = false,
  className,
}: {
  updatedAt: string;
  onlyWhenStale?: boolean;
  className?: string;
}) {
  // Re-render on a timer so "۲ دقیقه پیش" does not sit frozen between polls.
  // The clock reading is *state* rather than a `Date.now()` in the render body:
  // reading it during render is impure, and it also let the label and the
  // staleness test disagree, since `formatRelativeTime` would take its own
  // reading a moment later.
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const stale = now - new Date(updatedAt).getTime() > STALE_AFTER_MS;

  if (onlyWhenStale && !stale) return null;

  if (!stale) {
    return (
      <Text className={cn('text-muted-foreground text-[11px]', className)}>
        {formatRelativeTime(updatedAt, now)}
      </Text>
    );
  }

  return (
    <View className={cn('flex-row items-center gap-1', className)}>
      <Icon as={TriangleAlert} size={10} className="text-chart5" />
      <Text className="text-chart5 text-[11px] font-medium">
        {formatRelativeTime(updatedAt, now)}
      </Text>
    </View>
  );
}
