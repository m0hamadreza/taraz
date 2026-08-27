import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { cva, type VariantProps } from 'class-variance-authority';
import { Search, X } from 'lucide-react-native';
import { cssInterop } from 'nativewind';
import * as React from 'react';
import { Platform, Pressable, TextInput, View, type TextInputProps } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

/**
 * Teaches gorhom's input to take a `className`, so the field below can be one
 * component in and out of a sheet.
 *
 * The mapping mirrors NativeWind's own registration for React Native's
 * `TextInput` (`react-native-css-interop/runtime/components`): `textAlign` has
 * to be lifted out of the resolved style and passed as a *prop*, because a
 * `<TextInput>` reads it from there. Same reasoning as `Icon` — a third-party
 * component is invisible to NativeWind until it is registered.
 */
cssInterop(BottomSheetTextInput, {
  className: { target: 'style', nativeStyleToProp: { textAlign: true } },
});

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
const SheetField: React.ComponentType<TextInputProps> =
  Platform.OS === 'web' ? TextInput : BottomSheetTextInput;

/**
 * The field draws no chrome of its own — no border, no fill, no height. Every
 * input in the app sits inside a container that carries those (see
 * `SearchInput` below, and the bordered row in `quantity-step.tsx`), which is
 * also why `global.css` has to kill the UA focus ring: it would land on the
 * bare inner <input> and read as a stray rectangle beside the real border.
 *
 * Two things the variants own that a call site must not restate:
 *
 * - **The weight is a family, never a `fontWeight`.** `font-normal` and
 *   `font-semibold` are bound to their own Estedad face in
 *   `tailwind.config.js`; asserting a numeric weight beside one loses the
 *   typeface on Android (see Typography in CLAUDE.md).
 * - **`text-right` is `native:` only.** React Native treats `textAlign` on a
 *   `<TextInput>` as a *physical* value on every platform
 *   (facebook/react-native#45255), unlike on a `<Text>`, so RTL alignment has
 *   to be stated. Web does not inherit it either: react-native-web stamps
 *   `dir="auto"` on the <input>, which resolves from the *value* — a
 *   placeholder is not a value — so an empty field falls back to `ltr`.
 *   `global.css` pins `direction: rtl` on every input, which is the web half of
 *   this fix; a `text-right` there would fight it on the day a field holds a
 *   Latin value.
 */
const inputVariants = cva(
  'native:text-right flex-1 text-foreground placeholder:text-muted-foreground',
  {
    variants: {
      size: {
        /** Search fields and other secondary inputs. */
        sm: 'py-2.5 text-sm font-normal',
        /** The default body-sized field. */
        md: 'py-3 text-base font-normal',
        /** A figure the user is asked to type — the quantity step. */
        lg: 'py-3.5 text-[22px] font-semibold',
      },
    },
    defaultVariants: { size: 'md' },
  }
);

type InputProps = TextInputProps &
  React.RefAttributes<TextInput> &
  VariantProps<typeof inputVariants> & {
    /**
     * Render the sheet-aware field. Required for any input inside a
     * `BottomSheetModal`; harmless nowhere else, but pointless.
     */
    inSheet?: boolean;
  };

function Input({ className, size, inSheet = false, ...props }: InputProps) {
  const Field = inSheet ? SheetField : TextInput;
  return <Field className={cn(inputVariants({ size }), className)} {...props} />;
}

/**
 * Focus state, lifted out of the field and onto the container that draws the
 * border.
 *
 * `focus:` cannot do this. NativeWind resolves a variant against the node that
 * carries the class, and here that is the *parent* — the field itself draws no
 * chrome (see `inputVariants` above), so the state has to travel up. On web the
 * UA focus ring that would otherwise stand in for it is killed in `global.css`,
 * again because it lands on the bare inner <input> instead of the visible edge.
 *
 * Returns the flag plus the two handlers to spread back onto the `<Input/>`;
 * the caller's own `onFocus`/`onBlur` still run.
 */
function useInputFocus({ onFocus, onBlur }: Pick<TextInputProps, 'onFocus' | 'onBlur'> = {}) {
  const [focused, setFocused] = React.useState(false);
  return {
    focused,
    onFocus: React.useCallback<NonNullable<TextInputProps['onFocus']>>(
      (event) => {
        setFocused(true);
        onFocus?.(event);
      },
      [onFocus]
    ),
    onBlur: React.useCallback<NonNullable<TextInputProps['onBlur']>>(
      (event) => {
        setFocused(false);
        onBlur?.(event);
      },
      [onBlur]
    ),
  };
}

/**
 * A search field: the muted pill, the leading magnifier, and a clear button
 * that appears once there is something to clear.
 *
 * The market screen and the add-holding sheet ask the same question of the same
 * catalogue, so they ask it with the same control. `className` styles the pill,
 * not the field inside it.
 */
function SearchInput({
  className,
  onClear,
  ...props
}: InputProps & {
  /** Shown as a `✕` while `value` is non-empty. */
  onClear?: () => void;
}) {
  const { focused, ...focusProps } = useInputFocus(props);
  return (
    /*
     * The pill carries a transparent border at rest so focus only ever changes
     * its *colour*: growing one in would move the field and everything under it
     * by a point on every focus.
     */
    <View
      className={cn(
        'flex-row items-center gap-2 rounded-xl border border-transparent bg-muted px-3',
        focused && 'border-ring',
        className
      )}>
      <Icon as={Search} size={16} className="text-muted-foreground" />
      <Input size="sm" {...props} {...focusProps} />
      {onClear && props.value ? (
        <Pressable accessibilityLabel="پاک کردن" hitSlop={8} onPress={onClear}>
          <Icon as={X} size={15} className="text-muted-foreground" />
        </Pressable>
      ) : null}
    </View>
  );
}

export { Input, SearchInput, useInputFocus };
