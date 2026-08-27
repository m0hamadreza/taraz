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
- **Nothing on web infers its own direction.** react-native-web stamps
  `dir="auto"` on every root `<Text>` and every `<input>`, and `auto` resolves
  the paragraph direction from the first *strong* character.
  - On an `<input>` that means the *value*, and a placeholder is not a value —
    so an empty field falls back to `ltr` and its placeholder sits on the left.
    `global.css` pins `direction: rtl` on `input`/`textarea` to undo it. It also
    pins `outline: none` there, because NativeWind has no `outline` property and
    an `outline-none` className never reaches the DOM.
  - On a `<Text>` the trap is Persian digits: U+06F0–U+06F9 are bidi class EN,
    *weak*, and skipped by that scan — so "۰٫۲۱ BTC" resolves from the `B`,
    comes out `ltr`, and `text-align: start` parks the line on the left while
    every Persian sibling row sits on the right. `components/ui/text.tsx` passes
    `dir="rtl"` on web. It has to be the attribute, not a CSS `direction`:
    `dir="auto"` *is* `unicode-bidi: plaintext`, which keeps resolving `start`
    per line from the content whatever `direction` says, and `dir="rtl"` brings
    `unicode-bidi: isolate` with it so a Latin run inside a Persian line still
    reads left-to-right.
- Direction comes from `forcesRTL: true` (the `expo-localization` plugin) on
  native and `dir="rtl"` in `app/+html.tsx` on web.

### Text fields

Every field is `<Input/>` (`components/ui/input.tsx`) — `<SearchInput/>` beside
it is the same field in its muted pill with the magnifier and a clear button.

Inside a `BottomSheetModal` the field has to be gorhom's `BottomSheetTextInput`
(`inSheet`; still a plain `TextInput` on web, whose blur handler calls
`TextInput.State.currentlyFocusedInput()` — react-native-web never implemented
it, so leaving a field throws). NativeWind cannot see a third-party component,
so `input.tsx` registers it with `cssInterop`, mirroring NativeWind's own
mapping for `TextInput`: `className` to `style`, with `textAlign` lifted out to
a *prop*, which is where a `<TextInput>` reads it from. That registration is
what lets one `cva`-based component serve both cases; without it the field would
have to fall back to inline `style` objects and could not be shared.

So the variants own the typography and no call site restates it: the weight is
an Estedad *family* (`font-normal`/`font-semibold`), never a `fontWeight`, and
`placeholder:text-muted-foreground` reaches `placeholderTextColor` on native
through NativeWind's `@rn-move`. `text-right` is deliberately `native:`-only —
`global.css`'s `direction: rtl` is the web half. The field draws no chrome of
its own; it sits inside a container that carries the border or fill, which is
also why `flex-1` is in the base.

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
`useFonts`, `FONT_FAMILY` gives the family name to the one node NativeWind
cannot reach: `react-native-svg`'s `<Text>`, which takes it as an attribute. One static face is
registered per weight because React Native can neither synthesise a weight nor
address a variable font's `wght` axis — so `tailwind.config.js` must name a
family on every weight utility, and it deliberately covers only the weights
`lib/fonts.ts` actually loads. Adding a weight means all three: the TTF, an
entry in `FONTS`, a utility in the Tailwind config.

**Never set `fontWeight` next to one of those families.** `expo-font` loads a
face at runtime into Android's `Typeface.NORMAL` slot only, so a weight of 700
or more looks for a bold variant that isn't there, falls through to
`Typeface.create('Estedad_700Bold', BOLD)`, and Android — which has never heard
that family name — hands back **Roboto**. That is why `font-bold` headers and
the portfolio figure rendered in a Latin face on Android while `font-medium`
and `font-semibold` (weights that land in the NORMAL slot) were fine. On web
the same pair fakes bold over an already-bold file. The family name is the
weight; nothing else should assert it.

### Colour opacity steps

`bg-up/12` emits **nothing**. `12` is not a step in Tailwind's `opacity` scale
(0, 5, 10, 20, 25, …), and an unmatched modifier is dropped silently rather than
erroring — `ChangeBadge`'s tinted pill had no background at all until this was
caught. Stick to the scale (`/10`, `/20`) or use the bracket form
(`bg-up/[0.12]`).

Verify with `npx expo export -p web` and grep the emitted CSS for the selector:
the opacity modifier resolves to `hsl(var(--up) / .1)` only because `--up` is a
bare `H S% L%` triplet in `global.css`, so this is worth re-checking whenever a
token is added.

