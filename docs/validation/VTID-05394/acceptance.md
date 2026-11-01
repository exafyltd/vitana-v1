# VTID-05394 — fix-deeplink-scroll-test / fixture-dates: acceptance

Plan: `exafyltd/vitana-platform` `.kiro/specs/fix-deeplink-scroll-test/` (converged, policy `converged-auto-v1`).

## T0 start check
- exafyltd/vitana-v1#1506 is `CLOSED`, not merged (head `2b0d52d3d`).
- The same fixture fix landed on `main` through exafyltd/vitana-v1#1508, merge commit
  `627e8094fa3117ca1d8327559c7a88a98d02552a` (2026-10-28T14:32:52Z, VTID-05320): the outbox seeds use
  `RECENT_1 = now - 120 s` and `RECENT_2 = now - 119 s` instead of the fixed `2026-10-21T10:00:0…` dates.
- The plan's T0 condition ("the test file is already fixed on main") holds, so T1, T2 and T4's code part are skipped;
  this lane re-runs T3 on `origin/main` and records it. Deviation from the plan text: the fix came from #1508, not
  #1506; the edit is equivalent (now-relative timestamps, pending older than failed, far inside `OUTBOX_MAX_AGE_MS`).

## Acceptance
| Item | Result |
|---|---|
| Outcome: `Vitest (jsdom)` green on main | UNIT-TESTS run 40707016215 on `627e8094f` = success; every main run since, latest 41207435618 on `a10942848` (2026-10-31) = success |
| Stays green past 2026-10-28 | green on main on 2026-10-29, 10-30 and 10-31 (push + schedule runs); no fixed outbox date left in the file |
| VTID-05320 test file | 17/17 passed locally on `a10942848` |
| Deep-link test VTID-05201 | 1/1 passed locally on `a10942848` |
| Full `npm run test:unit` | see `commands.log` |
| Diff | only `docs/validation/VTID-05394/**`; no assertion, test or product file changed |
| States, surfaces, locales, accessibility, contract | n/a (no code change) |
| Staging proof | not verified on staging: no code change, the deployed bundle is unchanged; `staging-tests.json` names the covering Vitest file |
