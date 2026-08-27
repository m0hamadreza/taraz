import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * Web-only document shell, evaluated in Node during static rendering.
 *
 * `dir="rtl"` here is what actually gives the web build its right-to-left
 * layout: react-native-web ships an `I18nManager` stub that always reports
 * `isRTL: false`, so the native `forcesRTL` plugin has no web equivalent.
 * With `dir` set, CSS logical properties (`padding-inline-start`, which is what
 * Tailwind's `ps-*` compiles to) and flexbox row order flip on their own.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <meta name="theme-color" content="#faf8f4" />

        {/* Keeps ScrollView behaving like it does on native rather than letting
            the document body scroll. */}
        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: BACKDROP_CSS }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

/**
 * Pre-hydration backdrop only. The app is constrained to a phone width on web
 * (see MobileFrame), and once mounted MobileFrame repaints this from the user's
 * chosen theme — the media query here just avoids a white flash before that.
 */
const BACKDROP_CSS = `
body {
  background-color: hsl(75 11% 92.9%);
  overscroll-behavior-y: none;
}
@media (prefers-color-scheme: dark) {
  body { background-color: hsl(231.4 88.6% 2.1%); }
}
`;
