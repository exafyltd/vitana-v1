# VTID-05440 — wallet-fx-rate-url / fx-url: acceptance
Plan: `exafyltd/vitana-platform` `.kiro/specs/wallet-fx-rate-url/plan.md` + `tasks.md` (lane `fx-url`), converged and
policy-approved (`converged-auto-v1`, PR #4563).
| Acceptance item | Evidence |
|---|---|
| Default URL is `https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR` (EUR per 1 USD, same meaning as `from=USD&to=EUR`) | `src/hooks/useEurUsdRate.ts`; `useEurUsdRate.test.ts` "fetches EUR per 1 USD from api.frankfurter.dev…" |
| `rates.EUR` parsed as before | same test: `eurPerUsd` = 0.92 from `{rates: {EUR: 0.92}}` |
| Fallback to `EUR_PER_USD` unchanged (invalid body, non-ok response) | `useEurUsdRate.test.ts` two fallback tests (pass on base and head) |
| `VITE_FX_RATES_URL` override, query key, cache times, `retry: 1` unchanged | diff: only the default string and its comment changed |
| Red on base for the reason fixed | `red-on-base.txt`: URL assertion, received `https://api.frankfurter.app/latest?from=USD&to=EUR` (1 failed, 2 passed) |
| Green on head | `green-on-head.txt`: 3 passed |
| No wallet route added or changed (NEVER 26) | diff: no `App.tsx`, `screens.json` or route file touched |
| Staging proof | `staging-tests.json` + `tests/e2e/staging/vtid-05440-wallet-fx-rate.staging.spec.ts`: `/wallet` at 1440 and 390, `api.frankfurter.dev` answers 200 with numeric `rates.EUR`, no frankfurter/CORS console error or failed request; read-only (staging guard, nothing clicked). Expected red on staging until this merges. |
Decisions:
- The staging spec path `tests/e2e/staging/vtid-*-wallet-fx-rate.staging.spec.ts` is in the lane `paths` (plan § Change
  3); the VTID-05288 suite is not edited (it belongs to lane `desktop-spotlight-finish/colours-batch-4`).
- The lane file's own log entry (`state: executing`) lives in vitana-platform and is written there after the plan PR
  merges, not in this vitana-v1 PR.
