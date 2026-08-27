const { hairlineWidth } = require('nativewind/theme');
const plugin = require('tailwindcss/plugin');

/**
 * React Native cannot synthesise weights from one family the way a browser can,
 * and it cannot pick a weight off a variable font's `wght` axis either — so
 * Estedad is registered as one static face per weight and every weight utility
 * names its own family. Naming a family per weight is also what sidesteps
 * nativewind#1846 (bold text clipping after a space on Android).
 *
 * These utilities set **only** `font-family`, never `font-weight`. The family
 * name already carries the weight on all three platforms, and pairing it with a
 * `font-weight` is actively wrong on two of them:
 *
 * - **Android.** `expo-font` loads a face at runtime through
 *   `ReactFontManager.setTypeface(family, Typeface.NORMAL, …)` — the NORMAL
 *   slot only. A request for weight ≥ 700 resolves to `Typeface.BOLD`, misses
 *   that slot, looks for an `assets/fonts/<family>_bold.ttf` that a
 *   runtime-loaded font does not have, and ends at
 *   `Typeface.create('Estedad_700Bold', BOLD)` — a family name Android has
 *   never heard of, which it answers with **Roboto**. So `font-bold` and
 *   `font-extrabold` silently lost Estedad on Android (screen headers, the
 *   portfolio figure) while `font-medium`/`font-semibold` kept it, because
 *   weights below 700 land in the NORMAL slot and get the cached face back.
 * - **Web.** The `@font-face` these register carries the default `400`
 *   descriptor, so asking for 600–800 on top of an already-bold file makes the
 *   browser fake bold over real bold.
 *
 * Only the weights actually registered in `lib/fonts.ts` appear here. A utility
 * naming a face that was never loaded is worse than none at all: it silently
 * drops the whole run of text to a Latin system font. `font-thin`, `font-light`
 * and `font-black` therefore keep Tailwind's plain `font-weight` behaviour until
 * someone ships those TTFs.
 */
const estedadWeights = {
  '.font-normal': 'Estedad_400Regular',
  '.font-medium': 'Estedad_500Medium',
  '.font-semibold': 'Estedad_600SemiBold',
  '.font-bold': 'Estedad_700Bold',
  '.font-extrabold': 'Estedad_800ExtraBold',
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    /**
     * Tailwind's own weight utilities are dropped for the five weights Estedad
     * ships. A plugin utility cannot *unset* a `font-weight` the core utility
     * already emitted — both rules carry the same selector, so the cascade on
     * web and NativeWind's style flattening on native both end up with the pair
     * again, which is the Android-Roboto trap described above. The weights left
     * here have no Estedad face and keep plain `font-weight` behaviour.
     */
    fontWeight: {
      thin: '100',
      extralight: '200',
      light: '300',
      black: '900',
    },
    extend: {
      fontFamily: {
        sans: ['Estedad_400Regular'],
        // Tabular-ish numerals still come from Estedad; there is no separate
        // mono Persian face worth shipping.
        mono: ['Estedad_500Medium'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Semantic market colours. In Iranian finance UIs green is a rise and
        // red a fall, matching the western convention (unlike CJK markets).
        up: 'hsl(var(--up))',
        down: 'hsl(var(--down))',
        chart1: 'hsl(var(--chart-1))',
        chart2: 'hsl(var(--chart-2))',
        chart3: 'hsl(var(--chart-3))',
        chart4: 'hsl(var(--chart-4))',
        chart5: 'hsl(var(--chart-5))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      borderWidth: {
        hairline: hairlineWidth(),
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [
    require('tailwindcss-animate'),
    plugin(({ addUtilities }) => {
      addUtilities(
        Object.fromEntries(
          Object.entries(estedadWeights).map(([selector, family]) => [
            selector,
            { 'font-family': family },
          ])
        )
      );
    }),
  ],
};
