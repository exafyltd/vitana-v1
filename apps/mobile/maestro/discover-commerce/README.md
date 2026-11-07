# Maestro — discover-commerce / marketplace-orders (VTID-05511)

Device-runtime parity for `/discover/marketplace`, `/discover/doctors-coaches`, `/discover/provider/:id`,
`/discover/orders` and `/my-tickets` is deferred to the isolated test environment G1 (`next_actor: owner`,
tasks.md marketplace-orders task 8). The planned journeys are listed in
`docs/validation/VTID-05511/staging-tests.json` (`deferred_g1`): `marketplace-01-board.yaml`,
`marketplace-02-doctors-provider.yaml`, `marketplace-03-orders-tickets.yaml`. They are read-only by
construction — no post, share, booking, payment, voucher PDF or e-mail is ever triggered — and never run
against production or staging writes.
