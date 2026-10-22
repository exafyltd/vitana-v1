# Verification — VTID-05296 · lane `native-wave2-home-feed-news/community-hub`

Records the actual command runs for the acceptance-review fix pass (on top of the
original lane commit `8326dbc`). Environment: Windows / PowerShell, worktree
`c:\Users\dstev\vitana-v1\.worktrees\nat-w2-comm`, branch
`kiro/native-wave2-home-feed-news/community-hub`. Node 22.x, `apps/mobile`
`node_modules` already installed (`npm ci` from the setup step).

The native Maxina app has **no staging/production host and no production
profile** (collaboration §7a), so there is no STAGING-VERIFY run for this lane —
parity is proven by the read-only fixture/fake-gateway Jest suites plus
typecheck, the dev bundle, and the parity ledger, exactly as `staging-tests.json`
declares. Nothing in this lane runs against a live system.

## Red → green

The review found the parity gaps, the false-reuse claim, and the missing test
coverage. The green state below is **after** the fixes:
- New screens/components (`IntentComposer.tsx`, `CreateGroupSheet.tsx`,
  `FindPartnerFilterSheet.tsx`) and new data hooks (`usePostIntent`,
  `useCreateGroup`, widened `BoardFilter`) were added.
- New tests for the gap features (composer post, create-group insert,
  dance-variety chips, learning_seek filter, min-score filter) and for the
  previously-missing states (Groups directory error, GroupDetail error, Search
  error, Members load-more + preview dismiss, Find-a-Partner matches/members
  error) were added. They are **red before the screen changes** (the testIDs and
  behaviours they assert did not exist in `8326dbc`) and **green after**.

## Command runs (this pass)

| Command | cwd | Result |
|---|---|---|
| `npm run typecheck` (`tsc --noEmit`, runs `gen:i18n` first) | `apps/mobile` | **exit 0** — no type errors. `gen-i18n-map: 11 locales, 1386 shards` (unchanged). |
| `npx jest tests/community --config jest.config.js` | `apps/mobile` | **8 suites passed, 49 tests passed**, 0 failed. |
| `npm test` (full native suite) | `apps/mobile` | **71 suites passed, 2 failed; 1994 tests passed, 4 failed.** The 2 failing suites are the pre-existing Windows artifacts below — unrelated to this lane. |
| `APP_PROFILE=development npm run bundle` | `apps/mobile` | **exit 0** — `Exported: dist`; iOS bundle `_expo/static/js/ios/entry-*.hbc` (17MB) + Android bundle `_expo/static/js/android/entry-*.hbc` (17MB). |
| `node scripts/native/parity-ledger.mjs --check` | repo root | **OK — 435 rows, 20 native route(s)** (the 16 community-hub rows native, each with a route file). |
| `APP_PROFILE=development EXPO_OFFLINE=1 npm run deps:check` | `apps/mobile` | **exit 0** — "Dependencies are up to date" (the offline-mode reliability warning is expected with `EXPO_OFFLINE=1`). |

### Community suite breakdown (49 tests, 8 files)

- `groups.test.tsx` — my-groups loaded/empty, Discover switch+join, initialTab,
  **Discover directory ERROR**, **search filter**, **create-group insert**;
  GroupDetail member leave, not-found, **not-found on query error**.
- `members.test.tsx` — loaded, empty, gateway ERROR, preview open,
  **preview dismiss**, **load-more (append)**.
- `find-partner.test.tsx` — matches/board/posts/members views,
  **matches ERROR**, **members ERROR**, **min-score filter + Showing-of-total**,
  **composer open**.
- `intents.test.tsx` — board loaded/empty/ERROR, dance prefix filter,
  **dance-variety chips**, **learning_seek filter**, **composer open**;
  match detail loaded/no-matches/not-found.
- `composer.test.tsx` (new) — IntentComposer validation + POST; CreateGroupSheet
  name-required + insert-with-admin-membership.
- `search.test.tsx` — results (self excluded), empty, submit search,
  **profile-query ERROR**.
- `matches.test.tsx` — /me/matches loaded/empty/error/score.
- `open-asks.test.tsx` — loaded/empty/error/filter chips/load-more.

## Pre-existing / unrelated failures (explicitly noted, not caused by this lane)

Both fail only on Windows and touch files this lane never modifies:

1. **`tests/well-known-unchanged.test.ts`** — SHA-256 of
   `public/.well-known/apple-app-site-association` and `assetlinks.json` differs
   because Git checked those files out with **CRLF** line endings on Windows, so
   the byte hash no longer matches the committed (LF) originals. Not touched by
   this lane.
2. **`tests/ui/guards.test.ts`** — path-separator artifacts: the SR-19 guard
   expects `foundation/hitSlop.ts` but the test reads
   `foundation\\hitSlop.ts` on Windows; the SR-17 colour-literal scan flags
   `src/ui/theme/legacy-literals.ts` (a kit file, not touched here). Both are
   Windows `path.sep` / line-ending differences, not a code regression.

These 2 suites / 4 tests are the Windows artifacts named in the lane brief. On
the Linux CI runner they pass; nothing in this lane's diff affects
`public/.well-known/**` or `apps/mobile/src/ui/**` beyond re-exporting the
existing kit `Slider` through `src/ports/ui.tsx`.

## i18n

New user-visible strings added DE-first (du-form) in
`src/i18n/de/communityHubNative.json`, then mirrored to all 11 locales
(ar de en es fr pl pt ru sr tr zh). All 11 shards parse as valid JSON. No raw
user-visible strings in the new screens — every label goes through
`useI18n().t(...)` and every toast through `notify`/`notifyError` catalog keys.
RTL: logical props only (no physical left/right) in the new components.
