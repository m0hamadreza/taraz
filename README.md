# تراز (Taraz)

Track assets held across many different places and see what they are all worth
in Rial, right now.

Iranians routinely hold the same asset in several places at once — gold grams on
Digikala Gold and Wallgold, physical gold at a bazaar goldsmith, USDT on Wallex,
BTC on Nobitex. Taraz adds them up honestly and says where each one is cheapest
to buy and dearest to sell.

## What it does

- **Combined portfolio value in Rial**, re-valuing itself as prices move.
- **Two totals, not one.** *ارزش بازار* is the sum of what venues will pay you;
  *ارزش نقدشوندگی* is what would actually reach your account after each venue's
  fees. The gap is usually several percent.
- **Venue comparison** for every asset, ranked on effective prices — ask plus
  entry fee, bid minus exit fee — so a tight spread with a 7% اجرت does not beat
  a wide spread with a 0.25% fee.
- **Weekly, monthly, quarterly and yearly trends** with every venue overlaid on
  one chart.
- **Relocation prompts** — "Bitpin would pay 1.7M Toman more" — shown only for
  assets that can actually be moved.
- Persian throughout: RTL, Persian numerals, Jalali dates, Toman by default with
  a Rial toggle.

Runs on iOS, Android and the web from one codebase; the web build is
constrained to phone width.

## Running it

```bash
npm install
npm run web
```

For iOS or Android you need a development build, because forced RTL is a native
setting and does not apply in Expo Go:

```bash
npx expo prebuild
npx expo run:ios      # or: npx expo run:android
```

Other commands:

```bash
npm test          # unit tests for valuation, ranking, formatting, price engine
npm run typecheck
```

## Data

There is no backend yet. Prices come from a deterministic simulator in
`api/mock/` that behaves like a real feed: assets sharing an underlying move
together, each venue carries its own breathing premium, and history is generated
so that its final point *is* the live quote.

The simulator sits behind the same interface and the same Zod-validated contract
the real API will implement, so switching over is a matter of setting
`EXPO_PUBLIC_API_MODE=http` and filling in `api/http.ts`. Nothing above that
boundary changes.

Portfolios are stored on the device for now. The holdings repository already has
the shape a `/holdings` endpoint would have.

## Stack

Expo SDK 57 · React Native 0.86 · expo-router · NativeWind 4 ·
react-native-reusables · TanStack Query v5 · @gorhom/bottom-sheet ·
react-native-svg + d3 · Zod

See [CLAUDE.md](CLAUDE.md) for the conventions that matter when editing this
codebase — especially the RTL rules and the bid-not-ask valuation decision.
