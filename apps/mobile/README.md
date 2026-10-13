# apps/mobile — Vitana native app (Wave 0 skeleton)

VTID-05157, program VTID-05021 (`docs/programs/native-app/NATIVE-APP-PLAN.md`). Expo + TypeScript + Expo Router.
Wave 0 proves the JavaScript side builds for iOS and Android on a Linux runner. It mirrors no screen yet and makes
**no network calls**.

| | |
|---|---|
| Expo SDK | **57** (`expo@57.0.25`, React Native 0.86.3, React 19.2.3), exact pins, every version at least two weeks old when pinned |
| Minimum OS (what SDK 57 supports) | iOS **16.4** (`expo-modules-core` podspec), Android **7.0 / API 24** (`minSdk`, React Native 0.86) |
| Identifiers | `com.exafy.maxina.dev` (iOS), `com.vitanaland.app.dev` (Android) — never the store apps |
| Package manager | npm, **own lockfile**; not a root workspace (a root `package.json` / lock edit is a web deploy path) |

## Run it

```bash
cd apps/mobile
npm ci
APP_PROFILE=development npm start          # Expo dev server (Expo Go / a dev client)
npm run typecheck                          # regenerates the i18n map first
npm test                                   # jest-expo + React Native Testing Library
APP_PROFILE=development npm run bundle     # Metro + Hermes JS for iOS and Android → dist/
APP_PROFILE=development EXPO_OFFLINE=1 npm run deps:check   # deps match the pinned SDK (what CI runs)
```

`APP_PROFILE` is required: `development` or `test-g1`. Unset, unknown and `production` throw in `app.config.ts`.
There is no production profile in Wave 0.

Before an SDK bump, also run the online check (`APP_PROFILE=development npx expo install --check`): it compares
against the newest patch releases, which the "at least two weeks old" pinning deliberately trails, so CI runs it
offline against the pinned SDK's own `bundledNativeModules.json` instead.

## No production host, ever

`src/config/env.ts` holds every endpoint (`gatewayUrl`, `supabaseUrl`, `dataApiUrl`). All are **unset in Wave 0**,
there is **no default URL**, and `assertNotProduction()` refuses the production gateway, `vitanaland.com`, the
production Supabase project and the staging hosts (`preview-aws*.vitanaland.com`) — staging shares the production
database (root `CLAUDE.md`, "Why no host is exempt"). Native dev and test builds only ever point at G1. ESLint bans
importing the web clients (`@/integrations/supabase/client`, `@/lib/gateway-base`) here: both fall back to production.

## i18n

The app reads the web app's own catalog shards (`src/i18n/<locale>/*.json`) read-only. Metro has no
`import.meta.glob`, so `scripts/native/gen-i18n-map.mjs` writes a static `require()` map to
`src/i18n/catalog-map.generated.ts` before typecheck, test and bundle. That file is gitignored. Strings follow the
repo's i18n rule: no hardcoded user-visible text (`accessibilityLabel` / `accessibilityHint` included), new keys go to
`src/i18n/de/` first — which is a web deploy path, so Wave 0 uses existing keys only. Arabic is RTL
(`I18nManager.allowRTL(true)`); use `start`/`end`, never `left`/`right`.

## Parity ledger

`parity/ledger.json` has one row per web destination (`screens.json`, `exclusions.json`, role/business routes).
`node scripts/native/parity-ledger.mjs --sync` adds rows; `--check` (NATIVE-CI) fails on a missing or stale row, a
`native` row without a route in `app/`, a route in `app/` without a row, an exception without a reason, or an undecided
(`pending`) scope. Scope and lane rules: `scripts/native/parity-scope.json`.

## What waits for which gate

| Work | Waits for |
|---|---|
| Native builds (`expo prebuild`, Gradle/Xcode), simulators, Maestro, screenshot parity | STATUS row 8b: macOS minutes (iOS), G1 for signed-in screens |
| Supabase / gateway clients, auth, any network call | G1 (isolated test environment), Wave 1 |
| Push, React Native Firebase, `google-services` files | G2 |
| Store identifiers, signing, store listings | G3 |
| `packages/core`, `packages/tokens`, npm workspaces, NativeWind, UI kit | Wave 1, each with its own sparred plan (UI kit core primitives: N2, below) |

## Vitana Native UI (`@vitana/ui`, Wave 1 N2 — VTID-05176)

