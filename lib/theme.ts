import { DarkTheme, DefaultTheme, type Theme } from 'expo-router/react-navigation';

/**
 * JS mirror of the CSS custom properties in `global.css`.
 *
 * Anything that cannot read a className needs these: react-navigation's theme,
 * react-native-svg fills and strokes in the chart components, and the status
 * bar. Keep the two files in sync — they are the same palette expressed twice.
 */
export const THEME = {
  light: {
    background: 'hsl(40 33% 98%)',
    foreground: 'hsl(30 12% 12%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(30 12% 12%)',
    popover: 'hsl(0 0% 100%)',
    popoverForeground: 'hsl(30 12% 12%)',
    primary: 'hsl(41 72% 42%)',
    primaryForeground: 'hsl(40 40% 98%)',
    secondary: 'hsl(40 20% 94%)',
    secondaryForeground: 'hsl(30 12% 18%)',
    muted: 'hsl(40 20% 94%)',
    mutedForeground: 'hsl(30 8% 44%)',
    accent: 'hsl(41 60% 92%)',
    accentForeground: 'hsl(30 12% 18%)',
    destructive: 'hsl(0 72% 48%)',
    border: 'hsl(38 16% 88%)',
    input: 'hsl(38 16% 88%)',
    ring: 'hsl(41 72% 42%)',
    radius: '0.875rem',
    up: 'hsl(152 58% 34%)',
    down: 'hsl(0 72% 48%)',
    chart1: 'hsl(41 72% 48%)',
    chart2: 'hsl(199 62% 42%)',
    chart3: 'hsl(265 45% 55%)',
    chart4: 'hsl(152 48% 40%)',
    chart5: 'hsl(12 68% 55%)',
  },
  dark: {
    background: 'hsl(30 10% 7%)',
    foreground: 'hsl(40 20% 95%)',
    card: 'hsl(30 9% 11%)',
    cardForeground: 'hsl(40 20% 95%)',
    popover: 'hsl(30 9% 11%)',
    popoverForeground: 'hsl(40 20% 95%)',
    primary: 'hsl(41 78% 56%)',
    primaryForeground: 'hsl(30 20% 10%)',
    secondary: 'hsl(30 8% 17%)',
    secondaryForeground: 'hsl(40 20% 95%)',
    muted: 'hsl(30 8% 17%)',
    mutedForeground: 'hsl(38 10% 62%)',
    accent: 'hsl(30 10% 20%)',
    accentForeground: 'hsl(40 20% 95%)',
    destructive: 'hsl(0 68% 58%)',
    border: 'hsl(30 8% 20%)',
    input: 'hsl(30 8% 22%)',
    ring: 'hsl(41 78% 56%)',
    radius: '0.875rem',
    up: 'hsl(152 52% 48%)',
    down: 'hsl(0 68% 60%)',
    chart1: 'hsl(41 78% 58%)',
    chart2: 'hsl(199 66% 56%)',
    chart3: 'hsl(265 55% 68%)',
    chart4: 'hsl(152 46% 52%)',
    chart5: 'hsl(12 72% 64%)',
  },
} as const;

export type ThemeColors = (typeof THEME)['light'];

export const CHART_SERIES_COLORS = ['chart1', 'chart2', 'chart3', 'chart4', 'chart5'] as const;

export const NAV_THEME: Record<'light' | 'dark', Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      background: THEME.light.background,
      border: THEME.light.border,
      card: THEME.light.card,
      notification: THEME.light.destructive,
      primary: THEME.light.primary,
      text: THEME.light.foreground,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      background: THEME.dark.background,
      border: THEME.dark.border,
      card: THEME.dark.card,
      notification: THEME.dark.destructive,
      primary: THEME.dark.primary,
      text: THEME.dark.foreground,
    },
  },
};
