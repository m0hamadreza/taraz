import { Tabs } from 'expo-router';
import { ChartCandlestick, Settings2, Wallet } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Platform } from 'react-native';

import { FONT_FAMILY } from '@/lib/fonts';
import { THEME } from '@/lib/theme';

/**
 * Three tabs is the whole app: what you own, what things cost, and preferences.
 * Persian labels are short enough that icons plus text fit comfortably.
 */
export default function TabsLayout() {
  const { colorScheme } = useColorScheme();
  const theme = THEME[colorScheme ?? 'light'];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.mutedForeground,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          // The default 49pt bar is cramped once a Persian label sits under the
          // icon; web has no home indicator to allow for.
          height: Platform.select({ ios: 84, android: 64, default: 60 }),
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: FONT_FAMILY.medium,
          fontSize: 11,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'پرتفوی',
          tabBarIcon: ({ color, size }) => <Wallet color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="markets"
        options={{
          title: 'بازار',
          tabBarIcon: ({ color, size }) => <ChartCandlestick color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'تنظیمات',
          tabBarIcon: ({ color, size }) => <Settings2 color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
