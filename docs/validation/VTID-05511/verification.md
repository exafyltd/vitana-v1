# Verification — VTID-05511 (native-wave2-discover-commerce-r2 / marketplace-orders)

Native Wave 2 marketplace-orders lane: the commercial-intent marketplace, the doctors & coaches
directory, the provider profile, the orders view (the `MobileOrdersView` twin, owned by this lane) and
My Tickets, ported to the N3 shell at mobile-web parity (the phone branch of each web page; Spotlight is
desktop-only, `useSpotlightEnabled.ts:54`). Nine parity rows flipped to `native`. All commands ran
offline on Linux in worktree `.worktrees/native-wave2-discover-commerce-r2-marketplace-orders`, base
`origin/main` e1ab28b1f. The native app has no production profile (`assertNotProduction()` refuses
prod/staging hosts). Every command and its counts: `commands.log`.

## What was built

| Row(s) | Route file | Screen | Web source (phone branch) |
|---|---|---|---|
| `DISCOVER.MARKETPLACE`, `_OPEN` (`?view=open`), `_MINE` (`?view=mine`) | `app/(app)/discover/marketplace.tsx` | `MarketplaceScreen` | `src/pages/discover/Marketplace.tsx:167-279` |
| `DISCOVER.DOCTORS_COACHES` | `app/(app)/discover/doctors-coaches.tsx` | `DoctorsCoachesScreen` | `src/pages/discover/DoctorsCoaches.tsx:87-808` (`DoctorsCoachesLegacy`) |
| `DISCOVER.PROVIDER_PROFILE` | `app/(app)/discover/provider/[id].tsx` | `ProviderProfileScreen` | `src/pages/discover/ProviderProfile.tsx:159-426` |
| `DISCOVER.ORDERS`, `_ACTIVE` (`?tab=active`), `_HISTORY` (`?tab=history`) | `app/(app)/discover/orders.tsx` | `OrdersScreen` → `MobileOrdersView` | `src/pages/discover/Orders.tsx:61-372, 629-640`; `src/components/orders/MobileOrdersView.tsx` |
| `DISCOVER.MY_TICKETS` | `app/(app)/my-tickets.tsx` | `MyTicketsScreen` | `src/pages/MyTickets.tsx:138-319` |

Everything lives in `apps/mobile/src/screens/marketplace-orders/` plus one port,
`apps/mobile/src/ports/marketplace-orders.tsx` (kit Dialog / Drawer / Select / Textarea / Label /
Separator / `notifySuccess`, the category / status / page-gradient tokens, the lucide glyphs, and the
`@vitana/core/exchange-rates` helpers).

- **Data (class B, re-implemented, queries unchanged)** — `data/client.ts` (the app Supabase client;
  `communityFetch` twin with `X-Vitana-Active-Role: community`), `data/intents.ts` (`getIntentBoard`
  with kind + limit 30 for both commercial kinds, merged newest first; `listMyIntents({status:'open'})`
  kept to the commercial kinds; the share POST), `data/orders.ts` (`cj_orders`, the completed
  `event_ticket_purchases` with type + event, `voucher_orders`, the voucher PDF / e-mail Functions, the
  sample tickets and the pure active/history assembly of `Orders.tsx`), `data/providers.ts` (the
  sample providers, `provider_appointments` upcoming / history / insert, `bookmarked_items` with the
  realtime refetch), `data/booking.ts` (`user_wallets` + `initialize_user_wallet`, `update_user_balance`,
  `process_wallet_exchange`, the provider `messages` insert, `stripe-create-booking-checkout`),
  `data/chrome.ts` (calendar events, Vitana Index, streak, Autopilot pending count, voucher checkout).
  The member-listing / orders queries are the web hooks' own, so any test / service allowlist exclusion
  they carry (program NEVER 45) is inherited, not re-implemented.
