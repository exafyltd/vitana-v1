# VTID-05684 — acceptance (native-wave1-readiness-tests/roles)

**Readiness statement.** These tests are readiness evidence only. They do not prove the Wave 1 exit ("signed-in G1 member
navigates the full shell in all modes, receives a push and opens its deep link, on both platforms", `NATIVE-APP-PLAN.md:196`),
which needs G1 (`NATIVE-APP-PLAN.md` §5, §2a). Skipped cases are not counted toward the exit, and neither are the passing ones.

Checked against vitana-v1 `origin/main` e31bf4627ff3c705c20f8e6b718ce4dd03353b7f. No premise was stale (see `commands.log`, Task 0).

## Cases added (running): 440
| File | Cases | Covers |
|---|---|---|
| `role-labels.test.ts` | 104 | R1: `ROLE_LABEL_KEY` has all 8 `ROLE_LADDER` roles, distinct keys; `roleLabel` for 8 roles x 11 locales (de en es sr fr pl pt ru tr zh ar): non-empty, not the key, the locale's own string (no `de` fallback), distinct per role; unknown role returns the role string and never calls `t` |
| `route-guard-matrix.test.ts` | 304 (302 table rows + 2) | R2: 8 roles x every community prefix (11), `/admin`, `/staff`, `/professional`, `/patient`, `/backoffice`, 9 shared paths, consumer path, `/admin/device-preview`, 3 tenant-portal paths, 6 look-alike paths with no false prefix match; rows already in `shell-logic.test.ts:182-198` and `patient/gate-tabs-routes.test.tsx:99-102` left out |
| `web-console-destination.test.ts` | 24 | R3: `isWebConsoleDestination` (`/admin`, `/admin/x`, external, `/home`, `/patient/dashboard`, `/administrator`, ...); `getRoleSwitchDestination` never external for the roles `computeAvailableRoles` offers on mobile, all 8 roles |
| `use-role.test.tsx` | 8 | R4: no tenant -> `NO_ACTIVE_TENANT`, no RPC, no `role.changed`; `dbRole` `community` for null / `[]` / null role / empty role / RPC error; stored role returned; success -> `{ ok: true }`, one `set_role_preference`, re-read of the preference |

## Skipped, needs G1 (NOT counted toward the Wave 1 exit): 3
`g1-skipped.test.ts`, each `it.skip` with `// needs G1 (isolated test backend): <reason>` on the line above:
1. role grants read from the G1 database (`get_my_permitted_roles` on real rows) — mocks only echo what a test returns.
2. a role switch persisted and read back after a restart — needs a real `set_role_preference` write and an app restart.
3. a staff/admin member's web-console hand-off reaches a real host — needs the G1 web host.

## Findings (source differs from the web contract)
None. `routeGuard` (`route-guard.ts:10-12,17-37`) matches `src/hooks/useSmartRouting.tsx:15-25,52-105` with `isMobile` true for every row of
the matrix. Observations, not divergences (also true in the web hook): the shared prefix `/community` (`route-guard.ts:11`) wins over the
community prefix `/comm`, so `/community` is never bounced; shared paths match by `startsWith`, so `/devices` is also treated as shared.
`/backoffice` is bounced to `/home` for every role on the phone (`route-guard.ts:31`, web `useSmartRouting.tsx:74` with `isMobile`).
Test hygiene note: `use-role.test.tsx` logs React "not wrapped in act" warnings from the existing `LanguageProvider` in `tests/helpers/providers.tsx` (as the existing identity tests do); no failure, helper untouched.

## Acceptance checklist (tasks.md, lane `roles`)
- [x] Change types: Tooling/docs (new test files only)
- [x] Outcome: none for members; labels in 11 locales, the full route-guard matrix and `useRole` edge cases have mock-level cover
- [x] States: every `UserRole`, no tenant, null preference, RPC error, success
- [x] Surfaces: n/a, no screen changes
- [x] Locales: R1 asserts the role labels in all 11 locales
- [x] Accessibility: n/a, no UI change
- [x] Contract: no source file, existing test, helper or `package.json` changed; R2 is a table of current behaviour with `route-guard.ts` lines per group; no finding to record
- [x] Readiness only: statement above; G1 skips not counted
- [x] Staging proof: not verified on staging, offline mock tests, nothing deployed
- [x] Red on base: `npx jest tests/wave1-readiness/roles` on `origin/main` finds no tests (`commands.log`)
