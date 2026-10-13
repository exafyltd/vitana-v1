# apps/mobile — Vitana native app

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

## Wave 1 / N3 — shell, auth, identity, i18n + RTL, theming (VTID-05186)

| Area | Where | Notes |
|---|---|---|
| Config | `src/config/env.ts`, `src/ports/env.ts` | adds `authRedirectUrl`, `webBaseUrl` (both through `assertNotProduction`) and the Google client ids. Unset → `ConfigMissing` screen, never a default. N1 owns `requireValue`, `endpoints`, the key check. |
| Auth | `src/auth/` | supabase-js session in SecureStore (1,800-byte chunks, mutex + versioned reads), `AuthProvider` (same `useAuth()` shape), password / Apple / Google sign-in, PKCE for Apple on Android. |
| Identity | `src/identity/` | tenant, role preference, memberships, patient access, partner orgs, business mode, role switch, guided mode, language (`stt_language` + `tts_voice` rule). Admin consoles open in the system browser at `webBaseUrl`, else the `native.adminInBrowser` sheet. |
| Shell | `src/shell/` | `MobileAppShell`, `TopAppBar`, `BottomNav` (ORB slot in the centre), `SideDrawer`, `RoleSwitcherSheet`, `MobileModePill`, `PublicShell`, `LanguageSheet`. Rules that live inside web component bodies are mirrored in `src/shell/logic/` and pinned (below). |
| Routes | `app/` | `/` landing redirect, `(public)` auth screens, `(app)` AuthGate + shell + the resolver route `[...path]` (every ledger destination: Unported / web console / not found). Paths equal web paths. |
| Theme | `src/theme/` | `light` default (like the web), `dark`, `system`; tenant brand from `tenantBrand(slug)`. RTL: the shell root's `direction` follows the language; styles use start/end only (a test scans for left/right). |

**Ports.** Shell code imports lane code only through `src/ports/*` (`core`, `env`, `tokens` → N1; `ui` → N2; `links` → N4;
`orb-slot` → N6; `badges`, `soundscape` for screen lanes). `*.stub.ts(x)` files stand in for N1/N2 on the branch only;
`tests/ports.test.ts` fails as soon as the lane a stub waits for is present and the stub still exists — the port is then
switched in one file and the stub deleted, before PR-S merges.

**Source pins.** `node scripts/native/check-shell-pins.mjs` compares each mirrored web range (token stream, comments and
whitespace ignored) with `scripts/native/shell-pins.json`, and `src/navigation/guest-paths.ts` with the App.tsx
`<AuthGuard allowGuest>` routes. On "web shell rule changed": update the native file, then the hash (`--print`).
It runs in NATIVE-CI through `node --test scripts/native/__tests__/`.

**Device journeys.** `maestro/shell/*.yaml` are run only on G1 with native builds (STATUS row 8b), never in CI.

## What waits for which gate

| Work | Waits for |
|---|---|
| Native builds (`expo prebuild`, Gradle/Xcode), simulators, Maestro, screenshot parity | STATUS row 8b: macOS minutes (iOS), G1 for signed-in screens |
| Running sign-in, tenant/role RPCs, any network call on a device | G1 (isolated test environment); Apple on a device also G3 |
| Push, React Native Firebase, `google-services` files | G2 |
| Store identifiers, signing, store listings | G3 |
| `packages/core`, `packages/tokens`, npm workspaces, NativeWind, UI kit | Wave 1, each with its own sparred plan |

## Fonts

The editorial font Cormorant is licensed under the SIL Open Font License 1.1 (Google Fonts), which permits embedding
in app binaries. It is bundled in Wave 1 (program decision 8).
