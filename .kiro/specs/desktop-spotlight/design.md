# Design — Vitanaland Desktop "Spotlight"

Read `requirements.md` first. The approved plan is `docs/plans/desktop-spotlight/plan.md`. File references are `path:line` at commit
31979f8 (2026-10-12); re-check them before editing.

## 1. Code map (what exists today)

| Concern | Where |
|---|---|
| Desktop/mobile switch | `src/hooks/use-mobile.tsx:3` (`MOBILE_BREAKPOINT = 1024`); Tailwind `md` = 1024 |
| Global frame | `src/components/AppLayout.tsx` (sidebar `:198`, shortcut row `:244-315`, `GlobalSearch` `:318`, footer `:376-422`, ORB spacer `:420`) — **do not modify** |
| ORB | gateway `orb-widget.js` (`index.html:92`, `src/hooks/useOrbVoiceWidget.ts`), desktop position `src/index.css:606-635` |
| Sidebar items | `src/config/role-navigation.ts:25-40` (14 community items) |
| In-screen chrome | `src/components/SubNavigation.tsx`, `src/components/StandardHeader.tsx` (desktop large variant `:50-108`), `src/components/ui/utility-action-button.tsx` (`trailingElement` prop `:16`, rendered `:123`), `src/components/ui/split-bar.tsx` |
| Mobile chrome | `src/components/mobile/{TopAppBar,SideDrawerNav,MobileBottomNav,MobileAppShell}.tsx`, `MobileModePill` |
| Routes / loading | `src/App.tsx` (`BrowserRouter` `:764`, single `Suspense` `:810`, `RouteFallback` `:65`), `src/components/ui/DelayedLoader.tsx`, `src/components/RouteTransitionOverlay.tsx` |
| Prefetch | `src/lib/preloadHotChunks.ts` (5 chunks), `src/lib/prefetch-registry.ts`, `src/hooks/useBackgroundPrefetch.ts` |
| News | `src/pages/Home.tsx` (grid `:474`, chrome `:628-679`), `src/lib/feed-compose.ts`, `src/components/home/*`, `src/components/media/FeedMedia.tsx`, `src/components/vitana/VitanaRecommendationCard.tsx` |
| Discover | `src/pages/Discover.tsx`, `src/pages/discover/*`, `src/components/discover/*`, `ProductDetailsDrawer`, `src/config/navigation.ts:35-42` |
| Tenant flags | `tenant_settings.feature_flags`; member-readable pattern `useEventGameFeatureFlag()` `src/hooks/useEventGame.ts:230-252`; admin UI `src/pages/admin/settings/FeatureFlags.tsx` (`KNOWN_FLAGS`) |
| Lint / ratchet | `eslint.config.js` (local `i18n` plugin from `eslint-rules/`), PR-GATE `scripts/ci/pr-gate/gate.mjs` (`ratchet-eslint`, `ratchet()` `:173`), `lib.mjs` (`ALWAYS_ALLOWED` `:43`, `compareRatchet` `:109`), baseline `scripts/ci/pr-gate/baseline/eslint.json` |
| Route extraction | `scripts/nav/spa-routes.mjs` (`extractSpaRoutes`), used by `src/navigation/registry/registry.routes.test.ts` |
| Staging tests | `tests/e2e/staging/*.staging.spec.ts`, per-VTID `docs/validation/<VTID>/staging-tests.json` |

## 2. New modules

```
src/components/ui/vcard/
  VCard.tsx              size: 'spotlight' | 'standard' | 'compact' | 'row'; slots: media, eyebrow, title, meta, actions, badge
  adapters/*.tsx         post, news, event, liveRoom, product, service, provider, group, member  (data → slots)
  VCardSkeleton.tsx
src/components/layout/spotlight/
  ScreenFrame.tsx        archetype → composes SubNavigation / StandardHeader(density) / UtilityActionButton(+SplitBar trailing) / SpotlightLayout
  SpotlightLayout.tsx    stage + optional rail; root has `container-type: inline-size`; rail visible at ≥ 1060 px container width, else RailSheet
  RailSheet.tsx          toggle sheet for the rail below 1060 px
  StageCrossFade.tsx     framer-motion AnimatePresence keyed by pathname, 150 ms, off under reduced motion
  skeletons/*.tsx        one skeleton per archetype
  useFocusedCard.ts      IntersectionObserver centre-line focus + J/K/↑↓
src/components/layout/NavProgressBar.tsx + src/hooks/useNavigationPending.ts      (Phase 1b)
src/hooks/useTenantFeatureFlag.ts, src/hooks/useSpotlightEnabled.ts                (Phase 1a)
src/design/screen-manifest.json, src/design/screen-manifest.test.ts                 (Phase 1c)
eslint-rules/design/*.js                                                             (Phase 1c)
```

`StandardHeader` gets an additive `density?: 'default' | 'compact'` prop (default = today). No other existing component's default
rendering changes.

## 3. Layout