`ASSET_KIND_COLOR_KEY` in `lib/theme.ts` is the one place a kind is mapped to a
chart slot; `CHART_CLASS` beside it restates the same five slots as literal class
strings, because Tailwind only ever sees literals and a `bg-chart${n}` would
never be generated. `lib/**` is in the `content` globs — `domain/**` is not, so a
class string must never live there.

### Money

Stored and transported as **integer Rial** — that is what the backend will
serve. Toman is a display transform only (`lib/money.ts`). Never persist Toman.

Every figure on screen is a **number plus a de-emphasised unit**, never one
string: `formatMoneyParts` splits them and `<Money/>`
(`components/common/money.tsx`) renders the pair — the number in the call site's
own typography, the unit a step smaller and in `text-muted-foreground`. The unit
repeats on every row and every card, so it is a label, not content;
`<Amount/>` set that precedent for the headline and `<Money/>`'s `SIZE` table is
the same treatment at the other five scales. Prefer it to `formatMoney`, which
returns a flat string and therefore cannot style the unit — that is for strings
consumed as strings (a sheet row's subtitle, a chart tick).

`<Money/>` lays the pair out as a `flex-row` by default and only nests the unit
inside the number's `<Text>` under `inline`, for a figure sitting in a sentence.
The default is not cosmetic: `adjustsFontSizeToFit` scales a whole text run
including nested children, so a nested unit would shrink along with a long
number instead of holding its size. In toned prose (the green relocation
prompt) pass `unitClassName` to keep the sentence's colour — a single muted word
mid-sentence reads as a bug.

Estedad has `U+FDFC ﷼` in all five weights but **no Toman glyph**, and Unicode
encodes no Toman sign at all, so both units stay words: a symbol for one and a
word for the other would be lopsided, and `toman` is the default.

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

### Adding sums, editing sets

`addHolding` **merges** a same-asset-same-venue draft into the existing
position by adding the quantities — that is what buying more means. It is
therefore not a way to correct an amount: taking 4g down to 2g after a sale has
to go through `updateHoldingQuantity`, which *replaces* the quantity and
removes the holding outright when given zero or less. The `⋯` on `HoldingRow`
opens `<HoldingActionsSheet/>`, which routes to `<EditHoldingSheet/>` for
exactly that; the add and edit sheets share their "how much?" step
(`components/sheets/quantity-step.tsx`) so the field's platform quirks live in
one place.

Deletion is confirmed *inside* the actions sheet rather than through
`Alert.alert`. RN's `Alert` has no buttons on web, so anything built on it needs
a `window.confirm` fork and can never be the same interaction on all three
platforms.

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

### Dialogs, never `Alert`

`Alert.alert` renders **no buttons on web**, so anything built on it needs a
`window.confirm` fork and is then a different interaction on each platform — a
native sheet on iOS, browser chrome on web, neither in Persian, in Estedad, or
RTL. `components/ui/dialog.tsx` is the replacement: `<Dialog/>` for arbitrary
content and `<ConfirmDialog/>` for the `title / message / cancel+confirm` shape.

It portals to the `<PortalHost/>` in the root layout, which is a sibling of
`<MobileFrame/>` in the same flex column — so an `absoluteFill` overlay covers
the whole app including the floating tab bar, and on web it reuses the sheets'
max-width-plus-auto-margins trick to keep the scrim inside the phone column.
Escape (web) and hardware back (Android) both cancel; without them a modal
reads as frozen.

**A `className` on an `Animated.View` does nothing.** NativeWind registers its
`className`→`style` interop per *component object*, and the list is the core
React Native set (`View`, `Text`, `Pressable`, `ScrollView`, …). Reanimated's
`Animated.View` is `createAnimatedComponent(View)` — a different object, not in
that registry — so the class string is passed through as an ordinary prop and
dropped, with no warning. The dialog's scrim and card were invisible until the
animation and the styling were split: `Animated.View` carries `entering`/
`exiting` and a plain style, a registered `View`/`Pressable` inside carries the
classes. `components/ui/progress.tsx` still styles its native indicator this
way, so that bar is likely unpainted for the same reason.

`<HoldingActionsSheet/>` still confirms deletion *inside itself* — a dialog
presented over a `BottomSheetModal` fights its stacking, and the sheet is
already the surface the user is looking at.

### Bottom sheets

`@gorhom/bottom-sheet` v5 defaults `enableDynamicSizing` to **true**, and it
*adds* to `snapPoints` rather than replacing them: a second detent measured from
the scrollable's `onContentSizeChange`. That measurement sees the list rows and
nothing else — not the handle, not `SheetHeader`, not a search field — so the
sheet opens at a detent shorter than its own chrome while the content box is
still sized for the tallest detent. The overflow sits below the viewport,
unscrollable, and on native runs straight through the home indicator. Any sheet
with explicit `snapPoints` must pass `enableDynamicSizing={false}`.

`topInset={insets.top}` is what keeps a sheet off the status bar: it shifts
gorhom's hosting container down and shrinks it by the same amount, so
percentage snap points resolve against the space *below* the notch and the
sheet cannot travel above it even when over-dragged. The backdrop is a
full-screen sibling of that container, so the scrim still covers the inset.

Note also that gorhom keeps ~80pt of over-drag padding inside the content mask,
so a bottom-anchored control already clears the home indicator; the
`insets.bottom` padding the sheets add is belt-and-braces, matching the
convention the screens use.

**One sheet must not `present()` while another is up.** `BottomSheetModal`'s
`stackBehavior` defaults to `'switch'`, which *minimises* the incumbent and
leaves it in the provider's queue — `handleUnmountSheet` then restores it when
the newcomer closes, so the first sheet springs back up. That is why
`holding-actions-sheet.tsx` hands off to the edit sheet by latching the target in
a ref, calling `dismiss()`, and presenting from `onDismiss`. The latch is not
optional: `onDismiss` fires for *every* dismissal, backdrop tap included, so an
unlatched handler would open the edit sheet when the user cancelled. No timeout
is needed — the library fires `onDismiss` from `unmount()`, after the close
animation has resolved.

A short sheet wants a **fixed pt snap point**, not a percentage: its content is a
fixed number of points tall, and `topInset` makes a percentage resolve against a
per-device box, so the same string is a different height on every phone.

### The tab bar floats

`AppTabBar` is `position: absolute` at the bottom of the tab view, and the strip
around its pill is transparent so the scene shows through. `BottomTabView`
renders the `tabBar` prop as a bare sibling of the screens container, so taking
it out of that flex column is all it takes — the screens then fill the whole
viewport and nothing reserves a row.

That makes the bottom padding a **contract**: every scrollable inside `(tabs)`
pads its content by `useTabBarSpace()` (exported from the same file) plus its own
breathing room, or its last row sits unreachable behind the dock.
`useTabBarSpace()` sums the gap above the pill, `BAR_HEIGHT`, and the safe-area
floor below it, which is why those are numeric constants rather than `pt-2` —
a className the hook cannot read would drift from it.

The wrapper is `pointerEvents="box-none"`: it spans the full width over live
content, so only the dock itself may take a touch.

It also **shrinks while the user reads downwards** and springs back on the first
upward flick. `components/navigation/tab-bar-scroll.tsx` owns that: the provider
around `Tabs` holds a reanimated shared value, scenes spread
`useTabBarScrollProps()` onto an `Animated.FlatList`/`Animated.ScrollView`, and
the dock reads it in a `useAnimatedStyle`. Four things about it are deliberate:

- It tracks scroll **direction**, not offset, so the dock yields to the gesture
  instead of behaving like a scrollbar, and it is always full size within
  `REVEAL_FLOOR` of the top.
- Writes go through a `setProgress` worklet owned by the provider. React
  Compiler's `react-hooks/immutability` rule treats anything from
  `useContext()` — and anything named in a hook's dependency array — as
  read-only, so a shared value written at the consumer is a lint error. One
  setter means one `eslint-disable-next-line`, not one per scene.
- **The spring is assigned to the shared value, never called inside
  `useAnimatedStyle`.** `withSpring(...)` in a style worklet is a Reanimated 3
  habit and 4 drops it *silently*: the scale it produced left the pill
  undrawable on Android — the whole dock vanished, the wrapper still laying out
  around it — and simply never moved on web. `components/ui/progress.tsx` still
  animates `width` that way, so its indicator is likely inert for the same
  reason. Assigning also re-targets a spring in flight, which is what makes a
  mid-gesture reversal pick up from the current scale; the flip side is that
  re-sending the value it is already heading for restarts it from a standstill,
  so `setProgress` remembers its target and drops repeats.
- Intent is measured as **accumulated same-direction travel** (`DIRECTION_RUN`),
  not a per-event delta. A trackpad or a slow drag reports one or two points per
  event, so a per-event threshold large enough to ignore jitter ignores the
  whole gesture — which is the other half of why nothing moved on web.

The scrollable has to be reanimated's (`Animated.FlatList`, not `FlatList`) —
`useAnimatedScrollHandler` returns a worklet, and RN's own components would
hand it to the JS thread.

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
reappears, set the family directly —
`style={{ fontFamily: FONT_FAMILY.bold }}` — never `fontWeight`, which loses
the typeface on Android (see Typography).
