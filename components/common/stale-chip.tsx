import * as React from 'react';

import { Text } from '@/components/ui/text';
import { formatRelativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';

const STALE_AFTER_MS = 5 * 60_000;

/**
 * How old the price is.
 *
 * In a market that moves this fast, the age of a quote is part of its meaning —
 * a number with no timestamp invites the user to trust it more than they should.
 * Past five minutes the label turns amber rather than staying quiet.
 */
export function StaleChip({ updatedAt, className }: { updatedAt: string; className?: string }) {
  // Re-render on a timer so "۲ دقیقه پیش" does not sit frozen between polls.
  const [, force] = React.useReducer((n: number) => n + 1, 0);
  React.useEffect(() => {
    const id = setInterval(force, 30_000);
    return () => clearInterval(id);
  }, []);

  const age = Date.now() - new Date(updatedAt).getTime();
  const stale = age > STALE_AFTER_MS;

  return (
    <Text
      className={cn(
        'text-[11px]',
        stale ? 'text-chart5 font-medium' : 'text-muted-foreground',
        className
      )}>
      {formatRelativeTime(updatedAt)}
    </Text>
  );
}
