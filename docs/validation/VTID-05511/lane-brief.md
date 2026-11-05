# Lane brief — VTID-05511 · native-wave2-discover-commerce-r2/marketplace-orders

> Working summary. The spec is authoritative: `exafyltd/vitana-platform`, branch
> `kiro/native-wave2-discover-commerce-r2/plan` (plan PR #4604), `.kiro/specs/native-wave2-discover-commerce-r2/`
> — `plan.md`, `tasks.md` (`<!-- lane: marketplace-orders -->`, tasks 1–9), `requirements.md` (R0–R6),
> `design.md` (§2d), `lanes/marketplace-orders.md`.

- **Lane:** `native-wave2-discover-commerce-r2/marketplace-orders` · **VTID:** VTID-05511 (allocated by CI after
  PLAN-SPAR converged, policy `converged-auto-v1`) · seat exafyltd → reviewer seat hotmail · depends_on: none.
- **Branch:** `kiro/native-wave2-discover-commerce-r2/marketplace-orders` · session `kiro-exafyltd-202611011658-9f52`.
- **Rows (9):** `DISCOVER.MARKETPLACE`, `_MINE`, `_OPEN`, `DISCOVER.DOCTORS_COACHES`, `DISCOVER.PROVIDER_PROFILE`,
  `DISCOVER.ORDERS`, `_ACTIVE`, `_HISTORY`, `DISCOVER.MY_TICKETS` — all flipped to `native`.
- **Owns:** the `MobileOrdersView` native twin.
- **Not built here:** the `discover` lane's screens (`/discover`, sub-catalogues, `/shop`, `AddToCartButton`,
  `MobileDiscoverView`) and the `product-cart-checkout` lane's (`/discover/product/:id`, `/universal-cart`, the
  success screens). Supplier onboarding is out of scope.
- **Safety:** offline only — fake gateway and Supabase double in tests; every booking, voucher and order request is
  built and asserted, never sent; no live system, no migration, no merge.
- **Deferred to G1 (`next_actor: owner`):** task 8 — Maestro journeys + device screenshots
  (`staging-tests.json` `deferred_g1`).

What was built, the parity checklist, the R5 IAP-gate flags, the UX acceptance and every deviation:
`verification.md`. Commands and counts: `commands.log`.
