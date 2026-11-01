# VTID-05416 — spotlight-card-proportion / discover: acceptance
Plan: `exafyltd/vitana-platform` `.kiro/specs/spotlight-card-proportion/plan.md` + `tasks.md` (lane `discover`),
converged and policy-approved (`converged-auto-v1`). Owner approval of the layout: 2026-10-31, *"very good. yes, this
you can build"* (session `kiro-202610152203-0347`). Builds on `layout-core` (VTID-05420): `SpotlightGrid`,
`ScreenFrame layout="spotlight-grid"`, `VCard.spotlightLabel`, the `spotlight.grid.*` keys. `layout-core` numbered the
new contract rule **SR-31** (the plan's "SR-26" was already taken); this lane cites SR-31.

| Acceptance item (tasks.md `discover`) | Evidence |
|---|---|
| D1 `Discover.tsx` passes `layout="spotlight-grid"` to the storefront `ScreenFrame` | `src/pages/Discover.tsx`; test "the Discover page opts its storefront ScreenFrame into the Spotlight grid layout"; staging `[data-screen-layout="spotlight-grid"]` |
| D2 spotlight = top feed item (`ProductHero` stacked, Spotlight label); tiles = `feedItems.slice(1, 7)` as `ProductVCard`; row "Browse categories" = compact links to `/discover/supplements`, `/discover/wellness-services`, `/discover/doctors-coaches`, `/discover/deals-offers`, `/discover/marketplace`; shelves stay below | `DiscoverStorefront.tsx`; tests "…one spotlight card…", "six standard tiles…", "Browse categories row…", "the shelves stay below the grid…" |
| D3 additive stacked `ProductHero` variant (default side-by-side kept for results mode and Deals); `GRID_TILES = 6` | `DiscoverCards.tsx` (`variant`, default `side`; `ProductVCard as`, default `li`); `storefront-model.ts`; results-mode test asserts `data-hero-variant="side"`, no label, no grid |
| D4 tests rewritten with more cases and expects; results mode still one spotlight; vtid-05109 staging spec updated (contract changed on purpose) | `discover-storefront.vtid-05109.test.tsx`; `vtid-05109-discover-storefront.staging.spec.ts`; `gate.mjs weakening` (commands.log) |
| D5 new staging spec + manifest | `tests/e2e/staging/vtid-05416-discover-spotlight-grid.staging.spec.ts`; `staging-tests.json` |
| States: loading (grid skeleton 1 + 6 + 5), fewer than 7 items (no fabricated tiles), 1 item (shared empty tile state `spotlight.grid.emptyTiles`), empty feed (feed empty state, no grid), error (retry), guest (allowed, banner unchanged) | unit tests "loading shows VCard skeletons…", "fewer feed items (D4)…", existing guest/error cases |
| Surfaces | `/discover` overview, desktop Spotlight only. Results mode keeps its side-by-side hero (same full-width frame); `/discover/deals-offers`, `/business`, flag off and phones unchanged (phone spec at 390x844) |
| Locales | only existing keys: `spotlight.grid.{label,seeAll,emptyTiles,discover.section,discover.browseCategories}`, `spotlightDiscover.*`, `screens.discover.marketplace`; prices via the existing locale-format path; logical properties only (RTL mirrors) |
| Accessibility | product tiles keep their title button (keyboard → quick view); category cards' titles are links with the category name; DOM order = spotlight → tiles → row → shelves |
| Contract | interfaces of plan.md unchanged; same feed source (`useMarketplaceFeed({ limit: 12 })`); no new endpoint |
| Staging proof | `vtid-05416-discover-spotlight-grid.staging.spec.ts` at 1400x900 and 1920x1080 (one spotlight at 30-45% of the layout width, tiles beside, row below, header + utility, no horizontal scroll) and 390x844 (no Spotlight frame) — runs in STAGING-VERIFY after merge |

Decisions:
- Results mode lives inside the same storefront `ScreenFrame` (the search text and chips switch it in place), so the
  frame's `layout="spotlight-grid"` (width `full`) also applies while results show. The results content itself is
  unchanged (side-by-side hero + standard grid). Splitting the frame per mode would need the chip state lifted into
  the page, which is outside this lane's plan.
- The empty tile area (1 feed item) uses the shared `spotlight.grid.emptyTiles` key from `layout-core`.
- The lane file (`.kiro/specs/spotlight-card-proportion/lanes/discover.md`) lives in vitana-platform; this PR is in
  vitana-v1, so its log/front matter are written by the land step / Project Manager there.
