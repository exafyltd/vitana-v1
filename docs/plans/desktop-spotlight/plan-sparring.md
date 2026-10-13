# Plan sparring record — Spotlight desktop redesign (VTID-05105 … VTID-05117)

- Partner: plan-sparring-partner (independent, read-only)
- Class: standard; rounds: 4 (cap 3 — rounds 3 and 4 were single rounds on owner-directed changes after mockup review, skill §6 pattern)
- Plan hash (sha256 of text between plan markers): 2378d61b1283ba47b753d10aa37af7d586ef0e11e7012062b4cd6ad6fe3ae08b
- Verdict: **CONVERGED** (no open or disputed blocker/major)
- Owner approval: chat 2026-10-12 Gate 1 yes ("Yes, approved — go ahead")
- VTIDs: VTID-05105 (1a), VTID-05106 (1b), VTID-05107 (1c), VTID-05108 (2), VTID-05109 (3), VTID-05110 (4), VTID-05111 (5), VTID-05112 (6),
  VTID-05113 (7 admin), VTID-05114 (7 backoffice), VTID-05115 (7 dev), VTID-05116 (7 pro+staff), VTID-05117 (7 leftovers)
- Executor: Kiro IDE, spec `.kiro/specs/desktop-spotlight/`; mockups `docs/plans/desktop-spotlight/mockups/`

## Rounds
- R1: F1–F11 (majors F3 Phase 1 too big, F4 startTransition mechanism, F5 flag consumption, F6 View Transitions, F8 App.tsx risk) — all ACCEPTED.
- R2: F1–F11 closed → CONVERGED.
- R3 (owner: keep Vitanaland navigation chrome): F12, F13 minor ACCEPTED → CONVERGED.
- R4 (owner: harden rules across 550+ screens): F14 major (no colour replacement path) ACCEPTED, F15/F16 minor ACCEPTED → CONVERGED.

## Plan (verbatim) — see also plan.md

# Plan — Vitanaland Desktop Redesign ("Spotlight" desktop)

Planner: Claude Code session (vitana-v1 branch `claude/vitanaland-desktop-redesign-kv8059`)
Executor: Kiro IDE (spec under `.kiro/specs/desktop-spotlight/`), one VTID per phase.
Change class: **standard** (touches many `src/**` files, `App.tsx` routes are NOT changed, no migrations, no `.github`, no auth, no LLM routing).

<!-- plan:begin -->

## 0. Problem (owner request 2026-10-12)

Desktop (≥1024 px, `src/hooks/use-mobile.tsx:3`) shows "too much at once": the user's eye has no single
place to land. Mobile works because one content card fills the view and you scroll to the next.
Specific complaints: News Feed has large empty areas; Discover/Marketplace is not intuitive; screen loads and
screen-to-screen switches feel slow.

### Verified root causes (code evidence)

News Feed (`/home` → `src/pages/Home.tsx`)
- Feed is `grid grid-cols-1 md:grid-cols-3 gap-5` (`Home.tsx:474`, legacy `:570`) (`gap-3 md:gap-5` at md+) inside `max-w-7xl p-6` (`:625-627`).
- `src/lib/feed-compose.ts:1-4,47-55` interleaves info card / post / info card… so a fixed `h-[138px]`
  `VitanaRecommendationCard` (`components/vitana/VitanaRecommendationCard.tsx:24,73-75`) shares a row with a
  4:5 `CommunityPostCard` media frame (`src/components/media/FeedMedia.tsx:41-43`) → 300 px+ holes in every mixed row.
- No masonry, no right rail (`AppLayout.tsx` has none), ~4 rows of chrome (`Home.tsx:628-672`) before the first card.
- Loading = centred spinner, no skeleton (`Home.tsx:458-462,518-522`).

Discover / Marketplace (`/discover/*`, `src/pages/discover/*`, `App.tsx:~1022-1081`)
- Two stacked tab layers on every page: `SubNavigation` (6 items, `config/navigation.ts:35-42`) + a `SplitBar` of 3–5 tabs.
- No hero / featured item; overview is a card grid inside a card (`Discover.tsx:398-505`); categories hidden behind a tab.
- Dead controls: overview search has no `onSearch` (`Discover.tsx:351-353`); 5 doctor filters have no handler (`DoctorsCoaches.tsx:256-312`).
- Wrong/mock data shown as real: hard-coded category counts and mislinked tiles (`Discover.tsx:164-213`), Share&Earn stats (`:590,:601`),
  mocked services/providers/deals (`WellnessServices.tsx:40`, `DoctorsCoaches.tsx:132`, `DealsOffers.tsx:105,193,257`).
- ~7–8 product/service card designs; only `components/discover/MarketplaceProductCard` is shared, used on one page.
  Detail is a page in one place (`ProductDetail.tsx`) and a drawer (`ProductDetailsDrawer`) in another.
- "/discover/marketplace" shows intents, not products (`Marketplace.tsx:106`).

