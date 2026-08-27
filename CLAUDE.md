# تراز (Taraz)

Multi-venue asset portfolio for the Iranian market. Enter what you hold and
where — 4g of gold on Digikala Gold, 100 USDT on Wallex, 0.21 BTC on Nobitex —
and see the combined Rial value, plus where each asset is cheapest to buy and
dearest to sell.

Expo SDK 57 · React Native 0.86 · iOS, Android and web from one codebase.

## Commands

```bash
npm run dev         # Metro, all platforms
npm run web         # web only
npm run typecheck
npm test
```

Native RTL needs a **development build** — see below.

## Conventions that are not obvious

### The app is Persian and RTL-only

- **Never read `I18nManager.isRTL`.** react-native-web ships a stub whose
  `forceRTL()` is a no-op and which always reports `isRTL: false`. Use
  `IS_RTL` from `lib/rtl.ts`, which is simply `true`.
- **Use logical spacing utilities only**: `ps-*` `pe-*` `ms-*` `me-*` `start-*`
  `end-*` `rounded-s-*` `rounded-e-*` `border-s-*` `border-e-*`. Never `pl-`
  `pr-` `ml-` `mr-` `left-` `right-` — those are physical and do not mirror.
  `flex-row` mirrors on its own in both native RTL and CSS `dir="rtl"`.
- **Text alignment is already handled** in `components/ui/text.tsx` and
  `components/ui/input.tsx`; do not set it per-screen. React Native treats
  `textAlign: 'left'` on `<Text>` as *logical* start, CSS does not, and
  `<TextInput>` treats it as physical on both. Each primitive resolves this once
  through `Platform.select`.
- **Inputs do not inherit direction on web.** react-native-web stamps
  `dir="auto"` on every node; on an `<input>` that resolves from the *value*,
  and a placeholder is not a value — so an empty field falls back to `ltr` and
  its placeholder sits on the left. `global.css` pins `direction: rtl` on
  `input`/`textarea` to undo it. It also pins `outline: none` there, because
  NativeWind has no `outline` property and an `outline-none` className never
  reaches the DOM.
- Direction comes from `forcesRTL: true` (the `expo-localization` plugin) on
  native and `dir="rtl"` in `app/+html.tsx` on web.

### Numbers and dates

Everything user-facing goes through `lib/format.ts`. Digit shaping is a lookup
table rather than `Intl`, because Hermes' ICU coverage differs across iOS,
Android and web and the same number would render three ways. Jalali dates use
`jalaali-js` plus a month-name table.

### Typography

