# Verification — VTID-05512 (native-wave2-discover-commerce-r2 / product-cart-checkout)

The 5 `discover-commerce` ledger rows of this lane, ported to the phone branch of each web page:
`DISCOVER.PRODUCT_DETAIL /discover/product/:id`, `DISCOVER.CART /universal-cart` (+ the legacy `/cart`
redirect), and the exclusion rows `/checkout/success`, `/tickets/success`, `/packages/success`.
Stacked on PR #1573 (`discover`, VTID-05510): the branch is based on
`origin/kiro/native-wave2-discover-commerce-r2/discover` and lands after it. All commands run offline
(no production profile; `assertNotProduction()` refuses prod/staging hosts). Exact commands and counts:
`commands.log`.

## What was built

- **Core (task 1)** — `packages/core/src/checkout-idempotency.ts` re-exports `cartSignature`,
  `nextIdempotency`, `mintIdempotencyKey` and the two types from `src/lib/checkout-idempotency.ts`
  (imports nothing, class A). Manifest entry added, `core-closure --write` run, `closure.generated.json`
  and `mobile-ci-paths.generated.json` regenerated in this PR. `src/lib/format-money.ts` is NOT re-exported:
  it reads the web i18n singleton (`getI18nLocale`), so `src/screens/commerce/format.ts` re-implements it
  over the native UI language. No class-B module moved into core.
- **Port** — `src/ports/commerce.tsx`: the core re-export, the kit parts, the colour tokens, the lucide
  glyphs, and the discover lane's twins (the `AddToCartButton` + `useUniversalCart` through
  `src/ports/add-to-cart.ts`, bookmark / recommend / send-in-message / share, `ProductImage`,
  `AffiliateDisclosure`, the marketplace client). No discover-lane file is edited.
- **Data (native twins of the class-B web hooks, same calls)** — `src/screens/commerce/data/`:
  `product.ts` (`GET /discover/product/:id`, 404 → not found, `?rec=` remembered per product),
  `cart.ts` (`PATCH` / `DELETE /universal-cart/items/:id`, `POST /universal-cart/checkout`, the 15 error
  codes, `isInsufficientBalanceError`), `agent.ts` (`POST /shopping-agent/propose|reorder`, role /
  llm_unavailable / error), `wallet.ts` (`GET /wallet/balance`, `POST /wallet/deposits/create` → Stripe
  hosted checkout in the system browser, `GET /wallet/deposits/:id` polled every 2.5 s until terminal),
  `purchases.ts` (`event_ticket_purchases` select + the 1.5 s verify update, `verify-package-payment`).
  These are product code mirroring the web's own gateway / Supabase / hosted-checkout calls; the tests run
  them only against the fake gateway and the Supabase double.
- **Screens (tasks 2–4)** — `ProductDetailScreen`, `UniversalCartScreen` (+ `CartParts`: stepper, line
  header, `BudgetMeter`, `AgentProposalCard`; `wallet/GatewayWalletBalanceCard`, `wallet/AddMoneyDialog`),
  `CheckoutSuccessScreen`, `TicketPurchaseSuccessScreen` (+ `ticket/EventTicket`, `TicketShareSheet`,
  `QrCode`, the vendored `qrcodegen.js`), `PackagePurchaseSuccessScreen`; route files under
  `app/(app)/`.
- **Navigation** — `resolve.ts`: `/universal-cart`, `/checkout/success`, `/tickets/success`,
  `/packages/success` in `NATIVE_ROUTES`; `REDIRECTS { '/cart': '/universal-cart' }` (web
  `src/App.tsx:1087`). `/discover/product/:id` is a dynamic route ranked above the resolver.
- **i18n (task 5)** — 16 new keys under `discoverCommerceNative.commerce` (ticket fallbacks, ticket share
  sheet, package verification fallbacks), DE first (du-form), mirrored to the 11 locales (fr tu, pt você,
  ru ты). Every other string is the web's own key.
- **Ledger (task 7)** — the 5 rows `not_started` → `native` (owner kiro, 2026-11-02).
- **Device runtime (task 8)** — deferred to G1: `apps/mobile/maestro/discover-commerce/CART-CHECKOUT.md`
  + `staging-tests.json` `deferred_g1`.

## Red → green

`red-on-base.txt`: the 5 new suites on the lane base `c68982ec1` fail (the modules do not exist).
Green: `npx jest tests/discover-commerce` 13 suites / 254 tests (this lane: 5 suites / 120 tests), twice
at default workers.

