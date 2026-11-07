# Verification — VTID-05429 (native-wave2-profile-settings-r2 / profile)

Native Wave 2 profile lane: `/me/profile` (PROFILE.ME) and `/profile/me/privacy`
(PROFILE.PRIVACY). All commands run offline (the native app has no production
profile; `assertNotProduction()` refuses prod/staging hosts; `tests/helpers/no-network`
makes any real fetch fail the test). Linux, worktree
`/projects/sandbox/vitana-v1/.worktrees/native-wave2-profile-settings-r2-profile`,
base `origin/main` a41e89a0d. Every command and its counts are in `commands.log`.

## What was built

- `apps/mobile/app/(app)/me/profile.tsx` + `src/screens/profile/MyProfileScreen.tsx` —
  twin of the mobile branch of `src/pages/EditProfilePage.tsx`: ID-card segmented
  control (Identity / Social / Account / Business, `card` search param), the four
  cards (`ProfileCards.tsx`), content stats strip, Posts / About / Media / Groups
  tabs (`ProfileTabs.tsx`), and the Identity / About / Account / Showcase sheets
  (`ProfileSheets.tsx`); Create post opens the home lane's composer; Share opens the
  system share sheet with the web share path on the build's web base URL.
- `apps/mobile/app/(app)/profile/me/privacy.tsx` + `src/screens/profile/PrivacyScreen.tsx` —
  twin of `src/pages/PrivacySettings.tsx`: back header, intro, five sections with a
  whole-section row and sub-field rows, tier badge cycling Private → Connections →
  Public, the read-only partner-search row, the server-enforcement footnote.
- `src/screens/profile/data/profile.ts` — native re-implementation of the class-B
  web hooks (reads) and the pure write builders + sender (plan decision 2; no core
  change). `src/screens/profile/useVisibilityCycle.ts` — the shared tier cycle.
- `src/ports/profile.ts` — type-only port over `@vitana/core/types`.
- `src/navigation/resolve.ts` — `/me/profile` and `/profile/me/privacy` added to
  `NATIVE_ROUTES` (tests/navigation keeps the list equal to the files on disk).
- `src/i18n/*/profileNative.json` — new keys, DE first (du-form), all 11 locales;
  existing `profile.*`, `profileEditor.*`, `editProfile.*`, `profileTabs.*`,
  `profileStats.*`, `profileGroups.*`, `profilePosts.*`, `milestones.*`, `gallery.*`,
  `share.*`, `socialImport.*`, `screens.profile.*`, `screens.privacysettings.*` keys reused.
- `apps/mobile/parity/ledger.json` — `PROFILE.ME`, `PROFILE.PRIVACY` → `native`.
- `apps/mobile/maestro/profile/README.md` — the G1 device-runtime flows (deferred).

## Red → green

`docs/validation/VTID-05429/red-on-base.txt`: the 4 new suites run on `origin/main`
a41e89a0d fail to run (the screens and data layer do not exist). On this branch:
`npx jest tests/profile` → 4 suites, 38/38 pass.

## Results (summary; details in commands.log)

| Check | Result |
|---|---|
| `npm run typecheck` (apps/mobile) | pass, 0 errors |
| `npx jest tests/profile` | 4 suites, 38/38 pass |
| `npm test` (full, apps/mobile) | 80 suites, 2102/2102 pass |
| `APP_PROFILE=development npm run bundle` | pass (iOS + Android Hermes bundles) |
| `APP_PROFILE=development EXPO_OFFLINE=1 npm run deps:check` | pass ("Dependencies are up to date") |
| `npm run parity:check` / `parity-ledger.mjs --check` | OK — 435 rows, 28 native routes |
| `core-closure.mjs --check` | up to date (core unchanged) |
| `check-shell-pins.mjs` | OK |
| `node --test scripts/native/__tests__/*.test.mjs` | 68 pass, 0 fail |
| `npx eslint apps/mobile packages` | 0 problems |
| i18n: register (`--all`), long-words (de), audit `--report-only`, stamp `--check-all`, locale registry | pass (no `profileNative` finding) |
| staging-tests.json vs vitana-platform `staging-verify/lib.cjs validateManifest` | ok |

Known pre-existing, not from this lane: `gen-core-extract.mjs --check` reports
`feed-compose.generated.ts` / `news-feed-ranker.generated.ts` out of date on
`origin/main` (packages/core is outside this lane's paths; untouched);
`npm run i18n:gate` fails 10 locale review-queue checks on `origin/main` (none in
`profileNative`).

## Review fix 1 (reviewer verdict `changes` on 85861633)

Merged `origin/main` (20116662c; `resolve.ts` conflict kept both sides' routes),
`npm ci` in `apps/mobile` (main added `expo-image-picker`, `expo-audio`).

- **Finding 1 (uploads):** new upload port `src/ports/profile-media.ts`
  (`expo-image-picker` + pure request builders) and `src/screens/profile/data/uploads.ts`
  (senders). Wired: the avatar Upload / Remove in the Identity sheet, the gallery Upload
  sheet + delete confirm in the Media tab, and the Cover Library sheet (Posts-tab tile,
  `?drawer=cover-library`). Same buckets, paths and request shapes as the web (see
  lane-brief.md). `app.config.ts` and its picker plugin are unchanged.
- **Finding 2 (parity):** the About sheet now has the links and languages editors.
  The progress card and the dance / partner / service-offering drawers are **not on
  mobile web**, so they are not ported (driver decision C). Evidence:
  - `src/components/profile/shared/ProfileLayout.tsx:23` imports `ProfileProgressCard`
    and never renders it. No other web file renders it.
  - `src/pages/EditProfilePage.tsx` mobile branch, lines 432-680: it mounts no
    `DancePreferencesDrawer`, `PartnerPreferencesDrawer` or `ServiceOfferingsDrawer`.
    Those are mounted only in the desktop return, at lines 792, 798 and 813. Lines
    87-89 set their open state from `?drawer=`, but nothing renders it on mobile.

  `tests/profile/uploads.test.tsx` asserts that the native screen renders none of
  the three drawers and no progress card.
- The "Not ported in this lane" deferral text is removed from `MyProfileScreen.tsx`
  and `lane-brief.md`. The remaining small differences are listed openly in
  lane-brief.md under "Other differences from mobile web".

Red → green: `red-fix1.txt`. The new suite fails to run on 85861633 (no
`expo-image-picker`) and on its merge with main, 20116662c (no
`src/ports/profile-media.ts`). It passes on this branch, 19/19.

| Check (fix 1) | Result |
|---|---|
| `npx jest tests/profile` | 5 suites, 57/57 pass |
| `npx jest` (full, apps/mobile) | 88 suites, 2288/2288 pass |
| `npm run typecheck` | pass |
| `APP_PROFILE=development npm run bundle` | pass (iOS + Android Hermes; dist removed after) |
| `APP_PROFILE=development EXPO_OFFLINE=1 npm run deps:check` | "Dependencies are up to date" |
| `npm run parity:check` | OK — 435 rows, 33 native routes |
| `core-closure.mjs --check` / `check-shell-pins.mjs` | up to date / OK |
| `node --test scripts/native/__tests__/*.test.mjs` | 68 pass, 0 fail |
| `npx eslint apps/mobile packages` | 0 problems |
| i18n register (`--all`), long-words (de) | pass |

**Not verified on staging: device runtime deferred to G1** (`staging-tests.json`
`deferred_g1`, `next_actor: owner`, isolated environment only).
