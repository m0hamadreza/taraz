import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import * as TabsPrimitive from '@rn-primitives/tabs';
import { Platform } from 'react-native';

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  // `dir` is web-only (it drives Radix's arrow-key roving focus) and the app is
  // RTL everywhere, so it is set here rather than at every call site.
  return (
    <TabsPrimitive.Root dir="rtl" className={cn('flex flex-col gap-2', className)} {...props} />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        'bg-muted flex h-9 flex-row items-center justify-center rounded-lg p-[3px]',
        Platform.select({ web: 'inline-flex w-fit', native: 'me-auto' }),
        className
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const { value } = TabsPrimitive.useRootContext();
  return (
    <TextClassContext.Provider
      value={cn(
        'text-muted-foreground text-sm font-medium',
        value === props.value && 'text-foreground'
      )}>
      <TabsPrimitive.Trigger
        className={cn(
          'flex h-[calc(100%-1px)] flex-row items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 shadow-none shadow-black/5',
          Platform.select({
            web: 'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring inline-flex cursor-default whitespace-nowrap transition-[color,box-shadow] focus-visible:outline-1 focus-visible:ring-[3px] disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
          }),
          props.disabled && 'opacity-50',
          /*
           * The selected pill has to read as *raised off* the `bg-muted` track,
           * and in dark neither half of the shadcn default does that: `--input`
           * and `--muted` are the same triplet there, so `bg-input/30` is that
           * colour at 30% over itself — literally a no-op — and the
           * `bg-background` underneath it is the near-black page colour, i.e.
           * darker than its own track. Whichever of the two wins, the pill is
           * either invisible or a hole. So dark tints with the *foreground*
           * instead: white at 10% over the track is lighter than it by
           * construction, whatever `--muted` is set to.
           */
          props.value === value &&
            'bg-background border-border/60 shadow-sm shadow-black/5 dark:border-foreground/10 dark:bg-foreground/10',
          className
        )}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn(Platform.select({ web: 'flex-1 outline-none' }), className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
