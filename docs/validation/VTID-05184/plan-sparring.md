# VTID-05184 — Plan Sparring record (Native Wave 1 N5a — Health Sync module, HealthKit + Health Connect, contract v1)

- **VTID:** VTID-05184 (vitana-v1, "N5a" — the module in `apps/mobile/**`). Shared plan with **VTID-05185** ("N5b" — the
  OS permission strings under `src/i18n/**`, its own PR, staging verification and Gate 2), allocated from the same
  sparring record.
- **Program:** native app **VTID-05021**, Wave 1 "Health Sync module (contract v1)"; consumer of Health Hub C1
  (**VTID-05164**, vitana-platform #4107) shared interface S1, Health Hub plan **VTID-05020**.
- **Sparring session:** `9d78eef0-08c3-4747-b124-8c99c972378d` (`plan_sparring_sessions`).
- **Partner:** the independent `plan-sparring-partner` agent (read-only).
- **Change class:** standard. **Rounds:** 2. **Verdict: CONVERGED.**
- **Plan hash (round 1):** `3c1a72f2025967b25d40b0da3650a8f53d0e4037873f258930347041b607f383`
- **Plan hash (final):** `90f7dbae95f28604bbcf1223eea08b81f1a69da4de446265fb51340b0dd08a54` — sha256 of the text strictly
  between the plan begin and end markers below.
- **Owner approval:** d.stevanovic@exafy.io in the Claude Code session — Gate 1 2026-10-13: owner delegated decisions ("Continue and make the decisions yourself"; "build in parallel … quickest possible"); planner defaults taken (Open questions 1–9: native-build-only minSdk 26 confirmed at the Wave 3 store-release Gate 2; serializer matches the golden timestamp formats and compares instants; two-day deferral band; heart-rate stats from samples; HealthKit sleep grouping at 60 min / 24 h cap with value = end − start; no iOS revoke heuristic; N5b as its own VTID; DE/EN usage wording approved at Gate 1; READ_HEALTH_DATA_HISTORY requested).

`N5a` in the plan text is VTID-05184 for this PR and `N5b` is VTID-05185 (the plan was hashed before allocation, so
the placeholders are kept verbatim below). This PR implements N5a only: Changes 2–13, the Interfaces stubs, the N5a
Tests and the round-1 planner responses.

## Rounds

| Round | Finding | Severity | Answer |
|---|---|---|---|
| R1 | F1 — the server's platform/kind pairing (`contract-v1.ts:289-291`) needs a client-side backstop | major | **Accepted** — `sourceFor(Platform.OS)` is the only producer of `source`; `assertSourceConsistent` refuses any mismatch and any platform other than the running OS before gzip and send; tests on both platforms and a deliberate mismatch that never reaches `HttpPort` (Change 8, Tests "Source block") |
| R1 | F2 — Health Connect needs Android minSdk 26; the skeleton is at API 24 | major | **Decision (coordinator)** — the raise applies to the native build only (`expo-build-properties`); owner-facing item at the Wave 3 store-release Gate 2 with a read-only API 24–25 install-share evidence step; reversible; web and Appilix unaffected; not a pre-implementation blocker (Change 4, Rollout 5, open question 1) |
| R1 | F3 — "not consented" / paused purges must be scoped to this install's source and that category | major | **Accepted** — `CATEGORY_NOT_CONSENTED`, `403 CONSENT_REQUIRED` and `409 SOURCE_PAUSED` act only on (this install's source, category); local state keyed by `(user_id, install_id, kind)`; two-source, two-category test (Changes 8, 9; Tests "Purge scope") |
| R1 | F4 — `INVALID_RECORD` also covers the store's `MISALIGNED_BUCKET` | minor | **Accepted** — dropped and counted without `contract_mismatch`, on purpose (Change 9) |
| R1 | F5 — `series_sample_index` has no bound | minor | **Accepted** — 35-day TTL from the sample's end, a sweep at the start of every pass, a 200,000-row cap per source with oldest-first eviction; an evicted id only causes a reconciliation pass (Change 7, Tests) |
| R1 | F6 — gzip on Hermes (no TextEncoder) | minor | **Accepted** — pako 2.1.0 encodes strings itself (`lib/deflate.js:211-214`, `lib/utils/strings.js:26-`); G1 device round-trip check added (Change 8, Tests "Device") |
| R1 | F7 — the 60-minute sleep grouping gap is not an Apple convention | minor | **Accepted** — config value `SLEEP_GROUP_GAP_MIN`, labelled a planner choice, flagged to the C1 owner (Change 7, open question 5) |
| R1 | F8 — the N5b staging test must cover every locale | minor | **Accepted** — both keys checked in all 11 locale catalogues (Rollout 2) |
| R1 | F9 | — | No change needed |
| R1 | Q2 — an offline backlog crossing the 31-day boundary | question | **Answered (conservative)** — deferrals store only a key and a due time; the 1-hour interval is re-derived from the OS when due; a queued 5-minute item that enters the band leaves the queue and becomes a deferral; paced at 60 batches/hour (Change 7) |
| R1 | Q3 — an expired change token vs the 90-day backfill | question | **Answered (conservative)** — the original backfill window is re-derived and diffed against `sent_ledger`; only changes are uploaded; `sent_ledger` keeps ≥ backfill window + 30 days (Change 7) |
| R1 | Q4 — maximum sleep session duration | question | **Accepted** — `SLEEP_SESSION_MAX_H` = 24 h (planner choice); split at the longest internal gap; an unsplittable group is dropped and counted as `sleep_session_over_cap` (Change 7, Tests) |
| R2 | — | — | **CONVERGED** (no open findings) |

## Final plan

<!-- plan:begin -->

## Meta
- **Change class:** standard. One sparred plan, two VTIDs, merged in this order:
  - **N5b — OS permission strings (vitana-v1 `src/i18n/**`).** The HealthKit usage text (and the shared label used by
    the Health Connect rationale hand-off) as catalogue keys, DE first. `src/i18n/**` is a web deploy path, so N5b has
    its own STAGING-VERIFY and Gate 2. It merges first because N5a's config plugin resolves these keys.
  - **N5a — the module (vitana-v1 `apps/mobile/**` only).** It deploys nothing: NATIVE-CI only, no web or gateway
    deploy, so it has no Gate 2 (Autonomy Contract: done when merged with green checks).
- **Program:** native app VTID-05021, Wave 1 "Health Sync module (contract v1)" (`NATIVE-APP-PLAN.md:196`), the
  consumer named by Health Hub C1's shared interface S1 (`p1c-plan.md:129`).
