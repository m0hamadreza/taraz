/**
 * Estedad — the app's only typeface.
 *
 * Vendored rather than pulled from a font CDN or `@expo-google-fonts`: Estedad
 * is not on Google Fonts, and a Persian UI cannot degrade gracefully to a
 * system face the way a Latin one can. The TTFs sit in `assets/fonts/` under
 * the SIL OFL (see `assets/fonts/OFL.txt`).
 *
 * Estedad ships a variable font too, but React Native cannot pick a weight off
 * a `wght` axis, so we register one static face per weight — hence the family
 * names below. Only the five weights the design uses are shipped; adding one
 * means dropping its TTF in `assets/fonts/`, listing it here, and giving it a
 * utility in `tailwind.config.js`. The name strings are duplicated in that
 * config because it is CommonJS and evaluated by Tailwind, not by Metro.
 */
export const FONTS = {
  Estedad_400Regular: require('../assets/fonts/Estedad-Regular.ttf'),
  Estedad_500Medium: require('../assets/fonts/Estedad-Medium.ttf'),
  Estedad_600SemiBold: require('../assets/fonts/Estedad-SemiBold.ttf'),
  Estedad_700Bold: require('../assets/fonts/Estedad-Bold.ttf'),
  Estedad_800ExtraBold: require('../assets/fonts/Estedad-ExtraBold.ttf'),
} as const;

/**
 * For the one node NativeWind cannot reach: `<Text>` from `react-native-svg`,
 * which takes `fontFamily` as an SVG *attribute* rather than a style — the
 * chart axis labels. A third-party component can otherwise be taught
 * `className` with `cssInterop` (see `components/ui/icon.tsx` and
 * `components/ui/input.tsx`), and that is the right fix; reaching for a family
 * name in a screen is a sign that something is styling text outside `<Text/>`.
 */
export const FONT_FAMILY = {
  regular: 'Estedad_400Regular',
  medium: 'Estedad_500Medium',
  semibold: 'Estedad_600SemiBold',
  bold: 'Estedad_700Bold',
  extrabold: 'Estedad_800ExtraBold',
} as const;
