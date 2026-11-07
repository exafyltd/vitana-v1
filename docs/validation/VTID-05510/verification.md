# Verification — VTID-05510 (native-wave2-discover-commerce-r2 / discover)

Native Wave 2 discover lane: the 12 `discover-commerce` ledger rows of this lane — `/discover`
(+ `?tab=suggested|categories|share`), `/shop`, `/discover/supplements`, `/discover/wellness-services`,
`/discover/deals-offers` (+ `?tab=trending|ai|saved`) and `/discover/category/:subcategory` — ported to
the mobile-web branch of each web page. All commands run offline (no production profile;
`assertNotProduction()` refuses prod/staging hosts). Linux, worktree
`/projects/sandbox/vitana-v1/.worktrees/native-wave2-discover-commerce-r2-discover`. Exact commands and
counts: `commands.log`.

## What was built

- **Core extraction (task 1)** — `packages/core/extract.json` entries `discover` and `discover-category`,
  generated verbatim (`gen-core-extract`, then `core-closure --write`): `SUBCATEGORY_I18N_KEY` +
  `hasPersonalizationSignal` (discover-reason.ts; `MarketplaceProduct` type stubbed to the three picked
  fields), `toEurCents` + `formatPrice`, `SECTION_CONFIGS` / `ITEMS_PER_SECTION` / `FETCH_LIMIT`
  (CategoryShopSections.tsx), `MOBILE_DISCOVER_CATEGORIES` (MobileDiscoverView.tsx `categoryConfig`),
  `CART_PRODUCT_UUID_RE` (AddToCartButton.tsx), `HOLD_THRESHOLD_MS` (ShopFeed.tsx), `shopFeedQueryKeys` /
  `BATCHED_TYPES` / `FLUSH_INTERVAL_MS` / `MAX_BATCH` (useShopFeed.ts; `ShopEventType` stubbed),
  `SECTION_META` (CategoryProducts.tsx). Read through `src/ports/discover.tsx`. No class-B module moved
  into core; the data hooks are re-implemented natively (`src/screens/discover/data/*`). The 13 new icon
  names the extracts add are drawable in `src/ports/ui.tsx` (tests/ports.test.ts).
- **Shared twins (task 2)** — `AddToCartButton.tsx` (signed-out → toast + `/`, role block, product-only
  UUID rule, `POST /universal-cart/items` with the web body, "In cart" state) and `MobileDiscoverView.tsx`,
  exported with the native cart hook and the product drawer through `src/ports/add-to-cart.ts` for
  product-cart-checkout.
- **`/discover` (task 3)** — `DiscoverScreen.tsx`: mobile header, guest card, compact utility rail
  (Search · MobileModePill · Calendar · Life Compass · Gift Voucher · 🧬 Index → `/health` · Autopilot
  with the pulsing badge), the three tabs, `?tab=` / `?m=` handling, the `discover.view` activity row,
  the product drawer. `/discover/ai-picks` → `/discover?tab=suggested` (see plan-sparring.md).
- **`/shop` (task 3)** — `ShopFeedScreen.tsx`: paging vertical feed on expo-video, autoplay ≥ 60 %
  visible and no sheet open, mute, share, caption, anchor pill → peek drawer (live anchor states) →
  full product drawer, video-shop add-to-cart attribution, impression / hold_2s batching, infinite
  scroll, role-blocked / loading / error / empty states; the cards in the dark scheme like the web.
- **Sub-catalogues (task 4)** — `SupplementsScreen.tsx`, `WellnessServicesScreen.tsx`,
  `DealsOffersScreen.tsx` on `SubCatalogueFrame.tsx` (SubNavigation, header, rail with + Action → quick
  shop / book actions dialog and Refresh, SplitBar tabs) and `CategoryProductsScreen.tsx`.
- **Shared pieces** — product cards (featured / compact / list row), bookmark (bounce) and Recommend &
  Earn controls, `CategoryShopSections`, `ProductDetailsDrawer` (all sections + AddToCart · Buy ·
  Recommend · Send in message · Share), `SendInMessageSheet`, `VoucherModal`, `LifeCompassPopup`,
  `HiddenByLimitationsFooter`, `AffiliateDisclosure`, `ProductImage` placeholders.
