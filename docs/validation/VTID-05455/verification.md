# Verification — VTID-05455 (native-wave2-health-biology-r3 / health-hub)

Native Wave 2 health-hub lane: `/health` (HEALTH.OVERVIEW), `/health?mode=medical`
(HEALTH.MEDICAL), `/health?mode=supplements` (HEALTH.SUPPLEMENTS) and the Vitana Index overlay
(OVERLAY.VITANA_INDEX), a 1:1 port of the mobile-web (`useIsMobile`) branch of
`src/pages/Health.tsx` (:284-436). All commands ran offline (the native app has no production
profile; `assertNotProduction()` refuses prod/staging hosts). Linux, worktree
`/projects/sandbox/vitana-v1/.worktrees/native-wave2-health-biology-r3-health-hub`, base
`origin/main` e530abd0d. Every command and its counts: `commands.log`.

## What was built

- **Core extraction (class A only):** `packages/core/src/vitana-index.ts` (re-export of
  `src/lib/vitanaIndex.ts`: `VITANA_INDEX_TIERS`, `getVitanaIndexTier`, `nextTier`,
  `pointsToNextTier`, `getVitanaIndexPercentage`, `formatVitanaIndexScore`) and
  `packages/core/src/vitana-projection.ts` (`src/lib/vitana-projection.ts`: `trend7d`,
  `projectDays`, `projectDay90`, `buildHorizonPoints`); both import nothing. Manifest lines +
  regenerated `closure.generated.json` / `mobile-ci-paths.generated.json` (`npm run gen:core`).
  There are no `pillarKeys` / `pillarLabel` in `vitanaIndex.ts` (plan R1-F3); the pillar labels
  come from the `vitanaIndex.<key>` / `health.pillars.<key>` catalog keys. No biology-card
  formatting helper exists as a pure web module (the report-type emoji / status maps live inside
  `MobileHealthMedicalTab.tsx`), so none is extracted.
- **Native health-data module** `apps/mobile/src/screens/health/data/` (class-B web hooks
  re-implemented over the native Supabase client + native auth, plan decision 2):
  `vitana-index.ts` (web `useVitanaIndex` / `VitanaIndexProvider`: one query key, the 7-day
  window + latest-ever fallback, the same transform), `records.ts` (lab reports, supplements,
  `get_profile_health_summary` standing, Life Compass), `gateway.ts` (pillar-agent outputs,
  open Autopilot suggestions). Every Supabase read is a select with `user_id = auth.uid()`;
  every gateway call is a GET with the Bearer token.
- **Screens** `apps/mobile/src/screens/health/`: `HealthScreen.tsx` (header, utility bar with
  the shell `MobileModePill`, Upload, the chips; `?mode=` via the web `normalizeHealthMode`
  aliases, written back with `router.setParams`), `widgets.tsx` (MobileHealthSnapshot,
  MobilePriorityFocus, MobileAutopilotGuidance, VitanaPillarAgentsPanel), `MobileHealthMedicalTab.tsx`,
  `MobileHealthSupplementsTab.tsx` (+ SupplementCard), `MobileActionChips.tsx`
  (VitanaIndexChip / VitanaIndexValue / AutopilotChip), `VitanaIndexSheet.tsx` (the overlay),
  `sheets.tsx` (HealthMasterActionPopup, QuickLabOrderSheet, HealthReportUploadSheet),
  `events.ts` (`vitana:open-index`, `autopilot:open`, `vitana:open-life-compass` on the
  overlay bus), `text.ts`, `sync/HealthSyncAffordance.tsx`.
- **Ports:** `src/ports/health.tsx` (core math, kit Sheet/Dialog/Input/Separator, pillar and
  category tokens, lucide glyphs), `src/ports/health-sync.ts` (the pinned Health Sync
  interface + typed stub, sparring R1-F1), `src/ports/health-data.ts` (the door the
  `vitana-index-biology` and `health-plans-services` lanes use: data hooks, chip / value / overlay
  twins, the open event, the Health Sync affordance, the upload sheet).