- **Hard dependencies:**
  - **C1 (VTID-05164, vitana-platform #4107) merged**, so contract v1.0 is frozen. N5a vendors its schema and golden
    fixtures and pins their sha256 (Change 2). N5a may be drafted earlier but merges only after C1, because a vendored
    schema from an unmerged branch could still change.
  - **N3 (native auth session) and N4 (app-config client + `GET /api/v1/app-config`)** are separate Wave 1 VTIDs. N5a
    consumes them through two small ports and ships stubs (Interfaces). If N3 or N4 merges first, N5a wires the real
    implementation in the same PR instead of the stub.
  - **Runtime only, not merge blockers:** D10 WP1 (VTID-05092) for the consent endpoints; A1/A2/B1 and the ingest flag
    for a real ingest; G1 for any device test; G3 for the HealthKit capability on a real App ID.
- **Repos and areas (vitana-v1 only; vitana-platform is read-only for this plan):**
  - N5a: `apps/mobile/src/health-sync/**` (new), `apps/mobile/src/health-sync/contract/v1/**` (vendored, new),
    `apps/mobile/plugins/**` (new config plugins), `apps/mobile/modules/health-connect-rationale/**` (new, a few lines
    of Kotlin), `apps/mobile/app.config.ts`, `apps/mobile/package.json` + `package-lock.json` (own lockfile),
    `apps/mobile/jest.config.js` (setup file for native mocks), `apps/mobile/tests/health-sync/**` (new),
    `apps/mobile/README.md`, `scripts/native/vendor-health-sync-contract.mjs` (new),
    `scripts/native/gen-ios-locales.mjs` (new).
  - N5b: `src/i18n/<11 locales>/screens.json` (new `screens.nativeHealthSync.*` keys), regenerated
    `docs/SCREEN_INVENTORY.md`.
- **Regulatory impact:** this is the client end of the Art. 9 ingest path. The module never asks the OS for a health
  permission before the member has granted the matching Vitana consent (`sync_<category>` × source). It requests read
  access only, never write. It stores queued health values only encrypted, outside iCloud and Android Auto Backup,
  and it purges them on withdrawal, sign-out and every "not consented" answer. It sends no health value or record id to
  any log or analytics.
- **Production safety:** `apps/mobile/src/config/env.ts` already refuses production and staging hosts and has no default
  URL (`env.ts:19-24, :48-55, :68-74`). The ingest client takes the gateway URL only through `requireUrl(config,
  'gatewayUrl')`, so no N5 build can reach production. No test in this plan makes a network call.

## Facts (file:line; vitana-platform paths are on the C1 branch `wt-c1` unless marked origin/main)
**The contract the module implements (C1, PR #4107)**
- F1 The schema source is zod in `services/gateway/src/services/health-sync/contract-v1.ts`; the request body is
  `BatchV1` (`:239-246`): `contract_version`, `batch_id` (uuid), `source{kind, install_id, platform, os_version,
  app_version, device?}` (`SourceV1`, `:198-205`), `sync_mode: incremental|backfill`, `records[] ≤ 1,000`,
  `deletions[] ≤ 1,000`. Every object is strict (`z.strictObject`). A record (`RecordV1`, `:220-232`) has `record_id`,
  `type`, `value?`, `stats?{n,sum,min,max}`, `unit`, `start`, `end` (ISO-8601 with offset), `tz`, `origin_app_id?`,
  `stages?` (≤ 200, `SleepStageV1` `:207-211`, stage ∈ awake|light|deep|rem|asleep|in_bed|out_of_bed).
  `apple_health` must go with `ios` and `health_connect` with `android` (`:289-291`).
- F2 Limits (`HEALTH_SYNC_LIMITS`, `:58-74`): 512 KB as sent, 4 MB inflated, 1,000 records, 1,000 deletions, 200 sleep
  stages, `tooOldDays` 400, future tolerance 5 min, default backfill 90 days, 5-minute intervals within 30 days.
- F3 Catalogue v1 (`HEALTH_SYNC_CATALOGUE_V1`, `:99-116`) with HealthKit / Health Connect identifiers: activity —
  `steps`, `active_energy`, `exercise_minutes`, `distance`, `workout`; sleep — `sleep_session`; heart — `heart_rate`,
  `resting_heart_rate`, `hrv_sdnn` (HealthKit only), `hrv_rmssd` (Health Connect only); body — `body_weight`,
  `body_fat_percentage`. Kinds, UCUM units and plausibility ranges come from A's catalogue and are published by
  `GET /contract`; the golden "contract self-check" response pins them: `steps` series_sum `{steps}`, `active_energy`
  series_sum `kcal`, `exercise_minutes` series_sum `min`, `distance` series_sum `m`, `workout` record `min`,
  `sleep_session` record `min`, `heart_rate` series_stats `/min`, `resting_heart_rate` record `/min`, `hrv_sdnn` and
  `hrv_rmssd` record `ms`, `body_weight` record `kg`, `body_fat_percentage` record `%`
  (`docs/programs/health-hub/health-sync-v1/golden.json`, case 1).
- F4 Error codes: per record `UNSUPPORTED_TYPE, UNIT_MISMATCH, IMPLAUSIBLE_VALUE, OUT_OF_WINDOW,
  CATEGORY_NOT_CONSENTED, INVALID_RECORD, STORE_UNAVAILABLE` (`contract-v1.ts:153-161`); only `STORE_UNAVAILABLE`
  carries `retryable:true`, meaning "re-send in a NEW batch" (`adapter.ts:104-105, :381-382`;
  `HEALTH-SYNC-CONTRACT-v1.md` §6). Batch codes with status and retryable (`contract-v1.ts:169-183`): `INVALID_BATCH`
  400, `UNSUPPORTED_CONTRACT_VERSION` 400, `UNAUTHENTICATED` 401 (retryable), `TENANT_REQUIRED` 400,
  `CONSENT_REQUIRED` 403, `SOURCE_PAUSED` 409, `INGEST_DISABLED` 409, `BATCH_ID_REUSED` 409, `BATCH_TOO_LARGE` 413,
  `UNSUPPORTED_ENCODING` 415, `RATE_LIMITED` 429 (retryable), `STORE_PENDING` 503 (retryable), `STORE_UNAVAILABLE`
  503 (retryable). The shared auth middleware can also answer `403 TENANT_NOT_MEMBER`, `503 TENANT_CHECK_UNAVAILABLE`
  and `403 DELEGATED_TOKEN_NOT_ALLOWED` with `{ok:false, error, message}`; `/status` and `/source-state` answer
  `400 INVALID_REQUEST` (contract §2, §7).
- F5 Device pre-aggregation (contract §3.1; `p1c-plan.md:141`): series codes go as one item per aligned UTC interval,
  5 minutes when `start` is within the last 30 days, 1 hour when older, `record_id = "<type>:<start ISO UTC>"`, `value`
  for series_sum, `stats` for series_stats, a changed interval re-sent whole, an emptied interval sent as a deletion.
  The store decides the interval by its own clock and checks only `start % interval` (`health-store/ingest.ts:331,
  :334`), so a 1-hour item whose start is inside the 30-day window is accepted as if it were a 5-minute bucket, and a
  5-minute item that crosses the boundary before it is sent is `MISALIGNED_BUCKET` → `INVALID_RECORD`.
- F6 Record codes: one item per OS object, `record_id` = HKObject UUID / Health Connect `metadata.id` (contract §3.2).
- F7 Idempotency: batch `(member, batch_id)` — the same content replays with `replay:true`, different content is `409
  BATCH_ID_REUSED`; record `(source, record_id)` — resend `duplicate`, change `updated` (contract §6). The app keeps
  anchors and change tokens on the device and advances them after a `200`, whatever the per-record outcomes.
- F8 Order in the adapter (`adapter.ts:1-28, :262-341`): unknown type → `UNSUPPORTED_TYPE` (never sent on); consent per
  category present, one read each, before the source is resolved; no consented category and no deletion → `403
  CONSENT_REQUIRED {categories}`; deletions always pass; a phone source is created on first sync
  (`create:true`); a paused or disconnected source → `409 SOURCE_PAUSED`.
- F9 Ingest route (`routes/health-ingest.ts`): order gate (409, nothing read) → per-IP limit → auth → per-member limit
  (120 batches/hour, `:219-226`) → 10 concurrent per member (`:228-249`) → body ≤ 512 KB read raw, only `identity` or
  `gzip` encoding, `Content-Type: application/json` required (`:265-296`). `GET /status` resolves the source without
  creating it and returns `source_state`, per-category consent, `ingest_enabled`, `store` (`:299-337`).
  `POST /source-state` maps `os_permission_revoked` → `paused` and `active` → `connected` only for a source paused that
  way; a disconnected source stays disconnected (`:340-385`; `health-sources.ts:235-243`). The write routes answer `409
  INGEST_DISABLED` on staging and whenever `HEALTH_SYNC_INGEST_ENABLED` is not exactly `true` (`:68-73`).
- F10 Store quotas the app must pace against: 500 batches and 50,000 items per member per day, 250,000 during the first
  7 days of a source (backfill grace); `start` before `2025-07-01` is too old (`health-store/ingest.ts:140-152`).
  `QUOTA_EXCEEDED` maps to `429 RATE_LIMITED`.
- F11 Lock: `contract-v1.lock.json` pins `1.0` → sha256 `69ee9a4f6648bb7d5d3830820492aaf336b447c167cc9c465087ee1ee0c52913`,
  which is the sha256 of the bytes of `contract-v1.schema.json` (`test/health-sync/contract.test.ts:40-50`; checked
  with `sha256sum`). The schema is draft 2020-12 with `additionalProperties:false` throughout.
- F12 Golden fixtures (`golden.json`, clock `2026-10-13T12:00:00.000Z`, 11 cases): contract self-check; activity stored;
  replay; interval updated + emptied interval deleted; sleep not consented (dropped per record, steps stored); nothing
  consented 403; per-record rejections (`blood_glucose` → `UNSUPPORTED_TYPE`, `[lb_av]` → `UNIT_MISMATCH`, 999 kg →
  `IMPLAUSIBLE_VALUE`, 2024 start → `OUT_OF_WINDOW`); unknown field 400; major 2 → 400; no token 401; staging 409.
  **Timestamp formatting in the golden requests is not uniform:** a series item has `start` without milliseconds
  (`2026-10-13T08:00:00Z`), `end` and `record_id` with milliseconds (`…08:05:00.000Z`); record items use the local
  offset (`2026-10-12T22:31:00+02:00`). The C1 golden test builds them that way (`test/health-sync/golden.test.ts:36-39`).

**Consent API (D10 WP1 + C1)**
- F13 `GET /api/v1/health/consents` returns the catalogue (`key, resource_type, scope, per_resource,
  current_text_version, processing_active`) and the member's consents (`services/consent/health-consent.ts:620-640`).
  `POST /api/v1/health/consents/grant {category, resource_id?, text_version, locale, granted_via?}` and
  `POST /revoke {category, resource_id?, locale?}` (`routes/health-consent.ts:1-22, :118-170, :172-205`), mounted at
  `/api/v1/health/consents` (`index.ts:1244`). A `sync_*` grant must name `apple_health`, `health_connect` or an
  aggregator connector (`:142-144`); `granted_via` may be `native_health_sync` (`health-consent.ts:138`); `locale` must
  be one of the 11 consent locales (`:130-134`); `STALE_TEXT_VERSION` 409, `CONSENT_STORE_PENDING` 503. A revoke never
  checks that the connector still exists and always works.
- F14 **On vitana-platform origin/main (`1e508fb3c`) none of this exists yet:** `routes/health-consent.ts` has no history
  on main and `index.ts` mounts neither `/api/v1/health/consents` nor `/api/v1/health/ingest`. Both arrive with D10 WP1
  (VTID-05092) and C1.
- F15 The web consent wording rules (C3, vitana-v1 #1383, draft): keys
  `screens.settings.healthConsent.<category>.<version>.{title,body,checkbox}`, a draft gate (a version is grantable
  only when the lock manifest lists it `released` for the displayed locale), and "the locale sent to the gateway is the
  locale whose text was actually displayed" (`src/lib/health-consent-wording.ts` on that branch). The four `sync_*`
  keys and `apple_health`/`health_connect` are already listed there.

**The native skeleton (vitana-v1 origin/main `d7109abf2`)**
- F16 `apps/mobile` is Expo SDK 57 (`expo@57.0.25`, RN 0.86.3, React 19.2.3), exact pins, own lockfile, not a root
  workspace (`apps/mobile/package.json:18-44`; `README.md:9-12`). Minimum OS iOS 16.4, Android API 24 (`README.md:10`).
- F17 `app.config.ts` has only `development` and `test-g1` profiles, `.dev` identifiers, plugins
  `['expo-router','expo-localization']`, no credentials (`:16-53`); a test pins "no production profile, no store
  identifiers, no googleServicesFile" (`tests/app-config.test.ts`).
- F18 NATIVE-CI runs on Linux: `npm ci`, `expo install --check` offline, i18n map, typecheck, jest-expo, Metro bundle for
  iOS and Android; no prebuild, no native build, no secrets (`.github/workflows/NATIVE-CI.yml:1-90`). Native builds wait
  for macOS minutes and G1 (`README.md:57-65`). Tests live in `apps/mobile/tests/` (`jest.config.js:3-7`).
- F19 Native i18n reads the web shards through a generated static map; no hardcoded user-visible text; new keys go to
  `src/i18n/de/` first, which is a web deploy path (`README.md:41-48`).
- F20 Native plan: auth through supabase-js with the session in expo-secure-store (`NATIVE-APP-PLAN.md:151`);
  app-config endpoint with fail-safe defaults "features default off" (`:165-167`); G1 is the only test environment
  (`:100-116`).
- F21 There is a web `/privacy` route (`src/App.tsx:844`); there is no native `/privacy` route yet (the Public/legal
  Wave 2 lane ports it).

**Libraries (npm registry, read 2026-10-13; "≥ 2 weeks old" = published on or before 2026-09-29)**
- F22 Expo SDK 57's `bundledNativeModules.json` (in `expo@57.0.25`) pins `expo-secure-store ~57.0.4`,
  `expo-background-task ~57.0.20`, `expo-task-manager ~57.0.20`, `expo-crypto ~57.0.3`, `expo-sqlite ~57.0.3`,
  `expo-build-properties ~57.0.22`, `expo-file-system ~57.0.7`. Publish dates: secure-store 57.0.4 2026-09-11,
  background-task 57.0.20 2026-09-24, task-manager 57.0.20 2026-09-24, crypto 57.0.3 2026-09-11 (57.0.4 is
  2026-10-12, too new), sqlite 57.0.3 2026-09-11 (57.0.4 is 2026-10-06, too new), build-properties 57.0.22
  2026-09-24, file-system 57.0.7 2026-09-11.
- F23 `@kingstinct/react-native-healthkit@16.0.0` (2026-09-18, MIT; 16.1.0/16.2.0 are newer than two weeks): Nitro
  module, peers `react >=19`, `react-native >=0.79`, `react-native-nitro-modules >=0.35`; depends on
  `@react-native-healthkit/core@16.0.0`. API used here: `requestAuthorization`, `queryQuantitySamplesWithAnchor`,
  `queryCategorySamplesWithAnchor`, `queryWorkoutSamplesWithAnchor` (each returns `samples`, `deletedSamples`,
  `newAnchor`), `queryStatisticsCollectionForQuantity`, `queryQuantitySamples`, `subscribeToObserverQuery`,
  `configureBackgroundTypes` (observers registered natively at launch, persisted, survives termination),
  `isHealthDataAvailable`, `isProtectedDataAvailable`. Its config plugin adds `com.apple.developer.healthkit`, the
  background-delivery entitlement (default on) and `NSHealthShareUsageDescription`/`NSHealthUpdateUsageDescription`
  (the update text can be turned off with `false`). `QueryStatisticsResponse` has average/min/max/sum but **no sample
  count**. HealthKit does not reveal whether **read** access was denied (`authorizationStatusFor` reports share status).
- F24 `react-native-health-connect@4.1.3` (2026-08-06, MIT): peers `expo`, `@expo/config-plugins`; Android minSdk 26,
  compileSdk 35, `androidx.health.connect:connect-client:1.1.0`. API used: `getSdkStatus`, `initialize`,
  `requestPermission`, `getGrantedPermissions` (incl. `BackgroundAccessPermission`, `ReadHealthDataHistory`),
  `readRecords`, `aggregateGroupByDuration`, `getChanges` (`nextChangesToken`, `changesTokenExpired`). Its config
  plugin adds the permissions-rationale intent filter and the Android 14 `ViewPermissionUsageActivity` alias, both
  pointing at the main activity; it adds **no** `<uses-permission>` entries.
- F25 `react-native-nitro-modules@0.37.1` (2026-08-27), `pako@2.1.0` (2022-11-07, MIT AND Zlib, no deps),
  `ajv@8.17.1` (2024-07-12). `fflate`'s registry shows old versions (0.4.9, 0.5.4, 0.6.11, 0.7.5) re-published on
  2026-07-20, which is why it is not chosen.
- F26 `expo-sqlite@57.0.3`: `openDatabaseAsync(name, options, directory)` takes a directory, and its config plugin
  supports `useSQLCipher`. `expo-secure-store@57.0.4` offers `keychainAccessible` incl. `AFTER_FIRST_UNLOCK` and the
  `…_THIS_DEVICE_ONLY` variant. `expo-background-task@57.0.20` takes `minimumInterval` (WorkManager on Android,
  BGTaskScheduler on iOS).

## Changes (numbered)

**N5b — OS permission strings (vitana-v1, `src/i18n/**`)**

1. **Catalogue keys, DE first.** Add `screens.nativeHealthSync.osPermission.iosShareUsage` (why Vitana reads Apple
   Health: the four categories, read-only, only after the member agreed in the app; du-form) and
   `screens.nativeHealthSync.osPermission.privacyPolicyTitle` to `src/i18n/de/screens.json`, mirrored to `en/`, the
   other nine locales through `scripts/translate-keys.mjs` marked `_pending_review`; run `npm run i18n:inventory` and
   commit `docs/SCREEN_INVENTORY.md`. There is no `NSHealthUpdateUsageDescription` key: the app never writes to Apple
   Health. No user-visible string is hardcoded in any plugin or Swift/Kotlin file.

**N5a — the module (vitana-v1, `apps/mobile/**`)**

2. **Vendored contract, hash-pinned.** `scripts/native/vendor-health-sync-contract.mjs --from <vitana-platform
   checkout>` copies `contract-v1.schema.json`, `contract-v1.lock.json` and `golden.json` into
   `apps/mobile/src/health-sync/contract/v1/` and writes `VENDOR.json {source_repo, source_commit, schema_sha256,
   golden_sha256}`. The source commit is C1's merge commit on vitana-platform main. A test fails when the schema's
   sha256 differs from `VENDOR.json` or from the lock's `1.0` value (`69ee9a4f…`, F11), and when the hand-written
   `catalogue.ts` (below) differs from the golden "contract self-check" catalogue. A contract change therefore reaches
   the app only through a re-vendor PR with a visible diff, never silently.
   - `contract/v1/catalogue.ts`: the 12 types with category, kind, UCUM unit, HealthKit identifier, Health Connect
     record type, and the OS read permission each needs. `contract/v1/wire.ts`: TypeScript types of the wire body and
     responses, plus `RECORD_ERROR_CODES` and `BATCH_ERROR_CODES` taken from the golden contract response.
3. **Dependencies (exact pins, each ≥ 2 weeks old, own lockfile, F16/F22–F25).**
   - `@kingstinct/react-native-healthkit@16.0.0` (+ its `@react-native-healthkit/core@16.0.0`),
     `react-native-nitro-modules@0.37.1`, `react-native-health-connect@4.1.3`.
   - Expo SDK 57 modules at their bundled range: `expo-secure-store@57.0.4`, `expo-sqlite@57.0.3`,
     `expo-crypto@57.0.3`, `expo-background-task@57.0.20`, `expo-task-manager@57.0.20`,
     `expo-build-properties@57.0.22`, `expo-file-system@57.0.7`.
   - `pako@2.1.0` (gzip in JS; Hermes has no built-in gzip). Dev only: `ajv@8.17.1` (draft 2020-12 validation in the
     golden tests).
   - Library choice: a maintained, Expo-plugin-equipped library per platform rather than a custom Expo module. The
     custom native code is limited to the tiny rationale hand-off in item 11. Rejected: `react-native-health` (last
     release 2024-10, no anchored-deletion coverage for all types); `expo-health-connect` (last release 2024-07).
   - `npm run deps:check` stays green (only Expo-bundled modules are checked; all are at their bundled range).
4. **Config plugins (`apps/mobile/plugins/`), added in `app.config.ts` for both profiles.**
   - HealthKit: the library plugin with `NSHealthShareUsageDescription` from N5b's key,
     `NSHealthUpdateUsageDescription: false`, `background: true` (adds `com.apple.developer.healthkit` and
     `com.apple.developer.healthkit.background-delivery`). No `com.apple.developer.healthkit.access` (no clinical
     records). `with-ios-health-locales.js` writes `InfoPlist.strings` per locale from the catalogue
     (`scripts/native/gen-ios-locales.mjs`, gitignored output, the same pattern as `gen-i18n-map.mjs`).
   - Health Connect: the library plugin (rationale intent + `ViewPermissionUsageActivity` alias) plus our
     `with-health-connect-permissions.js`, which adds exactly the READ permissions of the catalogue
     (`android.permission.health.READ_STEPS`, `READ_ACTIVE_CALORIES_BURNED`, `READ_EXERCISE`, `READ_DISTANCE`,
     `READ_SLEEP`, `READ_HEART_RATE`, `READ_RESTING_HEART_RATE`, `READ_HEART_RATE_VARIABILITY`, `READ_WEIGHT`,
     `READ_BODY_FAT`), `READ_HEALTH_DATA_HISTORY`, `READ_HEALTH_DATA_IN_BACKGROUND`, and the `<queries>` entry for
     `com.google.android.apps.healthdata`. No WRITE permission.
   - `expo-build-properties`: Android `minSdkVersion: 26` (Health Connect library minimum, F24). This raises the floor
     of the **native build only**, from API 24. The web app and the Appilix app are unaffected, and no member runs the
     native app before Wave 3, so no member is affected now. It is reversible at the build-properties level. It is
     recorded as an owner-facing item for the Wave 3 store-release Gate 2, with a read-only evidence step before then
     (Rollout 5). It is not a blocker for implementing N5a. `expo-sqlite` plugin with `useSQLCipher: true`.
     `expo-background-task` plugin.
   - Tests pin all of the above (Tests, "config").
5. **Architecture (`apps/mobile/src/health-sync/`), dark and lazy.**
   - `index.ts` is the only public entry: `createHealthSync(ports)` → `{ getState, grantConsent, revokeConsent,
     requestOsPermission, connect, disconnect, syncNow, onStateChange }` plus a `useHealthSyncState()` hook (state
     only, no UI, no strings).
   - The native readers live behind `readers/healthkit.ts` and `readers/health-connect.ts`, imported with a lazy
     `require` only when the platform matches and the N4 flag is on, so Expo Go and the Wave 0 `npm start` keep working
     and the Metro bundle never loads a Nitro module eagerly.
   - Pure modules with no native or network imports: `aggregate.ts` (interval alignment, series stats), `serialize.ts`
     (wire items, batches), `batcher.ts` (limits and size budget), `responses.ts` (the code → action table), `units.ts`.
     These are where the golden tests run.
   - Ports (Interfaces): `AuthPort` (N3), `AppConfigPort` (N4), `HttpPort` (fetch with timeout), `StorePort` (queue,
     anchors, ledger), `ClockPort`, `Logger`.
6. **Consent before OS permission (enforced in code).**
   - `getState()` reads `GET /api/v1/health/consents` (F13) and `GET /api/v1/health/ingest/status` for this install,
     both read-only.
   - `grantConsent(category, {text_version, shown_locale})`: the UI lane shows the released wording and passes the
     version and the locale it displayed (C3's draft gate, F15). The module checks `text_version` equals the
     catalogue's `current_text_version` for `sync_<category>` and then calls `POST /grant {category:'sync_<category>',
     resource_id: platform === 'ios' ? 'apple_health' : 'health_connect', text_version, locale: shown_locale,
     granted_via: 'native_health_sync'}`. `STALE_TEXT_VERSION` → `{status:'wording_changed'}` (the UI reloads);
     `CONSENT_STORE_PENDING`/`DB_UNAVAILABLE` → `{status:'unavailable'}`; nothing local changes on failure.
   - `requestOsPermission(categories)`: re-reads `GET /consents` (never a cache) and keeps only categories with an
     active grant for **this member** and **this source**. Only then does it call HealthKit `requestAuthorization`
     with read types of those categories and an empty share set, or Health Connect `requestPermission` with the READ
     permissions of those categories (+ `ReadHealthDataHistory`, + `BackgroundAccessPermission`). Any category without
     a grant returns `consent_required` and no OS call happens. OS permission is device-wide but consent is per member:
     a second member signing in on the same phone gets nothing read until they grant their own consent.
   - `revokeConsent(category)`: `POST /revoke` always works, also with the flag off (withdrawal never depends on the
     flag). Locally, at once: stop reading that category, purge its queued records, reset its anchors and change tokens,
     remove its background types. iOS cannot withdraw an OS permission from code; the state tells the UI so it can
     point the member to the Health app.
7. **Readers and device pre-aggregation (contract §3.1/§3.2).**
   - **Change detection, per type:** HealthKit anchored queries (`samples`, `deletedSamples`, `newAnchor`); Health
     Connect `getChanges` with one change token per record type (upserts and deletion ids). An expired Health Connect
     token (`changesTokenExpired`, which happens after about 30 days without a sync) is handled conservatively. The
     category's **original backfill window** (90 days, or 30 without the history permission) is re-derived from the OS
     and diffed against `sent_ledger`. Only changed or emptied intervals and changed or vanished records go out, and the
     run gets a fresh token. This avoids assuming that older data is rarely edited. It is cheap: the cost is OS
     aggregate queries plus a diff, and only real changes are uploaded. `sent_ledger` therefore keeps entries for at
     least the backfill window plus 30 days.
   - **Series codes** (`steps`, `active_energy`, `exercise_minutes`, `distance`, `heart_rate`): a change only marks
     interval keys dirty. Added samples mark the intervals they overlap. A deleted sample is mapped to its intervals
     through a local `series_sample_index (sample id → type, interval starts)`. A deleted id that is not in the index
     marks the type for a reconciliation pass. **Bound and eviction:** an entry lives 35 days from its sample's end time.
     A TTL sweep runs at the start of every pass and deletes expired rows. The index also has a hard cap of 200,000 rows
     per source; above it the oldest rows are evicted first. An eviction can only turn a later deletion into a
     reconciliation pass, never into lost or wrong data. For scale: a watch wearer produces roughly 1,500–3,000 series
     samples a day across the five series types, so 35 days is about 50,000–100,000 rows. Dirty intervals are then recomputed:
     - `series_sum`: HealthKit `queryStatisticsCollectionForQuantity` (cumulative sum, anchored at the aligned UTC
       boundary, interval 5 min or 1 h); Health Connect `aggregateGroupByDuration` (`COUNT_TOTAL`,
       `ACTIVE_CALORIES_TOTAL`, `DISTANCE_TOTAL`, `EXERCISE_DURATION_TOTAL`). Both de-duplicate overlapping sources
       (phone + watch) the way the OS shows totals.
     - `heart_rate` (`series_stats`): `{n,sum,min,max}` computed on the device from the samples in the interval
       (HealthKit `queryQuantitySamples`, Health Connect `HeartRateRecord.samples` bucketed by each sample's own time),
       because HealthKit statistics have no count (F23). The wire output is the contract's shape; the contract text
       names statistics queries, so this is recorded as a decision for the C1 owner (open question 4).
     - Each recomputed interval is compared with the local `sent_ledger (record_id → content hash)`: new → queued,
       changed → queued (server answers `updated`), unchanged → nothing, present in the ledger but now empty → a
       deletion of that `record_id`.
     - **Interval boundary (F5):** 5-minute intervals only when `start ≥ now − 29 days`, 1-hour intervals only when
       `start < now − 31 days`. Intervals in the two-day band between are deferred until they age past 31 days and go
       as 1-hour items. A deferral stores only the interval key and its due time, never a value. When it is due, the
       reader **re-derives the 1-hour interval from the OS at that moment**; stale queued values are never re-bucketed.
       A queued 5-minute item is re-checked before every send. Once it enters the band it is removed from the queue and
       becomes such a deferral. The same applies to an offline backlog: when the device comes back online, items that
       crossed the boundary are re-derived from the OS and sent through the normal queue. They are paced by the module's
       own limit (60 batches per hour per source), so a large backlog never bursts. This keeps device and server clocks (and a slow queue) from producing `MISALIGNED_BUCKET` or a
       1-hour value stored as a 5-minute bucket (open question 3 asks C1 for an explicit interval field in v1.1).
   - **Record codes:** one item per OS object. `workout`: HKWorkout UUID / ExerciseSessionRecord `metadata.id`, value
     = duration in minutes. `resting_heart_rate`, `hrv_sdnn`, `hrv_rmssd`, `body_weight`, `body_fat_percentage`: one
     item per sample. A HealthKit edit is a delete + add, which produces a deletion and a new item.
   - **Sleep:** Health Connect has a `SleepSessionRecord` with stages (`metadata.id`, stage map AWAKE→awake,
     SLEEPING→asleep, OUT_OF_BED→out_of_bed, LIGHT→light, DEEP→deep, REM→rem, AWAKE_IN_BED→awake, UNKNOWN dropped).
     HealthKit has only stage samples, no session object. Samples from the same source with gaps under
     `SLEEP_GROUP_GAP_MIN` (default 60, a config value) form one session. The 60 minutes is a **planner choice**, not an
     Apple-documented convention, and is flagged to the C1 owner (open question 5). A grouped session is capped at
     `SLEEP_SESSION_MAX_H` (default 24 h, planner choice). A group longer than the cap is split at its longest internal
     gap into sessions under the cap. If no such split exists (one continuous run over 24 h, implausible), it is
     dropped and counted under the diagnostic `sleep_session_over_cap`. Each resulting session gets `record_id` = the UUID of its earliest sample (an HKObject UUID, as §3.2 requires); stage
     map inBed→in_bed, asleepUnspecified→asleep, awake→awake, asleepCore→light, asleepDeep→deep, asleepREM→rem. A
     local `sleep_session_index` records which samples formed which session; when a member sample is deleted or the
     grouping changes, the old `record_id` is sent as a deletion and the new session as an item. `value` = session
     duration (end − start) in minutes, as in the golden fixture (open question 5). More than 200 stages: adjacent
     stages of the same kind are merged; if still over, the session goes without `stages`.
   - **Units (`units.ts`):** HealthKit read units `count`, `kcal`, `min`, `m`, `count/min`, `ms`, `kg`, `%`, mapped to
     the catalogue's UCUM units; HealthKit percent is a fraction, so `body_fat_percentage` × 100. Health Connect:
     `inKilocalories`, `inMeters`, `inKilograms`, `heartRateVariabilityMillis`, `beatsPerMinute`, percentage 0–100,
     durations in minutes. A type the vendored catalogue does not list is never read (glucose, reproductive and
     clinical types are not even requested).
   - **Fields:** `tz` = the sample's HealthKit time-zone metadata when present, else the device's IANA zone
     (`expo-localization`); `origin_app_id` = HealthKit `sourceRevision.source.bundleIdentifier` / Health Connect
     `metadata.dataOrigin` for record codes, omitted for series items (they merge sources). `source.device` is taken
     from the device (manufacturer, model). `os_version`, `app_version` from Expo constants.
   - **Timestamp format (F12):** series `record_id` and `end` with `toISOString()`, series `start` in UTC without
     milliseconds, record codes in the sample's local offset without milliseconds, so the output is byte-identical to
     the golden fixtures (open question 2 asks C1 to make the fixtures uniform; the golden test compares instants for
     `start`/`end` so either format passes).
   - **Window:** nothing with `start` older than `min(400 days, 2025-07-01)` is read or sent (F10); `end` is clamped
     to the device clock and items ending in the future are deferred.
   - **Backfill:** on first connect of a category, 90 days (`sync_mode:'backfill'`), newest first, paced so that a
     source sends at most 60 batches per hour (half the gateway limit) and stays inside the store's daily quota (F9,
     F10). On Health Connect, data older than 30 days before the first grant needs `READ_HEALTH_DATA_HISTORY`; without
     it the backfill is 30 days.
8. **Batching, compression and the offline queue.**
   - **Store:** `expo-sqlite` with SQLCipher, opened in the cache directory (`expo-file-system` `Paths.cache`), which is
     excluded from iCloud backup and Android Auto Backup. The key is a random 32-byte value in expo-secure-store
     (`AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`, so background tasks after first unlock can read it). The queue is a
     cache by design (next bullet): if the OS clears it, nothing is lost.
   - **Two anchors per type:** `read_anchor` (used for the next OS read) and `committed_anchor` (advanced only when every
     item derived from that read and all earlier reads of the type have a `200`). This is the contract's "advance
     after a 200" (F7) while keeping a durable local queue: after a reinstall-less queue loss (cache purge, DB
     corruption) the reader restarts from `committed_anchor`.
   - **Tables** (scoped by `user_id` and `install_id`): `items` (kind record|series|deletion, type, category,
     record_id, payload, content hash, read cycle, state), `batches` (batch_id, item ids, frozen_at, attempts,
     next_attempt_at, last_error code), `cycles`, `anchors`, `sent_ledger`, `series_sample_index`,
     `sleep_session_index`, `state`. Coalescing: a newer queued item for the same `record_id` replaces an older unsent
     one.
   - **Source block (backstop for `contract-v1.ts:289-291`):** `sourceFor(Platform.OS)` is the only producer of
     `source`. It returns `{kind:'apple_health', platform:'ios'}` on iOS and `{kind:'health_connect',
     platform:'android'}` on Android, and throws on any other platform. A pre-send assertion
     (`assertSourceConsistent(batch)`) runs on every frozen batch before it is gzipped. It refuses a batch whose
     `kind`/`platform` pair is not one of those two, or whose platform is not the running OS. The refused batch is never
     sent and raises a `client_error` diagnostic, so the server's 400 is never the first line of defence.
   - **One source per install:** a native install is exactly one source (`kind` + `install_id`). The queue, anchors,
     ledger and indexes are keyed by `(user_id, install_id, kind)`. Phase 2 aggregators are separate sources on the
     server side, with their own queues there, and are never mixed into this queue.
   - **Batch build:** FIFO, one batch in flight per source (ordering of updates and deletions is preserved; the gateway
     allows 10). ≤ 1,000 records and ≤ 1,000 deletions; packed against a size budget of 3.8 MB serialised and 480 KB
     gzipped (margins under 4 MB / 512 KB). `batch_id` = `expo-crypto` `randomUUID()`. The body is gzipped with
     `pako.gzip(jsonString)` and sent with `Content-Type: application/json` and `Content-Encoding: gzip`. pako 2.1.0
     accepts a string, ArrayBuffer or Uint8Array (`lib/deflate.js:211-214`). It encodes strings itself: it uses
     `TextEncoder` when present and otherwise falls back to its own pure-JS UTF-8 encoder (`lib/utils/strings.js:26-`).
     It therefore needs no `TextEncoder` on Hermes, and its output is a `Uint8Array` that `fetch` sends as the body. A
     G1 device check confirms that a gzipped batch round-trips on both platforms' Hermes (Tests, device).
   - **Frozen batches:** at the first send attempt a batch's content and `batch_id` are frozen; every retry sends the
     same bytes, so a timeout followed by a retry is a `replay` (F7). A batch still unsent after 24 hours is unfrozen and
     rebuilt with a new `batch_id` (record-level idempotency makes that safe), which also re-checks the interval band.
   - **Bounds:** at most 50,000 queued items per source. When full, the readers pause (the OS keeps the data and the
     read anchor does not move), so a long offline period loses nothing.
9. **Response handling (`responses.ts`, typed `Record<BatchErrorCode | AuthMiddlewareCode, Action>` so a code without a
   branch fails `tsc`).**
   - `200` (also `replay:true`): mark items acked, update `sent_ledger`, advance committed anchors whose cycles are
     complete. Per record:
     - `STORE_UNAVAILABLE` (`retryable:true`) → the item goes back to the queue for a **new** batch.
     - `CATEGORY_NOT_CONSENTED` → scoped to **(this install's source, that category)** only. Purge the queued records
       of that category for this source, stop reading it, reset that category's anchors and change tokens for this
       source, set local consent `not_granted`, and notify the state listener. Other categories of this source and every
       other source (another phone of the member, a Phase 2 aggregator) are never touched. Their consents are separate
       `sync_*` × resource rows.
     - `UNSUPPORTED_TYPE`, `UNIT_MISMATCH`, `IMPLAUSIBLE_VALUE`, `OUT_OF_WINDOW`, `INVALID_RECORD` → dropped and counted
       per code. `UNSUPPORTED_TYPE` and `UNIT_MISMATCH` are client/contract mismatches and raise a `contract_mismatch`
       diagnostic flag in state. `INVALID_RECORD` deliberately does **not** raise it, because it also covers the store's
       `MISALIGNED_BUCKET`, which a clock edge can cause and which is not a contract mismatch.
     - The `consent` map in the response updates local consent; `source_state` updates the source state.
   - `400 INVALID_BATCH` → the batch's items are dropped and the cycles counted as done (otherwise the same bad items
     would be read again forever); the `details` paths (never values) are kept as a diagnostic. Three in a row → state
     `client_error`, sync paused until the next app version.
   - `400 UNSUPPORTED_CONTRACT_VERSION` → state `upgrade_required`, all sending stops, the queue is kept (the N4
     minimum-version prompt handles the upgrade).
   - `401 UNAUTHENTICATED` → `AuthPort.refresh()` once and retry the same frozen batch; a second 401 → state
     `auth_paused` until the next foreground session.
   - `400 TENANT_REQUIRED`, `403 TENANT_NOT_MEMBER`, `403 DELEGATED_TOKEN_NOT_ALLOWED` → `auth_paused` (not retried
     in the background). `503 TENANT_CHECK_UNAVAILABLE` → back-off retry.
   - `403 CONSENT_REQUIRED {categories}` → as `CATEGORY_NOT_CONSENTED` for each listed category, with the same
     (this source, category) scope; the batch is dropped.
   - `409 SOURCE_PAUSED` → state `source_paused` for this install's source only, its readers stop, queued records (not deletions) purged, committed anchors
     kept, so a later re-enable re-reads from there. The module only resumes after a member action (re-enable in the
     app → `POST /source-state active`, or a reconnect on the web).
   - `409 INGEST_DISABLED` → state `server_disabled`; nothing is sent; the queue stops growing (readers pause); the
     module checks again on the next app start or app-config change.
   - `409 BATCH_ID_REUSED` → the batch is unfrozen and rebuilt with a new `batch_id`.
   - `413 BATCH_TOO_LARGE` → split in two (new ids) and re-queued; the size budget is lowered for this session.
   - `415 UNSUPPORTED_ENCODING` → one retry without gzip, then `client_error`.
   - `429 RATE_LIMITED` → wait `Retry-After` (or `retry_after_s`), then the same frozen batch.
   - `503 STORE_PENDING` → exponential back-off with jitter, 5 min → 24 h cap. `503 STORE_UNAVAILABLE` → 30 s → 6 h cap.
   - Network error, timeout, any other status or a non-JSON body → back-off and resend the same frozen batch.
   - `GET /contract` self-check at start (cached per app version): the major must be 1 and every type the module reads
     must be in the server catalogue with the same unit; a type the server does not list is not read. The module
     always sends `contract_version:"1.0"`.
10. **Background delivery and scheduling.**
    - iOS: `configureBackgroundTypes(types of consented categories, hourly)` registers HealthKit observers natively at
      launch and keeps them after termination; the JS `subscribeToObserverQuery` handler runs one bounded sync pass
      (read the changed types, enqueue, send at most a few batches within a ~25 s budget). `isProtectedDataAvailable()`
      false (device locked) → skip and wait. `expo-background-task` (`minimumInterval` 60 min) drains the queue.
      `clearBackgroundTypes()` on disconnect, sign-out, flag off, or the last category revoked.
    - Android: `expo-background-task` (WorkManager) every 60 minutes runs read + send when
      `BackgroundAccessPermission` is granted, otherwise send only (reads happen in the foreground).
    - Foreground: a pass on app start and when the app becomes active.
    - One pass at a time: an in-process mutex plus a lease row in the store (2-minute expiry) so a background task and
      the foreground never run two passes.
    - Every pass starts with: flag on (N4), signed in (N3), not in a paused state.
11. **Source state ("OS permission revoked → source paused").**
    - Android: before each pass, `getSdkStatus` + `getGrantedPermissions`. A consented category whose READ permissions
      are all gone is not read any more. When **no** consented category is permitted any more (or Health Connect is
      unavailable/uninstalled), the module sends `POST /source-state {state:'os_permission_revoked',
      permitted_categories:[]}` once; when permissions come back, `{state:'active', permitted_categories:[…]}`. A
      partial loss does not pause the whole source, because the server pauses the source for any
      `os_permission_revoked` (F9). Answers: `changed:false/true`, `source_state`; `not_connected` (no first batch yet)
      is fine; `409 INGEST_DISABLED` and 503s use the same back-off as batches.
    - iOS: HealthKit does not reveal read denial (F23), so the module cannot detect a revoked OS permission and never
      sends `os_permission_revoked` on iOS; a revoked permission simply yields no new data. "Disconnect" in the app
      revokes the `sync_*` consents for `apple_health` (item 6).
    - Health Connect rationale: `modules/health-connect-rationale` (local Expo module, a few lines of Kotlin) reads the
      launch intent action (`ACTION_SHOW_PERMISSIONS_RATIONALE` / `VIEW_PERMISSION_USAGE`) and hands `/privacy` to Expo
      Router. The native `/privacy` screen itself comes from the Public/legal lane (F21); until then the route resolves
      to the not-found screen, which is acceptable for dev and G1 builds and a Wave 3 blocker for store review.
12. **Identity, tokens and data minimisation.**
    - Auth is the member's Supabase access token from N3's `AuthPort.getAccessToken()`, refreshed when it expires
      within 60 s; the session itself lives in N3's secure storage (F20). N5 stores no token.
    - `install_id`: `randomUUID()` once per install, in expo-secure-store with `…_THIS_DEVICE_ONLY` (a restored or new
      phone is a new source, as the contract intends). Not a credential.
    - Sign-out, or a different member signing in: stop observers, clear background types, delete the previous member's
      queue, anchors, ledger and indexes. The SQLCipher key and `install_id` stay.
    - Flag switched off (N4) after being on: same as sign-out for queued records; committed anchors kept.
    - The `Logger` port drops any field named `value`, `stats`, `record_id`, `stages` or `start`/`end`; logs carry codes,
      counts, types and categories only (mirrors C1's OASIS rule, `adapter.ts:26-27`).
13. **Docs.** `apps/mobile/README.md` gets a "Health Sync" section: the contract source and how to re-vendor, the flag,
    the dependency pins, what waits for G1/G3, and the store-review checklist (Rollout).

## Interfaces (consumed through ports; stubs ship in N5a until N3/N4 merge)
- **N3 — auth session** (`AuthPort`): `getSession(): Promise<{ user_id: string; tenant_id: string } | null>`,
  `getAccessToken(): Promise<string | null>` (refreshes when expiring), `refresh(): Promise<boolean>`,
  `onChange(cb: (s: {user_id} | null) => void): () => void`. Requirement on N3: the session's secure-store entries use
  `AFTER_FIRST_UNLOCK` accessibility so a background pass can read them. **Stub:** always `null` (signed out), so
  the module never runs.
- **N4 — app-config** (`AppConfigPort`): `getFlag('health_sync', platform): boolean` (cached last value; `false` when
  unknown or unreachable, per `NATIVE-APP-PLAN.md:165-167`), `onChange(cb)`. **Stub:** always `false`.
- **Gateway** (`HttpPort` over `requireUrl(config,'gatewayUrl')`): `GET /api/v1/health/ingest/contract`,
  `POST /api/v1/health/ingest`, `GET /api/v1/health/ingest/status`, `POST /api/v1/health/ingest/source-state`,
  `GET /api/v1/health/consents`, `POST /api/v1/health/consents/grant`, `POST /api/v1/health/consents/revoke`.
- **Exposed to the Wave 2 Health lane** (`index.ts`): the API in item 5 and a state object `{ flag, signedIn,
  platformAvailable, source_state, consent: Record<category, 'granted'|'not_granted'|'unknown'>, os_permission:
  Record<category, 'granted'|'denied'|'unknown'>, phase: 'idle'|'backfill'|'syncing'|'paused', paused_reason?,
  last_success_at?, queued, diagnostics:{counts by code} }`. No strings: the lane maps states to catalogue keys.

## Tests
All in `apps/mobile/tests/health-sync/`, jest-expo, run by NATIVE-CI. Native modules, expo-secure-store, expo-sqlite
and fetch are mocked; the `StorePort` has an in-memory implementation, and one shared conformance suite runs against it
now and against the SQLite implementation on a device later (G1). No test makes a network call.
- **Contract vendoring:** schema sha256 = `VENDOR.json` = lock `1.0`; `catalogue.ts` = the golden contract
  catalogue (types, kinds, units, OS identifiers); the module's error-code lists = the golden `error_codes`.
- **Golden serializer:** fixture HealthKit and Health Connect objects (mocked readers) for golden cases 2–5 produce
  request bodies equal to `golden.json`'s, field by field and in order, with `start`/`end`/stage times compared as
  instants and `record_id`, values, units, `tz`, `stages` compared exactly; every produced batch validates against the
  vendored `schema.json` with `ajv/dist/2020`. A seeded generator of 500 random sample sets (both platforms, every type,
  DST days for Europe/Berlin and America/New_York, sleep sessions across midnight) produces batches that all validate
  and all respect 1,000/1,000/200 and the size budget.
- **Never-produced inputs:** the module has no mapping for `blood_glucose` and requests no permission for it; a pound
  weight is converted to kg; a 2024 sample is never read (the golden "per-record rejections" are server answers the
  serializer cannot produce).
- **Source block (F1 backstop):** with `Platform.OS` mocked to `ios`, every batch carries
  `apple_health`/`ios`; with `android`, every batch carries `health_connect`/`android` (golden cases plus the random
  generator on both platforms). A batch built with a deliberate mismatch (`apple_health` + `android`, `health_connect` +
  `ios`, or a platform different from the running OS) is refused by `assertSourceConsistent`: `HttpPort` receives no
  call and `client_error` is raised.
- **Purge scope (F3):** with two sources' rows in the store (this install, and a second install id standing in for
  another source) and two categories queued, a `CATEGORY_NOT_CONSENTED` for sleep on this install removes only this
  install's queued sleep records and resets only this install's sleep anchors. Activity on this install and everything
  on the other source are unchanged. The same holds for `403 CONSENT_REQUIRED` and `409 SOURCE_PAUSED`.
- **Aggregation:** 5-minute/1-hour alignment and the deferral band (a deferred key stores no value and is re-derived
  from the mocked OS when due; an offline backlog crossing the boundary is re-derived and paced at ≤ 60 batches/hour);
  the `series_sample_index` TTL sweep and the 200,000-row cap (an evicted id leads to reconciliation, not to a wrong
  deletion); an expired Health Connect token re-derives the original backfill window and uploads only the diff; updated interval; emptied interval → deletion;
  unchanged interval → nothing; heart-rate `{n,sum,min,max}`; HealthKit body fat × 100; HealthKit sleep grouping and
  regrouping (old `record_id` deleted); `SLEEP_GROUP_GAP_MIN` honoured as a config value; a group over 24 h split at
  its longest gap, and an unsplittable one dropped with `sleep_session_over_cap` counted; stage map and the 200-stage merge.
- **Response handling:** the golden responses (200, replay, `CATEGORY_NOT_CONSENTED` in 200, 403, 400 unknown field,
  400 major, 401 middleware body, 409 staging) drive the handler and its effects on queue, anchors and state; plus a
  case for every batch and record code (F4) including middleware codes. Retries reuse the frozen `batch_id`; per-record
  `STORE_UNAVAILABLE` goes into a new batch; `BATCH_ID_REUSED` and the 24-hour unfreeze get a new id; 413 splits.
- **Anchors:** `committed_anchor` advances only when every item of the cycle and earlier cycles is acked; a simulated
  store loss restarts from `committed_anchor`; an expired Health Connect token triggers the 30-day reconciliation.
- **Consent before OS permission:** `requestAuthorization` / `requestPermission` are never called without a fresh
  `GET /consents` showing an active grant for this member, this source and that category; only read types are
  requested; a second member on the same device gets no reads; revoke works with the flag off and purges locally.
- **Source state:** Android all-lost → one `os_permission_revoked`; restored → `active`; partial loss → no POST;
  iOS never posts `os_permission_revoked`.
- **Dark:** with the N4 stub (flag off) or the N3 stub (signed out), no reader, background task, observer or network
  call happens (mock call counts are zero) and the native libraries are never `require`d.
- **Safety:** the ingest client refuses production and staging hosts through the existing `assertNotProduction`; the
  logger never receives a value, stats, record id or timestamp; sign-out and member switch delete the previous member's
  rows.
- **Config:** `buildConfig()` for both profiles: HealthKit plugin with `NSHealthUpdateUsageDescription:false`,
  background on, no `healthkit.access`; the usage string resolves from the N5b key in all 11 locales; the Android
  permission set equals the catalogue's READ permissions + history + background, and contains no `WRITE_`; minSdk 26;
  SQLCipher on; the existing "no production profile, `.dev` identifiers, no googleServicesFile" assertions stay green.
- **NATIVE-CI:** `deps:check`, typecheck, jest and the Metro bundle for iOS and Android stay green.
- **N5b:** the web Vitest and ESLint suites; `npm run i18n:inventory` committed; a test that the two keys exist in all
  11 shards with no `Sie/Ihr`.
- **Device tests (later, not in this plan's PRs):** on G1 only, after native builds exist: iOS simulator and device with
  Health app data, Android emulator with Health Connect; consent → permission → backfill → incremental → background
  wake → offline → recovery, against a G1 gateway with ingest enabled there. Includes the pako gzip round-trip on
  Hermes on both platforms. Never production or staging.

## Rollout / gates
1. Spar this plan, then Gate 1. Allocate N5b and N5a, citing the sparring record.
2. N5b PR (vitana-v1 `src/i18n/**`) → merge → staging frontend deploy → STAGING-VERIFY with
   `docs/validation/<N5b>/staging-tests.json` (read-only: the deployed build's catalogues for all 11 locales — ar, de,
   en, es, fr, pl, pt, ru, sr, tr, zh — contain both keys, non-empty, and the build commit matches) → Gate 2 → production. The keys are unused on the web.
3. N5a PR after C1 has merged (vendored hash from C1's merge commit) and after N5b. It deploys nothing: done when merged
   with NATIVE-CI and the repo's checks green; no Gate 2. No What's New entry (not a finished member feature) and no
   screen-registry or parity-ledger row (no route is added).
4. Activation is not part of this plan. A member's phone syncs only when all hold: the N4 flag is on for the platform,
   `HEALTH_SYNC_INGEST_ENABLED` is on in that environment (its own Gate 2 in Health Hub C1's rollout), the Wave 2 Health
   lane ships the UI, and the build passed device tests on G1.
5. **Store review needs (Wave 3, recorded here, done there):**
   - Apple: HealthKit capability on the App ID (G3); `NSHealthShareUsageDescription` in all 11 locales; no update
     string; privacy policy URL; App Privacy labels (Health & Fitness, linked to the member, not used for tracking);
     guideline 5.1.3 (no advertising use, no health data in iCloud — the queue lives in the cache directory, outside
     backup); reviewer notes explaining consent-before-permission and a demo account on a non-production environment.
   - Android minimum SDK 26 (owner-facing item for the store-release Gate 2). Read-only evidence step before Wave 3:
     the share of active installs on API 24–25 from the Play Console device statistics of `com.vitanaland.app` and/or
     the Appilix app's device stats, stated in that Gate 2. If the share is material, the owner decides between the
     raise and an alternative.
   - Google Play: Health Connect permissions declaration for each READ permission plus `READ_HEALTH_DATA_HISTORY` and
     `READ_HEALTH_DATA_IN_BACKGROUND`; Health apps declaration; Data safety form; the rationale hand-off to a native
     `/privacy` screen (needs the legal lane's port); target and min SDK as set here.
6. Rollback: revert the PR. With the flag off nothing runs, so a revert has no runtime effect on members.

## Out of scope
- Every Health Sync screen, sheet, copy and navigation entry (consent screens, permission primer, connected-sources
  list, sync status, settings): Wave 2 Health lane. N5 exposes state and actions only.
- The consent wording itself (C3, counsel) and the web Settings › Privacy list.
- Server-side changes of any kind (contract, ingest, store, consent API, app-config endpoint) and turning on any flag.
- N3 auth and N4 app-config implementations (only consumed through ports).
- Aggregators (Phase 2), write-back to HealthKit or Health Connect, clinical records, glucose/CGM, reproductive data,
  and categories beyond catalogue v1.
- Propagating OS-side deletions after a category's consent was withdrawn (the module stops reading at withdrawal);
  what happens to already-stored data on withdrawal belongs to the Phase 1 consent package ("keep vs delete history").
- Native builds, signing, store submission (G3, Wave 3).

<!-- plan:end -->

## Open questions (with planner defaults)
1. **Android minimum SDK 26.** Settled in round 1: the native build is raised to 26 now. The owner confirms at the
   Wave 3 store-release Gate 2, using the API 24–25 install-share evidence (Rollout 5).
2. **Golden timestamp formats** (F12). Default: the serializer matches the fixtures byte for byte and the test compares
   instants; ask the C1 owner to make series `start` use milliseconds like `end` and `record_id` before the contract is
   frozen (a fixture-only change, no schema change).
3. **The 30-day interval boundary** (F5). Default: the two-day deferral band on the device. Better long-term: an
   optional explicit `interval` field in contract v1.1 so the server never has to infer it from its own clock.
4. **Heart-rate stats from samples, not from statistics queries.** Default: compute `{n,sum,min,max}` from samples on
   both platforms (HealthKit statistics have no count). Needs the C1 owner's agreement that this meets §3.1.
5. **HealthKit sleep sessions.** Default: group stage samples per source with gaps under `SLEEP_GROUP_GAP_MIN` = 60 (a
   planner choice, not an Apple convention), cap a session at 24 h, `record_id` = earliest
   sample's UUID, `value` = end − start in minutes. Alternative for `value`: asleep minutes only. The C1 owner decides,
   since the store and B's derivation read this value.
6. **iOS permission-revoked detection.** Default: none (HealthKit hides read denial); the server's source stays
   `connected` and simply receives no new data. Alternative: a heuristic ("no data for N days") — rejected as unreliable.
7. **N5b placement.** Default: its own VTID. Alternative: fold the two keys into C3 (vitana-v1 #1383), which already
   touches the same shards but stays draft until counsel's wording exists — that would block N5a.
8. **Usage-string review.** Default: owner approves the DE/EN wording at Gate 1 of this plan; counsel review is
   optional because it is an OS permission purpose string, not the consent text.
9. **Backfill depth on Health Connect.** Default: request `READ_HEALTH_DATA_HISTORY` to reach 90 days; without it 30
   days. Requires the Play declaration in Wave 3.

## Planner responses — round 1
- **F1 [major] ACCEPTED.** The server's platform/kind check (`contract-v1.ts:289-291`) gets a client-side backstop. `sourceFor(Platform.OS)` is the only producer of `source` (iOS → `apple_health`/`ios`, Android → `health_connect`/`android`). `assertSourceConsistent` refuses any mismatch, and any platform other than the running OS, before gzip and send. Tests cover both platforms and a deliberate mismatch that never reaches `HttpPort` (Change 8, Tests "Source block").
- **F2 [major] DECISION (coordinator).** The raise to minSdk 26 applies to the native build only (`expo-build-properties`). It is an owner-facing item at the Wave 3 store-release Gate 2. No member runs the native app before Wave 3; the change is reversible at the build-properties level; Appilix and web are unaffected. A read-only evidence step (API 24–25 share from Play Console / Appilix device stats) runs before Wave 3. It is not a pre-implementation blocker (Change 4, Rollout 5, open question 1).
- **F3 [major] ACCEPTED.** `CATEGORY_NOT_CONSENTED`, `403 CONSENT_REQUIRED` and `409 SOURCE_PAUSED` act only on (this install's source, category). One source per native install; local state is keyed by `(user_id, install_id, kind)`. Phase 2 aggregators are separate sources with separate queues. A two-source, two-category test covers it (Changes 8, 9; Tests "Purge scope").
- **F4 [minor] ACCEPTED.** `INVALID_RECORD`, including the store's `MISALIGNED_BUCKET`, is dropped and counted without `contract_mismatch`, on purpose (Change 9).
- **F5 [minor] ACCEPTED.** `series_sample_index`: 35-day TTL from the sample's end time, a sweep at the start of every pass, and a hard cap of 200,000 rows per source with oldest-first eviction. An evicted id can only cause a reconciliation pass, never wrong data (Change 7, Tests).
- **F6 [minor] ACCEPTED.** pako 2.1.0 takes a string, ArrayBuffer or Uint8Array (`lib/deflate.js:211-214`). It encodes strings with `TextEncoder` when present, else with its own JS UTF-8 encoder (`lib/utils/strings.js:26-`), so no `TextEncoder` is needed on Hermes. A G1 device check of the gzip round trip on both platforms is added (Change 8, Tests "Device").
- **F7 [minor] ACCEPTED.** The 60-minute sleep grouping gap is the config value `SLEEP_GROUP_GAP_MIN`. It is labelled a planner choice because I could not verify an Apple convention, and it is flagged to the C1 owner (Change 7, open question 5).
- **F8 [minor] ACCEPTED.** The N5b staging test checks both keys in all 11 locale catalogues (Rollout 2).
- **F9:** no change.
- **Q2 (offline backlog crossing the 31-day boundary):** deferred intervals store only a key and a due time. At send time the 1-hour interval is re-derived from the OS; stale queued values are never re-bucketed. A queued 5-minute item that enters the band leaves the queue and becomes a deferral. The backlog is paced by the module's 60-batches-per-hour limit (Change 7).
- **Q3 (expired change token vs 90-day backfill):** conservative option chosen. The category's original backfill window (90 days, or 30 without the history permission) is re-derived and diffed against `sent_ledger`, and only changes are uploaded. No assumption that older data is rarely edited is needed. It is cheap (OS aggregate queries plus a diff). `sent_ledger` keeps at least backfill window + 30 days (Change 7).
- **Q4 (sleep session max duration):** ACCEPTED. `SLEEP_SESSION_MAX_H` defaults to 24 h (planner choice). Over the cap, the group is split at its longest internal gap; an unsplittable group is dropped and counted as `sleep_session_over_cap`. Tested (Change 7, Tests).