```
| sidebar 256 / 48 px (unchanged) | STAGE 680–760 px | gap 28 | RAIL 320–360 px (sticky) |
```
Width tokens: `stage` (680–760), `wide` (stage + gap + rail), `form` (680), `full`. Content is centred in the main area.

## 4. Archetypes

| Archetype | Layout | Dominant element | Typical screens |
|---|---|---|---|
| `focus-feed` | stage + rail | focused `spotlight` card | News, Media Hub, Live Rooms, community feeds |
| `storefront` | `wide` | hero `spotlight` | Discover overview, Business Hub catalog, Deals |
| `detail` | stage + rail | the item (`spotlight`) | post, article, product, event, provider, public profile |
| `collection` | `wide`, `standard` grid or `row` list | first row / result | Groups, Members, category lists, Orders |
| `dashboard` | stage + rail | one hero KPI `spotlight`, then `standard` tiles | Health, Wallet, My Journey, Vitana Index |
| `conversation` | list column + thread stage (+ optional rail) | open thread | Inbox, Messages, AI Assistant, group chat |
| `form` | single `form` column, no rail | the form | Settings, Edit profile, onboarding, auth, legal |
| `workspace` | `full`, dense; rail optional | primary table/panel | Admin (keeps `AdminTabs`), Backoffice, Dev, Professional, Staff |
| `immersive` | full-bleed; in-screen chrome hidden; sidebar + ORB stay | the media | `/shop`, live session, fullscreen media |

## 5. Desktop ↔ mobile mapping (part of the contract)

| Desktop | Phone |
|---|---|
| ORB — bottom-centre of sidebar | ORB — centre of bottom nav |
| Language row (sidebar footer) | Language row (side drawer footer) |
| Soundscape row (sidebar footer) | Soundscape mute in top app bar |
| User + role switcher (ProfileDrawer) | Avatar + role pill (side drawer header) |
| Global search (sidebar header) | Search in drawer shortcut strip + utility bar |
| Shortcut bar: Index · Calendar · Alerts · Wallet · Autopilot · Cart | Drawer shortcut strip + Index/Autopilot chips |
| SubNavigation tabs | Side drawer / section entry points |
| Header bar (compact StandardHeader) | Header title (StandardHeader mobile) |
| Utility bar | Utility bar (compact) |
| SplitBar at end of utility bar | MobileModePill in utility bar |
| Spotlight stage — one dominant card | One card fills the view |
| Context rail | Below-the-card sections / sheets |

## 6. Spotlight Design Contract — rules (copy into `docs/design-system/SPOTLIGHT_RULES.md` in Phase 1c)

**Chrome**
- SR-01 Sidebar elements (shortcut bar, search, nav, profile/role switcher, Soundscape, Language, ORB) are never hidden, moved or overlaid.
- SR-02 In-screen order: SubNavigation (if sections) → StandardHeader → UtilityActionButton row; SplitBar only in the utility row's trailing slot.
- SR-03 Pages compose chrome only through `ScreenFrame archetype="…"`; no ad-hoc header, tab bar or toolbar.
- SR-04 Only `immersive` hides in-screen chrome; nothing hides the sidebar or ORB.
- SR-05 Admin screens keep `AdminTabs` as their section tabs (admin-shell contract).

**Dominance**
- SR-06 `focus-feed`, `storefront`, `detail`, `dashboard`: exactly one `spotlight` VCard in the first viewport.
- SR-07 No other element on the screen uses `spotlight` size.
- SR-08 Rails hold only `compact` / `row` cards.

**Cards**
- SR-09 Content items render only through `VCard`.
- SR-10 Media ratios: 16:9 or 4:5 (spotlight), 4:3 (standard), 1:1 (compact, row).
- SR-11 A grid row never mixes card sizes.
- SR-12 No fixed-pixel card heights; no card inside a card.
- SR-13 Bento/grid rows render only full rows (no empty slots).

**Layout & tokens**
- SR-14 Widths only `stage`, `wide`, `form`, `full`.
- SR-15 Spacing from the 4 px scale.
- SR-16 Type scale 12 / 13 / 14 / 17 / 20 / 24 px; 28 px only for a storefront/dashboard hero title.
- SR-17 Colours, radii, elevation only from tokens; no raw Tailwind palette classes or hex/rgb in pages/components.
- SR-18 Semantic colour roles: shadcn set, `pill.*`, `sys.*`, `status.{success,warning,error,info}` (+ `-subtle`),
  `severity.{low,medium,high,critical}`, `category.1–8`, `surface.{page,raised,sunken}`; light + dark.
- SR-19 Logical properties only (`ms/me`, `ps/pe`, `start/end`, `text-start/end`, `rounded-s/e`).

**Loading & motion**
- SR-20 No page-level spinner or blank panel after first load; archetype skeletons only.
- SR-21 Images in fixed-ratio boxes; CLS < 0.1.
- SR-22 Motion = 150 ms cross-fade only; none under `prefers-reduced-motion`.
- SR-23 Links prefetch chunk + data on ≥ 80 ms hover/focus.

**Honesty & states**
- SR-24 No fabricated numbers or lists.
- SR-25 Every list/grid has loading, empty and error states from shared components.
- SR-26 Every control has a handler.

