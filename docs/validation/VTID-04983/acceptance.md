# VTID-04983 — Rewards shop tab in Wallet › Rewards

Plan: docs/validation/VTID-04983/plan-sparring.md (shared plan with VTID-04982, owner approved 2026-10-08).

AC-1 Wallet › Rewards has a Shop tab (no new route: a tab of the existing /wallet/rewards page); the two tabs that showed hardcoded sample data ("pending commissions", "withdrawal & referral") and their quick-actions dialog are removed.
TEST: src/components/wallet/RewardShop.test.tsx

AC-2 The shop lists items with the VTNA price and ≈ EUR/USD per the member's display currency, the earned balance, and the shortfall when the member cannot afford an item; loading, error and empty states.
TEST: src/components/wallet/RewardShop.test.tsx

AC-3 Redeeming sends the item id and an idempotency key, never a price; event/digital items confirm in place; ship items collect the address and go to Stripe Checkout for the shipping fee; age-restricted items ask for the birth date and the age confirmation before the button enables.
TEST: src/components/wallet/RewardShop.test.tsx

AC-4 Every shop string exists in DE and EN (the other nine languages are translated and marked _pending_review), stamped against their source.
TEST: src/components/wallet/RewardShop.test.tsx

AC-5 Staging (read-only): the staging gateway serves the shop and the tab renders on desktop and phone without raw keys or horizontal overflow.
TEST: tests/e2e/staging/vtid-04983-reward-shop.staging.spec.ts

Decisions taken
- No What's New entry yet: the shop launches empty until the owner lists items, and the owner rule of 2026-10-08 keeps cards for finished features members can use end to end. The entry is added with the first items.
- The quick-actions dialog on Wallet › Rewards served only the removed sample-data tabs, so it went with them.
