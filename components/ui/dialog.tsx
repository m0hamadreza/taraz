import { Portal } from '@rn-primitives/portal';
import { TriangleAlert } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import * as React from 'react';
import { BackHandler, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';

import { MOBILE_FRAME_WIDTH } from '@/components/layout/mobile-frame';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

/**
 * A centred modal dialog — the app's replacement for `Alert.alert`.
 *
 * RN's `Alert` is not an option here: it renders **no buttons on web**, so
 * anything built on it needs a `window.confirm` fork and is then a different
 * interaction on every platform — a native sheet on iOS, a browser chrome
 * dialog on web, neither of them in Persian, in the app's typeface, or RTL.
 * This is one component that looks the same on all three.
 *
 * It is portalled to `<PortalHost/>` in the root layout so it escapes the
 * screen's own stacking context — including the floating tab bar, which is
 * absolutely positioned over the scene and would otherwise sit on top of the
 * scrim.
 */

/**
 * Keeps the dialog and its scrim inside the phone column on web.
 *
 * Same reasoning as `SHEET_CONTAINER_STYLE`: the portal host is a sibling of
 * `<MobileFrame/>`, so on a desktop viewport the overlay would stretch across
 * the whole browser window while the app sits in a 430pt column. A max width
 * plus auto margins centres it over the frame. `undefined` on native, where
 * the viewport *is* the frame.
 */
const OVERLAY_STYLE: ViewStyle | undefined =
  Platform.OS === 'web'
    ? StyleSheet.create({
        overlay: {
          maxWidth: MOBILE_FRAME_WIDTH,
          marginStart: 'auto',
          marginEnd: 'auto',
        },
      }).overlay
    : undefined;

/**
 * The card's own box, on the animating wrapper rather than in a class: the zoom
 * scales the wrapper, so it has to be the width of the card or the animation
 * grows out of the full-width overlay instead of out of the dialog.
 */
const CARD_STYLE = StyleSheet.create({
  card: { width: '100%', maxWidth: 360 },
}).card;

type DialogProps = React.PropsWithChildren<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Set false for a decision the user must actually make. */
  dismissable?: boolean;
}>;

function Dialog({ open, onOpenChange, dismissable = true, children }: DialogProps) {
  // Unique per instance: portals are keyed by name in a shared store, so two
  // dialogs mounted under the same name would overwrite one another.
  const name = React.useId();
  const close = React.useCallback(() => onOpenChange(false), [onOpenChange]);

  useDismissAffordances(open && dismissable, close);

  if (!open) return null;

  return (
    <Portal name={`dialog-${name}`}>
      <View
        style={[StyleSheet.absoluteFill, OVERLAY_STYLE]}
        className="items-center justify-center px-6"
        // Hides everything behind it from VoiceOver/TalkBack; without it the
        // screen underneath stays swipeable by the screen reader.
        accessibilityViewIsModal>
        {/* The scrim's fill and the card's surface live on the *inner* nodes:
            NativeWind only registers `className` interop for core React Native
            components, and `Animated.View` is `createAnimatedComponent(View)` —
            a different component object, absent from that registry — so a class
            on it is passed through as a plain prop and silently dropped. The
            dialog rendered with no background at all until this was split.
            `Pressable` and `View` are both registered, so animation stays on the
            wrapper and styling moves inside. */}
        <Animated.View
          entering={FadeIn.duration(120)}
          exiting={FadeOut.duration(120)}
          style={StyleSheet.absoluteFill}>
          <Pressable
            className="flex-1 bg-black/50"
            accessibilityLabel="بستن"
            accessibilityRole="button"
            onPress={dismissable ? close : undefined}
          />
        </Animated.View>

        <Animated.View entering={ZoomIn.springify().damping(18).mass(0.6)} style={CARD_STYLE}>
          <View
            role="alertdialog"
            aria-modal
            className="border-border bg-card gap-4 rounded-2xl border p-5 shadow-lg shadow-black/20">
            {children}
          </View>
        </Animated.View>
      </View>
    </Portal>
  );
}

/**
 * Escape on web, hardware back on Android — the two gestures a user expects to
 * cancel a modal. Both are no-ops the platform swallows silently if unhandled,
 * so a dialog without them reads as frozen.
 */
function useDismissAffordances(active: boolean, close: () => void) {
  React.useEffect(() => {
    if (!active) return;

    if (Platform.OS === 'web') {
      if (typeof document === 'undefined') return;
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') close();
      };
      document.addEventListener('keydown', onKeyDown);
      return () => document.removeEventListener('keydown', onKeyDown);
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true; // handled — do not pop the route behind the dialog.
    });
    return () => subscription.remove();
  }, [active, close]);
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof Text>) {
  return <Text className={cn('text-lg font-semibold', className)} {...props} />;
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof Text>) {
  return (
    <Text className={cn('text-muted-foreground text-sm leading-6', className)} {...props} />
  );
}

/** Buttons share the row evenly; `flex-row` mirrors on its own under RTL. */
function DialogFooter({ className, ...props }: React.ComponentProps<typeof View>) {
  return <View className={cn('flex-row gap-2', className)} {...props} />;
}

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Reds the confirm button and badges the dialog with a warning icon. */
  destructive?: boolean;
  icon?: LucideIcon;
  /** Disables confirm while the mutation behind it is in flight. */
  pending?: boolean;
  onConfirm: () => void;
};

/**
 * The `Alert.alert(title, message, [cancel, confirm])` shape, as a dialog.
 *
 * Cancel sits first so it lands on the *start* edge under RTL, matching the
 * cancel/confirm pair the delete step of `<HoldingActionsSheet/>` already uses.
 */
function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'انصراف',
  destructive = false,
  icon,
  pending = false,
  onConfirm,
}: ConfirmDialogProps) {
  const badge = icon ?? (destructive ? TriangleAlert : undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <View className="flex-row items-start gap-3">
        {badge ? (
          <View
            className={cn(
              'h-9 w-9 items-center justify-center rounded-full',
              destructive ? 'bg-destructive/10' : 'bg-muted'
            )}>
            <Icon
              as={badge}
              size={16}
              className={destructive ? 'text-destructive' : 'text-foreground'}
            />
          </View>
        ) : null}
        <View className="flex-1 gap-1">
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </View>
      </View>

      <DialogFooter>
        <Button
          variant="secondary"
          size="lg"
          className="flex-1"
          onPress={() => onOpenChange(false)}>
          <Text>{cancelLabel}</Text>
        </Button>
        <Button
          variant={destructive ? 'destructive' : 'default'}
          size="lg"
          className="flex-1"
          disabled={pending}
          onPress={onConfirm}>
          <Text>{confirmLabel}</Text>
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

export { ConfirmDialog, Dialog, DialogDescription, DialogFooter, DialogTitle };
export type { ConfirmDialogProps, DialogProps };
