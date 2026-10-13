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
| `packages/core`, `packages/tokens`, npm workspaces, NativeWind, UI kit | Wave 1, each with its own sparred plan |

## Fonts

The editorial font Cormorant is licensed under the SIL Open Font License 1.1 (Google Fonts), which permits embedding
in app binaries. It is bundled in Wave 1 (program decision 8).

## Health Sync (VTID-05184, Wave 1 N5a)

`src/health-sync/` reads Apple Health (HealthKit) and Health Connect and sends to the Health Sync ingest, **contract
v1**. Read-only, Vitana consent before any OS permission, dark behind the N4 `health_sync` flag. It builds no screen:
`createHealthSync(ports)` and `useHealthSyncState()` (`src/health-sync/index.ts`) are the only public entry for the
Wave 2 Health lane, which maps state to catalogue keys.

| | |
|---|---|
| Contract | `src/health-sync/contract/v1/` — `contract-v1.schema.json`, `contract-v1.lock.json`, `golden.json` vendored byte for byte from vitana-platform, sha256 in `VENDOR.json` (tests fail on any drift) |
| Re-vendor | `node scripts/native/vendor-health-sync-contract.mjs --from <vitana-platform checkout> --commit <C1 merge commit>` — a contract change reaches the app only through a re-vendor PR |
| Flag | N4 app config `health_sync` per platform; the shipped stub is always off, and the N3 auth stub is always signed out, so nothing runs until both land |
| Libraries | `@kingstinct/react-native-healthkit@16.0.0` (+ `@react-native-healthkit/core@16.0.0`), `react-native-nitro-modules@0.37.1`, `react-native-health-connect@4.1.3`, `expo-sqlite@57.0.3` (SQLCipher), `expo-secure-store@57.0.4`, `expo-crypto@57.0.3`, `expo-background-task@57.0.20`, `expo-task-manager@57.0.20`, `expo-build-properties@57.0.22`, `expo-file-system@57.0.7`, `pako@2.1.0`; dev `ajv@8.17.1` |
| Config | `app.config.ts` `HEALTH_SYNC_PLUGINS` + `plugins/`: HealthKit read-only (no update string, background delivery, no clinical access), purpose string from `screens.nativeHealthSync.osPermission.iosShareUsage` in all 11 locales (N5b, VTID-05185 — prebuild **fails closed** without it), Health Connect READ permissions only, **Android minSdk 26 for the native build** (Health Connect library minimum), SQLCipher |
| Local data | queue, anchors, ledger and indexes in one SQLCipher database in the cache directory (outside iCloud and Auto Backup), key in the keychain/keystore `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`; purged on withdrawal, sign-out, member switch and every "not consented" answer; logs carry codes and counts only |
| Tests | `tests/health-sync/` — golden serializer, ajv schema validation, 500 random cases, every response code, consent before permission, anchors, purge scope, sleep grouping, config plugins. No test makes a network call |

**Waits for:** G1 (device tests: simulator/emulator with Health data, background wakes, the pako gzip round trip on
Hermes, the SQLCipher store against the same conformance suite), G3 (HealthKit capability on a real App ID), N3/N4
(real auth and flag instead of the stubs), and the legal lane's native `/privacy` screen (the Health Connect
rationale link opens `/privacy`, which is not-found until then).

**Store review (Wave 3):** Apple — HealthKit capability, `NSHealthShareUsageDescription` in 11 locales, no update
string, privacy policy URL, App Privacy labels (Health & Fitness, linked, not tracking), guideline 5.1.3 (no
advertising use, no health data in iCloud), reviewer notes on consent-before-permission with a non-production demo
account. Google Play — Health Connect declaration for every READ permission plus `READ_HEALTH_DATA_HISTORY` and
`READ_HEALTH_DATA_IN_BACKGROUND`, Health apps declaration, Data safety form, the rationale screen, and the minSdk 26
decision (owner item at the store-release Gate 2, with the API 24–25 install share as evidence).
