/**
 * The app is Persian-only, so direction is a constant rather than a runtime
 * lookup.
 *
 * Do NOT reach for `I18nManager.isRTL` instead: react-native-web ships a stub
 * where `forceRTL()` is a no-op and `getConstants()` always reports
 * `isRTL: false`, so any web code branching on it silently takes the LTR path.
 * On native, `expo-localization`'s `forcesRTL: true` plugin option flips the
 * layout for us at the native level (which is also why native RTL needs a
 * development build and does not work in Expo Go).
 */
export const IS_RTL = true;

/** Direction-aware sign for horizontal offsets in raw (non-flex) drawing code. */
export const H_SIGN = IS_RTL ? -1 : 1;
