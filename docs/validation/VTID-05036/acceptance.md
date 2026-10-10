# VTID-05036 — Admin › Rewards Shop (app)

Plan: docs/validation/VTID-05036/plan-sparring.md (converged in 2 rounds, owner approved 2026-10-10, plan hash d9176593…3e97). This is the vitana-v1 part of the plan (items 6–9); the gateway part (items 1–5) ships in exafyltd/vitana-platform.

AC-1 /admin/marketplace/rewards exists behind `ProtectedRoute requiredRole="admin"` (same guard as /admin/marketplace/partner-health) and is linked from Admin › Marketplace Overview and Products.
TEST: src/pages/admin/marketplace/RewardsShop.test.tsx

AC-2 When the gateway answers 403 (signed-in admin is not an exafy_admin) the page shows "Nur für Exafy-Admins" instead of the sections, and does not retry the 403.
TEST: src/pages/admin/marketplace/RewardsShop.test.tsx

AC-3 Three sections — Artikel, Versandkosten, Bestellungen — as tabs on desktop and a select on phones; the tab root follows the text direction (RTL in Arabic).
TEST: src/pages/admin/marketplace/RewardsShop.test.tsx

AC-4 Artikel lists every item, active and inactive, with photo, title, VTNA price, ≈ € at 0.01 per VTNA, type, stock and an on/off switch.
TEST: src/pages/admin/marketplace/RewardsShop.test.tsx

AC-5 Item form validation: German title required, VTNA price an integer > 0, a ship item needs at least one ISO country; slug, minimum age (1–99) and stock (integer ≥ 0, empty = unlimited) follow the table's CHECKs.
TEST: src/components/admin/rewards/item-form.test.ts

AC-6 The slug is generated from the German title (lowercase ASCII with hyphens, umlauts transliterated), editable until the item is saved, then read-only.
TEST: src/components/admin/rewards/item-form.test.ts

AC-7 Saving a new item sends PUT /api/v1/admin/rewards/items with exactly the gateway's fields, the slug from the German title and is_active false; editing keeps the saved slug, other locales' titles and every additional image (the form manages images[0] only).
TEST: src/components/admin/rewards/item-form.test.ts

AC-8 A rejected save shows the server's own message in the form.
TEST: src/pages/admin/marketplace/RewardsShop.test.tsx

AC-9 The photo is shrunk in the browser (longest side 1600 px, WebP or JPEG fallback, quality from 0.85 down) to ≤ 1,468,006 bytes, then sent to POST /api/v1/admin/rewards/items/image as `{ content_type, data_base64 }`; the returned URL is shown as a preview and can be removed.
TEST: src/components/admin/rewards/image-shrink.test.ts

AC-10 The upload call carries plain base64 plus the encoded type and the preview shows the returned URL.
TEST: src/pages/admin/marketplace/RewardsShop.test.tsx

AC-11 Versandkosten: a table of country × currency × fee with add (PUT /admin/rewards/shipping-fees, amount in cents), edit and delete (DELETE /admin/rewards/shipping-fees/:country/:currency, after a confirm).
TEST: src/pages/admin/marketplace/RewardsShop.test.tsx

AC-12 A warning lists every country of an active ship item that has no fee row, with the currencies it is missing.
TEST: src/components/admin/rewards/item-form.test.ts

AC-13 Bestellungen: status filter (GET /admin/rewards/orders?status=), item title, member's shipping address (ship orders only), fee paid and dates; a status change offers only the moves the gateway accepts (fulfilling / shipped / delivered), never cancel, with an optional reason (PATCH /admin/rewards/orders/:id); cancelled and refunded orders are read-only.
TEST: src/pages/admin/marketplace/RewardsShop.test.tsx

AC-14 Every visible string comes from admin.json (`admin.rewardsShop.*`): DE and EN complete, the nine other locales translated, marked _pending_review and stamped (EN against DE, the rest against EN); every key the screen uses exists in German.
TEST: src/pages/admin/marketplace/RewardsShop.test.tsx

AC-15 Staging (read-only), phone and desktop: the build carries the screen, the three admin GETs answer 200 or 403 JSON, and /admin/marketplace/rewards shows the sections (lists or empty states), the exafy-only state or the role gate, with no raw keys and no horizontal overflow. No save is clicked.
TEST: tests/e2e/staging/vtid-05036-admin-rewards-shop.staging.spec.ts
