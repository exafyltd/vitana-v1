# Acceptance — VTID-05442 (mt-track-s-r2 / s-j-route-inventory)

Plan: `exafyltd/vitana-platform:.kiro/specs/mt-track-s-r2/plan.md` §4 lane 1, `tasks.md` T1–T5. This lane closes the
S-H residual (`docs/MULTI-TENANT-PLAN.md:44`). S-J stays open (tracked by `mt-guardrails-r2`).

| Acceptance | Evidence |
|---|---|
| T1: no caller of `linkedin-import` | `commands.log`: at base, `git grep` hits only `src/lib/edge-functions-caller-identity.s4.test.ts`; no `invoke('linkedin-import'` in vitana-v1; no hit in vitana-platform `services/`. |
| T2: function and config removed | `supabase/functions/linkedin-import/` deleted; `[functions.linkedin-import]` removed from `supabase/config.toml`. |
| T3: s4 test loses only `linkedin-import` | The header, the caller-auth list (five → four functions), the profile-import loop, the "flagged for removal" case and the scan's `arrayContaining` drop `linkedin-import`. Every assertion about `social-media-import`, `fetch-user-context`, `queue-campaign-recipients` and `send-welcome-discount` is unchanged. |
| T4: gate added and wired | `scripts/check-edge-function-auth.mjs`, with a frozen and tagged `LEGACY` map of 59 functions (33 `B-user`, 1 `B-sig`, 1 `B-secret`, 24 `C-unreviewed`). It runs in `package.json` `"test"` before `vitest run`. |
| Red on base | `node scripts/check-edge-function-auth.mjs` exits 1 at base (the script does not exist). |
| Green after | It exits 0 with 64 functions and 59 legacy. |
| Planted failures | New folder without caller-auth: exit 1. `LEGACY` key with no folder: exit 1. `LEGACY` function that now satisfies the rule: exit 1 ("migrated — remove … from LEGACY"). All planted files were removed. |
| Full suite | `npm test`: 485 test files, 3,908 tests passed, with the gate run first. |
| No legacy function edited | `git diff --stat` touches only the lane `paths`. |
| Staging proof | Not verified on staging. An edge-function folder removal deploys nothing to staging. `staging-tests.json` references the gate and the s4 suite as `existing`. |
