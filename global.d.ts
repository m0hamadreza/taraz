/**
 * NativeWind's stylesheet is imported for its side effect in the root layout;
 * TypeScript needs to be told that a `.css` specifier is a valid module.
 *
 * NativeWind's own types live in the generated `nativewind-env.d.ts`, which it
 * rewrites on every start — leave that file alone.
 */
declare module '*.css';
