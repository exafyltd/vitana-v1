# Maestro — wallet-subscriptions lane (VTID-05425) — DEFERRED to G1 (`next_actor: owner`)

Device-runtime parity for the native subscriptions overview + `/profile/subscriptions`
storefront port (tasks.md wallet-subscriptions task 6). These flows are **not run in
CI** and are **not a merge blocker** (requirements R6.3). They need the isolated G1
test environment (and macOS minutes / G3 for iOS on a device). Recorded here and in
`docs/validation/VTID-05425/staging-tests.json`. No purchase, checkout, portal or
redeem call is ever attempted: the app's default `BillingActions` makes no call, and
the flows only read.

Flows (to author on G1):

- `01-wallet-subscriptions.yaml` — Android: `/wallet/subscriptions` renders the wallet
  sub-nav, the privacy promises, the plan state, the plan grids (month / year switch,
  the larger-plans disclosure), the feature usage, the credit packs and the FAQ;
  screenshot parity vs the 390×844 read-only staging `/wallet/subscriptions`.
- `02-profile-subscriptions.yaml` — Android: `/profile/subscriptions` renders the
  `MobileSubscriptions` storefront (not a redirect), in the storefront order, with the
  bottom "Manage" CTA for a paid member; parity vs the 390×844 read-only staging
  `/profile/subscriptions`.
- `03-subscriptions-ios.yaml` — iOS simulator: both screens render the same sections
  and CTAs as on Android (ungated today, no gate added); the drawer still has no
  Wallet row. Verified by reading the screen, never by pressing a purchase CTA.

Until G1, the port is proven offline by the jest-expo + RNTL unit tests in
`apps/mobile/tests/wallet-subscriptions/` and the typecheck / bundle / deps / parity
gates.
