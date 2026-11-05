# Maestro — wallet-home lane (VTID-05422) — DEFERRED to G1 (`next_actor: owner`)

Device-runtime parity for the native wallet hub + balance port (tasks.md
wallet-home task 7). These flows are **not run in CI** and are **not a merge
blocker** (requirements R6.3). They need the isolated G1 test environment (and
macOS minutes / G3 for iOS on a device). Recorded here and in
`docs/validation/VTID-05422/staging-tests.json`. No purchase, deposit,
withdrawal, transfer or redeem is ever attempted: the iOS-gated state is
verified, not exercised.

Flows (to author on G1):

- `01-wallet-hub.yaml` — Android: `/wallet` renders the cash + credits cards
  and the quick actions; the € / $ toggle; the mode pill switches to Activity
  (`/wallet?tab=activity`) and Actions (`/wallet?tab=actions`); the Actions
  button opens the WalletPopup; Rewards opens `/wallet/rewards`; screenshot
  parity vs the 390×844 read-only staging `/wallet`.
- `02-wallet-balance.yaml` — Android: `/wallet/balance` credits / tokens /
  membership / optimization tabs (`?tab=`); the contextual action opens its
  sheet; parity vs the 390×844 read-only staging `/wallet/balance`.
- `03-wallet-ios-gate.yaml` — iOS simulator: the drawer has no Wallet row; a
  `/wallet` deep link lands on `/home`; `/wallet/balance` shows no top-up /
  buy-stake / upgrade action and keeps the membership tab.

Until G1, the port is proven offline by the jest-expo + RNTL unit tests in
`apps/mobile/tests/wallet-home/` and the typecheck / bundle / deps / parity /
core-closure gates.
