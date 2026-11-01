# Plan sparring record — VTID-05428 (native-wave2-profile-settings-r2 / delete-account)

Copy of the plan's sparring record (authoritative source in `exafyltd/vitana-platform`
on `main`: `.kiro/specs/native-wave2-profile-settings-r2/sparring/`).

## Verdict

CONVERGED and approved by policy `converged-auto-v1` at 2026-11-01T03:02:17.659+00:00.

- Sparring session: `dffbaf66-2c23-4ad1-ae2a-520080973d18`
- Final plan hash: `7359e0651835d14da8d55c8dbafad86c8d915438a4064431f9e8f4accb027ed3`
- VTIDs allocated: **VTID-05428** (this lane: `delete-account`), VTID-05429, VTID-05430, VTID-05431, VTID-05432
- Rounds / responses: `sparring/round-1..3.md`, `sparring/responses-1..2.md`, `sparring/state.json`
  (3 rounds, converged in round 3 with no new findings)
- Re-plan of `native-wave2-profile-settings` (vitana-platform PR #4278); earlier rounds on that PR.

## The finding that created this lane

- **R1-F1 (accepted).** `/delete-account` is public on the web (`src/App.tsx:843-847`, no
  `AuthGuard`) and must stay reachable signed out. The native `(app)` group's `AuthGate`
  redirects a signed-out visitor to `/maxina` unless the path is in `GUEST_PATHS`, which may
  only hold `<AuthGuard allowGuest>` routes (`check-shell-pins.mjs`). So the twin goes in the
  existing `(public)` group as `apps/mobile/app/(public)/delete-account.tsx` and reads the
  session itself (signed out → the web's signed-out view; signed in → the confirm flow; the
  delete request mocked, never fired). Plan decision 1a; new lane `delete-account`.
- R2-F1 (accepted) concerns the sibling `public-profile` lane only.

## Approval

The converged plan is approved by policy `converged-auto-v1`: a plan sparred by CI whose
session converged is approved by policy and not sent to the owner as Gate 1. The VTID was
allocated by CI after convergence (`lanes/delete-account.md` log, 2026-11-01T03:04Z).