- **i18n (task 5)** — `src/i18n/*/discoverCommerceNative.json`, 49 keys, DE first (du-form), mirrored to
  the 11 locales (pt você, fr tu, ru ты, sr ti, ar RTL). All other strings reuse the web's own keys.
- **Ledger (task 7)** — the 12 rows `not_started` → `native` (owner kiro, 2026-11-02); `--sync` 0
  changes, `--check` OK (40 native routes).
- **Device runtime (task 8)** — deferred to G1, `apps/mobile/maestro/discover-commerce/README.md` +
  `staging-tests.json` `deferred_g1`.

## Red → green

`red-on-base.txt`: the 7 new suites on `origin/main` e1ab28b1f fail (modules missing). Green:
`npx jest tests/discover-commerce` 7 suites, 122/122.

## iOS IAP gate flags (requirements R5) — today's behaviour kept, gate extension deferred (program decision 5)

`isIAPRestricted()` = `Platform.OS === 'ios'` (`apps/mobile/src/shell/logic/drawer.ts:37-38`, the
`iapRestricted` field). Nothing here adds or removes iOS gating.

| key | surface | flag |
|---|---|---|
| DISCOVER.OVERVIEW / DISCOVER.AI_PICKS | add-to-cart in the product drawer; Gift Voucher pill | add-to-cart leg flagged, ungated today; Gift Voucher hidden on iOS exactly as the web `UtilityActionButton` (test: discover.test.tsx "iOS IAP gate unchanged") |
| DISCOVER.CATEGORIES / DISCOVER.SHARE_EARN | browse only (+ the rail's Gift Voucher) | n/a (voucher hidden on iOS) |
| DISCOVER.SHOP | peek-drawer add-to-cart (`source_surface:'video_shop'`), product drawer | add-to-cart leg flagged, ungated today |
| DISCOVER.SUPPLEMENTS | grid / Top Picks / My Stack / drawer add-to-cart; Gift Voucher | add-to-cart leg flagged, ungated today; voucher hidden on iOS |
| DISCOVER.WELLNESS_SERVICES | category-sheet add-to-cart; Gift Voucher | add-to-cart leg flagged (wellness items answer "failed" like the web); voucher hidden on iOS |
| DISCOVER.DEALS / _TRENDING / _AI / _SAVED | flash / trending / AI add-to-cart, drawer; Gift Voucher | add-to-cart leg flagged, ungated today; voucher hidden on iOS |
| `/discover/category/:subcategory` | no purchase control (rows link to the product page) | n/a — see deviation 3 |

## Functional-parity checklist (program §4) per screen

| screen | states | navigation | actions | i18n / RTL |
|---|---|---|---|---|
| `/discover` | loaded, empty, error, guest | tabs, `?tab`, `?m`, `/discover/ai-picks`, product, collections "See all", chips | add to cart (drawer), bookmark, recommend, affiliate redirect, rail items | 11 locales, ar |
| `/shop` | loading, error + retry, empty, role-blocked, loaded, end / loading more | anchor → peek → PDP, Go to cart, Browse Discover | mute, share, add to cart, telemetry | 11 locales |
| supplements | loading, empty, grid, picks, stack empty / filled | sub-nav, drawer | filters, sort, add to cart, bookmark, quick actions, refresh | 11 locales |
| wellness | categories, recommended, bookmarks loading / empty / filled | category sheet | add to cart, bookmark / remove, Book now, quick book actions | 11 locales |
| deals | flash empty / filled, trending, AI, saved; `?tab` | drawer, sub-nav | add to cart, bookmark, quick actions | 11 locales |
| category | loading, empty, list | back, product | bookmark, recommend, affiliate redirect | 11 locales |

## Deviations from the spec / the web (recorded, not silent)

1. **`/discover/ai-picks`** — the plan says the route is not in `screens.json`; it is
   (`screens.json:2056-2058`, alias route → mobileRoute `/discover?tab=suggested`). The mapping in
   `resolve.ts` is therefore the `/discover` NATIVE_ROUTES entry the alias resolves to; no second
   redirect table. Cold-start test as required.
2. **expo-video dependency** — `apps/mobile/package.json` + `package-lock.json` (expo-video 57.0.5, the
   SDK 57 bundled version; `deps:check` up to date) are outside the lane's `paths`; design.md §2 maps
   `<video>` → expo-video. Expect a Lane-scope note for these two files.
3. **`/discover/category/:subcategory` has no add-to-cart** — requirements R5.2 lists `AddToCartButton`
   for this row; the web page renders none (`src/pages/discover/CategoryProducts.tsx` imports no
   AddToCartButton; its `ProductListRow` rows open the product / the affiliate redirect).
4. **Web defect not reproduced** — DealsOffers passes review counts to `fmtDateTime`
   (`DealsOffers.tsx:536, :645, :844`), printing an epoch date; natively the count is a locale number.
5. **Hard-coded English on the web, catalog keys natively** — sub-nav labels (`discoverNavigation`
   names → existing `subNav.*` keys), "Search..." / mobile pills "Categories" / "Share & Earn"
   (existing `screens.discover.*` keys), supplement category labels, quick-action labels, hidden-reason
   texts, "Out of Stock", bookmark labels (new `discoverCommerceNative.*` keys). The web's static
   sample rows (WellnessServices `categoryServicesData`, DealsOffers trending / AI / saved) stay verbatim
   English data in every locale, as on the web.
6. **Tailwind palette gradients** (`from-violet-500 …`) are not tokens; each takes the `--category-*`
   token of its starting hue (`toneForGradient`, src/ports/discover.tsx).
7. **Share** — the mobile web uses the native share sheet (`navigator.share`) and opens its own share
   dialog only when that fails; `Share.share` has no such failure path (a dismiss resolves), so the
   system sheet is the whole flow. Share links use the profile's `webBaseUrl` (no production host
   literal in `src/`, tests/env.test.ts).
