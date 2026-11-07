# Plan sparring record — VTID-05424 (native-wave2-wallet-r2 / wallet-rewards)

Copy of the plan's sparring record (authoritative source in `exafyltd/vitana-platform`
on `main`: `.kiro/specs/native-wave2-wallet-r2/sparring/`).

## Verdict

CONVERGED and approved by policy `converged-auto-v1` at 2026-11-01T02:04:17.694+00:00.

- Sparring session: `45413869-e25c-4a01-95c9-6e9d52e10780`
- Final plan hash: `37e7205670467c23a286da860a20ec54cb03f152c0dfee2dfc9e780baf02c510`
- VTIDs allocated: VTID-05422, VTID-05423, **VTID-05424** (this lane: `wallet-rewards`), VTID-05425
- Rounds / responses: `sparring/round-1.md`, `sparring/responses-1.md`, `sparring/round-2.md`,
  `sparring/state.json`, `sparring/verdict.md`
- Re-plan of `native-wave2-wallet` (vitana-platform PR #4332, converged); that plan's sparring
  history stays on its PR.

## Findings

- **R1-F1 [minor]** — the `/redeem` twin's Expo Router group was ambiguous. Accepted: decision 2a
  moves `/redeem` to its own lane `wallet-redeem` at `apps/mobile/app/(public)/redeem.tsx`.
  This lane therefore ports the 3 rewards rows only; where `lanes/wallet-rewards.md` still names
  `/redeem`, `(app)/redeem.tsx` or 4 rows, the plan block and the tasks section govern. Round 2
  acknowledged it; no findings in round 2.

## Owner approval

Owner approval: by policy `converged-auto-v1` (no Gate 1 request). The converged plan is approved
by policy `converged-auto-v1` (owner decision 2026-10-14, VTID-05214/05218): a plan sparred by CI
whose session converged is approved by policy and not sent to the owner as Gate 1. The VTID was
allocated by CI after convergence (`lanes/wallet-rewards.md` log, 2026-11-01T02:06Z).

## Scope of this lane (wallet-rewards)

Port the rewards screen (`src/pages/wallet/Rewards.tsx`, phone branch, with `VtnaRewardRules`,
`EarnMore` and `RewardShop`) to native on the N3 shell, with the `earned` / `earn` / `shop` tabs on
the `tab` search param; re-implement the class-B data hooks natively (read only); mirror the
surface's `isIAPRestricted()` branch one-for-one (no gate added, removed, widened or narrowed);
i18n in 11 locales (DE first); flip the 3 parity rows to `native`. No core entry (wallet-home owns
the exchangeRates extraction). Device-runtime parity (task 5) is DEFERRED to G1 (`next_actor: owner`).
