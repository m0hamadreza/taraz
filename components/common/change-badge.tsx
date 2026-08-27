import { TrendingDown, TrendingUp } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Signed 24h move. Green up / red down, matching Iranian market convention.
 * A flat reading gets muted styling rather than an arbitrary direction.
 */
export function ChangeBadge({
  percent,
  size = 'default',
  className,
}: {
  percent: number;
  size?: 'default' | 'sm';
  className?: string;
}) {
  const flat = Math.abs(percent) < 0.005;
  const up = percent > 0;

  return (
    <View
      className={cn(
        'flex-row items-center gap-1 rounded-full',
        size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-1',
        flat ? 'bg-muted' : up ? 'bg-up/10' : 'bg-down/10',
        className
      )}>
      {!flat ? (
        <Icon
          as={up ? TrendingUp : TrendingDown}
          size={size === 'sm' ? 11 : 13}
          className={up ? 'text-up' : 'text-down'}
        />
      ) : null}
      <Text
        className={cn(
          'font-medium',
          size === 'sm' ? 'text-[11px]' : 'text-xs',
          flat ? 'text-muted-foreground' : up ? 'text-up' : 'text-down'
        )}>
        {formatPercent(percent)}
      </Text>
    </View>
  );
}
