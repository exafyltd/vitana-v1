# Lane brief — VTID-05298 · native-wave2-home-feed-news/news

> Pre-implementation brief for the `news` lane. Authoritative spec lives in the **platform** repo
> (`exafyltd/vitana-platform`) on branch `kiro/native-wave2-home-feed-news/plan`:
> `.kiro/specs/native-wave2-home-feed-news/` — `plan.md`, `tasks.md` (`<!-- lane: news -->` block, tasks 1–8),
> `lanes/news.md`, plus `requirements.md` / `design.md` (R1–R6 are authoritative; follow them exactly). This file is a
> working summary — if it ever conflicts with those spec files, the spec files win.
>
> Role: **implementer (Kiro, VTID-05192)**. Never allocate a VTID, merge/approve a PR, dispatch a workflow, deploy,
> or write to a live system (Supabase/AWS). A DB change is a migration file in the PR. Never test against production;
> the native app has no production profile (`assertNotProduction()` refuses prod/staging hosts).

## Lane identity
- **Lane:** `native-wave2-home-feed-news/news`
- **VTID:** VTID-05298 (allocated by CI after PLAN-SPAR converged — policy `converged-auto-v1`)
- **Repo:** `exafyltd/vitana-v1` — native app only (`apps/mobile/**`, `packages/core/**` via manifest/closure,
  `apps/mobile/parity/ledger.json`, DE-first i18n shards, `docs/validation/**`). No backend / gateway / migration.
- **Seat:** exafyltd → **reviewer_seat:** hotmail
- **depends_on:** none (runs in parallel with `community-hub`; the `home` lane depends on **this** lane for the
  `NewsArticleCard` native twin).
- **Branch:** `kiro/native-wave2-home-feed-news/news`
- **Worktree:** `c:\Users\dstev\vitana-v1\.worktrees\nat-w2-news`

## Goal
Port the two **reader** screens to native on the Wave 1 **N3 shell** at 1:1 **mobile-web** parity, and build the
`NewsArticleCard` native twin that Home's feed consumes through a port (design decision 3 → this lane is the single
owner of the card):
- `NEWS.DETAIL` → `/news/:id` — web source `src/pages/NewsArticleDetail.tsx` (~230 lines, route `src/App.tsx:1001-1008`)
- `/post/:source/:id` (exclusion row) — web source `src/pages/PostDetail.tsx` (~158 lines, route `src/App.tsx:1010-1016`)
- Shared card web source `src/components/crossover/NewsArticleCard.tsx` (~187 lines)

Full-screen reader + single post/video deep-link target. `<video>` → `expo-video`, images → `expo-image`. Built on
`@vitana/core` + `@vitana/tokens` + the N2 UI kit (`@vitana/ui`). Flips **both** parity rows `not_started` → `native`.
Mobile-web branch only (mirror the `useIsMobile()` ≤ 1024 px branch of each source; do not reproduce the four
N2-documented web defects; do not touch any web file beyond a DE-first i18n key or a `@vitana/core` re-export line).

## The 8 tasks (news lane, from tasks.md)
1. **`NewsArticleCard` native twin** (shared with Home via a port): `apps/mobile/src/screens/news/NewsArticleCard.tsx`
   mirrors `src/components/crossover/NewsArticleCard.tsx` (image primary + fallback swap, pillar, `expo-image`). Add any
   pure helper it needs (e.g. `src/lib/news-images.ts`) to `@vitana/core` via the manifest + `core-closure.mjs --write`.
   - Files: `apps/mobile/src/screens/news/NewsArticleCard.tsx`, `packages/core/manifest.json`, `packages/core/src/**`,
     `packages/core/closure.generated.json`.
   - Verify (repo root): `node scripts/native/core-closure.mjs --check`; from `apps/mobile`: `npm run typecheck` green.