## Mobile-web parity checklist (every section, control, sheet, toast, badge and animation)

| web (phone branch) | native |
|---|---|
| ProductDetail.tsx:95-111 pulse skeleton | `product-detail-loading` pulse blocks (Animated opacity loop) |
| :113-132 not found / error: title, body, Go back, Discover more | `product-not-found` |
| :163-166 Back | `product-back` (`router.back`, cold start → `/discover`) |
| :170-188 image + availability badge ("Out of Stock" / raw value) | `ProductImage` (discover twin) + `product-availability` |
| :189-205 brand, title, rating + reviews, origin, subcategory badge | same |
| :207-224 price, compare-at, "Save N %" badge, reward-points line | same |
| :227-275 AddToCart (lg) · Buy (affiliate, `product_detail`, rec) · Recommend & Earn (cta) · Bookmark · Send in message · Share | same (discover twins through the port) |
| :281-450 About · Key ingredients · Safety · Evidence · Directions · Supports · Dietary · Why this for you, separator, disclaimer, AffiliateDisclosure | same, same order (test asserts the order) |
| UniversalCart.tsx:248-303 role-blocked / loading / error | `cart-role-blocked` / `cart-loading` / `cart-error` |
| :455-475 header: title, Close, subtitle | same |
| :477-481 Cart / Saved tabs | kit `Tabs` |
| :486-494 BudgetMeter + advisory alert (default / destructive) | `BudgetMeter` + `Notice` |
| :496-578 prompt (label, textarea), Ask Vitana (spinner), Buy again (spinner), 3 alerts | same; an empty tap focuses the prompt |
| :580-636 "Vitana suggests" (+ review note) and "Buy again" sections with AgentProposalCard | same (`AgentProposalCard`: reorder badge, title, snapshot price, View product, Remove, rationale, safety callout, confidence badge, Keep, Remove) |
| :638-652 empty cart + link to Discover | `cart-empty` |
| :654 GatewayWalletBalanceCard (balance, loading, empty, Add money → dialog) | `wallet-balance-card` |
| :656-691 lines: header (hydrated title / skeleton / snapshot), Remove, stepper, Save for later | same |
| :693-720 affiliate links panel | `affiliate-redirects` |
| :722-741 Checkout (spinner) | `cart-checkout` |
| :746-793 Saved tab: empty / lines with Remove + Move to cart | same |
| :796-801 AddMoneyDialog (title, description, amount, currency select, Continue + spinner) | `wallet/AddMoneyDialog` |
| toasts: addButton.failed, checkout success / duplicate / affiliate opened / error keys, addMoney invalid / failed | same keys (`@vitana/ui` notify) |
| CheckoutSuccess.tsx:58-131 deposit return: checking (skeleton disc + body), succeeded (wallet icon, amount), failed (x icon), Back to cart | `deposit-*` |
| :133-215 confirmation: check, title, two lines, "What's next?" (4 steps), View my orders, Continue shopping, Need help? → Contact support | same |
| :44-55 `?checkout_id` refresh, legacy `?session_id` toast | same |
| TicketPurchaseSuccess.tsx:70-103 invalid request · :105-124 confirming · :126-161 error · :163-252 success header, EventTicket, View all my tickets, Discover more events | same |
| EventTicket.tsx (pass, QR level H, footer, seal, Download, Share → TicketShareSheet) | `ticket/*` |
| PackagePurchaseSuccess.tsx:92-112 missing · :114-126 confirming · :128-148 error · :150-282 success header, package panel (image, title, description, Includes, Total paid), Redeem now, View orders; the "Payment confirmed!" toast | same |

Not ported, with proof the phone does not render it: the Spotlight branches of all five pages
(`useSpotlightEnabled` → `resolveSpotlight`: `if (isMobile) return false`, src/hooks/useSpotlightEnabled.ts:50),
the `md:` / `lg:` / `sm:` layout variants (≥ 640 / 768 / 1024 px), the desktop `StandardHeader` cards
(src/components/StandardHeader.tsx:41-48 renders only the title on mobile), and `<SEO>` (document head,
no native equivalent).

## iOS IAP gate flags (requirements R5) — today's behaviour kept, gate extension deferred (program decision 5)

