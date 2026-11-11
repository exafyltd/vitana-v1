# Lane brief — VTID-05512 · native-wave2-discover-commerce-r2/product-cart-checkout

> Working summary. The authoritative spec is in `exafyltd/vitana-platform`, branch
> `kiro/native-wave2-discover-commerce-r2/plan`: `.kiro/specs/native-wave2-discover-commerce-r2/` — `plan.md`
> (incl. the legacy `/cart` → `/universal-cart` note), `tasks.md` (`<!-- lane: product-cart-checkout -->`,
> tasks 1–9), `requirements.md` (R0–R6), `design.md` (§2c) and `lanes/product-cart-checkout.md`. If this file
> conflicts with them, the spec wins.

## Lane identity
- **VTID:** VTID-05512 (allocated by CI after PLAN-SPAR converged, policy `converged-auto-v1`)
- **Repo:** `exafyltd/vitana-v1`, native app only. No backend, gateway change or migration.
- **Seat:** exafyltd → reviewer_seat hotmail · **Session:** `kiro-exafyltd-202611011658-9f52`
- **depends_on:** `discover` (VTID-05510, PR #1573) for the `AddToCartButton` twin; this branch is based on
  `origin/kiro/native-wave2-discover-commerce-r2/discover` and lands after #1573.
- **Branch:** `kiro/native-wave2-discover-commerce-r2/product-cart-checkout`

## Scope (5 ledger rows)
`DISCOVER.PRODUCT_DETAIL /discover/product/:id` (src/pages/discover/ProductDetail.tsx),
`DISCOVER.CART /universal-cart` (src/pages/UniversalCart.tsx; `/cart` redirects here), and the exclusion
rows `/checkout/success` (CheckoutSuccess.tsx), `/tickets/success` (TicketPurchaseSuccess.tsx),
`/packages/success` (PackagePurchaseSuccess.tsx).

## Rules applied
- Phone branch only (Spotlight is desktop-only); every section, control, sheet, toast and badge ported.
- The `AddToCartButton`, the cart reads and the Discover controls are consumed through ports; no
  discover-lane file edited.
- Checkout idempotency is the web rule (`@vitana/core/checkout-idempotency`).
- Product code mirrors the web's gateway / Supabase / hosted-checkout calls; tests use the fake gateway
  and the Supabase double only — no real order, payment or write.
- iOS IAP gate exactly as today (`iapRestricted`, shell/logic/drawer.ts:38), flagged per surface.
- i18n DE-first in 11 locales (du / tu / você / ты), no physical left/right.
- Device runtime deferred to G1 (`next_actor: owner`).
