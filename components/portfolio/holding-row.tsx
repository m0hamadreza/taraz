import { ArrowLeftRight, Ellipsis } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

import { AssetKindAvatar } from '@/components/common/asset-kind-avatar';
import { ChangeBadge } from '@/components/common/change-badge';
import { Money } from '@/components/common/money';
import { StaleChip } from '@/components/common/stale-chip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { RelocationAdvice } from '@/domain/ranking';
import { unitLabel } from '@/domain/units';
import type { ValuedHolding } from '@/domain/valuation';
import { formatPercent, formatQuantity } from '@/lib/format';
import type { Currency } from '@/lib/money';
import { ASSET_KIND_COLOR_KEY, CHART_CLASS } from '@/lib/theme';
import { cn } from '@/lib/utils';

/**
 * One position, in three tiers: what you hold and what it is worth, how much of
 * the portfolio it is, where it lives and what is left after fees — plus, when
 * the asset can actually be moved, whether somewhere else would pay more.
 *
 * The only control is a `⋯`. Edit and delete used to be a permanent
 * pencil-and-red-trash pair on every card, which put a destructive action one
 * stray tap from the row's own target and gave a list of eight holdings eight
 * red buttons to compete with the numbers. Both now live in
 * `<HoldingActionsSheet/>`, which also owns the confirmation — so this component
 * no longer needs the web/native `Alert` fork it used to carry.
 */
export function HoldingRow({
  item,
  currency,
  advice,
  sharePct,
  onPress,
  onMenu,
}: {
  item: ValuedHolding;
  currency: Currency;
  advice: RelocationAdvice | null;
  /** This holding's share of the portfolio's gross value, 0–100. */
  sharePct: number;
  onPress: () => void;
  onMenu: () => void;
}) {
  const share = Math.min(100, Math.max(0, sharePct));
  const kindColors = CHART_CLASS[ASSET_KIND_COLOR_KEY[item.asset.kind]];

  return (
    // `relative` is load-bearing on web: without it the absolutely positioned
    // control below resolves against the list's container, not the card.
    <View className="relative mx-5 rounded-2xl border border-border bg-card p-4">
      {/* The card body and the row's control are siblings rather than nested.
          react-native-web renders accessibilityRole="button" as a real <button>,
          and a <button> inside a <button> is invalid HTML — the browser
          reparents it and the inner tap bubbles out to the outer handler.
          Absolutely positioned rather than a flex sibling so the lower tiers
          still span the card's full width. */}
      <Pressable accessibilityRole="button" onPress={onPress} className="gap-2.5 active:opacity-70">
        {/* Tier 1 — what it is, what it is worth. `pe-8` reserves the control's
            footprint so a long asset name cannot run under it. */}
        <View className="flex-row items-center gap-3 pe-8">
          <AssetKindAvatar kind={item.asset.kind} assetId={item.asset.id} />

          <View className="h-full flex-1">
            {/* `text-sm`, not the base size: the name shares one line with a
                ten-digit Rial figure, and at 16pt "طلای ۱۸ عیار" ellipsised on a
                narrow phone. The figure below is a step down for the same
                reason — an asset that cannot be named is not identifiable. */}
            <Text className="text-sm font-semibold" numberOfLines={1}>
              {item.asset.nameFa}
            </Text>
            <Text className="mt-0.5 text-[11px] text-muted-foreground">
              {formatQuantity(item.holding.quantity, item.asset.decimals)} {unitLabel(item.asset)}
            </Text>
          </View>

          {/* `items-end`, not `items-start`: under RTL the start edge is the
              right one, which would park the badge against the asset name
              instead of hugging the card's far edge. */}
          <View className="shrink-0 items-end">
            <Money rial={item.grossIrr} currency={currency} size="sm" className="font-semibold" />
            <ChangeBadge percent={item.changePct} size="sm" className="mt-1" />
          </View>
        </View>

        {/* The share rule, in place of the divider this row used to draw with a
            `border-t`. `flex-row` mirrors on its own in both native RTL and
            `dir="rtl"`, so the fill grows from the start edge — the right.
            Deliberately not `<Progress/>`: its web indicator moves the fill with
            `transform: translateX(-N%)`, which CSS treats as physical, and its
            native indicator runs a reanimated spring that would re-animate on
            every quote poll. */}
        <View className="flex-row items-center gap-2">
          <View className="h-1 flex-1 flex-row overflow-hidden rounded-full bg-muted">
            <View
              className={cn('h-full rounded-full', kindColors.bg)}
              style={{ width: `${share}%` }}
            />
          </View>
          <Text className="text-[10px] text-muted-foreground font-medium">
            {formatPercent(share, { signed: false })}
          </Text>
        </View>

        {/* Tier 2 — where it lives, and what would actually reach the user's
            account. The venue is the premise of the app, so it gets a chip
            rather than trailing a muted line after a middot. */}
        <View className="flex-row items-center gap-2">
          <Badge variant="secondary" className="shrink">
            <Text className="text-[11px]" numberOfLines={1}>
              {item.venue.nameFa}
            </Text>
          </Badge>

          {/* Only when this row is behind: the screen header already prints the
              portfolio's oldest quote age once. */}
          <StaleChip updatedAt={item.quote.updatedAt} onlyWhenStale />

          <Text className="flex-1 text-[11px] text-muted-foreground" numberOfLines={1}>
            پس از کارمزد <Money rial={item.netIrr} currency={currency} size="xxs" inline />
          </Text>
        </View>

        {/* Tier 3 — only for an asset that can actually leave its venue. */}
        {advice ? (
          <View className="flex-row items-center gap-2 rounded-xl bg-up/10 px-3 py-2">
            <Icon as={ArrowLeftRight} size={13} className="text-up" />
            <Text className="flex-1 text-[11px] leading-5 text-up">
              فروش در {advice.to.venue.nameFa} حدود{' '}
              <Money
                rial={advice.gainIrr}
                currency={currency}
                size="xxs"
                inline
                compact
                unitClassName="text-up"
              />{' '}
              ({formatPercent(advice.gainPct)}) بیشتر عاید می‌کند.
            </Text>
          </View>
        ) : null}
      </Pressable>

      {/* 40pt intrinsically, not 32pt plus `hitSlop`: react-native-web ignores
          `hitSlop` entirely, so on web the hit target is exactly the box. The
          `sm:` pair is respecified because it is a separate tailwind-merge group
          — overriding only `h-10 w-10` would let `size="icon"`'s 36pt default
          win at the `sm` breakpoint, which does fire on a desktop browser even
          though `MobileFrame` caps the column at 430pt. */}
      <Button
        variant="ghost"
        size="icon"
        accessibilityLabel={`گزینه‌های ${item.asset.nameFa} در ${item.venue.nameFa}`}
        hitSlop={8}
        onPress={onMenu}
        className="absolute end-2 top-2 h-10 w-10 rounded-full sm:h-10 sm:w-10">
        <Icon as={Ellipsis} size={18} className="text-muted-foreground" />
      </Button>
    </View>
  );
}
