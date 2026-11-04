# VTID-05419 — spotlight-card-proportion / health: acceptance

Plan: `exafyltd/vitana-platform` `.kiro/specs/spotlight-card-proportion/plan.md` + `tasks.md` (lane `health`, H1-H5),
converged and policy-approved (`converged-auto-v1`). Owner approval of the layout: 2026-10-31, *"very good. yes, this
you can build"*, on `health-proposed.png`. Builds on `layout-core` (VTID-05420, contract rule SR-31).

| Acceptance item | Evidence |
|---|---|
| H1 `/health` Spotlight branch: `ScreenFrame layout="spotlight-grid"`; spotlight = `VitanaIndexHeroCard` with `spotlightLabel`, the ring, five pillar bars, headline + insight, View breakdown (Index sheet) / Ask Vitana (ORB) | `src/pages/Health.tsx`; `health-grid.test.tsx` "opts the frame…", "View breakdown opens the Index sheet; Ask Vitana opens Vitana" |
| H2 `VitanaIndexHeroCard`: additive props only (`spotlightLabel`, `ringMedia`); the `VitanaIndexDetail.tsx` call site renders as before | `spotlight-tier-b.vtid-05111.test.tsx` "default call … has no Spotlight label, ring or ring media" + "spotlightLabel + ringMedia add …" |
| H3 six `standard` tiles in order: Sleep, Movement (exercise), Nutrition, My Biology (→ `/health/my-biology`, copy only), 7-day trend (`history`), Today's plan (`pendingActions`); row "Up next · For you" = pending Autopilot actions as `compact`, the next best action (first action lifting the weakest pillar) first | `HealthGridTiles.tsx`; `health-grid.test.tsx` "six standard tiles … planned order", "Up next …" |
| States: loading → grid skeleton (1 spotlight + 6 standard), no spinner; no index → "—" and the shared empty line, no invented number; single history day → no trend; no actions → no row, Today's plan says so; error → the existing Health handling (the hero shows the no-index line) | `health-grid.test.tsx` "real data only" block |
| Surfaces: flag-off desktop and phones unchanged (`VitanaPillarAgentsPanel`, `NextBestActionCard` stay there); `/health/vitana-index` unchanged | `health-grid.test.tsx` "flag off"; source contract test (VitanaIndexDetail has no grid) |
| Locales: only existing keys and `spotlight.grid.*`; numbers via `fmtNumber` (`@/lib/locale-format`); logical properties only | diff; no shard edit |
| Accessibility: every tile is a named button (`role=button`, `tabindex=0`, `aria-label`, Enter/Space), focus ring from `cardButtonProps`; DOM order spotlight → tiles → row | `health-grid.test.tsx` tile loop |
| Contract: `SpotlightGrid` / `ScreenFrame.layout` / `VCard.spotlightLabel` used unchanged; no new endpoint, no write | diff |
| Staging proof | `tests/e2e/staging/vtid-05419-health-spotlight-grid.staging.spec.ts` (read-only; `staging-tests.json`) |
| New tests fail on base, pass on head | `red-on-base.txt` (9 of 10 red on base; the flag-off case is green on both by design), `commands.log` |

Decisions:
- Pillar tiles read the same `index.pillars` the hero card shows (one source on the screen); with no index every tile
  shows "—" and the shared empty line.
- The previous Spotlight-branch "View my journey" link (→ `/autopilot`) gives way to the plan's two actions (View
  breakdown, Ask Vitana); the Autopilot stays one tap away on the Today's plan tile and every "Up next" card (they
  open the Autopilot pop-up, as the header Autopilot card does).
- Tiles and row are built by functions (`healthGridTiles`, `healthUpNextRow`) fed by the page's own
  `useAutopilot()` / `useVitanaIndexCache()` results, so the page does not open a second Autopilot subscription.