`isIAPRestricted()` = `Platform.OS === 'ios'` (`apps/mobile/src/shell/logic/drawer.ts:37-38`, the
`iapRestricted` field); the shell hides the wallet drawer row with it (`:68`). None of this lane's web
pages consults `isIAPRestricted()` (grep of src/pages/UniversalCart.tsx, CheckoutSuccess.tsx,
discover/ProductDetail.tsx, TicketPurchaseSuccess.tsx, PackagePurchaseSuccess.tsx,
components/wallet/AddMoneyDialog.tsx, GatewayWalletBalanceCard.tsx: no match), so the native port adds no
gate and removes none. `drawer.ts` is unchanged.

| key | surface | flag (today's behaviour) |
|---|---|---|
| DISCOVER.PRODUCT_DETAIL | add-to-cart (the discover twin) | flag: add-to-cart leg — no iOS gate, unchanged |
| DISCOVER.PRODUCT_DETAIL | affiliate "Buy" (`/r/:id`, merchant site) | flag: real-world merchant redirect, lower IAP risk — unchanged |
| DISCOVER.CART | checkout (wallet debit) | **highest priority** — no iOS gate, unchanged |
| DISCOVER.CART | AddMoneyDialog wallet top-up (Stripe deposit) | **highest priority** — no iOS gate, unchanged |
| /checkout/success | `?deposit_id` deposit return | **highest priority** — no iOS gate, unchanged |
| /tickets/success | ticket purchase confirmation | flag: confirmation of a purchase — unchanged |
| /packages/success | package purchase confirmation | flag: confirmation of a purchase — unchanged |

## UX acceptance (Commerce UX contract, VTID-05204)

- User steps / required fields / decisions: identical to the web pages (no step, field, dialog or status
  added). Nothing asked that Vitanaland or the AI could infer.
- The user can always tell what to do next: every state keeps the web's action (Go back / Discover more,
  Checkout, Add money, Back to cart, View my orders / tickets, Browse events).
- Friction: unchanged.

## Deviations (each recorded, none adds friction)

1. **Signed-out access to the three public web routes** (`/discover/product/:id`, `/tickets/success`,
   `/packages/success` have no AuthGuard on the web, App.tsx:1084, :1105-1106). The lane's route files
   are under `app/(app)/` (lane paths), whose AuthGate sends a signed-out visitor to
   `/maxina?redirectTo=…` and back after sign-in; the guest list (`src/navigation/guest-paths.ts`) is
   pinned to the `<AuthGuard allowGuest>` routes by `check-shell-pins.mjs` and is outside the lane's
   paths. Follow-up: a shell rule for unguarded web routes.
2. **Shell chrome on `/universal-cart` and `/tickets/success`**: the web renders these two pages without
   `AppLayout`; the N3 shell wraps every `(app)` route in `MobileAppShell` (shell, outside the lane).
3. **Ticket confirmation line**: the web passes `value0: " "` and appends the e-mail after the sentence
   (TicketPurchaseSuccess.tsx:214, :237), which only reads right in English; natively the e-mail sits at
   the catalog's `{value0}`.
4. **Ticket twin copied from VTID-05511** (PR #1575, `src/screens/marketplace-orders/ticket/*`, not on this
   lane's base): `EventTicket`, `TicketShareSheet`, `QrCode`, `qrcodegen.js` are copies with this lane's
   port and keys; one copy is removed once both PRs land. Ticket Download goes to the system share sheet
   (no view-capture module in the app; the web renders a PNG with html2canvas, EventTicket.tsx:109).
5. **Hosted checkout**: the web navigates the tab to Stripe (`window.location.assign`,
   useWalletGateway.ts:87); natively the Stripe page opens in the system browser (expo-web-browser), like
   the discover lane's voucher. Affiliate redirects: the web opens each in a new tab (UniversalCart.tsx:416);
   natively each opens through `Linking.openURL`, and the panel keeps every link to reopen.
6. **Idempotency key minter**: `expo-crypto` `randomUUID` (Hermes has no Web Crypto); the key rule itself
   is the web module through `@vitana/core`.
7. **Type scale**: the web price is `text-3xl`; the token scale tops out at `2xl`.
8. **Back / Close on a cold start** (no history): opens `/discover`.

## Not verified on staging

Device runtime is deferred to G1 (`next_actor: owner`): Maestro flows, simulator / emulator screenshots and
parity vs the 390×844 read-only staging screens (`staging-tests.json` `deferred_g1`).
