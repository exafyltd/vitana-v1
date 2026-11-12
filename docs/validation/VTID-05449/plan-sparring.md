# Plan sparring record — VTID-05449 (native-wave2-public-auth-onboarding-r3 / auth-portals)

Copy of the plan's sparring record (authoritative source in `exafyltd/vitana-platform`
on `main`: `.kiro/specs/native-wave2-public-auth-onboarding-r3/sparring/`).

## Verdict

CONVERGED and approved by policy `converged-auto-v1` at 2026-11-01T18:19:45.364+00:00.

- Sparring session: `a503f127-5bd3-4bc8-b3fb-d27b6f0e5c64`
- Final plan hash: `d535812e039bc8dca432ca9e657be9c016865f66ebb96e75ce0149769250a5cb`
- VTIDs allocated: **VTID-05449** (this lane: `auth-portals`), VTID-05450, VTID-05451
- Rounds / responses: `sparring/round-1.md`, `sparring/responses-1.md`, `sparring/round-2.md`
  (converged), `sparring/state.json`, `sparring/verdict.md`
- Re-plan of `native-wave2-public-auth-onboarding-r2` (PR #4545) and of the converged
  `native-wave2-public-auth-onboarding` (PR #4275); the old VTIDs were never written on `main`.

## Findings and dispositions

- **R1-F1** (round 1, minor, accepted): the Measured State route catalog read `:819 (/)`;
  corrected to `:818 (/)` and `:819 (/_intro/:tenantSlug)`. Cosmetic, no lane or task change.
- Round 2: no findings (converged).

## Owner approval

Owner approval: by policy. The converged plan is approved by policy `converged-auto-v1` (owner decision 2026-10-14,
VTID-05214/05218): a plan sparred by CI whose session converged is approved by policy and
not sent to the owner as Gate 1. The VTID was allocated by CI after convergence
(`lanes/auth-portals.md` log, 2026-11-01T18:20Z).

## Scope of this lane (auth-portals)

Complete `AUTH.MAXINA_PORTAL /maxina`, `AUTH.ALKALMA_PORTAL /alkalma`, `/oauth/complete`,
`/reset-password`, `/logout` (N3 `in_progress`) to mobile-web parity and port `/:tenantSlug`,
`/auth/confirmed`, `/maxina/confirmed`, `/alkalma/confirmed`, `/oauth/consent`; all 10 parity
rows flip to `native`. Requirements R0–R6 and design §2a are authoritative.
