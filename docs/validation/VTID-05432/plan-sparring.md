# Plan sparring record — VTID-05432 (native-wave2-profile-settings-r2 / support-connectors)

Copy of the plan's sparring record (authoritative source in `exafyltd/vitana-platform`
on `main`: `.kiro/specs/native-wave2-profile-settings-r2/sparring/`).

## Verdict

CONVERGED and approved by policy `converged-auto-v1` at 2026-11-01T03:02:17.659+00:00.

- Sparring session: `dffbaf66-2c23-4ad1-ae2a-520080973d18` (3 rounds)
- Final plan hash: `7359e0651835d14da8d55c8dbafad86c8d915438a4064431f9e8f4accb027ed3`
- VTIDs allocated: VTID-05428, VTID-05429, VTID-05430, VTID-05431, **VTID-05432** (this lane: `support-connectors`)
- Rounds / responses: `sparring/round-1..3.md`, `sparring/responses-1..2.md`, `sparring/state.json`,
  `sparring/verdict.md`. Findings R1-F1 (`/delete-account` public → lane `delete-account`) and R2-F1
  (`/u/:identifier`, `/profile/:id` public → lane `public-profile`) did not change this lane.
- Re-plan of `native-wave2-profile-settings` (vitana-platform PR #4278, converged); its sparring history
  stays on that PR.

## Approval

- Owner approval: by policy `converged-auto-v1` (the owner's standing decision of 2026-10-14,
  VTID-05214/05218), applied at 2026-11-01T03:02:17.659+00:00; no separate Gate 1.

The converged plan is approved by policy `converged-auto-v1` (owner decision
2026-10-14, VTID-05214/05218): a plan sparred by CI whose session converged is
approved by policy and not sent to the owner as Gate 1. The VTID was allocated by
CI after convergence (`lanes/support-connectors.md` log, 2026-11-01T03:04Z).

## Scope of this lane (support-connectors)

Port the member support surface and the connected-apps directory to native
(apps/mobile) at 1:1 mobile-web parity — 14 ledger rows, 3 route files:

- `/support` (+ `?tab=contact|community|faqs`, 4 rows) — `src/pages/MobileSupport.tsx`.
- `/connectors` (+ 8 `?tab=` categories and `SETTINGS.SOCIAL`, 9 rows) —
  `src/pages/settings/ConnectedApps.tsx` → `MobileConnectedAppsView.tsx`.
- `/settings/connected-apps` (1 row) — the web redirect to `/connectors`.

No `@vitana/core` change (plan decision 2): the class-B data hooks are re-implemented
natively. Every write is asserted against a mocked gateway (plan decision 5). Device-runtime
parity and the real OAuth round-trip are DEFERRED to G1 (`next_actor: owner`).
