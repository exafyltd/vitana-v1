# Plan sparring record — VTID-05422 (native-wave2-wallet-r2 / wallet-home)

Copy of the plan's sparring record (authoritative source in `exafyltd/vitana-platform`
on `main`: `.kiro/specs/native-wave2-wallet-r2/sparring/`).

## Verdict

CONVERGED and approved by policy `converged-auto-v1` at 2026-11-01T02:04:17.694+00:00.

- Sparring session: `45413869-e25c-4a01-95c9-6e9d52e10780`
- Final plan hash: `37e7205670467c23a286da860a20ec54cb03f152c0dfee2dfc9e780baf02c510`
- VTIDs allocated: **VTID-05422** (this lane: `wallet-home`), VTID-05423, VTID-05424, VTID-05425
- Rounds / responses: `sparring/round-1.md`, `sparring/responses-1.md`, `sparring/round-2.md`,
  `sparring/state.json`, `sparring/verdict.md`
- Re-plan of `native-wave2-wallet` (vitana-platform PR #4332, converged); that plan's sparring
  history stays on its PR.

## Findings

- **R1-F1 [minor]** — the `/redeem` twin's Expo Router group was ambiguous. Accepted: decision 2a
  places it at `apps/mobile/app/(public)/redeem.tsx` in its own lane `wallet-redeem`. Round 2
  acknowledged it; no findings in round 2. Not this lane's surface.

## Approval

The converged plan is approved by policy `converged-auto-v1` (owner decision 2026-10-14,
VTID-05214/05218): a plan sparred by CI whose session converged is approved by policy and not
sent to the owner as Gate 1. The VTID was allocated by CI after convergence
(`lanes/wallet-home.md` log, 2026-11-01T02:06Z).

## Scope of this lane (wallet-home)

Port the wallet hub (`src/pages/Wallet.tsx`, mobile-web branch) and the balance detail
(`src/pages/wallet/Balance.tsx`) to native on the N3 shell; re-export the pure
`src/lib/exchangeRates.ts` through `@vitana/core` (closure + mobile-ci-paths regenerated in the
same PR); re-implement the class-B data hooks natively; mirror every `isIAPRestricted()` branch
one-for-one (no gate added, removed, widened or narrowed); i18n in 11 locales (DE first); flip the
8 parity rows to `native`. Device-runtime parity (task 7) is DEFERRED to G1 (`next_actor: owner`).
