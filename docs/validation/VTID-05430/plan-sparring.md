# Plan sparring record — VTID-05430 (native-wave2-profile-settings-r2 / public-profile)

Copy of the plan's sparring record (authoritative source in `exafyltd/vitana-platform`
on `main`: `.kiro/specs/native-wave2-profile-settings-r2/sparring/`).

## Verdict

CONVERGED and approved by policy `converged-auto-v1` at 2026-11-01T03:02:17.659+00:00.

- Sparring session: `dffbaf66-2c23-4ad1-ae2a-520080973d18`
- Final plan hash: `7359e0651835d14da8d55c8dbafad86c8d915438a4064431f9e8f4accb027ed3`
- VTIDs allocated: VTID-05428 (delete-account), VTID-05429 (profile), **VTID-05430** (this lane:
  `public-profile`), VTID-05431 (settings), VTID-05432 (support-connectors)
- Rounds / responses: `sparring/round-1..3.md`, `sparring/responses-1..2.md`, `sparring/state.json`,
  `sparring/verdict.md`

## Approval

The converged plan is approved by policy `converged-auto-v1` (owner decision 2026-10-14,
VTID-05214/05218): a plan sparred by CI whose session converged is approved by policy and not sent
to the owner as Gate 1. The VTID was allocated by CI after convergence (`lanes/public-profile.md`
log, 2026-11-01T03:04Z).

- **Owner approval:** policy approval `converged-auto-v1` (owner decision 2026-10-14,
  VTID-05214/05218) stands in for Gate 1 for a CI-sparred plan that converged. Recorded here as the
  audit line; the mechanical gate is the `vtid_ledger` trigger that admitted VTID-05430.

## Scope of this lane (public-profile)

Plan decision 1b (r2 sparring R2-F1): `/u/:identifier` and `/profile/:id` are public on the web
(`src/App.tsx:1493`, `:1482`, no `AuthGuard`, not in `GUEST_PATHS`), so the native twins live in
the `(public)` group, outside the `(app)` `AuthGate`:

- `apps/mobile/app/(public)/u/[identifier].tsx` → `PublicProfileScreen`, the read-only twin of
  `src/pages/PublicProfilePage.tsx` (PROFILE.PUBLIC + PROFILE.WITH_MATCH, one route file). The
  screen wraps itself in `MobileAppShell` with a session and in `PublicShell` without one.
- `apps/mobile/app/(public)/profile/[id].tsx` → `LegacyProfileRedirectScreen`, the twin of
  `LegacyProfileRedirect`: resolves the id and replaces the route with `/u/…`, signed in or out.
- i18n `src/i18n/*/publicProfileNative.json` (DE first, 11 locales); fixture / fake-client tests
  under `apps/mobile/tests/public-profile/`; the 3 parity rows flip `not_started` → `native`.

Device-runtime parity (task 6: Maestro / simulator / emulator) is DEFERRED to G1 and recorded in
`staging-tests.json` under `deferred_g1` (`next_actor: owner`), never run in CI.