The core primitives live in `src/ui/` and are imported as **`@vitana/ui`** (`tsconfig.json` `paths`, which Metro
resolves through Expo's tsconfig-paths support, plus the matching jest `moduleNameMapper`). Moving the kit to a
workspace package later is a one-line alias change. The sonner-compatible `toast` is `@vitana/ui/sonner`. Each
primitive is the native twin of the shadcn/Radix component today's **phone** UI renders (only the phone branch where
the web has two — `use-mobile` is 1024 px), with the web's export names and prop names wherever React Native allows.
Styling is `StyleSheet` + tokens; primitives take `style` (and `overlayStyle` where the web has `overlayClassName`),
no `className` in v1. Two dependencies were added: `react-native-svg` 15.15.4 (the SDK 57 version) and
`lucide-react-native` 1.48.0 (the web's icon family). Sheets, slider, popover and toasts are built on Reanimated +
Gesture Handler; there is no bottom-sheet, slider or NativeWind package.

**Tokens.** Everything visual comes from `@vitana/tokens` through `src/ui/theme/index.ts`. Until N1's package lands,
the alias points at `src/ui/theme/tokens-stub.ts`, which is the module shape N1 must export (`TOKENS_VERSION`,
`ColorScheme`, `ShadowStyle`, `TenantId`, `SemanticColors`, `VitanaTokens`, `tokens`) with the values copied from
`src/index.css` / `tailwind.config.ts` (source line per group). `tests/ui/tokens-contract.test.ts` checks whatever
the alias resolves to. When N1 lands: point both aliases at the package and delete the stub. The raw colours the web
primitives still use (button `solid`/`soft`/`pill`, badge `success`, select trigger, progress gradient, overlay
scrims) are in `src/ui/theme/legacy-literals.ts` with their web line; a guard test forbids colour literals anywhere
else in `src/ui/`.

**Provider.** `<VitanaUIProvider colorScheme={…} tenant={…} direction={…}>` (default `light`, like the web's
`defaultTheme`). Only the outermost provider renders the `GestureHandlerRootView`, the overlay root and the toast host;
a nested one only overrides theme values for its subtree. N3 mounts it in `app/_layout.tsx` inside
`SafeAreaProvider` and `I18nProvider`. Hooks: `useTheme()`, `useDirection()`, `useReducedMotion()`.
`useOrbSuppressed()` / `subscribeOrbSuppression()` report the web's `body[data-dialog-open]` (Dialog, Sheet, Drawer,
ResponsiveDialog only) for N6.

**Web → native prop map** (for the Wave 2 ports):

| Web | Native |
|---|---|
| `onClick` | `onPress` |
| `className` | `style` (`overlayClassName` → `overlayStyle`) |
| `aria-label`, `aria-*`, `role` | pass through (React Native 0.86 accepts them) |
| `id` + `<Label htmlFor>` | `<Label nativeID>` + `accessibilityLabelledBy` |
| `<Input onChange={e => …e.target.value}>` | `onChangeText={text => …}`; `type` → keyboard / secure entry; `disabled` → not editable |
| `asChild` | `asChild` (`Slot` merges `onPress`, `style`, `disabled`, accessibility props) |
| `toast(…)` from `sonner` | `toast(…)` from `@vitana/ui/sonner` (same call shape) |
| `notify*(titleKey, descKey?, params?)`, `toast({…})`/`useToast()` | same, from `@vitana/ui` |

**Documented native differences:** `Select` opens a bottom-sheet list with a check on the selected item (the web
uses a popper dropdown); `Tooltip` is a long-press hint (no hover; a string content is also the trigger's
`accessibilityHint`); pressed states replace hover; every close button sits at the **inline end** (it flips in
Arabic); the `Dialog` close button is visible (the web hides it with `[&>button]:sr-only`, `dialog.tsx:63`); the web
drawer has no close button, the native one shows one only with `showCloseButton`; `shouldScaleBackground` is accepted
and ignored; a range `Slider` has one thumb per value; `Progress` fills from the inline start.

**Catalogue.** `/native-ui-catalogue` (`app/native-ui-catalogue.tsx`) shows every primitive in every variant, size
and state, overlays launched by buttons and every toast kind, with a light/dark switch and the current direction. It
renders only for the `development` and `test-g1` profiles (else it redirects to `/`) and is listed in the parity
ledger's `native_only`. Open it in a dev client at `maxina://native-ui-catalogue`. Its visible text uses only the
existing keys in `src/ui/catalogue-keys.ts`.

### Web defects found

Found while mirroring the web primitives. Reported to the owner; each gets its own VTID only after its own sparring —
**not fixed in N2**, which touches no web file.

| Web defect | Where | What the native kit does |
|---|---|---|
| The slider draws one thumb even for a `[min, max]` range, so the second value of the community age-range filter cannot be dragged | `src/components/ui/slider.tsx:21`; `src/components/intents/FindMatchFilterSheet.tsx:149-155` | one thumb per value (Radix semantics) |
| The progress bar fills from the physical left in Arabic (physical `translateX`) | `src/components/ui/progress.tsx:20` | fills from the inline start |
| The drawer's `shouldScaleBackground` (default `true`) is inert: no `vaul-drawer-wrapper` exists anywhere, so the prop promises a behaviour the app never shows | `src/components/ui/drawer.tsx:7-15` | accepted and ignored |
| Close buttons stay on the physical right in Arabic instead of the inline end | `dialog.tsx:69`, `sheet.tsx:71`, `responsive-dialog.tsx:128-130`, `responsive-popover.tsx:160-168` | inline end in both directions |

## Fonts

The editorial font Cormorant is licensed under the SIL Open Font License 1.1 (Google Fonts), which permits embedding
in app binaries. It is bundled in Wave 1 (program decision 8).
