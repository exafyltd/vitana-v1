# Requirements — Vitanaland Desktop "Spotlight"

Source of truth: the owner-approved, sparred plan `docs/plans/desktop-spotlight/plan.md`
(plan hash `2378d61b1283ba47b753d10aa37af7d586ef0e11e7012062b4cd6ad6fe3ae08b`, record
`docs/plans/desktop-spotlight/plan-sparring.md`, owner approval 2026-10-12). If this spec and the plan disagree, the plan wins;
a change to either is a plan change (spar it, owner approves, then edit both).

Mockups: `docs/plans/desktop-spotlight/mockups/` (01 today · 02 News · 03 Discover · 04 quick view · 05 Events ·
06 navigation anatomy · 07 VCard · 08 screen switching · 09 mobile↔desktop · 10 archetypes).

VTIDs: 1a VTID-05105 · 1b VTID-05106 · 1c VTID-05107 · 2 VTID-05108 · 3 VTID-05109 · 4 VTID-05110 · 5 VTID-05111 ·
6 VTID-05112 · 7 VTID-05113 (admin) / VTID-05114 (backoffice) / VTID-05115 (dev) / VTID-05116 (pro+staff) / VTID-05117 (leftovers).

---

## R1 — One dominant thing on desktop
**User story:** As a member on a desktop screen, I want one clear item to look at, with calm context beside it, so the screen
does not overwhelm me.
1. WHEN Spotlight is enabled AND the viewport is ≥ 1024 px THEN screens of archetype `focus-feed`, `storefront`, `detail` and
   `dashboard` SHALL show exactly one `spotlight` VCard in the first viewport.
