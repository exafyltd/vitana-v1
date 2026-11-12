# Plan sparring record — VTID-05425 (native-wave2-wallet-r2 / wallet-subscriptions)

Copy of the plan's sparring record (authoritative source in `exafyltd/vitana-platform`
on `main`: `.kiro/specs/native-wave2-wallet-r2/sparring/`).

## Verdict

CONVERGED and approved by policy `converged-auto-v1` at 2026-11-01T02:04:17.694+00:00.

- Sparring session: `45413869-e25c-4a01-95c9-6e9d52e10780`
- Final plan hash: `37e7205670467c23a286da860a20ec54cb03f152c0dfee2dfc9e780baf02c510`
- VTIDs allocated: VTID-05422, VTID-05423, VTID-05424, **VTID-05425** (this lane: `wallet-subscriptions`)
- Rounds / responses: `sparring/round-1.md`, `sparring/responses-1.md`, `sparring/round-2.md`,
  `sparring/state.json`, `sparring/verdict.md`
- Re-plan of `native-wave2-wallet` (vitana-platform PR #4332, converged); that plan's sparring
  history stays on its PR.

## Findings

- **R1-F1 [minor]** — the `/redeem` twin's Expo Router group was ambiguous. Accepted: decision 2a
  places it at `apps/mobile/app/(public)/redeem.tsx` in its own lane `wallet-redeem`. Round 2
  acknowledged it; no findings in round 2. Not this lane's surface.

## Owner approval

Owner approval: by policy `converged-auto-v1` (no Gate 1 request). A plan sparred by CI whose
session converged is approved by policy and not sent to the owner as Gate 1 (owner decision
2026-10-14, VTID-05214/05218). The VTID was allocated by CI after convergence
(`lanes/wallet-subscriptions.md` log, 2026-11-01T02:06Z).

## Scope of this lane (wallet-subscriptions)

Port the subscriptions overview (`src/pages/wallet/Subscriptions.tsx`, phone branch) and the
`/profile/subscriptions` storefront (`ProfileSubscriptionsRouter` mobile branch →
`src/pages/MobileSubscriptions.tsx`) to native on the N3 shell; re-implement the class-B billing
hooks natively; no `isIAPRestricted` gate exists on these surfaces today, so none is added
(subscriptions flagged as digital content for the owner's decision-5 call, documentation only);
i18n in 11 locales (DE first); flip the 2 parity rows to `native`. No core entry (wallet-home owns
the only extraction). Device-runtime parity (task 6) is DEFERRED to G1 (`next_actor: owner`).