Social screens: content widths vary (max-w-7xl/4xl/3xl/2xl across Community, GroupDetail, Members, PublicProfile, PostDetail);
bento rows render with empty `col-span-3` slots when a row has 1–2 items (`Community.tsx:798`, `EventsAndMeetups.tsx:250`).

Loading / switching (app-wide)
- One `Suspense` with `RouteFallback = <DelayedLoader fullscreen/>` (`App.tsx:65,810`): blank panel, spinner after 400 ms.
  The previous screen is torn down before the next chunk arrives.
- No route transition, no hover/intent chunk prefetch (only idle `preloadHotChunks`, 5 chunks, `src/lib/preloadHotChunks.ts`;
  data prefetch exists in `src/lib/prefetch-registry.ts` / `useBackgroundPrefetch`).

Cards: 115 `*Card*.tsx` files; shadcn `Card` in 409 files; `src/components/templates/*Card` and `ui/*-horizontal-card` overlap.

## 1. Inventory (scope sizing)

439 `<Route>` in `App.tsx` (82 redirects), 340 page files. Documented total: 551 screens (`docs/SCREEN_REGISTRY.md:5`).

| Tier | Areas | Routes (approx) | In this plan |
|---|---|---|---|
| A — member core | News/Home, Community, Events&Meetups, Groups, Live Rooms, Media Hub, Discover (6 sub-pages + product/provider detail + cart), Profile/Public profile, Post detail, Messages/Inbox | ~45 | Phases 2–4, fully redesigned |
| B — member secondary | Health, Wallet, AI/Memory, Settings, Calendar, Intents, Sharing | ~110 | Phase 5: adopt shell + cards + skeletons only (no re-layout) |
| C — operator | Admin, Backoffice, Dev, Professional, Staff | ~230 | Phase 7: `workspace` archetype, contract applies in full |

Kiro's first task in Phase 1 regenerates this table as `docs/design-system/desktop-screen-inventory.md` from `App.tsx`
+ `src/navigation/registry/screens.json` (exact counts, owner tier per route) so later phases tick screens off.

## 2. Design direction — "Spotlight"

One idea applied everywhere on desktop: **one dominant thing, calm context beside it.**