2. WHEN the main area (viewport minus the sidebar's current width) is ≥ 1060 px THEN the context rail SHALL be visible; otherwise it
   SHALL be reachable through a toggle sheet.
3. The context rail SHALL contain only `compact` and `row` VCards.

## R2 — Vitanaland navigation chrome is kept 1:1
**User story:** As a member, I want the Vitanaland navigation I know (also from the phone app) to stay exactly where it is.
1. The sidebar shortcut bar (Vitana Index, Calendar, Alerts, Wallet, Autopilot, Cart), Global search, the 14 nav items in order,
   the profile trigger with role switcher, Soundscape, Language and the ORB SHALL render unchanged on every screen, with the sidebar
   expanded and collapsed.
2. No Spotlight element SHALL overlap the ORB's bounding box.
3. In-screen chrome SHALL appear in this order: `SubNavigation` (only on screens with sections) → `StandardHeader` → `UtilityActionButton`
   row, with `SplitBar` in the utility row's `trailingElement` slot.
4. WHEN Spotlight is on THEN `StandardHeader` SHALL render with `density="compact"` (64 px, same emoji/title/description, same Autopilot and
   Vitana Index tiles); WHEN off THEN it SHALL render exactly as today.
5. Mobile (< 1024 px) chrome SHALL NOT change in any phase.

## R3 — Unified card system (VCard)
1. Content items SHALL render through `VCard` with sizes `spotlight` (16:9 or 4:5), `standard` (4:3), `compact` (64 px thumb, 72–88 px tall),
   `row` (48 px thumb).
2. A grid row SHALL NOT mix card sizes; cards SHALL NOT use fixed pixel heights; cards SHALL NOT nest; bento rows SHALL render only full rows.
3. VCard SHALL expose `data-vcard-size`; ScreenFrame SHALL expose `data-archetype`.

## R4 — News Feed (focus feed)
1. The stage SHALL be a single column of `spotlight` cards with free scrolling (no scroll-snap on desktop).
2. The card crossing the stage's centre line SHALL be the focused card; neighbours SHALL be dimmed with text contrast still ≥ WCAG AA.
3. `J`/`K` and ↑/↓ SHALL scroll the next/previous card into view (instant under reduced motion).
4. Info cards (Vitana Index, Longevity Journey, match, invite, new member, Did-you-know, event game badge) SHALL appear in the rail, not
   in the stream; `feed-compose.ts` SHALL decide placement via a `placement` field.
5. At 1280 / 1440 / 1920 px there SHALL be no vertical gap > 48 px between stage cards.

## R5 — Discover storefront
1. `SubNavigation` (Overview, Supplements, Wellness Services, Doctors/Coaches, Deals & Offers, Orders) SHALL be the only section level; the
   Overview `SplitBar` (Suggested / Categories / Share & Earn) SHALL be removed on the storefront.
2. Overview SHALL show: header bar → utility bar with a working search → filter chips → one hero `spotlight` ("Picked for you", real data) →
   shelves of `standard` cards with "See all" → Share & Earn shelf (real data or empty state).
3. Products, services and providers SHALL open the same quick-view sheet from the inline-end side with "Open full page".
4. The sidebar Cart button SHALL remain the only cart entry.
5. No fabricated numbers SHALL be shown; sections with only mock data SHALL show an empty state.
6. Every control SHALL have a handler (overview search; doctor filters wired or removed). Raw English strings on touched pages SHALL move to `t()`.

## R6 — Loading and switching
1. WHEN navigating after the first load THEN the previous screen SHALL stay visible until the next is ready (React Router
   `future.v7_startTransition`), with a ≤ 2 px progress bar after 150 ms; the full-screen `DelayedLoader` SHALL appear only on first load.
2. Pages SHALL show archetype-shaped skeletons, never a page spinner or blank panel.
3. Links in the sidebar and VCards SHALL prefetch the route chunk and its data after ≥ 80 ms hover/focus.
4. Stage content SHALL cross-fade in 150 ms (framer-motion), none under `prefers-reduced-motion`.
5. Images SHALL sit in fixed-ratio boxes; CLS SHALL stay < 0.1.
6. Existing keep-alive behaviour and `screen-journey.staging.spec.ts` budgets SHALL NOT regress.

## R7 — Design contract across all 550+ screens
1. Every non-redirect route in `App.tsx` SHALL have one archetype in `src/design/screen-manifest.json`
   (`focus-feed | storefront | detail | collection | dashboard | conversation | form | workspace | immersive`) and a status (`legacy | migrated`).
2. A test SHALL fail when a route is missing from the manifest or has an invalid archetype.
3. Rules SR-01…SR-30 (see design.md §6) SHALL be documented in `docs/design-system/SPOTLIGHT_RULES.md` and linked from
   `.claude/rules/design.md`, `.kiro/steering/vitana-design.md` and a short pointer in `CLAUDE.md`.
4. ESLint `design/*` rules SHALL run at error level; existing violations SHALL be absorbed by the per-file ratchet; new files SHALL be clean.
5. A PR-GATE `ratchet-design` check SHALL compare design counts with the baseline read from the base commit, so no PR can raise them
   (except a PR that changes `eslint-rules/design/**`, which is a sparred contract change).
6. Semantic colour tokens (`status.*`, `severity.*`, `category.1–8`, `surface.*`) SHALL exist before `design/no-raw-palette` is enabled.
7. `// design-allow-next-line: <reason>` SHALL be the only escape hatch; a missing reason SHALL be an error; `npm run design:allowances` SHALL list them.
8. Admin SHALL keep `AdminTabs` and the admin-shell contract (`docs/plans/admin-shell.md`).

## R8 — Rollout safety
1. Everything except Phase 1b SHALL be behind tenant flag `desktop_spotlight` (`tenant_settings.feature_flags`, listed in `KNOWN_FLAGS`),
   read by `useTenantFeatureFlag(key)` and wrapped by `useSpotlightEnabled()` = `!isMobile && (previewOverride ?? tenantFlag)`.
2. `?spotlight=1|0` SHALL set a localStorage override (try/catch) that wins over the tenant flag in both directions.
3. With the flag off, every screen SHALL render exactly as today.
4. Turning the flag on in production is a separate owner decision.

## R9 — Cross-cutting
1. i18n: DE first, then EN and the other locales; no raw strings; `fmt*` helpers; `npm run i18n:inventory` each PR.
2. RTL: logical properties only; verified in `dir=rtl`.
3. WCAG 2.2 AA including a keyboard path through stage and rail.
4. No new routes (no `screens.json` change); no What's New entry; no sidebar, `AppLayout.tsx`, `useOrbVoiceWidget`, `ProfileDrawer` change.
5. Never write to production; staging specs are read-only.
