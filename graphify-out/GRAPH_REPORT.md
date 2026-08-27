# Graph Report - .  (2026-08-27)

## Corpus Check
- Corpus is ~33,308 words - fits in a single context window. You may not need a graph.

## Summary
- 657 nodes · 1480 edges · 67 communities (26 shown, 41 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- UI Components and Formatting
- Holdings Settings and Queries
- App Shell and Startup
- Asset Details and History
- Development Toolchain
- Interactive UI Rows
- Estedad Font Licensing
- Expo App Configuration
- API Client and Catalog
- Mock Market Engine
- API Schemas and Contracts
- Market Engine Tests
- Portfolio Valuation Domain
- Component Alias Configuration
- Type Declarations and Test References
- Styling Utility Dependencies
- Adaptive Icon Artwork
- Dark Theme Artwork
- Splash Screen Artwork
- Metro NativeWind Configuration
- Tailwind Typography Theme
- Main App Icon Artwork
- Light Theme Artwork
- ESLint Configuration
- Web Favicon Artwork
- D3 Scale Dependency
- D3 Shape Dependency
- Expo Core Dependency
- Expo Constants Dependency
- Expo Dev Client Dependency
- Expo Font Dependency
- Expo Haptics Dependency
- Expo Linking Dependency
- Expo Localization Dependency
- Expo Router Dependency
- Expo Splash Screen Dependency
- Expo Status Bar Dependency
- Global CSS Types
- Bottom Sheet Dependency
- Jalaali Date Dependency
- Lucide Icons Dependency
- NativeWind Dependency
- NativeWind Type Rationale
- React DOM Dependency
- React Native Dependency
- Async Storage Dependency
- Gesture Handler Dependency
- Reanimated Dependency
- Safe Area Dependency
- SVG Dependency
- React Native Web Dependency
- Worklets Dependency
- Avatar Primitive Dependency
- Label Primitive Dependency
- Portal Primitive Dependency
- Progress Primitive Dependency
- Separator Primitive Dependency
- Slot Primitive Dependency
- Switch Primitive Dependency
- Tabs Primitive Dependency
- Tailwind CSS Dependency
- Tailwind Animate Dependency
- React Query Dependency
- Zod Validation Dependency

## God Nodes (most connected - your core abstractions)
1. `cn()` - 68 edges
2. `react` - 32 edges
3. `react` - 27 edges
4. `Text()` - 25 edges
5. `formatMoney()` - 22 edges
6. `Icon()` - 17 edges
7. `AssetDetailScreen()` - 16 edges
8. `expo` - 15 edges
9. `unitLabel()` - 15 edges
10. `Quote` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Persian RTL User Experience` --semantically_similar_to--> `Persian RTL-Only Interface`  [INFERRED] [semantically similar]
  README.md → CLAUDE.md
- `Taraz` --semantically_similar_to--> `Taraz`  [INFERRED] [semantically similar]
  README.md → CLAUDE.md
- `Gross and Net Portfolio Totals` --semantically_similar_to--> `Bid Minus Exit Fees Valuation`  [INFERRED] [semantically similar]
  README.md → CLAUDE.md
- `Effective Price Venue Comparison` --semantically_similar_to--> `Effective Price Venue Ranking`  [INFERRED] [semantically similar]
  README.md → CLAUDE.md
- `Transferable Asset Relocation Prompts` --semantically_similar_to--> `Transferability-Gated Relocation Advice`  [INFERRED] [semantically similar]
  README.md → CLAUDE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Honest Portfolio Valuation** — readme_combined_rial_valuation, readme_gross_and_net_totals, claude_bid_minus_fees_valuation, claude_effective_price_venue_ranking [INFERRED 0.95]
- **Cross-Platform Persian Experience** — readme_persian_rtl_ux, readme_cross_platform_single_codebase, claude_rtl_only_ui, claude_deterministic_persian_formatting [INFERRED 0.85]
- **Estedad Distribution and Runtime Typography** — claude_estedad_typeface, claude_static_font_weight_registry, claude_family_name_as_weight, assets_fonts_ofl_sil_open_font_license_1_1 [INFERRED 0.85]

## Communities (67 total, 41 thin omitted)

### Community 0 - "UI Components and Formatting"
Cohesion: 0.07
Nodes (70): Asset, Venue, useCatalogIndex(), useQuoteIndex(), DonutChart(), DonutSlice, Amount(), sizeForLength() (+62 more)

### Community 1 - "Holdings Settings and Queries"
Cohesion: 0.10
Nodes (35): HoldingSchema, CatalogIndex, EMPTY_INDEX, MarketData, MarketStatus, queryKeys, useAddHolding(), useCatalog() (+27 more)

### Community 2 - "App Shell and Startup"
Cohesion: 0.07
Nodes (34): AssetKind, configureMockApi(), plugins, AppShell(), queryClient, RootLayout(), useAppStateFocus(), ChartSeries (+26 more)

### Community 3 - "Asset Details and History"
Cohesion: 0.12
Nodes (33): useCurrency(), useHistory(), useMarketData(), AssetDetailScreen(), RANGES, PortfolioScreen(), KIND_FILTERS, MarketsScreen() (+25 more)

### Community 4 - "Development Toolchain"
Cohesion: 0.05
Nodes (43): @babel/core, eslint, eslint-config-expo, jest, jest-expo, devDependencies, @babel/core, eslint (+35 more)

### Community 5 - "Interactive UI Rows"
Cohesion: 0.07
Nodes (33): SegmentedRow(), Cell(), OptionRow(), ActionRow(), Alert(), AlertTitle(), Avatar(), AvatarFallback() (+25 more)

### Community 6 - "Estedad Font Licensing"
Cohesion: 0.05
Nodes (42): Collaborative Font Development, Estedad Font License Notice, Estedad Project Authors, Font Software, Font Software Permissions, Redistribution and Copyleft Conditions, Reserved Font Name, SIL Open Font License 1.1 (+34 more)

### Community 7 - "Expo App Configuration"
Cohesion: 0.06
Nodes (33): backgroundColor, foregroundImage, adaptiveIcon, package, projectId, typedRoutes, expo, android (+25 more)

### Community 8 - "API Client and Catalog"
Cohesion: 0.12
Nodes (17): ApiClient, ApiMode, Catalog, CatalogSchema, HistoryRange, HistoryResponse, HistoryResponseSchema, Quote (+9 more)

### Community 9 - "Mock Market Engine"
Cohesion: 0.21
Nodes (20): HistoryPoint, assetCache, assetDailyMids(), bidAsk(), dailyMids(), fbm(), hashString(), historyFor() (+12 more)

### Community 10 - "API Schemas and Contracts"
Cohesion: 0.11
Nodes (18): AssetKindSchema, AssetSchema, AssetUnit, AssetUnitSchema, HISTORY_RANGE_LABEL, HistoryPointSchema, HistoryRangeSchema, HoldingDraft (+10 more)

### Community 11 - "Market Engine Tests"
Cohesion: 0.12
Nodes (15): HISTORY_RANGE_DAYS, Pair, allQuotes(), dailySwing(), NOW, ASSET_BY_ID, ASSET_PRICING, AssetPricing (+7 more)

### Community 12 - "Portfolio Valuation Domain"
Cohesion: 0.18
Nodes (16): Holding, AllocationSlice, exitCostIrr(), indexQuotes(), KIND_ORDER, netOfFeesIrr(), PortfolioSummary, btc (+8 more)

### Community 13 - "Component Alias Configuration"
Cohesion: 0.12
Nodes (15): aliases, components, hooks, lib, ui, utils, rsc, $schema (+7 more)

### Community 14 - "Type Declarations and Test References"
Cohesion: 0.12
Nodes (15): expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, global.d.ts, jest, nativewind-env.d.ts, node, **/*.ts (+7 more)

### Community 15 - "Styling Utility Dependencies"
Cohesion: 0.18
Nodes (11): class-variance-authority, clsx, expo-system-ui, dependencies, class-variance-authority, clsx, expo-system-ui, react-native-screens (+3 more)

### Community 16 - "Adaptive Icon Artwork"
Cohesion: 0.50
Nodes (4): Adaptive App Icon, Atom Orbit Emblem, Parallel Diagonal Core Mark, React Ecosystem Visual Language

### Community 17 - "Dark Theme Artwork"
Cohesion: 0.67
Nodes (4): Dark Theme Asset, Diagonal Center Mark, React Atom Symbol, React Native Reusables Dark Icon

### Community 18 - "Splash Screen Artwork"
Cohesion: 0.50
Nodes (4): Atom-Like Orbital Emblem, Central Diagonal Bars, Minimalist Monochrome Design, Splash Screen Graphic

### Community 19 - "Metro NativeWind Configuration"
Cohesion: 0.50
Nodes (3): config, { getDefaultConfig }, { withNativeWind }

### Community 20 - "Tailwind Typography Theme"
Cohesion: 0.50
Nodes (3): estedadWeights, { hairlineWidth }, plugin

### Community 21 - "Main App Icon Artwork"
Cohesion: 1.00
Nodes (3): Application Icon, Atomic Orbit Motif, Central Coding Glyph

### Community 22 - "Light Theme Artwork"
Cohesion: 0.67
Nodes (3): React Native Reusables Light Image Asset, Light Theme Variant, React Atom Emblem

## Ambiguous Edges - Review These
- `Atom Orbit Emblem` → `React Ecosystem Visual Language`  [AMBIGUOUS]
  assets/images/adaptive-icon.png · relation: conceptually_related_to

## Knowledge Gaps
- **218 isolated node(s):** `ApiMode`, `AssetKindSchema`, `AssetUnitSchema`, `AssetUnit`, `AssetSchema` (+213 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **41 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Atom Orbit Emblem` and `React Ecosystem Visual Language`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `dependencies` connect `Styling Utility Dependencies` to `App Shell and Startup`, `Development Toolchain`, `D3 Scale Dependency`, `D3 Shape Dependency`, `Expo Core Dependency`, `Expo Constants Dependency`, `Expo Dev Client Dependency`, `Expo Font Dependency`, `Expo Haptics Dependency`, `Expo Linking Dependency`, `Expo Localization Dependency`, `Expo Router Dependency`, `Expo Splash Screen Dependency`, `Expo Status Bar Dependency`, `Bottom Sheet Dependency`, `Jalaali Date Dependency`, `Lucide Icons Dependency`, `NativeWind Dependency`, `React DOM Dependency`, `React Native Dependency`, `Async Storage Dependency`, `Gesture Handler Dependency`, `Reanimated Dependency`, `Safe Area Dependency`, `SVG Dependency`, `React Native Web Dependency`, `Worklets Dependency`, `Avatar Primitive Dependency`, `Label Primitive Dependency`, `Portal Primitive Dependency`, `Progress Primitive Dependency`, `Separator Primitive Dependency`, `Slot Primitive Dependency`, `Switch Primitive Dependency`, `Tabs Primitive Dependency`, `Tailwind CSS Dependency`, `Tailwind Animate Dependency`, `React Query Dependency`, `Zod Validation Dependency`?**
  _High betweenness centrality (0.291) - this node is a cross-community bridge._
- **Why does `react` connect `App Shell and Startup` to `UI Components and Formatting`, `Asset Details and History`, `Styling Utility Dependencies`?**
  _High betweenness centrality (0.267) - this node is a cross-community bridge._
- **Why does `cn()` connect `Interactive UI Rows` to `UI Components and Formatting`, `Holdings Settings and Queries`, `App Shell and Startup`, `Asset Details and History`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **What connects `ApiMode`, `AssetKindSchema`, `AssetUnitSchema` to the rest of the system?**
  _218 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `UI Components and Formatting` be split into smaller, more focused modules?**
  _Cohesion score 0.06879865348201136 - nodes in this community are weakly interconnected._
- **Should `Holdings Settings and Queries` be split into smaller, more focused modules?**
  _Cohesion score 0.10144927536231885 - nodes in this community are weakly interconnected._