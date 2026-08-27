import { Tabs } from 'expo-router';
import { ChartCandlestick, Settings2, Wallet } from 'lucide-react-native';
import * as React from 'react';

import { AppTabBar } from '@/components/navigation/app-tab-bar';
import { TabBarScrollProvider } from '@/components/navigation/tab-bar-scroll';

/**
 * Three tabs is the whole app: what you own, what things cost, and preferences.
 * Persian labels are short enough that icons plus text fit comfortably.
 */
export default function TabsLayout() {
  return (
    // The provider sits above `Tabs` because the dock and the scenes that drive
    // it are siblings inside `BottomTabView`, not parent and child.
    <TabBarScrollProvider>
      <Tabs
        tabBar={(props) => <AppTabBar {...props} />}
        screenOptions={{
          headerShown: false,
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
    </TabBarScrollProvider>
  );
}
