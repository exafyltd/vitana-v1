# Maestro — product-cart-checkout lane (VTID-05512) — DEFERRED to G1 (`next_actor: owner`)

Device-runtime parity for the native product / cart / checkout cluster (tasks.md `product-cart-checkout`
task 8). These flows are **not run in CI** and are **not a merge blocker**. They need the isolated G1
test environment (iOS simulator + Android emulator; macOS minutes / G3 for iOS on a device). Recorded
here and in `docs/validation/VTID-05512/staging-tests.json` (`deferred_g1`).

Read-only by construction: sign in, navigate, read. The network guard aborts every non-GET except
sign-in, so no add-to-cart, quantity change, checkout, agent proposal or wallet top-up is ever sent.
Never complete a real checkout or a real wallet top-up; never `vitanaland.com`.

Flows (to author on G1):

- `cart-01-product.yaml` — `/discover/product/:id` (a staging product id): hero, price, reward line,
  the sections, Back; Buy is observed only (it opens the merchant in the system browser); screenshot
  parity vs the 390×844 read-only staging page.
- `cart-02-universal-cart.yaml` — `/universal-cart` and the legacy `/cart` deep link (cold start):
  Cart / Saved tabs, budget meter, wallet balance card, the lines; no stepper / checkout / Add money
  tap (non-GET); screenshot parity vs staging `/universal-cart`.
- `cart-03-success.yaml` — `/checkout/success` (no params, `?checkout_id=`), `/tickets/success`
  (no `purchase_id` → Invalid request), `/packages/success` (no params → Missing purchase
  information); the `?deposit_id=` return only with a deposit id G1 seeds; screenshot parity.

Until G1, the port is proven offline by the jest-expo + RNTL tests in
`apps/mobile/tests/discover-commerce/` (product-detail, universal-cart, purchase-success,
commerce-routes, commerce-i18n-rtl) and the typecheck / bundle / deps / parity / core-closure gates.