2. **News article reader**: `apps/mobile/app/(app)/news/[id].tsx` + `apps/mobile/src/screens/news/NewsDetailScreen.tsx`
   — full-screen reader twin of `NewsArticleDetail.tsx` on the N3 shell, back-navigation (gesture + button), opens from
   a feed card and from a deep link. Mobile-web branch only.
   - Verify: `npm test` + `npm run typecheck` green.
3. **Single post / video**: `apps/mobile/app/(app)/post/[source]/[id].tsx` +
   `apps/mobile/src/screens/news/PostDetailScreen.tsx` — twin of `PostDetail.tsx`, the like/comment-notification
   deep-link target; `<video>` → `expo-video`, images → `expo-image`.
   - Verify: `npm test` + `npm run typecheck` green.
4. **i18n + RTL** for the two readers + the card: user-visible strings from web shards; any genuinely new key added
   to `src/i18n/de/*.json` **first**, then the other ten (ar de en es fr pl pt ru sr tr zh); render under `ar` with
   start/end only; no hardcoded text, no physical `left`/`right`. New shard per lane naming: `src/i18n/*/newsNative.json`
   (per lane `paths`).
   - Verify: `npm run typecheck`; `npm test` no-raw-text / no-physical-direction tests pass.
5. **Unit tests** (fake gateway / fixtures, no network): article loaded / not-found / error; post loaded / deleted /
   error; card image fallback swap; open-from-deep-link resolves the right screen. React 19 — use `ReactElement`, no
   global `JSX`.
   - Files: `apps/mobile/src/screens/news/__tests__/**`, `apps/mobile/app/(app)/news/__tests__/**`,
     `apps/mobile/app/(app)/post/__tests__/**`.
   - Verify: `npm test`; `APP_PROFILE=development npm run bundle`;
     `APP_PROFILE=development EXPO_OFFLINE=1 npm run deps:check` green.
6. **Flip the parity rows** (`NEWS.DETAIL`, `/post/:source/:id`) to `native`: `node scripts/native/parity-ledger.mjs
   --sync` (status edited by hand to `native`), then `--check`. Edit **only this lane's 2 rows** in the shared ledger.
   - Files: `apps/mobile/parity/ledger.json` (news rows only), `docs/validation/VTID-05298/{scope,staging-tests}.json`.
   - Verify (repo root): `node scripts/native/parity-ledger.mjs --check` green.
7. **(depends-on-owner / G1 — `next_actor: owner`, NOT a merge blocker)** Device-runtime parity: Maestro
   `apps/mobile/maestro/news/*.yaml` + iOS simulator + Android emulator screenshots + parity vs the 390×844 read-only
   staging `/news/:id` and `/post/:source/:id`. Blocked until G1 (and macOS minutes / G3 for iOS on device). Recorded
   in the lane log and `staging-tests.json`, not run in CI.
8. **PR**: branch `kiro/native-wave2-home-feed-news/news`, title
   `VTID-05298 (native-wave2-home-feed-news/news): native news / post reader port`; body names the Kiro session id with
   Summary / Decisions taken / Tests / Handoff. Commit trailers `Collab-Session: <kiro id>`,
   `Collab-Lane: native-wave2-home-feed-news/news`. Lane → `in-review`, `next_actor: kiro` (reviewer seat `hotmail`).
   **Never merge, deploy, or write to a live system.**

## Lane scope — `paths` (from lanes/news.md; stay inside these)
```
apps/mobile/app/(app)/news/**
apps/mobile/app/(app)/post/**
apps/mobile/src/screens/news/**
apps/mobile/maestro/news/**
packages/core/manifest.json
packages/core/closure.generated.json
packages/core/src/**
apps/mobile/parity/ledger.json
src/i18n/*/newsNative.json
docs/validation/**
```
**Shared files** (resolve a merge conflict by keeping both lanes' rows/keys, never overwrite another lane's):
- `apps/mobile/parity/ledger.json` — this lane edits **only its 2 rows**.
- `packages/core/manifest.json` + `closure.generated.json` + `src/**` — only the re-exports this lane adds.
- The DE-first i18n shard — shared by key/line with the other two lanes.

