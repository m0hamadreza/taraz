import { API_MODE } from '@/api';
import * as React from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { REFRESH_OPTIONS, type Settings as SettingsShape } from '@/store/settings';
import { useClearHoldings, useHoldings, useSettings, useUpdateSettings } from '@/api/queries';
import { Screen, ScreenHeader } from '@/components/layout/screen';
import { useTabBarSpace } from '@/components/navigation/app-tab-bar';
import { useTabBarScrollProps } from '@/components/navigation/tab-bar-scroll';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Text } from '@/components/ui/text';
import { CURRENCY_LABEL, toPersianDigits } from '@/lib/format';
import type { Currency } from '@/lib/money';

const SCHEME_LABEL: Record<SettingsShape['colorScheme'], string> = {
  system: 'سیستم',
  light: 'روشن',
  dark: 'تیره',
};

export default function SettingsScreen() {
  const tabBarSpace = useTabBarSpace();
  const tabBarScroll = useTabBarScrollProps();
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const { data: holdings } = useHoldings();
  const clearHoldings = useClearHoldings();
  const [confirmingClear, setConfirmingClear] = React.useState(false);

  if (!settings) return <Screen />;

  function clear() {
    clearHoldings.mutate(undefined);
    setConfirmingClear(false);
  }

  return (
    <Screen>
      <ScreenHeader title="تنظیمات" />

      <Animated.ScrollView
        {...tabBarScroll}
        contentContainerStyle={{ paddingBottom: tabBarSpace + 24, gap: 18 }}>
        <Section title="نمایش">
          <SegmentedRow
            label="واحد پول"
            // Rial is what the backend serves and what everything is stored in;
            // Toman is the default because it is what people actually think in.
            options={(['toman', 'rial'] as Currency[]).map((value) => ({
              value,
              label: CURRENCY_LABEL[value],
            }))}
            value={settings.currency}
            onChange={(currency) => updateSettings.mutate({ currency })}
          />
          <Divider />
          <SegmentedRow
            label="پوسته"
            options={(['system', 'light', 'dark'] as SettingsShape['colorScheme'][]).map(
              (value) => ({ value, label: SCHEME_LABEL[value] })
            )}
            value={settings.colorScheme}
            onChange={(colorScheme) => updateSettings.mutate({ colorScheme })}
          />
        </Section>

        <Section title="به‌روزرسانی قیمت‌ها">
          <SegmentedRow
            label="فاصله هر بار"
            options={REFRESH_OPTIONS.map((option) => ({
              value: option.ms,
              label: option.label,
            }))}
            value={settings.refreshIntervalMs}
            onChange={(refreshIntervalMs) => updateSettings.mutate({ refreshIntervalMs })}
          />
        </Section>

        <Section
          title="توسعه"
          description={
            API_MODE === 'mock'
              ? 'داده‌ها از شبیه‌ساز محلی می‌آید. برای اتصال به بک‌اند واقعی EXPO_PUBLIC_API_MODE=http را تنظیم کنید.'
              : 'برنامه به بک‌اند واقعی متصل است.'
          }>
          <View className="flex-row items-center justify-between gap-3 px-4 py-3">
            <View className="flex-1">
              <Text className="text-sm">شبیه‌سازی قطعی شبکه</Text>
              <Text className="mt-0.5 text-[11px] text-muted-foreground">
                همه درخواست‌ها عمداً شکست می‌خورند تا حالت خطا و تلاش دوباره دیده شود.
              </Text>
            </View>
            {/* A partial failure rate would be invisible: React Query retries
                twice, so even one-in-three failures almost always recovers
                before any error state renders. A full outage is the only
                setting that actually exercises the path. */}
            <Switch
              checked={settings.mockErrorRate > 0}
              onCheckedChange={(checked) =>
                updateSettings.mutate({ mockErrorRate: checked ? 1 : 0 })
              }
              disabled={API_MODE !== 'mock'}
            />
          </View>
        </Section>

        <Section title="داده‌ها">
          <View className="gap-3 px-4 py-3">
            <Text className="text-xs text-muted-foreground">
              {toPersianDigits(holdings?.length ?? 0)} دارایی روی همین دستگاه ذخیره شده است.
            </Text>
            <Button
              variant="destructive"
              disabled={!holdings?.length || clearHoldings.isPending}
              onPress={() => setConfirmingClear(true)}>
              <Text>پاک کردن پرتفوی</Text>
            </Button>
          </View>
        </Section>
      </Animated.ScrollView>

      <ConfirmDialog
        open={confirmingClear}
        onOpenChange={setConfirmingClear}
        destructive
        title="پاک کردن پرتفوی"
        description="همه دارایی‌های ثبت‌شده حذف می‌شوند. این کار برگشت‌پذیر نیست."
        confirmLabel="پاک کن"
        pending={clearHoldings.isPending}
        onConfirm={clear}
      />
    </Screen>
  );
}

function Section({
  title,
  description,
  children,
}: React.PropsWithChildren<{ title: string; description?: string }>) {
  return (
    <View className="gap-2">
      <Text className="px-5 text-xs text-muted-foreground font-medium">{title}</Text>
      <View className="mx-5 overflow-hidden rounded-2xl border border-border bg-card">
        {children}
      </View>
      {description ? (
        <Text className="px-5 text-[11px] leading-5 text-muted-foreground">{description}</Text>
      ) : null}
    </View>
  );
}

function Divider() {
  return <View className="h-px bg-border" />;
}

function SegmentedRow<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View className="gap-2.5 px-4 py-3">
      <Text className="text-sm">{label}</Text>
      {/* `@rn-primitives/tabs` keys every value as a string and one option set
          here is numeric (the refresh interval in ms), so the value goes out
          through `String()` and comes back by looking the option up again —
          `onChange` still hands the call site its own `T`. */}
      <Tabs
        value={String(value)}
        onValueChange={(next) => {
          const option = options.find((candidate) => String(candidate.value) === next);
          if (option) onChange(option.value);
        }}>
        <TabsList className="w-full">
          {options.map((option) => (
            <TabsTrigger
              key={String(option.value)}
              value={String(option.value)}
              className="flex-1">
              <Text>{option.label}</Text>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </View>
  );
}