- **Screens and their overlays** — `MarketplaceScreen` (+ the "Choose a view" sheet, `IntentCard`,
  `IntentShareSheet`, the community lane's `IntentComposer` with `defaultKind="commercial_sell"`),
  `DoctorsCoachesScreen` (+ `providers.tsx`: `DiscoverSubNav`, `BookmarkButton`, `BookActionPopup`,
  `VisitHistoryCard`), `ProviderProfileScreen`, `BookingPaymentFlow` (+ `MonthCalendar`),
  `OrdersScreen` / `MobileOrdersView` / `OrderDetailSheet`, `MyTicketsScreen`, `ticket/EventTicket`,
  `ticket/TicketShareSheet`, `ticket/QrCode` (+ `ticket/qrcodegen.js`, the Nayuki encoder vendored
  unmodified from qrcode.react 4.2.0, the library behind the web `QRCodeSVG`), `UtilityBar.tsx`
  (the rail and its pills), `VoucherModal.tsx` (MaxinaVoucherModal twin).
- **Core** — one class-A re-export: `src/lib/exchangeRates.ts` → `@vitana/core/exchange-rates`
  (manifest line, `packages/core/src/exchange-rates.ts`, `core-closure --write`, both generated files
  committed). No class-B module moved into core.
- **Navigation** — `resolve.ts`: the four concrete routes in `NATIVE_ROUTES`, and
  `NATIVE_PATTERNS = ['/discover/provider/:id']` so deep links and ORB directives treat the provider
  route as native (the ORB refuses non-native kinds, `src/orb/nav-directive.ts:55`).
- **i18n** — `src/i18n/*/discoverCommerceNative.json`, key group `marketplaceOrders` (101 keys), German
  first (du-form), mirrored to the other ten (pt você, fr tu, ru ты). Every other visible string reuses
  an existing web key (`screens.discover.*`, `orders.*`, `screens.mytickets.*`, `screens.tickets.*`,
  `screens.payment.*`, `screens.intents.*`, `voucher.*`, `actionBar.*`, `lifeCompass.title`, `toasts.*`).
- **Ledger** — the nine rows `native`, owner `kiro`, `last_parity_check` 2026-11-02; `--sync` changes
  nothing else.

## Mobile-web parity checklist (R1.1 — every section, rail item, sheet, modal, toast, badge, animation)

**Marketplace** — title (StandardHeader phone branch = title only, `StandardHeader.tsx:41-48`); compact
rail: Search pill with the view chip (`🛒 Open marketplace` / `📝 My listings` + chevron) → "Choose a view"
bottom sheet; the primary `+ Post` pill → composer; Life Compass; Gift Voucher (iOS-gated, see R5);
loading skeletons (4); error line `Couldn't load — <error>`; open list (not tappable) / mine list (→
`/intents/match/:id`); both empty states with the bag icon and CTA; intent card: cover (when the intent
has one), kind pill, raw status, share button → share drawer (direct invite with recipient parsing,
note, valid count + over-cap warning, Send; public link + copy; WhatsApp / e-mail / More; Close), title,
one-line scope, chips, match count; toasts of the share outcomes. The web search's `onSearch` is a
deliberate no-op (`Marketplace.tsx:181`) and stays one. The SplitBar tabs are desktop-only (`!isMobile`,
`:197`).

**Doctors & Coaches** — the Discover sub-navigation (`SubNavigation`, rendered on phones too), page
gradient, title; rail: Search (no handler on the web), Calendar (count badge + conflict dot), `+ Action`
→ Quick booking actions (8 tiles, each toasts "Action selected"), Life Compass, Gift Voucher (iOS-gated),
trailing Refresh; the split bar Find Providers · Best Matches · 💛 My Providers (N); Find: the five filter
selects (no effect, as on the web) and six provider cards (bookmark with bounce, avatar + verified tick,
name, title, rating (reviews), coloured badges with the trend / award icons, about, experience, price
range, location, availability, View Profile, Book Now → booking dialog); Best Matches: header, the
94 %…84 % cards with "Perfect for your health goals", Book Now; My Providers: three counters, Bookmarked
· Upcoming (N) · History with the bookmarked cards (Book Now without a handler, Remove), the appointment
cards with the countdown badge (date > 7 days / N days away / N h away / starting soon) and the three
buttons without handlers, the visit history cards with the notes toggle; every empty state (💛 / 📅 / 📋).
The web's `AutopilotPopup` on this page is never opened (its setter is never called, `DoctorsCoaches.tsx:92`),
so it has no counterpart.

**Provider profile** — not-found state + Back to providers; Back; profile card (avatar 128 + tick +
bookmark, name, title, badges, rating + reviews, bookings, Book Appointment, Message (no handler on the
web), Share); the three quick-info cards; About · Services (initial consultation price, follow-up $150)
· Reviews · Availability tabs; the booking dialog.

**Booking dialog** (`BookingPaymentFlow.tsx`) — title, summary card ("<title> Session", "Book a session
with <name>", provider avatar / name / rating), date picker (month calendar, past days disabled), time
select (09:00–17:00 / 30 min), location + duration, the three payment methods with balances and prices,
insufficient-balance card, total (+ Credits conversion line), Cancel / Confirm, the validation and
outcome toasts.

**Orders (`MobileOrdersView`)** — title; the sticky compact rail: Search (title / subtitle / ticket
number), the Orders mode pill (Active / History), Calendar, Life Compass, Gift Voucher (iOS-gated),
Vitana Index chip (value, 🔥 streak badge from 3 days), Autopilot chip (pulsing pending count); the
"Sample Data" banner while the sample tickets show; order cards (image or type tile, title, status
badge, subtitle, date + venue, price, × quantity, chevron); 3 pulsing skeletons; both empty states with
Browse Products / Find Events; the order detail sheet (type tile, title, type • date, close; summary;
Order Info rows; Your ticket with the full event pass; Gift Voucher code; the send-to-recipient form;
Download PDF and Send to Recipient with their toasts).

**Event pass + share** — every pass layer and field (photo / tenant gradient, scrims, vignette, seal,
brand + EVENT PASS + accent + micro-text, type badge, title, Date / Time / Venue, the cut-out divider,
Attendee / Qty, QR level H 140 px with "Scan for Entry", ticket number, SEQ, barcode, tenant serial,
"Powered by VITANA"), Download, Share → "Share your ticket" (preview card, the six quick-share buttons,
the note).

**My Tickets** — header band (icon, title, "N tickets purchased" / skeleton), loading, empty state +
Browse Events, Upcoming (N) / Past (N) tabs with their empty lines, ticket cards (photo / tile, title,
date or "Date TBA", venue, type pill, × quantity, Checked In; past dimmed), the pass dialog.

## R5 — iOS IAP gate (behaviour exactly as today; gate decision deferred, program decision 5)

`isIAPRestricted()` today = `Platform.OS === 'ios'` (`apps/mobile/src/shell/logic/drawer.ts:37-38`),
unchanged. The spec (R5.2, plan decision 4) lists no purchase surface in this lane; the mobile web has
two, so both are recorded here:

| Surface | Where | Today's web gate | Native behaviour in this port | Flag |
|---|---|---|---|---|
| Gift Voucher pill + `MaxinaVoucherModal` (Stripe voucher checkout) | utility rail of Marketplace, Doctors & Coaches, Orders | hidden when `isIAPRestricted()` (`utility-action-button.tsx:43, :115-117`) | hidden on iOS (`UtilityBar.tsx isIAPRestricted()` = the shell rule); on Android it opens the voucher modal, whose checkout opens in the system browser | candidate for the gate (already gated on iOS) |
| `BookingPaymentFlow` (provider session: Credits / USD wallet / card via Stripe) | Doctors & Coaches "Book Now", provider profile "Book Appointment" | none — neither the dialog nor its callers call `isIAPRestricted()` | not gated (mirrors the web); card checkout opens in the system browser | **flag: candidate for the gate before an iOS store submission** (a real-world service session, paid from the in-app wallet or by card) |

Orders and My Tickets are view / track only (no buy control); the marketplace has no cart. Note:
"today's behaviour — `isIAPRestricted()` = `Platform.OS === 'ios'`, gate extension deferred (program
decision 5)".

## UX acceptance (Commerce UX contract, VTID-05204)

- **User steps / required fields / decisions:** identical to the mobile web on every screen (same
  sections, same order, same controls, same validations — booking still needs date + time; the voucher
  modal still needs a tier; the share needs at least one valid Vitana ID).
- **Anything asked that Vitanaland or the AI could infer:** none added.
- **Can the user always tell what to do next:** yes — same empty states and CTAs as the web.
- **Supplier onboarding:** not touched (`CommercePortalLogin` / `CommerceJoin` / `CommercePortal` are
  not in this lane). No supplier-facing screen changed.
- **Friction:** unchanged vs the web.

## Deviations from the web (each with its reason; none adds a step or removes a control)

1. **Overlays owned by other lanes are opened through the shared overlay bus**: the Autopilot chip emits
   `autopilot:open` (the event the shell's side drawer already emits, `SideDrawer.tsx:245`), the Vitana
   Index chip `vitana:open-index`, the Life Compass pill `vitana:open-life-compass` (the events the web
   uses). The Autopilot popup, Index sheet and Life Compass popup are those lanes' twins (journey-autopilot
   r2, health); until they register on `main`, a tap on these three pills does nothing natively.
2. **No clipboard module** (no `expo-clipboard` in the app's dependencies; a new dependency is outside
   the lane paths): "copy link" buttons hand the link to the system share sheet (its Copy action), and
   the copied check / toast follow a completed share.
3. **No view capture** (no `react-native-view-shot`): the ticket's Download and the share-sheet buttons
   send the ticket text instead of first saving a PNG of the pass; the web's "Ticket downloaded! …" toasts
   (which describe that PNG) become "Opening …" / "Event details copied!" / "Ticket saved!".
4. **Web-relative image assets** (`/lovable-uploads/…` provider photos and the CJ / voucher logo,
   `/placeholder.svg`, the bundled intent-cover fallback photos) are not in the native bundle: the
   provider avatar shows initials, order cards show their type tile, an intent cover that fails to load is
   hidden. Remote `https` images load as on the web.
5. **Provider bookings count**: the web formats the count with `fmtDateTime` (a date formatter → a 1970
   date); natively it is a grouped number (a web defect not reproduced, as R1.3 does for the kit defects).
6. **Discover sub-navigation labels** come from the catalog (the web renders the items' English
   `name`, they carry no i18n key) — the i18n hard rule.
7. **`?view=` write-back** happens when the member picks a view, not on mount (a write in the first render
   of a cold start runs before the root navigator mounts — the cold-start test caught it).
8. **Visit-history notes toggle** uses this lane's "View Notes" / "Hide Notes" keys (the web's
   `value0Notes` template glues an English word onto a localised one).
