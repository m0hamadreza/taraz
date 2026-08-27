import { cn } from '@/lib/utils';
import { Slot } from '@rn-primitives/slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Platform, Text as RNText, type Role } from 'react-native';

const textVariants = cva(
  cn(
    // `font-normal` is not redundant: Tailwind's `fontFamily.sans` only backs the
    // `font-sans` utility, it is not a global default, so a <Text> with no weight
    // class would fall through to the platform's own sans — a Latin face pressed
    // into service for Persian. Naming the weight here binds the Estedad regular
    // family (see tailwind.config.js); twMerge lets any `font-medium`/`font-bold`
    // from a variant or the call site replace it.
    'text-foreground font-normal text-base',
    Platform.select({
      web: 'select-text',
      // The app is RTL-only. React Native treats `textAlign: 'left'` on <Text>
      // as *logical* start, so under forced RTL it renders right-aligned. CSS
      // does not: `text-align: left` is physical and would stay on the left. On
      // web we therefore emit nothing and let `dir="rtl"` supply the default
      // `start`. Resolved via Platform.select rather than a `native:` variant so
      // twMerge still sees one text-align class and lets `text-center` on the
      // heading variants win.
      native: 'text-left',
    })
  ),
  {
    variants: {
      variant: {
        default: '',
        h1: cn(
          'text-center text-4xl font-extrabold tracking-tight',
          Platform.select({ web: 'scroll-m-20 text-balance' })
        ),
        h2: cn(
          'border-border border-b pb-2 text-3xl font-semibold tracking-tight',
          Platform.select({ web: 'scroll-m-20 first:mt-0' })
        ),
        h3: cn('text-2xl font-semibold tracking-tight', Platform.select({ web: 'scroll-m-20' })),
        h4: cn('text-xl font-semibold tracking-tight', Platform.select({ web: 'scroll-m-20' })),
        p: 'mt-3 leading-7 sm:mt-6',
        blockquote: 'mt-4 border-l-2 pl-3 italic sm:mt-6 sm:pl-6',
        code: cn(
          'bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold'
        ),
        lead: 'text-muted-foreground text-xl',
        large: 'text-lg font-semibold',
        small: 'text-sm font-medium leading-none',
        muted: 'text-muted-foreground text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

type TextVariantProps = VariantProps<typeof textVariants>;

type TextVariant = NonNullable<TextVariantProps['variant']>;

const ROLE: Partial<Record<TextVariant, Role>> = {
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  blockquote: Platform.select({ web: 'blockquote' as Role }),
  code: Platform.select({ web: 'code' as Role }),
};

const ARIA_LEVEL: Partial<Record<TextVariant, string>> = {
  h1: '1',
  h2: '2',
  h3: '3',
  h4: '4',
};

/*
 * react-native-web renders a root <Text> as a <div dir="auto">, and `auto`
 * resolves the paragraph direction from the first *strong* character. Persian
 * digits are U+06F0–U+06F9, bidi class EN — weak, and skipped by that scan — so
 * a subtitle like "۰٫۲۱ BTC" or "۱۰۰ USDT" resolves from the Latin symbol,
 * comes out ltr, and `text-align: start` parks it on the left while every
 * Persian sibling row sits on the right.
 *
 * The app is RTL-only, so state the direction outright — the same fix
 * `global.css` applies to <input>, except that here it has to be the attribute
 * rather than a CSS `direction`: `dir="auto"` is implemented as
 * `unicode-bidi: plaintext`, which keeps resolving `start` from the content per
 * line no matter what the `direction` property says. `dir="rtl"` carries
 * `unicode-bidi: isolate` with it, so a Latin run inside a Persian line still
 * reads left-to-right within a right-aligned line.
 *
 * Cast because `dir` is a react-native-web prop and is not in RN's TextProps;
 * spread before `...props` so a call site can still opt out.
 */
const WEB_DIR = Platform.select({ web: { dir: 'rtl' } }) as { dir?: 'rtl' } | undefined;

const TextClassContext = React.createContext<string | undefined>(undefined);

function Text({
  className,
  asChild = false,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof RNText> &
  React.RefAttributes<typeof RNText> &
  TextVariantProps & {
    asChild?: boolean;
  }) {
  const textClass = React.useContext(TextClassContext);
  const Component = asChild ? Slot : RNText;
  return (
    <Component
      {...WEB_DIR}
      className={cn(textVariants({ variant }), textClass, className)}
      role={variant ? ROLE[variant] : undefined}
      aria-level={variant ? ARIA_LEVEL[variant] : undefined}
      {...props}
    />
  );
}

export { Text, TextClassContext };
