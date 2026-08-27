import {
  BottomSheetBackdrop,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import * as React from 'react';
import {
  Platform,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { MOBILE_FRAME_WIDTH } from '@/components/layout/mobile-frame';
import { Text } from '@/components/ui/text';
import { THEME } from '@/lib/theme';

/**
 * Keeps a sheet — and its scrim — inside the phone column on web.
 *
 * A modal sheet is portalled to the root, outside `<MobileFrame/>`, so on a
 * desktop viewport it would otherwise stretch across the whole browser window
 * while the app it belongs to sits in a 430pt column.
 *
 * The library's hosting container is `position: absolute` with all four insets
 * pinned to 0 and our style merged *underneath* those, so left/right cannot be
 * set from here. A max width plus auto margins survives the merge: an
 * over-constrained absolute box resolves the extra space into the auto margins,
 * which centres it exactly as `mx-auto` centres the frame.
 *
 * `undefined` on native, where the viewport is already the frame.
 */
export const SHEET_CONTAINER_STYLE: ViewStyle | undefined =
  Platform.OS === 'web'
    ? StyleSheet.create({
        container: {
          maxWidth: MOBILE_FRAME_WIDTH,
          marginStart: 'auto',
          marginEnd: 'auto',
        },
      }).container
    : undefined;

/**
 * The sheet's own text input on native, a plain one on web.
 *
 * `BottomSheetTextInput` exists to keep the sheet's keyboard state in sync,
 * which on web is both pointless — RN's `Keyboard` events never fire in a
 * browser — and fatal: its blur handler reads
 * `TextInput.State.currentlyFocusedInput()`, which react-native-web does not
 * implement (it kept the older `currentlyFocusedField`), so leaving a field
 * throws `currentlyFocusedInput is not a function`.
 */
export const SheetTextInput: React.ComponentType<TextInputProps> =
  Platform.OS === 'web' ? TextInput : BottomSheetTextInput;

/** Tap-to-dismiss scrim, faded in with the sheet. */
export function SheetBackdrop(props: BottomSheetBackdropProps) {
  return (
    <BottomSheetBackdrop
      {...props}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      opacity={0.45}
      pressBehavior="close"
    />
  );
}

export function sheetTheme(scheme: 'light' | 'dark') {
  const theme = THEME[scheme];
  return {
    backgroundStyle: { backgroundColor: theme.card },
    handleIndicatorStyle: { backgroundColor: theme.mutedForeground, width: 40 },
  };
}

export function SheetHeader({
  title,
  description,
  leading,
}: {
  title: string;
  description?: string;
  leading?: React.ReactNode;
}) {
  return (
    <View className="border-border flex-row items-center gap-3 border-b px-5 pb-3">
      {leading}
      <View className="flex-1">
        <Text className="text-lg font-semibold">{title}</Text>
        {description ? (
          <Text className="text-muted-foreground mt-0.5 text-xs">{description}</Text>
        ) : null}
      </View>
    </View>
  );
}