## Acceptance / verify commands (reviewer seat checks these)
All `npm` commands run from `apps/mobile/` unless noted; `scripts/native/*` run from the **repo root**. Everything is
offline by construction (no production profile; `assertNotProduction()`).

- Requirements R1–R6 for `/news/:id` and `/post/:source/:id`; mobile-web parity; `@vitana/core`-only web bridge; the
  card twin shared via a port (single owner, no duplicate).
- `npm run typecheck` — green.
- `npm test` — article loaded / not-found / error; post loaded / deleted / error; card image fallback; deep-link
  resolves. React 19 `ReactElement`.
- `APP_PROFILE=development npm run bundle` — green.
- `APP_PROFILE=development EXPO_OFFLINE=1 npm run deps:check` — green.
- `node scripts/native/core-closure.mjs --check` — green (run `--write` and commit the regenerated
  `packages/core/closure.generated.json` + `scripts/native/mobile-ci-paths.generated.json` in the same PR).
- `node scripts/native/parity-ledger.mjs --check` — green with **both** rows `native` and their routes present under
  `apps/mobile/app/`.
- 11 locales (ar de en es fr pl pt ru sr tr zh), new keys DE-first (du-form) then mirrored; RTL (`ar`) covered; no
  hardcoded user-visible text; no physical `left`/`right`.
- NATIVE-CI (shell source-pin + ports), PR-GATE **Collab handoff** + **Lane scope** green.
- `docs/validation/VTID-05298/` has `scope.json` (every touched path), `staging-tests.json` (this lane's read-only
  spec) and `plan-sparring.md` (copy of the plan's sparring record).
- Device-runtime parity (task 7) is deferred to G1 as `next_actor: owner` — recorded, not a merge blocker.

## Key design constraints (from plan.md)
- **No new routes / registry / manifest, no `App.tsx` route.** A native Expo Router file is not an `App.tsx` route, so
  the "new page needs screens.json/exclusions.json + screen-manifest + parity row" rule does not fire — only parity-row
  **status** flips (`not_started` → `in_progress` → `native`).
- **Only pure, IO-free modules move into `@vitana/core`.** This lane adds the pure helper(s) the card needs (e.g.
  `news-images.ts`). Do NOT add data-fetching hooks or class-B modules (anything that imports
  `@/integrations/supabase/client.ts`, uses `import.meta.env` / `localStorage`, etc.) — they fail `core-closure --check`.
  Type-only imports are excluded from the runtime graph (`scripts/native/extraction-deps.mjs:183`) and resolve via the
  native tsconfig `@/*` → `../../src/*` alias, so they need no core re-export.
- **Mobile-web parity, not desktop.** Mirror the `useIsMobile()` ≤ 1024 px branch; every visual value from
  `@vitana/tokens`; do not reproduce the four N2-documented web defects.
- **No What's New entry** (ports of existing screens).

## Session-start / collaboration reminders
- At session start: generate the Kiro session id
  (`node <vitana-platform>/scripts/collab/queue.mjs session-id --agent kiro`), state it + the lane in the first reply;
  `git fetch --prune origin`; run the queue; a claimed lane is one session only.
- The claim ref `collab-claim/native-wave2-home-feed-news/news` is held by this session
  (sha `7caf3d2ace57887e2bd65fd9800048fa92a54a37`). Do not re-claim.
- Commit trailers on every commit: `Collab-Session: <kiro id>`, `Collab-Lane: native-wave2-home-feed-news/news`.
- GitHub is slow (20s+/call) and `git push` can hang after success — use long timeouts, verify remote state with
  `git ls-remote`. PERMISSION RULES DENY and must not be run: `Remove-Item -Recurse`, `rm -rf`, `git reset --hard`,
  `git clean -f`, `git push --force`, `git branch -D`, `git config`.