**Parity, i18n, a11y, performance**
- SR-27 Every desktop element has its mobile counterpart (§5).
- SR-28 DE-first i18n, `t()` / `notify()` / `fmt*`.
- SR-29 WCAG 2.2 AA incl. keyboard path through stage and rail.
- SR-30 Performance budgets = existing `screen-journey.staging.spec.ts` budgets.

## 7. Enforcement (Phase 1c)

**ESLint plugin `design`** (`eslint-rules/design/*.js`, registered in `eslint.config.js` like `i18n`; files `src/pages/**`, `src/components/**`,
excluding `src/components/ui/**`; all `error`):

| Rule | Flags |
|---|---|
| `design/no-arbitrary-size` | `h-[…]`, `w-[…]`, `min-h-[…]`, `max-w-[…]` in `className` |
| `design/no-raw-palette` | `(bg|text|border|ring|from|via|to|fill|stroke)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+`, hex/rgb literals in `className`/`style` — never token classes |
| `design/no-physical-direction` | `ml-/mr-/pl-/pr-/left-/right-/text-left/text-right/rounded-l/rounded-r` |
| `design/no-page-spinner` | `Loader2` / `animate-spin` outside a `Button` in `src/pages/**` |
| `design/require-screen-frame` | page default export rendering `AppLayout` without `ScreenFrame` |
| `design/no-raw-content-card` | `@/components/ui/card` imported in `src/pages/**` outside workspace paths (`admin`, `backoffice`, `dev`, `professional`, `staff`) |

Escape hatch: `// design-allow-next-line: <reason>` (reason mandatory, else error). `npm run design:allowances` lists every use.
Each rule ships with RuleTester tests (valid + invalid fixtures).

**Ratchets**
- The existing `ratchet-eslint` absorbs legacy violations per file (regenerate `baseline/eslint.json` once in 1c; PR body states counts).
- New `ratchet-design` in `gate.mjs`/`lib.mjs`: counts only `design/*`, compares with `baseline/design.json` read via
  `git show <base>:scripts/ci/pr-gate/baseline/design.json`; any increase fails, even if the PR edited the baseline, unless the PR changes
  `eslint-rules/design/**`. Unit tests in `scripts/ci/pr-gate/__tests__/`. One step in `.github/workflows/PR-GATE.yml`.

**Manifest test** — `src/design/screen-manifest.test.ts` reuses `extractSpaRoutes`; every non-redirect, non-catch-all route has exactly one
manifest entry with a valid archetype, tier and status; no stale entries.

**Staging design-lint** — `tests/e2e/staging/design-contract.staging.spec.ts` (read-only, network guard, `?spotlight=1`): for each
`migrated` manifest entry at 1024/1440/1920 and once `dir=rtl`: chrome invariants (R2.1–2.2), SR-06 count via `data-vcard-size`, no
horizontal scroll, no stage gap > 48 px, CLS < 0.1, no `DelayedLoader` test id after first load. Phase PRs run it for their screens;
STAGING-VERIFY runs it for all migrated screens.

## 8. Flag plumbing (Phase 1a)
- `useTenantFeatureFlag(key)`: React Query read of `tenant_settings.feature_flags[key]` for the active tenant (generalises
  `useEventGameFeatureFlag`), cached, defaults `false`.
- `useSpotlightEnabled()`: `!isMobile && (override ?? tenantFlag)`; override from `?spotlight=1|0` → localStorage `vitana.spotlight`
  (try/catch), explicit override wins in both directions.
- Add `desktop_spotlight` to `KNOWN_FLAGS`.

## 9. Navigation feel (Phase 1b, not flag-gated)
1. Prototype first: Vitest with MemoryRouter + `future={{ v7_startTransition: true }}` + a deferred `lazy()` page proves the old page stays
   mounted and `RouteFallback` is not rendered while the chunk loads. If it fails → stop; fallback design (`PendingOutlet` outside
   `App.tsx`) goes back to sparring.
2. Add `future={{ v7_startTransition: true }}` to `<BrowserRouter>` (`App.tsx:764`) — the only `App.tsx` edit in the whole plan.
3. `useNavigationPending` + `NavProgressBar`, rendered **from inside `src/components/RouteTransitionOverlay.tsx`** (already mounted in
   `App.tsx` next to `AppHooksInitializer`), so `App.tsx` keeps its single-prop change.
4. Intent prefetch via **one document-level delegated listener** (`pointerover` / `focusin` on `a[href]`, ≥ 80 ms dwell, once per href),
   also started from `RouteTransitionOverlay.tsx`; it maps the href to a route chunk (extends `preloadHotChunks.ts`) and a data prefetch
   (`prefetch-registry.ts`). This covers sidebar links and VCard links without touching `AppLayout.tsx` (which stays unmodified).
   Decision taken inside the approved plan (listed under "Decisions taken" at Gate 2).
5. Must keep `tests/loading-no-flash.cjs`, keep-alive tests and `screen-journey.staging.spec.ts` green; verify on staging desktop + Pixel journey.
