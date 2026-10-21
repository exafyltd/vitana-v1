# Verification — VTID-05298 (native-wave2-home-feed-news / news)

Native Wave 2 news lane: the `/news/:id` and `/post/:source/:id` reader ports and
the `NewsArticleCard` native twin. All commands run offline (the native app has no
production profile; `assertNotProduction()` refuses prod/staging hosts).
Windows / PowerShell, worktree `c:\Users\dstev\vitana-v1\.worktrees\nat-w2-news`.

## What was built

- `apps/mobile/src/screens/news/NewsArticleCard.tsx` — native twin of
  `src/components/crossover/NewsArticleCard.tsx` (image primary + fallback swap,
  category · timestamp, title/description, source row; presentational `onPress`).
  Single owner; Home's feed consumes it via a port (design decision 3).
- `apps/mobile/src/screens/news/NewsDetailScreen.tsx` + `app/(app)/news/[id].tsx`
  — full-screen reader twin of `src/pages/NewsArticleDetail.tsx` (mobile-web branch):
  back control, 16:9 hero + fallback, category/title/summary/source, member-greet /
  view-profile / read-on / open-in-browser actions, not-found state.
- `apps/mobile/src/screens/news/PostDetailScreen.tsx` + `app/(app)/post/[source]/[id].tsx`
  — twin of `src/pages/PostDetail.tsx`: fetches the one post (`profile_posts`) or
  video (`media_uploads`) via the injected Supabase client, renders author / body /
  image or video poster / counts; loading / not-found (deleted) / error states.
- `apps/mobile/src/screens/news/ActionButton.tsx`, `.../types.ts` — lane-local
  presentational button and the reader data shapes.
- `packages/core/src/news-images.ts` + `packages/core/manifest.json` — re-export of
  the pure `src/lib/news-images.ts` (`getNewsImage`, `getArticlePillar`,
  `LONGEVITY_PILLARS`); `apps/mobile/src/ports/news.ts` is the shell port the screens
  import (they never import `@vitana/*` directly — `tests/ports.test.ts`).
- `src/i18n/*/newsNative.json` — new `newsNative.*` keys (DE first, du-form) mirrored
  to all 11 locales (ar de en es fr pl pt ru sr tr zh); existing `newsCard.*` /
  `screens.postDetail.*` / `screens.home.communityMember` keys reused.
- `apps/mobile/parity/ledger.json` — `NEWS.DETAIL` and `/post/:source/:id` flipped
  `not_started` → `native`.
- `apps/mobile/maestro/news/README.md` — the G1 device-runtime flows (deferred).

## Commands run and results

From `apps/mobile/`:

- `npm run typecheck` → **PASS** (`tsc --noEmit`, 0 errors; i18n map regenerated first).
- `npm test` (scoped: `npx jest tests/news --ci --runInBand`) → **PASS**, 17/17:
  parseArticleParam (3), normalizePostSource (1), NewsArticleCard render + image
  fallback (2), NewsDetailScreen loaded / external-action / member-greet /
  not-found (4), deep-link resolution + route default-exports (3), PostDetailScreen
  loaded / video / deleted / fetch-error (4).
- `APP_PROFILE=development npm run bundle` → **PASS** (Metro + Hermes;
  android `entry-*.hbc` 17MB, ios `entry-*.hbc` 16MB; `Exported: dist`).
- `APP_PROFILE=development EXPO_OFFLINE=1 npm run deps:check` → **PASS**
  (`Dependencies are up to date`; no new dependency added).

Regression check (shell gates that read `src/screens/**` / routes):
`npx jest tests/ports.test.ts tests/navigation.test.tsx tests/i18n-rtl.test.tsx`
→ **PASS** (557 passed in those three suites; ports ban, native-route list, 11-locale
RTL no-raw-text / no-physical-direction all green).

From the repo root:

- `node scripts/native/parity-ledger.mjs --check` → **PASS**
  (`OK — 435 rows, 11 native route(s)`; both lane rows `native`, routes present).
- `node scripts/native/core-closure.mjs --check` → **PASS**
  (`21 roots, 31 src files, 11 assets — up to date`).

## Decisions taken (conservative, inside the approved plan)

1. **RN core `Image`, not `expo-image`; no `expo-video`.** Neither package is a
   dependency of the native app and neither is in the npm cache, so an offline
   install is impossible and would break `deps:check`. The web uses a plain `<img>`;
   RN `Image` is its direct twin and preserves parity (fixed-ratio cover + fallback
   swap). A video post shows its thumbnail with a "video" badge. `expo-image` /
   `expo-video` (caching / a real player) are "allowed native improvements" that
   belong to the G1 device-runtime pass (task 7, `next_actor: owner`), recorded in
   `staging-tests.json`. No new dependency was added.
2. **Reader data shapes are declared locally (`src/screens/news/types.ts`), not
   imported from the web types.** `NewsArticle` lives in `src/hooks/useNewsFeed.ts`
   (imports the Supabase client) and `PostFeedItem` in `src/lib/news-feed-ranker.ts`
   (uses `import.meta`); importing them — even `import type` — drags the web `src/`
   graph into the native `tsc` run, which fails on `import.meta.glob` / `import.meta.env`.
   Only the pure helper `news-images.ts` crosses the bridge (through `@vitana/core`).
   Feed composition logic is not re-implemented (R1.4) — these are field shapes.
3. **A lane port `apps/mobile/src/ports/news.ts` was added.** `tests/ports.test.ts`
   bans `@vitana/*` imports in `src/screens/**`; the design has screens reach core
   helpers through `src/ports/*`. The port is the one adapter for the news helper this
   lane owns. Recorded in `scope.json`.
4. **`apps/mobile/tests/news/**` is the test location.** The jest config roots at
   `tests/` (never `app/`), so the brief's `src/screens/news/__tests__/**` would not
   run; the lane's unit tests live in `apps/mobile/tests/news/`. Added to `scope.json`.
5. **`docs/SCREEN_INVENTORY.md` was not committed.** `npm run i18n:inventory` was run;
   its regeneration on Windows rewrites every page path with `\` separators (392 of 682
   added lines) and drops `__tests__` entries — OS-specific corruption that would break
   the CI-generated snapshot for every other lane, with zero lines reflecting the new
   `newsNative` keys (the inventory tracks `src/pages/**` consumers, which native screens
   are not). The committed file was restored. The 11 locale shards are the source of truth.

## Deferred to G1 (owner gate; not a merge blocker)

Device-runtime parity — Maestro `apps/mobile/maestro/news/*.yaml`, iOS simulator /
Android emulator screenshots, and screenshot parity vs the 390×844 read-only staging
`/news/:id` and `/post/:source/:id` — is `next_actor: owner` (requirements R5.3,
tasks 7), recorded in `apps/mobile/maestro/news/README.md` and
`docs/validation/VTID-05298/staging-tests.json`.

## Pre-existing, unrelated

`tests/well-known-unchanged.test.ts` fails on `public/.well-known/`
(apple-app-site-association, assetlinks.json) — files outside this lane, with zero diff
vs HEAD in this worktree. Pre-existing on the branch; not caused by and not touched by
this lane.