The app uses **Estedad** ([aminabedi68/Estedad](https://github.com/aminabedi68/Estedad),
SIL OFL), vendored as static TTFs in `assets/fonts/` rather than fetched from a
CDN — it is not on Google Fonts, and a Persian UI has no acceptable system
fallback.

`lib/fonts.ts` is the single registry: `FONTS` is what the root layout passes to
`useFonts`, `FONT_FAMILY` gives the family names to the few nodes NativeWind
cannot reach (bare `TextInput`, `tabBarLabelStyle`). One static face is
registered per weight because React Native can neither synthesise a weight nor
address a variable font's `wght` axis — so `tailwind.config.js` must name a
family on every weight utility, and it deliberately covers only the weights
`lib/fonts.ts` actually loads. Adding a weight means all three: the TTF, an
entry in `FONTS`, a utility in the Tailwind config.

### Money

Stored and transported as **integer Rial** — that is what the backend will
serve. Toman is a display transform only (`lib/money.ts`). Never persist Toman.

### Valuation values at the bid, minus fees

A holding is worth what its venue will **pay you** (`bidIrr`), less that venue's
exit fees. Valuing at the ask overstates a Digikala gold position by the full
spread. Both figures are surfaced: `grossIrr` ("ارزش بازار") and `netIrr`
("ارزش نقدشوندگی"). See `domain/valuation.ts`.

Venue comparison ranks on *effective* prices — ask plus entry fee, bid minus
exit fee — so the bazaar's tight spread and 7% اجرت compare honestly against an
exchange's wide spread and 0.25% fee. See `domain/ranking.ts`.

`Venue.transferable` gates the "you could sell this for more elsewhere" prompt.
BTC can move between exchanges; gold inside Digikala Gold cannot move to
Wallgold, so suggesting it would be advice the user cannot act on.

### Storage writes must be serialised

AsyncStorage has no atomic update, so load-merge-save is a race. Every mutation
in `store/` goes through `serialize()` (`store/serialize.ts`). Without it,
changing two settings in one tick loses one of them. Regression tests are in
`store/store.test.ts`.

### The backend seam

`api/contracts.ts` is the wire contract, as Zod schemas that both transports
validate against. `api/client.ts` defines the interface; `api/index.ts` picks
mock or HTTP from `EXPO_PUBLIC_API_MODE`. `api/http.ts` is written and complete
but unused until the backend exists.

**Do not let screens import a transport directly** — they use the hooks in
`api/queries.ts`. Prefer `useMarketData()` over composing `useCatalog` and
`useQuotes` by hand: it combines both statuses, so a failed catalog surfaces as
an error rather than an empty list.

The mock (`api/mock/`) is a deterministic simulator, not random noise. Assets
sharing an underlying move together — 18k and 24k gold, Tether and the
free-market dollar — and each venue is that underlying plus a breathing premium.
History is generated backwards from today and normalised so its last point *is*
the live quote. Tests in `api/mock/engine.test.ts` pin these properties.

### Charts

`react-native-svg` + `d3-shape`/`d3-scale`, not Skia: identical on all three
platforms with no CanvasKit WASM shipped to browsers. `adjustsFontSizeToFit`
is a no-op on web, so anything that must fit sizes itself from string length —
see `components/common/amount.tsx`.

Time runs left→right on charts even in RTL (the convention on TGJU and TSETMC);
the value axis sits on the right. SVG labels use `textAnchor="middle"` only —
`start`/`end` resolve against text direction on web but not on native.

### Bottom sheets

`@gorhom/bottom-sheet` v5 defaults `enableDynamicSizing` to **true**, and it
*adds* to `snapPoints` rather than replacing them: a second detent measured from
the scrollable's `onContentSizeChange`. That measurement sees the list rows and
nothing else — not the handle, not `SheetHeader`, not a search field — so the
sheet opens at a detent shorter than its own chrome while the content box is
still sized for the tallest detent. The overflow sits below the viewport,
unscrollable, and on native runs straight through the home indicator. Any sheet
with explicit `snapPoints` must pass `enableDynamicSizing={false}`.

Note also that gorhom keeps ~80pt of over-drag padding inside the content mask,
so a bottom-anchored control already clears the home indicator; the
`insets.bottom` padding the sheets add is belt-and-braces, matching the
convention the screens use.

### Web is phone-width

`components/layout/mobile-frame.tsx` caps the web build at 430pt and centres it.
It is a pass-through on native.

## Development build

`forcesRTL` writes to iOS `Info.plist` and Android `strings.xml`, so **RTL does
not work in Expo Go**:

```bash
npm run build:ios       # prebuild + run:ios
npm run build:android   # prebuild + run:android
```

Both prebuild first, so they are safe to re-run after a change to `app.json`
or to a config plugin. `npm run prebuild` regenerates the native projects on
their own. `ios/` and `android/` are generated and git-ignored — edit
`app.json`, never them.

Web (`npm run web`) needs no build step — `dir="rtl"` carries it.

## Known upstream issue

[nativewind#1846](https://github.com/nativewind/nativewind/issues/1846): on
Android + RN 0.86, `font-bold` via `className` can clip multi-word text. The
Tailwind config sidesteps it by binding every weight utility to its own
Estedad family, so Android measures with the typeface it draws with. If it
reappears, fall back to a plain `style={{ fontWeight: '700' }}` on that node.
