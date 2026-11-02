# Verification — VTID-05427 (native-wave2-memory-diary-r2 / memory)

Native Wave 2 memory lane: the `/memory`, `/memory/timeline`, `/memory/recall` and
`/memory/permissions` ports. All commands run offline (the native app has no production
profile; `assertNotProduction()` refuses prod/staging hosts). Linux, worktree
`/projects/sandbox/vitana-v1/.worktrees/native-wave2-memory-diary-r2-memory`, base
`origin/main` a41e89a0. Every command and its counts: `commands.log`.

## What was built

- `apps/mobile/src/screens/memory/data/` — the class-B data paths re-implemented natively
  (plan decision 2): `client.ts` (`memoryJson`: `getGateway()` + `X-Vitana-Active-Role:
  community` + JSON content type, web `communityFetch` + `json()`), `garden.ts` (web
  `memory-api.ts` garden / diary-save calls, `useMemoryMetadata`, `useKnowledgeBase`, the
  `WhatVitanaKnows` self-awareness read), `learning.ts` (`memory-learning-api.ts` +
  `useMemoryLearning.ts`), `timeline.ts` (`timeline-api.ts` + `useTimeline.ts`). Same
  endpoints, query keys, optimistic updates and invalidations as the web.
- `apps/mobile/src/screens/memory/text.ts` — the mirrored `timeline-meta.tsx` /
  `routine-text.ts` / `pillarLabel` / locale-format helpers over the native `t()` and Hermes
  `Intl` (decision 2: mirrored, not re-exported).
- `MemoryOverview.tsx` + `overview/*` — body port of `Memory.tsx`: sub-navigation, header,
  Add Memory sheet, Categories (IndexWeekStory, RoutinesCard, WhatVitanaKnows, Memory Garden
  grid + category detail + edit + quick categorize) / Timeline (`MemoryTimelineTab`) /
  Education (`MemoryEducationTab`) tabs, `?tab=` like the web `useUrlTab`.
- `MemoryTimeline.tsx` + `timeline/*` — body port of `Timeline.tsx` → `TimelineBody`:
  Index spotlight card, pillar + area chips, search, clear, transparency link, day groups
  with moment / Index-day / digest rows, cursor paging, the moment detail sheet (measured
  effect, sensitive note, hide-from-Vitana switch, open, delete with confirmation).
- `MemoryRecall.tsx` — static body (header, Memory Actions sheet = `RecallMasterActionPopup`,
  AI Memory Search panel, three tabs) with the honest empty state; no live read.
- `MemoryPermissions.tsx` — `LearningSwitches` + `UsageDataCard` (export via the system share
  sheet, delete all behind a confirmation).
- `apps/mobile/src/ports/memory.tsx` — the lane port: kit `Switch` / `Textarea` /
  `AlertDialog*` / `notifySuccess`, pillar colours from `@vitana/tokens`, the lucide icons the
  web timeline names. `src/ports/ui.tsx` is untouched.
- Routes `apps/mobile/app/(app)/memory/{index,timeline,recall,permissions}.tsx`;
  `NATIVE_ROUTES` in `src/navigation/resolve.ts`; the 4 ledger rows → `native`.
- `src/i18n/*/memoryNative.json` — 42 new keys (DE first, du-form; pt você; fr tu; ru ты),
  all 11 locales. Every other string reuses existing web keys (`screens.memory.*`,
  `memoryLearning.*`, `timeline.*`, `vitanaIndex.*`, `recallActions.*`,
  `spotlightMember.memory.recall.*`, `toasts.*`).
- No core change (`packages/core/**`, closure, mobile-ci-paths untouched; `core-closure
  --check` up to date). No new dependency, no `app.config.ts` change (the `diary` lane owns it).

## Results

- `npm run typecheck` → PASS.
- `npx jest tests/memory --ci` → PASS, 4 suites / 70 tests.
- `npm test -- --ci` → PASS, 80 suites / 2145 tests, 57 snapshots.
- `APP_PROFILE=development npm run bundle` → PASS (ios + android `.hbc`, `Exported: dist`).
- `APP_PROFILE=development EXPO_OFFLINE=1 npm run deps:check` → PASS (up to date).
- `npm run parity:check` → PASS (435 rows, 30 native routes); `parity-ledger.mjs --sync` → no change.
- `node ../../scripts/native/core-closure.mjs --check` → up to date.
- i18n (repo root, the checks `i18n-check.yml` runs): `i18n-register-check.mjs --all` → no
  violations; `i18n-long-words.mjs --locale=de` → no long words; `check-i18n-subscriptions`
  → OK; `i18n-stamp-source --check-all` → 0 stale; `i18n-audit --report-only` → exit 0
  (its errors are pre-existing `_pending_review` keys, none in `memoryNative`).
- Red → green: `red-on-base.txt` (all 4 suites fail on origin/main: the screens do not exist).
- Preflight: see `commands.log`.

## Not verified on staging

Device runtime deferred to G1 (`staging-tests.json` `deferred_g1`, `next_actor: owner`).
The parity reference for these four rows is body parity against the native N3 shell
baseline, not a web screenshot (plan decision 6).

## Deviations from the web body (each recorded in the file header)

- Add Memory offers the text mode only: the web voice / photo modes need the native capture
  deps (`expo-image-picker`, an expo audio recorder) that the `diary` lane adds with the
  `app.config.ts` plugins (plan decision 3). Follow-up once that lane lands.
- The web utility row's search box (no handler on the phone layout) and calendar button
  (calendar lane popup) are not in the overview body; Timeline's `<input type="date">`
  jump-to-date has no N2 kit counterpart and is not ported. Timeline paging uses a
  "Load more" button instead of the web's scroll sentinel.
- The category detail's subcategory badges are not ported: they filter on tags the garden
  API never returns (always 0) and are untranslated English on the web.
- The overview Timeline pane's "Save as Knowledge" / "Delete" card actions only raise a
  success toast on the web and change nothing; they are not reproduced.
- Recall's three tabs show the honest empty state (`spotlightMember.memory.recall.*`, the
  web Spotlight frame's SR-24 decision) instead of the sample cards (made-up results, stock
  photos).
- Usage-data export uses the system share sheet instead of a browser file download.
- Web catalog text defect seen, not fixed (outside the lane paths): en
  `screens.memory.value0TotalMemoriesAcrossAllCategories` is `{value0}total …` (no space).