8. **Recommend rec id** — the web drawer reads `sessionStorage['vitana.rec.<id>']` written by its product
   page; the native product page (product-cart-checkout lane) writes none yet, so the Buy redirect
   carries no `rec_id`.
9. **Global popups** — the Autopilot popup opens through the shell's `autopilot:open` bus event; its
   sheet is assigned to native-wave2-journey-autopilot-r2/journey (that plan's tasks.md:37). The Life
   Compass popup (web: one app-wide `LifeCompassPopupProvider`) is assigned to no lane, so the Discover
   rail ships its twin and opens it unless a global host has registered `vitana:open-life-compass`.
10. **Desktop-only pieces not rendered** (mobile-web parity): `DiscoverMasterActionPopup` (opened only by
    the desktop "+ Action" button, `Discover.tsx:416-425` `!isMobile`), the SplitBar overview, the
    Spotlight frames (`useSpotlightEnabled` is desktop + flag), the refresh trailing button on `/discover`
    (desktop only, `Discover.tsx:387-398` `!isMobile`).
11. **Bookmarked tab label** — the web passes `false` as `value0` when the count is 0
    (WellnessServices.tsx:322); natively an empty string.

## Gift voucher after checkout (review finding discover-c68982e, blocking) — fixed natively, no backend change

**Problem.** The dialog only called `stripe-create-voucher-checkout` and opened the browser. The web shows the
post-purchase states on the Stripe return URL (`src/components/voucher/MaxinaVoucherModal.tsx:112-132`), but the
function builds `success_url` from the request Origin (`supabase/functions/stripe-create-voucher-checkout/index.ts:147`,
`:161`, fallback `https://vitana.app`), so a native member landed signed-out on the web origin and could not reach
`voucher-download-pdf` (it needs the Authorization header, `supabase/functions/voucher-download-pdf/index.ts:250-274`).

**Approach (read on vitana-v1 origin/main; no edge-function, schema or deploy change):**
1. Keep the order id. The function already returns `{ url, session_id, order_id }`
   (`stripe-create-voucher-checkout/index.ts:179-184`); `createVoucherCheckout` now types and returns it
   (`apps/mobile/src/screens/discover/data/utility.ts` `createVoucherCheckout`).
2. Open checkout with expo-web-browser `openBrowserAsync` (already on main, `apps/mobile/package.json`
   `expo-web-browser 57.0.3`; no new package). iOS resolves when the member closes the browser; Android resolves
   at once with `opened` (`node_modules/expo-web-browser/build/WebBrowser.js:112`).
3. Return leg (brief "External checkout / portal return leg"): while a checkout is pending the dialog re-reads the
   order when the browser closes (iOS), on AppState `active` (Android, and any resume) and on screen focus
   (`apps/mobile/src/screens/discover/VoucherModal.tsx` `checkPending`, the AppState listener and `useFocusEffect`). The read is the web's own
   `voucher_orders` read (`src/hooks/useVouchers.ts:76-80`: own rows by `buyer_user_id`, newest first) narrowed to
   the order id (`apps/mobile/src/screens/discover/data/utility.ts` `fetchVoucherOrder`), polled 4 × 1 s for webhook lag (`waitForPaidVoucherOrder`; the
   webhook sets `paid`, `stripe-webhook/index.ts:309-315`).
4. `paid` → the web's success state (title, "Your {tier} voucher is ready", download, send by e-mail, view in
   orders, done). Not paid → back to the selection, which is what the web shows on a cancel return
   (`voucher_cancelled` has no handler on the web). A checkout error keeps `voucher.toast.checkoutFailed`.
