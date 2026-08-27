import { cn } from '@/lib/utils';
import { Platform, TextInput } from 'react-native';

function Input({ className, ...props }: React.ComponentProps<typeof TextInput> & React.RefAttributes<TextInput>) {
  return (
    <TextInput
      className={cn(
        // `font-normal` for the same reason as in text.tsx: it is what binds Estedad.
        'dark:bg-input/30 border-input bg-background text-foreground flex h-10 w-full min-w-0 flex-row items-center rounded-md border px-3 py-1 font-normal text-base leading-5 shadow-sm shadow-black/5 sm:h-9',
        props.editable === false &&
        cn(
          'opacity-50',
          Platform.select({ web: 'disabled:pointer-events-none disabled:cursor-not-allowed' })
        ),
        Platform.select({
          web: cn(
            'placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground outline-none transition-[color,box-shadow] md:text-sm',
            'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
            'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive'
          ),
          // Unlike <Text>, React Native treats textAlign on <TextInput> as a
          // *physical* value (facebook/react-native#45255), so RTL alignment has
          // to be stated outright. Web does *not* simply inherit from dir="rtl":
          // react-native-web stamps dir="auto" on the <input>, which resolves
          // from the value (never the placeholder), so an empty field falls back
          // to ltr. global.css pins `direction: rtl` on every input to undo that.
          native: 'placeholder:text-muted-foreground/50 text-right',
        }),
        className
      )}
      {...props}
    />
  );
}

export { Input };
