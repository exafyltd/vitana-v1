# Maestro — wallet-rewards lane (VTID-05424) — DEFERRED to G1 (`next_actor: owner`)

Device-runtime parity for the native rewards port (tasks.md wallet-rewards
task 5). These flows are **not run in CI** and are **not a merge blocker**
(requirements R6.3). They need the isolated G1 test environment (and macOS
minutes / G3 for iOS on a device). Recorded here and in
`docs/validation/VTID-05424/staging-tests.json`. No redeem, reward or payment
is ever attempted: the shop dialog is opened and cancelled, and the iOS-gated
state is verified, not exercised.

Flows (to author on G1):

- `01-rewards-tabs.yaml` — Android: `/wallet/rewards` shows the back link,
  the header and the "Verdient" tab (rules, groups, never-earns, recent); the
  tab bar switches to "Mehr verdienen" (`?tab=earn`) and "Shop"
  (`?tab=shop`); screenshot parity vs the 390×844 read-only staging
  `/wallet/rewards` (each tab).
- `02-rewards-shop.yaml` — Android: `/wallet/rewards?tab=shop` item cards and
  orders; an item opens the redeem sheet; Cancel closes it (no confirm press).
- `03-rewards-ios-gate.yaml` — iOS simulator: the drawer has no Wallet row; a
  `/wallet/rewards` deep link (any `?tab=`) lands on `/home`.

Until G1, the port is proven offline by the jest-expo + RNTL unit tests in
`apps/mobile/tests/wallet-rewards/` and the typecheck / bundle / deps / parity
gates.