5. Download → `voucher-download-pdf` `{ orderId }` with the member's session (supabase `functions.invoke`, same as
   `useDownloadVoucherPdf`, `src/hooks/useVouchers.ts:37-48`), then the web's mobile PDF preview (voucher card,
   Save / Share, Download PDF, share hint; `MaxinaVoucherModal.tsx:642-760`, share-API branch). Download PDF opens
   the signed URL in the in-app browser (system PDF viewer with save/share); Save / Share uses React Native
   `Share.share` (the web's `navigator.share`).
6. E-mail form → `voucher-send-email` `{ orderId, recipientEmail, recipientName, message }`
   (`src/hooks/useVouchers.ts:50-66`), `voucher.toast.voucherSent` with `{email}`, then the dialog closes.
7. Toasts are the web's `voucher.toast.*` keys from the existing catalog (`src/i18n/<locale>/voucher.json`,
   all 11 locales); no new strings, no catalog change.
8. The web's return params are handled too if such a link reaches the app: `voucher_success=true&order_id&tier`
   opens the success state and clears the params; `voucher_cancelled` is cleared (`apps/mobile/src/screens/discover/VoucherModal.tsx` return-param effect).

**Remaining deviations.**
- Error toasts: the web toasts the raw server message on a download / e-mail failure
  (`MaxinaVoucherModal.tsx:303-308`, `:341-346`); natively `voucher.toast.downloadFailed` (catalog key, no
  untranslated server text on screen).
- Copy link / Open in browser (the web's no-share-API branch) are not shown: the native share sheet is always
  available, so the web's share-API branch is the one ported. No clipboard package is on main.
- A webhook that trails the 4 s poll leaves the selection showing; the next app resume or screen focus re-reads
  while the dialog is open, and the order stays in Orders → vouchers, whose download self-heals the status via
  Stripe (`voucher-download-pdf/index.ts:161-226`).
- Device runtime (real browser, real Stripe return) is deferred to G1; tests use fakes only.

**Tests** (`apps/mobile/tests/discover-commerce/voucher.test.tsx`, red on the base head → green, `red-on-base.txt`): request builders (checkout keeps
`order_id`; own-row `voucher_orders` read by id / newest / signed out; the paid poll; download and e-mail
bodies) and the dialog: paid → success → PDF preview → download + share; e-mail form → send → toast → close;
failed PDF read; not paid → selection; checkout failure; Android open → AppState active → refetch → success;
the web's return params.

## UX acceptance (Commerce UX contract)

- User steps: unchanged — the same taps as the mobile web on every screen.
- Required fields: none added (the supplements filters and the Life Compass custom goal are the web's own).
- Decisions asked of the user: none added.
- Anything asked that Vitanaland or the AI could infer: none.
- Can the user always tell what to do next: yes — the same empty / error / role-blocked states and CTAs
  as the web ("Browse Discover", "Explore services", retry).
- Friction vs before: unchanged. No supplier-onboarding surface is touched.