- Route `apps/mobile/app/(app)/health/index.tsx`; `/health` in `NATIVE_ROUTES`; no other
  `app/` file shadows it (asserted). The 4 ledger rows → `native`.
- `src/i18n/*/healthNative.json` — 68 new keys (DE first, du-form; pt você; fr tu; ru ты),
  all 11 locales. Every other string reuses web keys (`health.*`, `screens.health.*`,
  `vitanaIndex.*`, `empty.*`, `actionBar.autopilot`, `screens.common.*`,
  `screens.supplements.*`, `profile.identity.understandIndex`, `toasts.hooks.*`). No
  `screens.nativeHealthSync.osPermission.*` key (N5a's).

## Health Sync (sparring R1-F1 / R1-F5)

- The N5a module is not on main. `ports/health-sync.ts` declares `HealthSyncEntry`
  (`snapshot()`, `onStateChange(cb)`, `connect()`) and `HealthSyncState` vendored from the #1398
  branch head 8fea5e652 (`apps/mobile/src/health-sync/state.ts:7-25`,
  `contract/v1/catalogue.ts:10-11`, `index.ts:66-71`, `index.ts:301-378`). The stub is dark:
  `HEALTH_SYNC_INGEST_ENABLED = false`, `connect()` → `{ ran: false, reason: 'flag_off' }`.
- `tests/health/health-sync-contract.test.tsx` runs in stub-only mode: type-level
  assignability, runtime shape check, no OS-permission / consent / ingest member on the entry.
  When `apps/mobile/src/health-sync/index.ts` exists, the same test loads its
  `createHealthSync()` and requires the pinned shape (conditional real import).
- The affordance (`Connect Device` / `Connect API`, web `MyBiology.tsx:337-340`, `:354-357`)
  only calls `entry.connect()`; it never requests an OS permission or ingests. It is NOT mounted
  on `/health`: the mobile-web dashboard renders no connect entry point (`Health.tsx:284-436`),
  so per R1.1 the native dashboard does not either (asserted). The biology lane mounts it through
  `ports/health-data.ts`.
- Follow-up (`next_actor: kiro`): re-pin the vendored signature to C1's merge commit once the
  Health Sync contract is re-vendored (n5a-health-sync.md:16-19).

## Results

- `npm run typecheck` → PASS.
- `npx jest tests/health --ci` → PASS, 5 suites / 105 tests.
- `npm test -- --ci` → PASS, 89 suites / 2379 tests, 57 snapshots.
- `APP_PROFILE=development npm run bundle` → PASS (ios + android `.hbc`, `Exported: dist`).
- `APP_PROFILE=development EXPO_OFFLINE=1 npm run deps:check` → up to date.
- `APP_PROFILE=development npm run bundle:core-probe` → ok (ios + android, no production host).
- `npm run parity:check` → PASS (435 rows, 33 native routes); `parity-ledger --sync` → no change.
- `core-closure --check` → up to date (24 roots, 34 src files); `gen-core-extract --check`,
  `gen-tokens --check`, `check-shell-pins` → up to date / OK; `node --test scripts/native/__tests__`
  → 68 / 0 and eslint tests 22 / 0; `npx eslint apps/mobile packages` → clean.
- i18n (the `i18n-check.yml` scripts): register check → no violations; long words (de, 22) → none;
  subscriptions → OK; stamp-source → OK; locale registry → OK; i18n-audit `--report-only` → 0
  errors in `healthNative` (the reported errors are pre-existing `_pending_review` keys).
- Web: `npm run build` → built; `npx vitest run src/i18n scripts/native` → 3 files / 25 tests.
- Red → green: `red-on-base.txt` (all 5 suites fail on origin/main: the modules do not exist).

## Fix 1 — reviewer `changes` on 3afeca5 (R1.1: utility bar + baseline survey)

Ported inside the lane paths, red first (`red-fix1.txt`: `tests/health/utility-bar.test.tsx`,
11/11 failing on 3afeca5), then green:
- `src/screens/health/HealthUtilityBar.tsx` (self-contained; the driver consolidates later): the web
  rail order (`Health.tsx:303-333`, `utility-action-button.tsx:99-125`) — Search, mode pill,
  Calendar, Upload, Life Compass, Gift Voucher, then the Vitana Index and Autopilot chips.
  - ExpandableSearchButton (`Health.tsx:316`): expands to an input with the page placeholder, ✕
    collapses and clears it; inert as on web (no `onSearch` on that page).
  - UniversalCalendarButton (`Health.tsx:322`, `UniversalCalendarButton.tsx:59-87`): opens
    `/calendar` via `navigateToWebPath` (the resolver's Unported screen until a native calendar route
    exists); the upcoming-events badge (`getUpcomingEvents(10)`, `formatNotificationCount`) and the
    conflict dot, from a read of the member's `calendar_events` (`data/calendar.ts`, select with
    `user_id = auth.uid()`, the web query at `useCalendarEvents.ts:121-125`). `calendar:open` is
    already routed by the shell (`MobileAppShell.tsx:50`), so the bar does not listen twice.
  - Life Compass (`utility-action-button.tsx:108-118`) emits `vitana:open-life-compass` (`events.ts`).
  - Gift Voucher (`:121-123`) is hidden when the native IAP-restricted check is true (iOS, the
    drawer's `iapRestricted` rule, `shell/logic/drawer.ts:37`, `SideDrawer.tsx:105`), like
    `isIAPRestricted()`. A tap emits `gift-voucher:open`; the MaxinaVoucherModal checkout itself (a
    purchase surface with no route) is not ported in this lane.
- `src/screens/health/VitanaBaselineSurveyModal.tsx`, mounted on `/health` (see the deviation above
  for the disabled submit, `plan.md:110`).
- Ports: `src/ports/health.tsx` adds the glyphs (Apple, Brain, Dumbbell, Gift, Moon, Search) and
  `DialogDescription` / `DialogFooter`.
- i18n: 16 new `healthNative.*` keys (`searchPlaceholder`, `utility.*`, `baselineSurvey.*` — the
  web question copy is hard-coded English), DE first, all 11 locales. Everything else reuses
  `actionBar.search|calendar|giftVoucher`, `lifeCompass.title`, `screens.health.back`,
  `screens.health.fiveQuickQuestionsSetYourDay0`.
- `tests/health/consent-no-write.test.tsx`: the expected read set now includes `calendar_events`
  (still a select scoped to `user_id = auth.uid()`), and the status GET is asserted.
- Confetti: kept out (reason above).

Results (fix 1 code): `npm run typecheck` PASS; `npx jest tests/health --ci` 6 suites / 119 tests
PASS; `npm test -- --ci` 90 suites / 2396 tests, 57 snapshots PASS; `APP_PROFILE=development npm run
bundle` PASS; `deps:check` up to date; `parity:check` OK (435 rows, 33 native routes); core-closure,
gen-core-extract, gen-tokens --check up to date; check-shell-pins OK; native script tests 68/0 and
22/0; eslint clean; i18n register / long words / subscriptions / stamp / locale registry / chunking
OK; `npx vitest run src/i18n scripts/native` 3 files / 25 tests.

## Not verified on staging

Device runtime deferred to G1 (`staging-tests.json` `deferred_g1`, `next_actor: owner`):
Maestro, iOS simulator / Android emulator screenshots, parity vs the read-only 390×844 staging
web `/health`.

## Deviations from the mobile web (each recorded in the file header, with evidence)

Writes are not wired (plan "No health data is written", tasks.md task 3):
- Vitana Index self-heal: the web calls the `health_compute_vitana_index` RPC when the 7-day
  window is empty (`src/hooks/useVitanaIndex.ts:116-127`, an upsert). The native read goes
  straight to the latest-ever fallback.
- Upload sheet presented, write not wired: storage upload + `lab_reports` insert
  (`HealthReportUploadSheet.tsx:95-127`). The document zone is not pressable, so the submit stays
  disabled — the web's own state without a file (`:257`). The calendar popover is not ported; the
  date row shows today.
- Supplement delete (`SupplementCard.tsx:72-75`) rendered disabled. Edit (`MobileHealthSupplementsTab.tsx:69`,
  a TODO no-op) and "Add supplement" (`:58`, no handler) stay no-ops, as on web.
- Opening a report file uses a storage signed URL (`MobileHealthMedicalTab.tsx:53-61`, a POST);
  the native rows are not pressable.
- `completeBySourceRef('onboarding_health')` (`Health.tsx:129`, a gateway write) is not called.
- `VitanaBaselineSurveyModal` (`Health.tsx:288`): ported (fix 1) with the web trigger, auto-open
  on `GET /health/baseline-survey/status` → `ok && !completed` (`VitanaBaselineSurveyModal.tsx:88-104`),
  the five steps, Back / Next. **Submit disabled**: the web Finish POSTs `/health/baseline-survey`
  (`:120-123`), a health-data write; the plan says "No health data is written to production. Reads
  only" (`plan.md:110` on `origin/kiro/native-wave2-health-biology-r3/plan`), so the native Finish
  renders disabled and never calls it, like the upload sheet's submit.
- The Health Sync tap logs an activity row on web (`useHealthLogger.ts:48-54`); the native
  affordance does not.

Other lanes' surfaces (no native twin yet; same deferral as the home and diary lanes):
- The Autopilot popup (`Health.tsx:408-411`) belongs to the journey-autopilot lane: the chip and
  the sheet's "Open Autopilot" emit `autopilot:open` on the overlay bus when that lane has
  registered it, otherwise open `/autopilot` (the web "View My Journey" target, `Health.tsx:386`).
- The Life Compass row emits `vitana:open-life-compass` (web window event, same name).
- The Gift Voucher button emits `gift-voucher:open`; MaxinaVoucherModal (`utility-action-button.tsx:128-133`, a
  checkout) has no native twin yet.

Data / presentation:
- Real-data standing: the web shows the server's "Top X%" only behind `VITE_HEALTH_REAL_DATA`
  (`Health.tsx:146-151`; on in staging, `AWS-STAGE-DEPLOY-FRONTEND.yml:140`); the native twin
  always reads it (staging is the parity reference) — as a GET (`rpc(…, { get: true })`).
- Autopilot pending count: the web Health page shows the length of a list it only fetches on
  the 5-minute poll / popup (`use-autopilot.ts:463-480`); the native twin reads the same list
  (`GET /autopilot/recommendations?status=new,activated&limit=20&role=community`) on mount.
- Lab reports are read with an explicit `user_id = auth.uid()` filter (the web relies on RLS
  only) so only the member's own reports are requested.
- Index sheet: no confetti (`VitanaIndexSheet.tsx:258-273`; the web draws a 130-particle canvas
  burst with `confettiManager` (`src/lib/confetti.ts:88-120`); there is no native canvas, and a
  react-native `Animated` re-implementation of that particle system is not a small change, so it
  stays out of this lane) — the
  banner shows and the day is marked in AsyncStorage; the streak is 0 because the web streak is a
  localStorage day log (`useVitanaStreaks.ts:29`) nothing writes natively, so no streak badge.
- Hard-coded English on the web (sheet banner / Life Compass copy, Health Actions and lab-test
  names, report categories, supplement filters, pillar-agent labels, "no output yet", status
  badges) is translated through `healthNative.*` in all 11 locales.
