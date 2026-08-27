import { DarkTheme, DefaultTheme, type Theme } from 'expo-router/react-navigation';

import type { AssetKind } from '@/api/contracts';

/**
 * JS mirror of the CSS custom properties in `global.css`.
 *
 * Anything that cannot read a className needs these: react-navigation's theme,
 * react-native-svg fills and strokes in the chart components, and the status
 * bar. Keep the two files in sync — they are the same palette expressed twice.
 *
 * The palette is authored in OKLCH (a tweakcn/shadcn theme) and converted to
 * `H S% L%` triplets here and in `global.css`: React Native's colour parser
 * has no `oklch()`, and NativeWind hands these strings straight to it. The
 * conversion is gamut-mapped by chroma reduction, so hue and lightness hold.
 */
export const THEME = {
  light: {
    background: 'hsl(75 40.2% 98%)',
    foreground: 'hsl(222.2 47.3% 11.2%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(222.2 47.3% 11.2%)',
    popover: 'hsl(0 0% 100%)',
    popoverForeground: 'hsl(222.2 47.3% 11.2%)',
    primary: 'hsl(82.5 88.3% 59.8%)',
    primaryForeground: 'hsl(0 0% 0%)',
    secondary: 'hsl(215.3 25% 26.7%)',
    secondaryForeground: 'hsl(210 40% 98%)',
    muted: 'hsl(210 40.3% 96.1%)',
    mutedForeground: 'hsl(215.4 16.3% 46.9%)',
    accent: 'hsl(138.5 76.5% 96.7%)',
    accentForeground: 'hsl(142.8 64.2% 24.1%)',
    destructive: 'hsl(0 84.2% 60.2%)',
    border: 'hsl(214.3 31.8% 91.4%)',
    input: 'hsl(214.3 31.8% 91.4%)',
    ring: 'hsl(82.5 88.3% 59.8%)',
    radius: '1rem',
    up: 'hsl(142.8 64.2% 24.1%)',
    down: 'hsl(0 84.2% 60.2%)',
    chart1: 'hsl(82.5 88.3% 59.8%)',
    chart2: 'hsl(215.3 25% 26.7%)',
    chart3: 'hsl(142.1 70.6% 45.3%)',
    chart4: 'hsl(215.4 16.3% 46.9%)',
    chart5: 'hsl(215 20.2% 65.1%)',
  },
  dark: {
    background: 'hsl(228.6 84% 4.9%)',
    foreground: 'hsl(210 40% 98%)',
    card: 'hsl(222.2 47.3% 11.2%)',
    cardForeground: 'hsl(210 40% 98%)',
    popover: 'hsl(222.2 47.3% 11.2%)',
    popoverForeground: 'hsl(210 40% 98%)',
    primary: 'hsl(82.5 88.3% 59.8%)',
    primaryForeground: 'hsl(0 0% 0%)',
    secondary: 'hsl(217.2 32.5% 17.4%)',
    secondaryForeground: 'hsl(210 40% 98%)',
    muted: 'hsl(217.2 32.5% 17.4%)',
    mutedForeground: 'hsl(215 20.2% 65.1%)',
    accent: 'hsl(143.8 61.1% 20.2%)',
    accentForeground: 'hsl(82.5 88.3% 59.8%)',
    destructive: 'hsl(0 70% 35.3%)',
    border: 'hsl(217.2 32.5% 17.4%)',
    input: 'hsl(217.2 32.5% 17.4%)',
    ring: 'hsl(82.5 88.3% 59.8%)',
    radius: '1rem',
    up: 'hsl(142.1 70.6% 45.3%)',
    down: 'hsl(0 84.2% 60.2%)',
    chart1: 'hsl(82.5 88.3% 59.8%)',
    chart2: 'hsl(217.2 91.2% 59.8%)',
    chart3: 'hsl(142.1 70.6% 45.3%)',
    chart4: 'hsl(270.7 91% 65.1%)',
    chart5: 'hsl(37.7 92.1% 50.2%)',
  },
} as const;

export type ThemeColors = (typeof THEME)['light'];

export const CHART_SERIES_COLORS = ['chart1', 'chart2', 'chart3', 'chart4', 'chart5'] as const;

export type ChartColorKey = (typeof CHART_SERIES_COLORS)[number];

/**
 * Which chart slot each asset kind gets.
 *
 * The donut legend in `portfolio-header.tsx` and the avatar on `holding-row.tsx`
 * are the same colour coding seen twice, so a row can be traced back to its
 * slice. Stated here exactly once so the two cannot drift.
 */
export const ASSET_KIND_COLOR_KEY = {
  gold: 'chart1',
  coin: 'chart5',
  crypto: 'chart2',
  fiat: 'chart4',
} as const satisfies Record<AssetKind, ChartColorKey>;

/**
 * The same five slots as classNames, for the nodes that *can* read one.
 *
 * Spelled out rather than built up: Tailwind only ever sees literal strings, so
 * a `bg-chart${n}` would never be generated. Keyed by slot rather than by kind
 * so `ASSET_KIND_COLOR_KEY` above stays the single place the mapping lives.
 */
export const CHART_CLASS: Record<ChartColorKey, { bg: string; tint: string; text: string }> = {
  chart1: { bg: 'bg-chart1', tint: 'bg-chart1/10', text: 'text-chart1' },
  chart2: { bg: 'bg-chart2', tint: 'bg-chart2/10', text: 'text-chart2' },
  chart3: { bg: 'bg-chart3', tint: 'bg-chart3/10', text: 'text-chart3' },
  chart4: { bg: 'bg-chart4', tint: 'bg-chart4/10', text: 'text-chart4' },
  chart5: { bg: 'bg-chart5', tint: 'bg-chart5/10', text: 'text-chart5' },
};

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
