# Plan sparring record — VTID-05423 (native-wave2-wallet-r2 / wallet-redeem)

Copy of the plan's sparring record (authoritative source in `exafyltd/vitana-platform`
on `main`: `.kiro/specs/native-wave2-wallet-r2/sparring/`).

## Verdict

CONVERGED and approved by policy `converged-auto-v1` at 2026-11-01T02:04:17.694+00:00.

- Sparring session: `45413869-e25c-4a01-95c9-6e9d52e10780`
- Final plan hash: `37e7205670467c23a286da860a20ec54cb03f152c0dfee2dfc9e780baf02c510`
- VTIDs allocated: VTID-05422, **VTID-05423** (this lane: `wallet-redeem`), VTID-05424, VTID-05425
- Rounds / responses: `sparring/round-1.md`, `sparring/responses-1.md`, `sparring/round-2.md`
  (converged, no findings), `sparring/state.json`, `sparring/verdict.md`

## Findings and dispositions

- **R1-F1** (round 1, minor, accepted — this lane exists because of it): the plan had to say
  whether the native redeem twin is `app/(public)/redeem.tsx` or a bare top-level
  `app/redeem.tsx`. Resolved in plan decision 2a: `apps/mobile/app/(public)/redeem.tsx`
  (the `(public)` Stack, `headerShown: false`, no shell chrome, no auth — next to the native
  `/reset-password` and `/logout` twins), in its own lane `wallet-redeem`. Done:
  `app/(public)/redeem.tsx`; `tests/wallet-redeem/route-gate-i18n.test.tsx` asserts the file is
  in `(public)`, that no `(app)/redeem.tsx` exists and that the `(public)` layout has no auth
  gate; `tests/wallet-redeem/redeem.test.tsx` renders the screen signed out.
- Round 2: acknowledged R1-F1, no new findings.

## Owner approval

Owner approval: by policy. The converged plan is approved by policy `converged-auto-v1` (owner
decision 2026-10-14, VTID-05214/05218): a plan sparred by CI whose session converged is approved
by policy and not sent to the owner as Gate 1. The VTID was allocated by CI after convergence
(`lanes/wallet-redeem.md` log, 2026-11-01T02:06Z).

## Scope of this lane (wallet-redeem)

Port the exclusion route `/redeem` (web `src/pages/RedeemVoucher.tsx` with
`src/components/voucher/RedemptionLanding.tsx` / `RedemptionConfirm.tsx` and
`src/hooks/useRedeemVoucher.ts`) to native in the `(public)` group; the one parity row flips
`not_started` → `native`. Ungated on iOS as today (requirements R3.2). Requirements R1–R7,
design §3 and plan decision 2a are authoritative.
