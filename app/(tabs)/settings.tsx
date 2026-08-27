import { API_MODE } from '@/api';
import * as React from 'react';
import { Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  REFRESH_OPTIONS,
  type Settings as SettingsShape,
} from '@/store/settings';
import { useClearHoldings, useHoldings, useSettings, useUpdateSettings } from '@/api/queries';
import { Screen, ScreenHeader } from '@/components/layout/screen';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { CURRENCY_LABEL, toPersianDigits } from '@/lib/format';
import type { Currency } from '@/lib/money';
import { cn } from '@/lib/utils';

const SCHEME_LABEL: Record<SettingsShape['colorScheme'], string> = {
  system: 'سیستم',
  light: 'روشن',
  dark: 'تیره',
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const { data: holdings } = useHoldings();
  const clearHoldings = useClearHoldings();

  if (!settings) return <Screen />;

  function confirmClear() {
    const title = 'پاک کردن پرتفوی';
    const message = 'همه دارایی‌های ثبت‌شده حذف می‌شوند. این کار برگشت‌پذیر نیست.';

    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (typeof window !== 'undefined' && window.confirm(`${title}\n${message}`)) {
        clearHoldings.mutate(undefined);
      }
      return;
    }

    Alert.alert(title, message, [
      { text: 'انصراف', style: 'cancel' },
      { text: 'پاک کن', style: 'destructive', onPress: () => clearHoldings.mutate(undefined) },
    ]);
  }

  return (
    <Screen>
      <ScreenHeader title="تنظیمات" />

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24, gap: 18 }}>
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
              <Text className="text-muted-foreground mt-0.5 text-[11px]">
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
            <Text className="text-muted-foreground text-xs">
              {toPersianDigits(holdings?.length ?? 0)} دارایی روی همین دستگاه ذخیره شده است.
            </Text>
            <Button
              variant="destructive"
              disabled={!holdings?.length || clearHoldings.isPending}
              onPress={confirmClear}>
              <Text>پاک کردن پرتفوی</Text>
            </Button>
          </View>
        </Section>
      </ScrollView>
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
      <Text className="text-muted-foreground px-5 text-xs font-medium">{title}</Text>
      <View className="bg-card border-border mx-5 overflow-hidden rounded-2xl border">
        {children}
      </View>
      {description ? (
        <Text className="text-muted-foreground px-5 text-[11px] leading-5">{description}</Text>
      ) : null}
    </View>
  );
}

function Divider() {
  return <View className="bg-border h-px" />;
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
      <View className="bg-secondary flex-row gap-1 rounded-xl p-1">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onChange(option.value)}
              // Selected uses the accent fill rather than `bg-background`: in
              // dark mode the background is darker than the track, so the
              // active pill read as a hole punched in the control.
              className={cn(
                'flex-1 items-center rounded-lg py-2',
                active && 'bg-primary'
              )}>
              <Text
                className={cn(
                  'text-xs font-medium',
                  active ? 'text-primary-foreground font-semibold' : 'text-muted-foreground'
                )}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