9. **Toasts**: sonner's `toast.loading` → outcome pairs become the kit's toasts (a "generating / sending"
   toast, then the outcome); hard-coded English toast titles of the share drawer come from the catalog.
10. **Quick-share brand marks**: WhatsApp / Viber use lucide glyphs on token colours (simple-icons is a
    web-only package).
11. The Orders mode pill uses the shell's `MobileModePill` (shell component, pinned; it renders the label,
    not the web's emoji).

## Results

- `npm run typecheck` → PASS.
- `npx jest tests/discover-commerce --ci` → PASS, 6 suites / 118 tests.
- `npm test -- --ci` → PASS (counts in `commands.log`).
- `APP_PROFILE=development npm run bundle` → PASS (iOS + Android `.hbc`, `Exported: dist`);
  `npm run bundle:core-probe` → PASS.
- `APP_PROFILE=development EXPO_OFFLINE=1 npm run deps:check` → PASS.
- `npm run parity:check` → PASS; `parity-ledger --sync` → no change.
- `core-closure --check` → up to date; `gen-core-extract --check`, `gen-tokens --check`,
  `check-shell-pins` → up to date / OK; `node --test scripts/native/__tests__/*.test.mjs` and the ESLint
  rule tests → PASS; `npx eslint apps/mobile packages` → 0 errors.
- i18n (repo root, the `i18n-check.yml` steps): audit (no `discoverCommerceNative` issue),
  subscriptions, locale registry, stamp-source, register check (no violations), DE long words, web build +
  locale chunking, `vitest run src/i18n scripts/native` → all pass.
- Red → green: `red-on-base.txt` (the 6 lane suites fail on origin/main; 5 load errors).

## Not verified on staging

Device runtime deferred to G1 (`staging-tests.json` `deferred_g1`, `next_actor: owner`): Maestro
journeys, simulator / emulator screenshots, screenshot parity vs the 390×844 read-only staging web.
