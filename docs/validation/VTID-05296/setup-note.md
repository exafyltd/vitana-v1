# Setup note — VTID-05296 · lane `native-wave2-home-feed-news/community-hub`

Worktree setup only. No code edits in this step.

## Environment
- **Repo:** `exafyltd/vitana-v1` (native Maxina app, Expo/React Native + TS)
- **Worktree path (confirmed):** `c:\Users\dstev\vitana-v1\.worktrees\nat-w2-comm`
- **Branch:** `kiro/native-wave2-home-feed-news/community-hub` (tracking `origin/main`), base commit `69d39ef34`
- **Claim:** verified — `refs/heads/collab-claim/native-wave2-home-feed-news/community-hub` = `9e2972883e4d5ce7e3465a4d5e1164a928f2f2bc` on origin (expected `9e2972883`, matches; not taken by another session)
- **npm ci** (`apps/mobile/`): exit 0 — added 927 packages, audited 928 in ~8m; 65 npm-audit vulnerabilities reported (15 moderate, 50 high) — pre-existing in the locked dependency set, not introduced here.
- Spec read read-only from the platform plan branch via `git show origin/kiro/native-wave2-home-feed-news/plan:...` (platform repo not checked out).

## Lane-scope globs (copied verbatim from `lanes/community-hub.md` front-matter `paths:`)
```
apps/mobile/app/(app)/comm/**
apps/mobile/app/(app)/me/matches.tsx
apps/mobile/app/(app)/intents/**
apps/mobile/app/(app)/search.tsx
apps/mobile/src/screens/community/**
apps/mobile/maestro/community/**
packages/core/manifest.json
packages/core/closure.generated.json
packages/core/src/**
apps/mobile/parity/ledger.json
src/i18n/*/communityHubNative.json
docs/validation/**
```
Front-matter also: `executor: kiro`, `seat: exafyltd`, `reviewer_seat: hotmail`, `area: frontend`, `depends_on: []`, `state: ready`, `next_actor: kiro`, `vtid: VTID-05296`.

Shared-file rule (from the lane file): `apps/mobile/parity/ledger.json` — this lane edits ONLY its own rows; `packages/core/manifest.json` + closure + `src/**` — only this lane's re-exports; the DE-first i18n shard is shared by row/line. Resolve any merge conflict by keeping both lanes' rows/keys.

## Parity-ledger rows to flip (`not_started` → `in_progress` → `native`)

> **COUNT DISCREPANCY — resolve against the ledger, not the prose.** The lane header and `tasks.md` §7 say "17 rows". The committed ledger at `origin/main` (`apps/mobile/parity/ledger.json`, 435 rows total, 27 under `"lane": "home-feed"`) actually has **16** rows for this lane once the 9 `home` and 2 `news` rows are excluded. The plan's own Measured-state / partition section agrees: `9 (home) + 2 (news) + 16 (community-hub) = 27`, and notes the earlier "8+2+17" count was wrong. **Flip the 16 rows below.** If the build later finds a 17th row genuinely assigned to this lane, that is a plan/ledger mismatch to log with `next_actor: claude`, not a row to invent.

The 16 community-hub rows (ledger `key` → `web_path`, all currently `status: "not_started"`, `lane: "home-feed"`):

| # | key | web_path | kind | source |
|---|-----|----------|------|--------|
| 1 | `COMM.GROUPS` | `/comm/groups` | screen | registry |
| 2 | `COMM.GROUPS_DISCOVER` | `/comm/groups?tab=recommended` | screen | registry |
| 3 | `COMM.GROUP_DETAIL` | `/comm/groups/:id` | screen | registry |
| 4 | `/comm/my-groups/:id` | `/comm/my-groups/:id` | route | exclusion |
| 5 | `COMM.MEMBERS` | `/comm/members` | screen | registry |
| 6 | `OVERLAY.PROFILE_PREVIEW` | `/comm/members` | overlay | registry |
| 7 | `COMM.OPEN_ASKS` | `/comm/open-asks` | screen | registry |
| 8 | `COMM.FIND_PARTNER` | `/comm/find-partner` | screen | registry |
| 9 | `COMM.FIND_PARTNER_BOARD` | `/comm/find-partner?view=board` | screen | registry |
| 10 | `COMM.FIND_PARTNER_MATCHES` | `/comm/find-partner?view=matches` | screen | registry |
| 11 | `COMM.FIND_PARTNER_POSTS` | `/comm/find-partner?view=posts` | screen | registry |
| 12 | `COMM.MATCHES` | `/me/matches` | screen | registry |
| 13 | `INTENTS.BOARD` | `/intents/board` | screen | registry |
| 14 | `INTENTS.MINE` | `/intents/mine` | screen | registry |
| 15 | `INTENTS.MATCH_DETAIL` | `/intents/match/:id` | screen | registry |
| 16 | `SEARCH.OVERVIEW` | `/search` | screen | registry |

