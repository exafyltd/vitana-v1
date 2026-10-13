# Tasks — Vitanaland Desktop "Spotlight"

Rules for every task (from `CLAUDE.md` / steering, unchanged):
- One PR per phase VTID; PR title starts with the VTID; `docs/validation/<VTID>/scope.json` lists the paths and sets
  `"sparring_record": "docs/plans/desktop-spotlight/plan-sparring.md"`; add `docs/validation/<VTID>/staging-tests.json` for any PR that deploys.
- Before work on a VTID: `scripts/dev/resume-vtid.sh <VTID>` (vitana-platform) and update the ledger row to `in_progress`.
- Local checks before push: `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`, `npm run i18n:inventory` (commit `docs/SCREEN_INVENTORY.md`).
- Screenshots 1400×900 desktop (flag on and off) + 390×844 mobile (must be unchanged) in every UI PR.
- Never write to production; staging specs are read-only. No What's New entry.
- Work outside this spec = plan change → spar → owner. Inside the spec, take the conservative option and list it under "Decisions taken".
- After merge: watch STAGING-VERIFY for the merge commit; Gate 2 to the owner only from its evidence.

Dependencies: 1a + 1c → 2, 3, 4, 7 (parallel) → 5 → 6. 1b is independent.

---

## Phase 1a — Design foundation · VTID-05105
- [x] 1a.1 Generate `docs/design-system/desktop-screen-inventory.md` from `App.tsx` + `screens.json` (exact route counts, tier per route). _R7_
- [x] 1a.2 Tokens in `src/index.css` (light + dark) + `tailwind.config.ts` extend: width tokens, VCard radius/elevation/ratios, focus ring. _R3, SR-14…17_
- [x] 1a.3 `VCard` (4 sizes, slots, `data-vcard-size`, RTL, 2-line title clamp, missing-media fallback) + `VCardSkeleton`. _R3_
- [x] 1a.4 Adapters: post, news, product (others land with their phases). _R3_
- [x] 1a.5 `SpotlightLayout` (container query, `container-type: inline-size`, rail ≥ 1060 px else `RailSheet`), `StageCrossFade`, `useFocusedCard`. _R1, R6.4_
- [x] 1a.6 `ScreenFrame archetype` composing existing chrome; `StandardHeader density="compact"` (additive prop; default unchanged); SplitBar at the end of the utility row (see decisions). _R2_
- [x] 1a.7 Archetype skeletons. _R6.2_
- [x] 1a.8 `useTenantFeatureFlag`, `useSpotlightEnabled` (+ `?spotlight=` override), `desktop_spotlight` in `KNOWN_FLAGS`. _R8_
- [x] 1a.9 Vitest: VCard sizes × adapters, RTL, clamp, missing media; container-type asserted; rail rule; StandardHeader compact keeps Autopilot + Index tiles and default is unchanged; flag on/off/override; reduced motion. _R1–R3, R8_
- [x] 1a.10 No screen renders differently with the flag off — no page imports the new components yet; verified by the read-only staging spec
  `tests/e2e/staging/vtid-05105-spotlight-foundation.staging.spec.ts` (/home and /discover keep today's header, no `[data-archetype]`).

Status: implemented in PR #1349 (VTID-05105). Decisions taken (inside the plan, for Gate 2):
- `ScreenFrame` lays the SplitBar out next to the utility row, not in `trailingElement` (that slot sits inside the row's horizontal scroller).
- `StandardHeader density="compact"` drops the hover preview of the latest Autopilot actions; the tile still opens the Autopilot popup.
- The inventory counts 345 distinct screen routes (429 `<Route>` − 82 redirects − catch-all); the 551 in `docs/SCREEN_REGISTRY.md` also counts tabs/overlays.
- New strings: DE + EN by hand; the other 9 locales seeded by I18N-PROPAGATE as `_pending_review` until the translate run.


## Phase 1b — Navigation feel · VTID-05106 (not flag-gated)
- [x] 1b.1 **Prototype gate:** Vitest proving `v7_startTransition` keeps the old page mounted and no `RouteFallback` during a lazy load. Fails → stop, re-spar.
  Passed (`src/lib/navigation-transition.vtid-05106.test.tsx`; the control without the flag shows the fallback).
- [x] 1b.2 `future={{ v7_startTransition: true }}` on `<BrowserRouter>` (`App.tsx:764`) — the only `App.tsx` edit.
- [x] 1b.3 `useNavigationPending` + `NavProgressBar` rendered from `RouteTransitionOverlay.tsx`. _R6.1_
- [x] 1b.4 Document-level intent prefetch (pointerover/focusin on `a[href]`, ≥ 80 ms, once per href) → chunk + data prefetch. _R6.3_
- [x] 1b.5 Keep `tests/loading-no-flash.cjs`, keep-alive tests, `screen-journey.staging.spec.ts` green; staging spec: route switch never shows the DelayedLoader test id after first load. _R6.6_

Status: implemented (VTID-05106). Decisions taken (inside the plan, for Gate 2):
- Pending detection: `<BrowserRouter>` has no `useNavigation()`, so `useNavigationPending` compares the router's committed
  location with the browser URL, re-read on `popstate`, the Navigation API's `currententrychange` and after clicks. No
  `history` patching; where the Navigation API is missing, a pushState-only switch shows no bar (never a stuck bar).
- The bar appears only for switches slower than 150 ms; reduced motion → no animation.
- Intent prefetch reuses the existing `ROUTE_CHUNK_IMPORTERS` + `prefetchForPath` (prefetch-registry) instead of a second
  map in `preloadHotChunks.ts`; unknown paths are a no-op. Skipped on save-data / 2g like `preloadHotChunks`.
- `tests/loading-no-flash.cjs` was not run locally: it boots a production build wired to the production Supabase project
  (absolute rule); it is not in CI. Its "no wrong screen" guarantee is the RouteTransitionOverlay path, which is unchanged.

## Phase 1c — Design contract & enforcement · VTID-05107
- [x] 1c.1 `docs/design-system/SPOTLIGHT_RULES.md` from design.md §4–§7 (SR-01…30, archetypes, mobile mapping, palette→token table). Header pointer in `docs/UNIVERSAL_SCREEN_PATTERN.md`. _R7.3_
- [x] 1c.2 `.claude/rules/design.md` (paths `src/pages/**`, `src/components/**`) and `.kiro/steering/vitana-design.md` (same fileMatch) linking the contract; short pointer paragraph in `CLAUDE.md`.
- [x] 1c.3 Semantic colour tokens `status.*`, `severity.*`, `category.1–8`, `surface.*` (incl. today's page gradient), light + dark. _R7.6_
- [x] 1c.4 `src/design/screen-manifest.json` (every non-redirect route; archetype, tier, status `legacy`, phase) + `screen-manifest.test.ts` via `extractSpaRoutes`. _R7.1–7.2_
- [x] 1c.5 `eslint-rules/design/*` (6 rules) + escape hatch + RuleTester tests; register in `eslint.config.js` at error. _R7.4, R7.7_
- [x] 1c.6 `npm run design:allowances` report.
- [x] 1c.7 Regenerate `scripts/ci/pr-gate/baseline/eslint.json`; create `baseline/design.json`; PR body lists starting counts per rule.
- [x] 1c.8 `ratchet-design` in `gate.mjs`/`lib.mjs` reading the base commit's baseline; unit tests prove a raised count fails even when the PR edits the baseline; one step in `PR-GATE.yml`. _R7.5_
- [x] 1c.9 `tests/e2e/staging/design-contract.staging.spec.ts` (iterates `migrated` manifest entries; empty set passes). _R7_

Status: implemented (VTID-05107). Starting legacy counts carried by the ratchets: 6,345 `design/*` errors in 861 files
(no-raw-palette 3,842 incl. bg-white/text-black · no-physical-direction 1,670 · no-arbitrary-size 513 · require-screen-frame 185 ·
no-page-spinner 68 · no-raw-content-card 67 — one fixed in this PR: the compact StandardHeader now uses status tokens).
Manifest: 345 screens (workspace 187 · collection 84 · form 32 · detail 18 · conversation 12 · dashboard 4 · focus-feed 3 ·
storefront 3 · immersive 2), all `legacy`.

## Phase 2 — News Feed · VTID-05108
- [x] 2.1 `feed-compose.ts` `placement: 'stream' | 'rail'` (+ tests); info cards, DidYouKnow, EventGameFeedBadge → rail. _R4.4_
- [x] 2.2 Desktop focus feed in `Home.tsx` behind `useSpotlightEnabled()` via `ScreenFrame archetype="focus-feed"`; legacy branch untouched. _R4_
- [x] 2.3 Rail: Up next, Today, Vitana Index / journey, People to meet. _R1_
- [x] 2.4 Keyboard J/K/↑↓, centre-line focus, dim with AA contrast. _R4.2–4.3_
- [x] 2.5 Manifest: `/home` → `migrated`; lower the design baseline for touched files.
- [x] 2.6 Staging spec: no gap > 48 px at 1280/1440/1920, one spotlight, rail present, J/K, RTL, chrome invariants. _R4.5_

Status: implemented (VTID-05108). Migrated: `/home` (focus-feed). Decisions taken (for Gate 2):
- Only the Spotlight branch changes; phones and flag-off keep the legacy feed and its order exactly.
- VTID-05143's Home enrichment cards are Vitana cards, so on desktop Spotlight they sit in the rail with the other info cards.
- Design baseline: `src/pages/Home.tsx` 13 → 12.

## Phase 3 — Discover storefront · VTID-05109
- [x] 3.1 Storefront overview (`ScreenFrame archetype="storefront"`): SubNavigation kept, Overview SplitBar removed, chips, hero, shelves, Share & Earn shelf. _R5.1–5.2_
- [x] 3.2 Product/service/provider adapters; quick-view sheet generalised from `ProductDetailsDrawer`. _R5.3_
- [x] 3.3 Wire overview search; wire or remove doctor filters; mock-only sections → empty states; raw strings → `t()`. _R5.5–5.6_
- [x] 3.4 Sub-pages: their SplitBar moves to the utility trailing slot; results grid of `standard` cards.
- [x] 3.5 Manifest + baseline; staging spec: hero + shelves, search returns results, quick-view opens (read-only).

Status: implemented (VTID-05109). Migrated: `/discover`, `/discover/supplements`, `/discover/wellness-services`,
`/discover/doctors-coaches`, `/discover/orders`. Decisions taken (for Gate 2):
- Only the Spotlight branch changes; flag-off Discover (incl. its dead search and doctor filters) stays identical.
- Shelves show at most 4 real items (2 columns, 4 from xl); a short shelf shows what exists, never padding.
- Wellness services / providers have no real catalogue: empty states + the member's saved items, no sample data.
- Goal / price / rating chips use the gateway's existing `health_goals`, `price_max_cents`, `rating_min` — no contract change.
- `/discover/deals-offers` stays `legacy` until staging shows a real discounted product (empty → no hero by design).
- Orders keeps `StandardHorizontalCard` rows (VCard conversion is Phase 5/6). Detail sub-pages untouched.

## Phase 4 — Social screens · VTID-05110
- [~] 4.1 Community overview, Events & Meetups (featured event + list + rail; no empty bento slots), Groups, GroupDetail, Live Rooms, Media Hub, Public profile, Post detail, Messages — each via its archetype. _R1, R3_
  Part 1 done (VTID-05110): Community overview, Events & Meetups, Groups, Group detail, Live Rooms. Decisions (for Gate 2):
  Events keeps its `collection` archetype with a stage + rail inside it; full rows as a `standard` grid, the remainder as
  `row` cards (no empty slots); Community overview shows only real data (live rooms, today, this week, groups you have
  not joined — the legacy mock rows, invented counters and the console-only search are not rendered; no member list,
  to keep test accounts out); empty dominant screens show one text-only spotlight card; existing drawers, deep links
  and dialogs are shared with the legacy render. Part 2 done: Media Hub (focus-feed; demo shorts/playlists/shows not rendered, search really filters) and Messages
  (conversation; same ConversationView props, data hooks/realtime/keep-alive untouched). Left: Post detail (after Phase 2),
  Public profile (needs an owner design call), the Live Rooms "Past" tab with recordings.
- [x] 4.2 Remaining adapters (event, liveRoom, group, member).
- [ ] 4.3 Manifest + baseline; per-screen staging spec + screenshots.

## Phase 5 — Tier B adoption · VTID-05111
- [x] 5.1 Health, Wallet, AI, Settings, Calendar, Intents, Sharing: `ScreenFrame` (compact header + SplitBar in utility bar), skeletons, VCard, width token — no stage/rail re-layout.
- [x] 5.2 PR body: list of every card component still not on VCard (input to Phase 6).

Status: implemented (VTID-05111). Migrated 35 routes (31 static + 4 parameterised): `/ai`, `/ai/companion`,
`/ai/daily-summary`, `/ai/insights`, `/ai/recommendations`, `/assistant`, `/calendar`, `/calendar/entry/:entryId`,
`/connectors`, `/health` + 7 health sections, `/intents/board`, `/intents/mine`, `/intents/match/:id`, `/reminders`,
`/reminders/fire/:fireId`, `/settings/{billing,limitations,notifications,tenant-role}`, `/sharing`, `/sharing/campaigns`,
`/sharing/campaigns/:id`, `/sharing/data-consent`, `/support`, `/wallet` + balance/rewards/subscriptions.
Decisions taken (for Gate 2):
- Only the Spotlight branch changes; phones and flag-off keep the legacy JSX verbatim.
- Sample content without real data is left out on Spotlight (SR-24/26): Health demo sections, invented ratings and view
  counts, wallet "special offer" cards, sharing nudge.
- Main's VTID-05143 Calendar enrichment strip and VTID-05100 Vitana messages settings render on both paths; the
  VTID-05100 settings harness pins the Spotlight flag off (no assertion changed).
- Design baseline lowered by one (require-screen-frame) in 31 files.

## Phase 7 — Workspace & remaining screens (parallel with 2–4)
- [x] 7.1 Admin · VTID-05113 — `workspace`, `AdminTabs` kept, admin-shell contract respected.
  Status: 92 `/admin/*` routes migrated (`/admin/init-events` stays legacy: no AppLayout, no guard — own decision).
  Admin `design/*` errors 409 → 0. Decisions (for Gate 2): flag-gated `ScreenFrame` like every other phase, but the
  token / logical-direction / size / skeleton changes apply on both paths (the lint cannot tell them apart), so with the
  flag off admin shows small visual differences (dark-mode text on coloured fills, ≤ 8 px size steps, skeletons instead
  of spinners); behaviour, data, routes and AdminTabs unchanged. `AdminHeader` stays in the content (the ScreenFrame
  header carries member tiles). 25 `design-allow-next-line` with reasons (viewport-sized scroll areas, modal backdrops,
  device bezel). `src/components/admin/**` not migrated yet. The staging design-lint skips role-gated operator routes;
  `vtid-05113-admin-workspace.staging.spec.ts` checks them (gate for a non-admin, workspace frame for an admin).
- [x] 7.2 Backoffice · VTID-05114
  Status: implemented (VTID-05114). All 27 `/backoffice/*` routes migrated (`workspace`, BackOfficeTabs kept above the frame). Decisions (for Gate 2): `BackOfficePage` itself is not edited — a page-local `BackOfficeWorkspacePage` wraps it; token fixes apply on both paths (status colours, spacing scale); one reasoned `design-allow-next-line` keeps the flag-off placeholder 404 centring. BackOffice `design/*` errors 12 → 0.
- [x] 7.3 Dev · VTID-05115
  Status: implemented (VTID-05115). 48 `/dev/*` routes migrated (`workspace`, section tabs kept above the frame). Left legacy: `/dev` (redirect to `/dev/dashboard`) and `/dev/login` (sign-in screen outside DevLayout; token fixes only). Decisions (for Gate 2): token fixes apply on both paths (surface tokens, logical directions, spacing scale); unrouted DevReleases / DevDocsBacklog get token fixes only. `src/pages/dev` `design/*` errors 139 → 0.
- [x] 7.4 Professional + Staff · VTID-05116
  Status: implemented (VTID-05116). Migrated `/professional/dashboard`, `/staff/dashboard`, `/staff/queue` (`workspace`). The other `/professional/*` and `/staff/*` routes render the shared ComingSoonPlaceholder and move with 7.5. Decisions (for Gate 2): content, demo data and the queue card layout unchanged; token fixes on both paths (status tokens, logical border/spacing); the phone bottom-bar clearance (VTID-04001) is kept on the flag-off path. `design/*` errors professional 4 → 0, staff 18 → 0.
- [ ] 7.5 Leftover `form` / `immersive` screens → manifest 100 % `migrated` · VTID-05117

## Phase 6 — Card consolidation · VTID-05112 (last)
- [ ] 6.1 Retire only cards on the Phase 5 list with zero static and zero dynamic references; split into sub-phases if > 20.
- [ ] 6.2 Design part of the ESLint baseline = 0; mobile screenshots unchanged.

## System-wide done
- [ ] Manifest 100 % `migrated`; `baseline/design.json` all zero; STAGING-VERIFY design-lint green for every screen.
- [ ] Owner decision on turning `desktop_spotlight` on in production (separate). Legacy-path removal = separate sparred plan.
