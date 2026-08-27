import '@/global.css';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { PortalHost } from '@rn-primitives/portal';
import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { ThemeProvider } from 'expo-router/react-navigation';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { configureMockApi } from '@/api/mock/client';
import { useSettings } from '@/api/queries';
import { MobileFrame } from '@/components/layout/mobile-frame';
import { AddHoldingSheetProvider } from '@/components/sheets/add-holding-sheet';
import { EditHoldingSheetProvider } from '@/components/sheets/edit-holding-sheet';
import { HoldingActionsSheetProvider } from '@/components/sheets/holding-actions-sheet';
import { FONTS } from '@/lib/fonts';
import { createQueryClient } from '@/lib/query-client';
import { useColorSchemePreference } from '@/lib/use-color-scheme-preference';
import { NAV_THEME } from '@/lib/theme';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden, or unsupported on this platform. Not worth failing over.
});

const queryClient = createQueryClient();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONTS);

  React.useEffect(() => {
    // Render even if a face fails to register; a fallback beats a blank app.
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <BottomSheetModalProvider>
            <AppShell />
          </BottomSheetModalProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Everything below the providers, so it can read settings from React Query.
 */
function AppShell() {
  const { colorScheme } = useColorScheme();
  const { data: settings } = useSettings();

  useAppStateFocus();
  useColorSchemePreference(settings?.colorScheme);

  // Dev affordance from the settings screen: make the mock transport fail.
  React.useEffect(() => {
    if (!settings) return;
    configureMockApi({ errorRate: settings.mockErrorRate });
  }, [settings?.mockErrorRate]);

  const scheme = colorScheme ?? 'light';

  return (
    <ThemeProvider value={NAV_THEME[scheme]}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <AddHoldingSheetProvider>
        {/* The actions sheet hands off to the edit sheet, so it has to sit
            inside that provider to reach `useEditHoldingSheet()`. */}
        <EditHoldingSheetProvider>
          <HoldingActionsSheetProvider>
            <MobileFrame>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                {/* Leave the transition to the default: with native RTL forced,
                    react-navigation already mirrors the push animation, and
                    naming a direction here would flip it back. */}
                <Stack.Screen name="asset/[assetId]" />
              </Stack>
            </MobileFrame>
          </HoldingActionsSheetProvider>
        </EditHoldingSheetProvider>
      </AddHoldingSheetProvider>
      <PortalHost />
    </ThemeProvider>
  );
}

/**
 * React Query's window-focus refetching is a browser concept. On native the
 * equivalent signal is AppState, so polling resumes when the user comes back
 * instead of showing a price from twenty minutes ago.
 */
function useAppStateFocus() {
  React.useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
      focusManager.setFocused(status === 'active');
    });

    return () => subscription.remove();
  }, []);
}