`parity-ledger.mjs` matches by exact `shapeOf()` (not prefix), so each row is distinct. Flip with `node scripts/native/parity-ledger.mjs --sync` (status hand-edited to `native`) then `--check` from the repo root.

## Web source screens to mirror (mobile-web branch only; `@vitana/core`-only bridge)
From `requirements.md` R0.4 (with `src/App.tsx` route cites), per the lane file:

| Native destination(s) | Web source | lines | App.tsx route |
|---|---|---|---|
| groups (+discover, detail, legacy my-groups) | `src/pages/community/Groups.tsx` | 272 | `:1226-1230` |
| group detail | `src/pages/community/GroupDetail.tsx` | 234 | `:1231-1235` |
| members (+ profile-preview overlay) | `src/pages/community/Members.tsx` | 332 | `:1269-1274` |
| open asks | `src/pages/community/OpenAsks.tsx` | 289 | `:1276-1281` |
| find a partner (+ board/matches/posts views via `?view=`) | `src/pages/community/FindPartner.tsx` | 780 | `:1283-1287` |
| full matches list `/me/matches` | `src/pages/MatchesPage.tsx` | 183 | `:1495-1499` |
| intents board | `src/pages/IntentBoard.tsx` | 225 | `:1508-1512` |
| my intents | `src/pages/MyIntents.tsx` | 202 | `:1517-1521` |
| intent match detail | `src/pages/IntentMatchDetail.tsx` | 192 | `:1522-1526` |
| global search `/search` | `src/pages/Search.tsx` | 492 | `:1488-1492` |

(Line counts are an approximate scoping snapshot per R1-F2; not load-bearing.)

## Key build constraints carried from plan/tasks (for the build step)
- Member-listing queries (members, find-partner, open-asks, global search) are **RE-IMPLEMENTED against the native PostgREST / gateway client** in `apps/mobile/src/screens/community/data/directory.ts` — NOT imported from `@vitana/core`. (Acceptance-review correction, VTID-05296: the earlier "reused unchanged from `@vitana/core`" claim was wrong.) The test/service allowlist exclusion (program NEVER rule 45 — `service_bot_accounts` ∪ `notification_test_actors`) is enforced by the SAME mechanisms as web, not by sharing a query object: direct `global_community_profiles` reads filter `is_visible = true` (the `vtid_04888_rule45` DB trigger hides allowlisted accounts), and the `/community/members` + `/community/open-asks` gateway feeds apply it server-side. A member-listing surface must keep both.
- Find-match / age-range filter uses the N2 kit's corrected-range `Slider` (web defect not reproduced).
- Core re-exports owned here are only this lane's hooks/types; the `home` lane owns the feed-compose/news-feed-ranker core extraction.
- i18n: 11 locales (ar de en es fr pl pt ru sr tr zh), new keys DE-first (du-form) then mirrored; RTL (`ar`) covered; no hardcoded user-visible text; no physical `left`/`right` (use logical `start`/`end`). New shard: `src/i18n/*/communityHubNative.json`.
- Verify gates (from `apps/mobile/`): `npm run typecheck`, `npm test`, `APP_PROFILE=development npm run bundle`, `APP_PROFILE=development EXPO_OFFLINE=1 npm run deps:check`; from repo root `node scripts/native/core-closure.mjs --check` and `node scripts/native/parity-ledger.mjs --check` (all 16 rows `native`, routes present). React 19 `ReactElement`.
- `docs/validation/VTID-05296/` must gain `scope.json`, `staging-tests.json` (read-only spec) and `plan-sparring.md`.
- Device-runtime parity (task 8) deferred to G1 as `next_actor: owner` — not a merge blocker; record in lane log + `staging-tests.json`.
- NEVER (collaboration §7a): no VTID allocation, no merge/approve, no workflow dispatch/deploy, no Supabase/AWS writes, no test against production; staging specs read-only; native app has no production profile.