### 2.1 Three-zone desktop frame
```
| sidebar (unchanged, 256 px / 48 px collapsed) | STAGE (focus column, 680–760 px) | CONTEXT RAIL (320–360 px, sticky) |
```
- The rail shows when the **main area** (viewport minus the sidebar's current width) is ≥ 1060 px, measured with a CSS container query on
  `SpotlightLayout` (not a viewport breakpoint, so collapsing the sidebar is accounted for); below that the rail becomes a toggle sheet.
- New primitive `SpotlightLayout` (`src/components/layout/spotlight/`), used inside existing `AppLayout`'s `<main>`.
  **`AppLayout.tsx`, `AppSidebar`, sidebar items and order are not modified** (platform rules 31–33, admin-shell contract).
- Stage width is a token; rail is optional per screen; one shared content width scale replaces the 2xl/3xl/4xl/7xl mix.
- **Vitanaland navigation chrome is kept 1:1 (owner direction 2026-10-12).** Unchanged: the sidebar shortcut bar (`DesktopVitanaIndexChip`,
  `UniversalCalendarButton`, `NotificationBell`, Wallet, Autopilot, Cart — `AppLayout.tsx:244-315`), `GlobalSearch` (`:318`), the 14 nav items,
  the footer `ProfileDrawer` trigger + role switcher, `SoundscapeControl`, `LanguageSidebarControl`, and the ORB (`orb-widget.js`, fixed at the
  sidebar's bottom centre, `src/index.css:606-635`, with the `h-28` spacer at `AppLayout.tsx:420`). Spotlight never overlays or moves them; the
  quick-view sheet opens from the inline-end side, away from the ORB.
- **In-screen chrome: same components, compact desktop density** — no new header system:
  1. `SubNavigation` (horizontal section tabs) stays on top on screens that have sections (Discover, Community) — unchanged.
  2. `StandardHeader` gets a `density="compact"` prop used only when Spotlight is on: the same glass card with emoji + title + one-line
     description, and the same Autopilot and Vitana Index tiles, at 64 px tall instead of today's large `p-8 text-3xl` + 128 px tiles
     (`StandardHeader.tsx:50-108`). Default density = today's look, so flag-off and every untouched screen are identical.
  3. `UtilityActionButton` row unchanged (same pills, same order, Life Compass + Gift Voucher kept).
  4. `SplitBar` (in-page tabs) is passed through the utility bar's existing `trailingElement` slot (`utility-action-button.tsx:16` prop, rendered at `:123`) and
     rendered as a right-aligned segmented control at the end of the utility row — the same place `MobileModePill` sits on phone.
  5. `DidYouKnowCard` and `EventGameFeedBadge` move from above the feed into the context rail.
  Net effect: chrome before the first card drops from ≈350 px to ≈130 px (mockup `06-navigation-anatomy.svg`).
- Mobile (<1024 px) chrome — `TopAppBar`, `SideDrawerNav`, `MobileBottomNav` with the centre ORB, mobile `StandardHeader`, compact utility
  bar + `MobileModePill` — is not touched by any phase. The desktop↔mobile mapping is documented in `docs/design-system/` (mockup 09).

### 2.2 Unified card system — `VCard`
One primitive (`src/components/ui/vcard/`) built on shadcn `Card`, with **4 sizes and fixed media ratios** so rows never leave holes:

| Size | Use | Media | Height rule |
|---|---|---|---|
| `spotlight` | the one dominant item on a screen (focused feed item, marketplace hero, featured event) | 16:9 or 4:5 | fills stage |
| `standard` | shelves / grids | 4:3 | uniform per row |
| `compact` | rail items, "up next" | 1:1 thumb 64 px | fixed 72–88 px |
| `row` | lists (orders, members, results) | 1:1 thumb 48 px | fixed |

Slots: media, eyebrow (type/source), title (2-line clamp), meta, actions, badge. Kind adapters (post, news, event, live room,
product, service, provider, group, member) map data → slots; existing card components become thin adapters or are retired
only after every call site is migrated (nothing deleted while referenced). Tokens: radius, elevation, spacing, media ratios,
focus ring — CSS variables in `src/index.css`, light + dark, RTL via logical properties only.

### 2.3 Feed pattern on desktop — "focus feed"
- Stage: single column of `spotlight` cards (like mobile). **Free scrolling — no scroll-snap on desktop.** The "focused" card is the one
  crossing the stage's centre line (IntersectionObserver); it gets full contrast, neighbours a subtle dim (text contrast stays ≥ AA).
  Keyboard `J/K` / ↑↓ scroll the next/previous card into view (smooth, instant under reduced motion).
- Info cards from `feed-compose.ts` (Vitana Index, Longevity Journey, match, invite, new member, did-you-know) move **out of the stream into the
  context rail** as `compact` cards; the stream holds content only (posts, news). Composition logic stays in `feed-compose.ts` (adds a `placement` field), not rewritten.
- Rail (sticky): "Up next" (next 3 items), today's events, Vitana Index / journey card, suggested members, trending tags.
- Same pattern reused for Media Hub (video stage + playlist rail) and Live Rooms (live now hero + schedule rail).

### 2.4 Marketplace pattern — "storefront"
- **One section level.** The `SubNavigation` tabs (Overview, Supplements, Wellness Services, Doctors/Coaches, Deals & Offers, Orders —
  `config/navigation.ts:35-42`) stay as the only section navigation. The Overview's second layer (`SplitBar` Suggested / Categories /
  Share & Earn, `Discover.tsx:385-393`) is removed on the storefront: Overview becomes header bar → utility bar (its search pill wired) →
  filter chips (category, goal, price, rating) → **hero `spotlight`** ("Picked for you", real recommendation data) → horizontal shelves of
  `standard` cards (Supplements, Wellness services, Doctors & coaches, Deals) each with "See all" to the existing sub-route → a Share & Earn
  shelf last (real data or an empty state).
- Existing sub-routes keep their URLs and their `SubNavigation` entry (no screen-registry route changes); their own `SplitBar` tabs move into
  the utility bar's trailing slot like every other screen.
- **One detail pattern:** desktop opens a right-side quick-view sheet (`ProductDetailsDrawer` generalized to product/service/provider) with
  "Open full page" → existing detail route; mobile unchanged.
- Results grid: `standard` cards, uniform 4:3, 3 cols at stage+rail, 4 cols when rail hidden; filters left-aligned chips, never `<Select>`s without handlers.
- Cart: the existing sidebar shortcut-bar Cart button and badge (`AppLayout.tsx:298-314`) is the cart entry; no second cart control.
- Fix the dead controls: wire overview search to the existing discover search, wire doctor filters or remove them.
- Fix the raw English strings on the touched Discover pages (e.g. `Discover.tsx:352` search placeholders, `:587,:598` Share&Earn labels) into `t()` keys.
- **Mock data:** no fabricated numbers on the redesigned screens. Where a section has only mock data and no real source, the section shows a
  proper empty state instead of fake values (list of affected sections in Decisions). No new backend endpoints in this plan.

### 2.5 Loading & switching
1. **Keep the old screen until the new one is ready:** mechanism = React Router 6.30's own `future={{ v7_startTransition: true }}` on the existing
   `<BrowserRouter>` (`App.tsx:764`, react-router-dom ^6.30.1, react ^18.3.1). With it the router wraps location updates in `React.startTransition`,
   and React 18 keeps an already-revealed `<Suspense>` boundary showing its current content instead of the `RouteFallback` while the next lazy chunk
   loads. That is the ONLY `App.tsx` edit in the whole plan (one prop), shipped as its own PR (Phase 1b) behind a prototype gate: a Vitest
   (React Testing Library + MemoryRouter with the same future flag + a deferred `lazy()` page) must prove the old page stays mounted and
   `RouteFallback` is not rendered during navigation, and the existing `tests/loading-no-flash.cjs`, keep-alive tests and
   `screen-journey.staging.spec.ts` budgets must stay green. If the prototype fails, fallback design = per-route `Suspense` inside a
   `PendingOutlet` component living in `src/components/layout/spotlight/` (not in `App.tsx`), sparred with the same partner before building.
   A thin top progress bar (≤2 px, after 150 ms) is driven by a `useNavigationPending` hook (router `useTransition`-free: tracks
   location-requested vs location-rendered), mounted next to `RouteTransitionOverlay`. Full-screen `DelayedLoader` stays for first app load.
   Because the flag changes app-wide navigation timing (also mobile), Phase 1b is NOT behind `desktop_spotlight`; it is verified on its own
   on staging (desktop + Pixel journey) and is revertible by removing the one prop.
2. **Layout-shaped skeletons:** `SpotlightSkeleton` variants (focus feed, storefront, grid, detail, list) replace page-level spinners on Tier A/B screens.
3. **Intent prefetch:** sidebar links and `VCard` links prefetch the route chunk on hover/focus (≥80 ms dwell) and fire the matching
   `prefetch-registry` data prefetch; extends `preloadHotChunks.ts`, no new mechanism.
4. **Transitions:** cross-fade only (150 ms) of the stage content via framer-motion `AnimatePresence` keyed by pathname inside `SpotlightLayout`
   (framer-motion already used in 30 files) — works in every browser. No shared-element transitions in this plan (View Transitions shared-element
   is Chromium-only; deferred). No-op under `prefers-reduced-motion`; Vitest covers the reduced-motion path.
5. **Images:** fixed aspect boxes (no layout shift), `loading="lazy"` + `decoding="async"` below the fold, blur/colour placeholder.
6. Must not regress the existing keep-alive work (News/Inbox/Events keep-alive, VTID-05081 budgets).

### 2.6 Rollout safety
- Everything (except Phase 1b) behind tenant flag `desktop_spotlight` (existing `tenant_settings.feature_flags`, added to `KNOWN_FLAGS` in
  `src/pages/admin/settings/FeatureFlags.tsx`). Consumption: a new generic `useTenantFeatureFlag(key)` hook generalising the existing
  member-readable pattern of `useEventGameFeatureFlag()` (`src/hooks/useEventGame.ts:230-252`, direct `tenant_settings.feature_flags` read,
  React Query cached), wrapped once by `useSpotlightEnabled()` = `!isMobile && (previewOverride ?? tenantFlag)`. Preview override:
  `?spotlight=1|0` writes localStorage `vitana.spotlight` (try/catch), and an explicit override wins over the tenant flag in both directions
  (so staging can review with the flag off and anyone can opt out). Pages call `useSpotlightEnabled()` once and branch at the top.
  Flag off = current desktop exactly. Mobile (<1024 px) code paths untouched in every phase.
- Flag flip in production is a separate owner decision after all Tier A phases pass staging.


### 2.7 Spotlight Design Contract — system-wide, enforced (owner direction 2026-10-12: "harden the rules, 550+ screens")

The contract is one document, `docs/design-system/SPOTLIGHT_RULES.md` (rule ids `SR-xx`), linked — not copied — from a path-scoped
`.claude/rules/design.md` (paths `src/pages/**`, `src/components/**`) and `.kiro/steering/vitana-design.md` (same `fileMatch`), plus one short
unscoped pointer paragraph in `CLAUDE.md` (like the What's New section) so every session and Kiro sees it before touching a screen.
`docs/UNIVERSAL_SCREEN_PATTERN.md` gets a header pointing to the contract as its v2 (file kept, nothing deleted).

**A. Every screen has exactly one archetype.** `src/design/screen-manifest.json` lists every non-redirect `<Route>` in `App.tsx`
(path, archetype, tier, status `legacy|migrated`, phase). `src/design/screen-manifest.test.ts` reuses `extractSpaRoutes`
(`scripts/nav/spa-routes.mjs`, already used by `src/navigation/registry/registry.routes.test.ts`) and fails when a route is missing, unknown
or has an invalid archetype — so a new screen cannot be added without choosing one (same contract style as the VTID-04502 screen registry).

| Archetype | Layout (desktop, Spotlight on) | Dominant element | Typical screens |
|---|---|---|---|
| `focus-feed` | stage + rail | the focused `spotlight` card | News, Media Hub, Live Rooms, community feeds |
| `storefront` | full width (stage+rail span) | the hero `spotlight` | Discover overview, Business Hub catalog, Deals |
| `detail` | stage + rail | the item itself (`spotlight`) | post, article, product, event, provider, public profile |
| `collection` | stage+rail span, `standard` grid or `row` list | the first row / search result | Groups, Members, category lists, Orders |
| `dashboard` | stage + rail | one hero KPI `spotlight`, then `standard` tiles | Health, Wallet, My Journey, Vitana Index |
| `conversation` | list column + thread stage (+ optional rail) | the open thread | Inbox, Messages, AI Assistant, group chat |
| `form` | single 680 px column, no rail | the form | Settings, Edit profile, onboarding, auth, legal |
| `workspace` | full width, dense; rail optional | the primary table/panel | Admin, Backoffice, Dev, Professional, Staff |
| `immersive` | full-bleed, in-screen chrome hidden; sidebar + ORB stay | the media | `/shop` video feed, live session, fullscreen media |

**B. Hard rules (MUST).** Numbered in the contract; summary:
- *Chrome (SR-01…05):* sidebar elements of §2.1 never hidden, moved or overlaid (only `immersive` hides in-screen chrome, never sidebar/ORB);
  in-screen order is always SubNavigation (if sections) → StandardHeader → UtilityActionButton row (SplitBar in its trailing slot);
  no page renders its own ad-hoc header, tab bar or toolbar — pages compose them through one `ScreenFrame archetype="…"` wrapper
  (`src/components/layout/spotlight/ScreenFrame.tsx`, built in 1a) which renders the existing components; admin keeps `AdminTabs` as its tabs.
- *Dominance (SR-06…08):* `focus-feed`, `storefront`, `detail`, `dashboard` show exactly one `spotlight` VCard in the first viewport;
  nothing else on screen uses `spotlight` size; rails only hold `compact`/`row` cards.
- *Cards (SR-09…13):* content items render only through `VCard` (4 sizes, fixed ratios 16:9 / 4:5 / 4:3 / 1:1); a grid row never mixes card sizes;
  no fixed-pixel card heights; no card-in-card; bento rows render only full rows (no empty slots).
- *Layout & tokens (SR-14…19):* only the width tokens `stage` (680–760), `wide` (stage+rail), `form` (680), `full`; spacing from the 4-px
  scale; type scale of 6 steps (12/13/14/17/20/24, 28 hero only); colours, radii, elevation only from `src/index.css` tokens — no raw Tailwind
  palette classes or hex in pages/components; logical properties only (RTL).
  **Colour replacement path (shipped in Phase 1c, before the rule bites):** every colour role a page needs has a semantic token class —
  the existing shadcn set (`primary`, `muted`, `accent`, `destructive`, `foreground`, `border`…), the existing `pill.*` (pillar) and `sys.*`
  (vitana/autopilot/ai/feature) tokens in `tailwind.config.ts`, plus new ones added in 1c: `status.{success,warning,error,info}` (+ `-subtle`
  backgrounds), `severity.{low,medium,high,critical}`, `category.{1…8}` (chart/category accents) and `surface.{page,raised,sunken}`
  (incl. the page gradient used today as `from-purple-50 via-blue-50 to-pink-50`, `Home.tsx`). Light + dark values for each. The contract
  carries a "palette class → token" mapping table so migration PRs are mechanical.
- *Loading & motion (SR-20…23):* no page-level spinner or blank panel after first load — archetype skeletons only; images in fixed-ratio
  boxes (CLS < 0.1); 150 ms cross-fade only, none under reduced motion; route chunk + data prefetch on link hover/focus.
- *Content honesty & states (SR-24…26):* no fabricated numbers/lists in UI; every list/grid has loading, empty and error states from shared
  components; every control has a handler (no dead buttons/filters).
- *Parity, i18n, a11y (SR-27…30):* every desktop element has its documented mobile counterpart (mockup 09 table becomes part of the contract);
  DE-first i18n; WCAG 2.2 AA incl. keyboard path through stage and rail; performance budgets = the existing screen-journey budgets.

**C. Enforcement — mechanical, not by review.**
1. *ESLint `design/*` plugin* (`eslint-rules/design/*.js`, registered like the `i18n` plugin in `eslint.config.js`), all at **error**, scoped
   to `src/pages/**` and `src/components/**` (not `src/components/ui/**` primitives):
   `design/no-arbitrary-size` (`h-[…]`, `w-[…]`, `min-h-[…]`, `max-w-[…]` on cards/layout), `design/no-raw-palette` (Tailwind palette
   colour classes, hex/rgb in `className`/`style`), `design/no-physical-direction` (`ml-/mr-/pl-/pr-/left-/right-/text-left/text-right/rounded-l/-r`),
   `design/no-page-spinner` (`Loader2`/`animate-spin` outside a `Button` in `src/pages/**`), `design/require-screen-frame` (a page default export
   that renders `AppLayout` must render `ScreenFrame`), `design/no-raw-content-card` (`@/components/ui/card` imported in `src/pages/**` outside
   `workspace` paths). `design/no-raw-palette` flags only Tailwind palette scales (`(bg|text|border|ring|from|via|to|fill|stroke)-(slate|gray|zinc|…|rose)-\d+`)
   and hex/rgb literals — never the semantic token classes above. Escape hatch, same pattern as `i18n-allow-next-line`:
   `// design-allow-next-line: <reason>` (a reason is mandatory; the rule reports a missing reason as an error), and the 1c PR adds a
   `npm run design:allowances` report listing every allowance so they stay visible. Existing violations are absorbed by the **existing per-file ESLint ratchet** in PR-GATE (`gate.mjs ratchet-eslint`,
   `scripts/ci/pr-gate/baseline/eslint.json`, VTID-04948): counts may only go down, so **every new file must be clean from day one** and every
   migration PR lowers the baseline. The baseline is regenerated once in Phase 1c with the rules added, and that PR states the starting counts.
   *Hardening the ratchet itself:* today a PR can raise its own `baseline/eslint.json` (the file is in `ALWAYS_ALLOWED`,
   `scripts/ci/pr-gate/lib.mjs:43`, and `ratchet()` reads the head copy, `gate.mjs:173-176`). Phase 1c adds a `ratchet-design` check to
   `gate.mjs` (+ `lib.mjs`, unit tests in `scripts/ci/pr-gate/__tests__/`, one step in `.github/workflows/PR-GATE.yml`) that counts only
   `design/*` errors and compares them with `scripts/ci/pr-gate/baseline/design.json` **read from the base commit** (`git show <base>:…`), so a
   PR can lower design counts but never raise them — the only exception is a PR that changes `eslint-rules/design/**` (a contract change,
   which is sparred and owner-approved per C5) and states the new counts in its body.
2. *Manifest test* (A above) in `npm test`.
3. *Staging design-lint* (`tests/e2e/staging/design-contract.staging.spec.ts`, read-only, `?spotlight=1`): for every manifest entry with
   `status: migrated` at 1024 / 1440 / 1920 and once in `dir=rtl` — chrome invariants (§5), exactly-one-spotlight for the four archetypes,
   no horizontal scroll, no vertical gap > 48 px between stage cards, CLS < 0.1, no `DelayedLoader` after first load, no element overlapping
   the ORB. Each phase PR runs it for its own screens; STAGING-VERIFY runs it for all migrated screens.
4. *VCard and ScreenFrame expose `data-vcard-size` / `data-archetype`* attributes so the staging checks read structure, not pixels.
5. *Contract changes* (a new archetype, a new card size, a new token) are plan changes: sparred, owner-approved, then the contract, ESLint rules
   and manifest schema change in the same PR.

## 3. Phases (one VTID + one PR each, executed by Kiro)

| # | Phase | Main files | Done when |
|---|---|---|---|
| 1a | **Design foundation** — tokens, `VCard` + adapters (post, news, product), `SpotlightLayout`, `StandardHeader density="compact"`, `SplitBar` via utility-bar `trailingElement` helper, skeletons, stage cross-fade, flag plumbing (`useTenantFeatureFlag`, `useSpotlightEnabled`, `KNOWN_FLAGS`), inventory doc | `src/components/ui/vcard/*`, `src/components/layout/spotlight/*`, `src/components/StandardHeader.tsx` (additive prop), `src/hooks/useTenantFeatureFlag.ts`, `src/index.css`, `tailwind.config.ts` (extend only), `FeatureFlags.tsx`, `docs/design-system/*` | Vitest for VCard sizes/slots/RTL, container-query rail rule (asserts `container-type: inline-size` on the SpotlightLayout root — first `@container` use in the repo, documented in `docs/design-system/`), StandardHeader compact keeps Autopilot + Index tiles and default density unchanged, flag on/off/override; nothing rendered differently without the flag |
| 1b | **Navigation feel** — `v7_startTransition` (one prop in `App.tsx`), `useNavigationPending` + top progress bar, intent (hover/focus) chunk + data prefetch | `App.tsx:764` (one prop only), `src/lib/preloadHotChunks.ts`, `src/lib/prefetch-registry.ts`, `src/components/layout/NavProgressBar.tsx` | prototype Vitest passes first; loading-no-flash, keep-alive tests and screen-journey budgets green; staging desktop + Pixel journey |
| 1c | **Design contract & enforcement** — `SPOTLIGHT_RULES.md`, `.claude/rules/design.md`, `.kiro/steering/vitana-design.md`, CLAUDE.md pointer, `screen-manifest.json` (all routes, archetype + tier, all `legacy`) + manifest test, `eslint-rules/design/*` at error + ESLint ratchet baseline regenerated, `design-contract.staging.spec.ts` | `docs/design-system/*`, `src/index.css` + `tailwind.config.ts` (semantic colour tokens, additive), `.claude/rules/design.md`, `.kiro/steering/*`, `CLAUDE.md`, `src/design/*`, `eslint-rules/design/*`, `eslint.config.js`, `scripts/ci/pr-gate/{gate,lib}.mjs` + `__tests__`, `scripts/ci/pr-gate/baseline/{eslint,design}.json`, `.github/workflows/PR-GATE.yml` (one step), `tests/e2e/staging/*` | manifest test green for every route; a fixture file with each violation fails each rule (Vitest RuleTester); `ratchet-design` unit tests prove a raised design count fails even when the PR edits the baseline; ratchet PR shows starting counts; no app behaviour change |
| 2 | **News Feed** — focus feed + rail on `/home`; info cards to rail; header compaction | `Home.tsx`, `feed-compose.ts` (+placement), `components/home/*` adapters, new `components/home/desktop/*` | no empty grid holes at 1280/1440/1920; keyboard nav; staging spec |
| 3 | **Discover storefront** — storefront home, shelves, one-level nav, quick-view sheet, results grid, Overview SplitBar removed, dead controls fixed, mock-only sections → empty states | `src/pages/discover/*`, `components/discover/*`, `ProductDetailsDrawer` | staging spec: hero + shelves render, search returns results, quick-view opens (read-only) |
| 4 | **Social** — Community, Events&Meetups (no empty bento slots), Groups, GroupDetail, Live Rooms, Media Hub, Public profile, Post detail, Messages on SpotlightLayout + VCard | `src/pages/Community.tsx`, `src/pages/community/*`, `MediaHub.tsx`, `PublicProfilePage.tsx`, `PostDetail.tsx` | per-screen staging screenshots + spec |
| 5 | **Tier B adoption** — compact header density + SplitBar in utility bar + layout skeletons + VCard for existing cards + the shared content-width token; NO `SpotlightLayout` stage/rail, no content reorganisation (behind the flag) | Health, Wallet, AI, Settings, Calendar, Intents, Sharing pages | inventory doc 100% ticked for Tier A+B |
| 7 | **Workspace & remaining screens** — `workspace` archetype across Admin (incl. the admin-shell `AdminTabs` contract), Backoffice, Dev, Professional, Staff; `form`/`immersive` leftovers; one VTID per area (admin, backoffice, dev, professional+staff, leftovers) | `src/pages/admin/**`, `src/pages/backoffice/**`, `src/pages/dev/**`, `src/pages/professional/**`, `src/pages/staff/**` | manifest: 100 % `migrated`; design ratchet baseline for these paths = 0 |
| 6 | **Card consolidation** — Phase 5's PR body lists every card component still not on VCard; Phase 6 retires only cards on that list with zero static AND zero dynamic (`lazy(`/string) references; if the list is > 20 components it is split into sub-phases per directory, each its own VTID | listed `*Card*.tsx` only | each retired card: grep shows 0 refs, build green, mobile screenshots unchanged |

Phases 2–4 and 7 depend on 1a + 1c (1b is independent and can ship in parallel; 7 runs in parallel with 2–4 since `workspace` uses no stage/rail); 5 depends on 2–4; 6 runs last. Every migration PR flips its screens to `migrated` in the manifest and must lower (never raise) the design ratchet. **System-wide done** = manifest 100 % `migrated` and the design part of the ESLint baseline at 0; then the flag flip in production is the owner's separate decision, and removing the legacy branches is a later, separately sparred clean-up. Each phase follows the Autonomy Contract (PR → green → merge → staging → STAGING-VERIFY → Gate 2).

## 4. Constraints every phase must honour
- i18n: every new string DE first then EN (+ other 9 locales via `scripts/translate-keys.mjs`), `t()`/`notify()`, `fmt*` helpers; `npm run i18n:inventory`.
- RTL (Arabic): logical properties only (`ms/me`, `start/end`); rail sits on the inline-end side; verified in `dir=rtl`.
- WCAG 2.2 AA: focus rings, keyboard nav for focus feed, contrast on dimmed neighbours ≥ AA for text, reduced motion.
- No route additions/removals: `SpotlightLayout`, rail, quick-view sheet are components rendered inside existing route components, never new `<Route>` entries → `screens.json` unchanged; if any route ever changes, registry updated in the same PR.
- Each PR runs `npm run i18n:inventory` and commits the regenerated `docs/SCREEN_INVENTORY.md`.
- No What's New entry (redesign of existing screens).
- No sidebar change, no `AppLayout`/`useOrbVoiceWidget`/`ProfileDrawer` change.
- No production writes; staging specs read-only (network guard).

## 5. Test plan
- **Vitest (CI):** VCard (each size × kind adapter, RTL snapshot, title clamp, missing media), SpotlightLayout (rail visible ≥1280, sheet 1024–1279,
  not used <1024), flag off renders legacy tree, `feed-compose` placement split, intent prefetch fires once per link, transition wrapper keeps previous
  screen mounted until chunk resolves, Discover search/filters call handlers, no hard-coded numbers in storefront.
- **Playwright staging (read-only, `tests/e2e/staging/`, `?spotlight=1`):** per phase spec at 1440×900 and 1920×1080 — no vertical gap >48 px between
  stage cards, rail present, J/K moves focus, Discover hero+shelves+quick-view, route switch Home→Discover→Events shows no blank panel
  (DelayedLoader test id never visible after first load), CLS < 0.1 on feed, existing `screen-journey.staging.spec.ts` budgets still pass; RTL run on `/home` and `/discover`.
- **Chrome invariants (staging, every Tier A spec):** sidebar shortcut bar (6 buttons), `GlobalSearch`, 14 nav items in order, profile trigger,
  Soundscape and Language rows and the ORB button (`.vtorb-fab`) are present and visible with `?spotlight=1`, and nothing in the stage or rail
  overlaps the ORB's bounding box; same check with the sidebar collapsed.
- **Visual evidence:** screenshots at 1400×900 desktop + 390×844 mobile (mobile must be unchanged) attached to each PR.
- `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build` green locally before push.

## 6. Out of scope
Backend/gateway changes, new marketplace data sources, mobile layout, sidebar IA, flag flip in prod, removal of legacy (flag-off) code paths.

<!-- plan:end -->

## Planner responses and partner verdicts (verbatim)


---
## Planner responses — round 1
- F1 ACCEPTED — path corrected to `src/components/media/FeedMedia.tsx:41-43`.
- F2 ACCEPTED — 5 chunks.
- (premise notes) ACCEPTED — gap-3/md:gap-5 and App.tsx Discover line range corrected.
- F3 ACCEPTED — Phase 1 split into 1a (design foundation, flag-gated, no App.tsx) and 1b (navigation feel, the single App.tsx prop), separate VTIDs/PRs.
- F4 ACCEPTED (mechanism specified) — React Router 6.30 `future.v7_startTransition` on the existing BrowserRouter makes the router itself wrap location updates in `startTransition`; React 18 then keeps already-revealed Suspense content instead of showing the fallback. Prototype Vitest is a gate before anything else in 1b; fallback design (PendingOutlet outside App.tsx) named, and would go back to you for one round.
- F5 ACCEPTED — `useTenantFeatureFlag(key)` generalising `useEventGameFeatureFlag`, `useSpotlightEnabled()` merge rule specified (explicit override wins both ways).
- F6 ACCEPTED (option a) — cross-fade only via framer-motion; shared-element deferred out of the plan.
- F7 ACCEPTED — no scroll-snap on desktop; focus = card crossing stage centre; J/K scroll.
- F8 ACCEPTED — App.tsx change limited to one prop, own PR (1b), revertible; all transition/progress logic lives outside App.tsx.
- F9 ACCEPTED — Phase 6 works from an explicit list produced by Phase 5, static+dynamic ref check, split if >20.
- F10 ACCEPTED — added to Phase 3 scope.
- F11 ACCEPTED — added to constraints.
- Q1: see F4. Q2: confirmed — component-level only, no new routes. Q3: Tier B gets screen bar + skeletons + VCard + width token, not the stage/rail frame (Phase 5 row clarified).

## Partner round 2
F1–F11 all closed. No new blockers or majors. Note: v7_startTransition behaviour to be proven by the Phase 1b prototype Vitest gate (fallback named).
**Verdict: CONVERGED** (2 rounds, standard class).

## Plan change after owner review of mockups (round 3 input)
Owner direction 2026-10-12: the Vitanaland navigation chrome (sidebar: ORB, language, soundscape, user + role switcher, search, shortcut bar;
in-screen: horizontal tabs, header bar, utility bar) is a recognised navigation identity shared with mobile and must stay. Changes:
§2.1 (rail by container query; chrome kept 1:1; StandardHeader `density="compact"`; SplitBar in utility bar `trailingElement`; did-you-know to rail),
§2.4 (SubNavigation kept as the single section level; Overview SplitBar removed; sidebar cart is the cart entry), Phase 1a/3/5 rows, test plan (chrome invariants).
Owner decisions are not re-argued; review only how the plan implements them.

## Planner responses — round 3
- F12 ACCEPTED — line refs corrected (`:16` prop, `:123` render).
- F13 ACCEPTED — Phase 1a test asserts `container-type: inline-size` on the SpotlightLayout root; documented as first container-query use.
**Verdict: CONVERGED** (3 rounds, standard class; partner: no open blocker/major).

## Plan change after owner review (round 4 input)
Owner direction 2026-10-12: "harden the design rules — 550+ screens, applied across the whole Vitanaland system". Changes: new §2.7
(Spotlight Design Contract: 9 archetypes, screen manifest + test, SR rules, ESLint `design/*` plugin on the existing per-file ratchet,
a new base-branch `ratchet-design` PR-GATE check, staging design-lint spec, steering for Claude Code + Kiro), new Phase 1c, new Phase 7
(workspace/admin/dev/backoffice/pro/staff — Tier C now in scope), dependency + system-wide "done" definition, out-of-scope updated.
Round cap note: standard cap is 3; this is one round on an owner-directed change (skill §6 pattern). Not converged → escalated to owner.

## Planner responses — round 4
- F14 ACCEPTED — Phase 1c ships the replacement first: semantic tokens `status.*`, `severity.*`, `category.1–8`, `surface.*` (incl. today's page gradient) on top of the existing shadcn, `pill.*` and `sys.*` tokens, light + dark, plus a palette→token mapping table in the contract. `no-raw-palette` matches only raw palette scales and hex/rgb, never token classes. Q1 answered: a new status indicator uses `text-status-success`.
- F15 ACCEPTED — `// design-allow-next-line: <reason>` escape hatch (reason mandatory) + `npm run design:allowances` report.
- F16 ACCEPTED — Phase 7 depends on 1a + 1c only and runs in parallel with 2–4.

**Round 4 verdict: CONVERGED** — F14–F16 closed, no open blocker/major.
