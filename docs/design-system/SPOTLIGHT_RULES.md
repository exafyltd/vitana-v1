# Spotlight Design Contract (VTID-05107)

The design rules for **every Vitanaland screen**: all 345 screen routes, the "550+ screens" of the older registry. They were
approved by the owner on 2026-10-12 and sparred as part of `docs/plans/desktop-spotlight/plan.md` (§2.7).
`docs/UNIVERSAL_SCREEN_PATTERN.md` was v1 of this contract; this document is v2.

**The idea:** one dominant thing on the screen, calm context beside it, and the same Vitanaland navigation everywhere,
on desktop and phone.

**Changing this contract** means adding an archetype, a card size, a token, or changing a rule or ESLint rule. That is a
plan change: spar it, get the owner's approval, then update this file, `eslint-rules/design/**`, the manifest schema and
the baselines in the same PR.

Mockups: `docs/plans/desktop-spotlight/mockups/` (06 navigation anatomy, 07 VCard, 09 mobile↔desktop, 10 archetypes).

---

## A. Every screen has exactly one archetype

`src/design/screen-manifest.json` lists every non-redirect route in `src/App.tsx` with its `archetype`, `tier`,
`status` (`legacy` | `migrated`) and owning `phase`. `src/design/screen-manifest.test.ts` fails when a route is
missing, stale or invalid. **Adding a page means adding it here**: run `npm run design:manifest`, then review the
archetype it guessed.

| Archetype | Layout (desktop, Spotlight on) | Dominant element | Typical screens |
|---|---|---|---|
| `focus-feed` | stage + rail | the focused `spotlight` card | News, Media Hub, Live Rooms |
| `storefront` | `wide` | hero `spotlight` | Discover overview, Business Hub, Deals |
| `detail` | stage + rail | the item itself (`spotlight`) | post, article, product, event, provider, public profile |
| `collection` | `wide`, `standard` grid or `row` list | first row / result | Groups, Members, category lists, Orders |
| `dashboard` | stage + rail | one hero KPI `spotlight`, then `standard` tiles | Health, Wallet, My Journey, Vitana Index |
| `conversation` | list column + thread stage (+ optional rail) | the open thread | Inbox, Messages, AI Assistant |
| `form` | single `form` column, no rail | the form | Settings, Edit profile, onboarding, auth, legal |
| `workspace` | `full`, dense, rail optional | the primary table or panel | Admin (keeps `AdminTabs`), Backoffice, Dev, Professional, Staff |
| `immersive` | full-bleed; in-screen chrome hidden; sidebar and ORB stay | the media | `/shop`, live session, fullscreen media |

Building blocks (Phase 1a, VTID-05105):
- `ScreenFrame` and `SpotlightLayout`: `src/components/layout/spotlight/`
- `VCard`: `src/components/ui/vcard/`
- Feature switch: `useSpotlightEnabled()`, driven by tenant flag `desktop_spotlight` and the `?spotlight=1|0|clear`
  preview override

## B. Rules (MUST)

### Chrome
- **SR-01** The sidebar elements are never hidden, moved or overlaid: shortcut bar (Vitana Index · Calendar · Alerts ·
  Wallet · Autopilot · Cart), global search, the 14 nav items, profile + role switcher, Soundscape, Language and the ORB.
- **SR-02** In-screen chrome comes in this order:
  1. `SubNavigation`, only on screens that have sections;
  2. `StandardHeader`;
  3. the `UtilityActionButton` row, with the `SplitBar` tabs at the inline end of that row.
- **SR-03** Pages compose their chrome only through `<ScreenFrame archetype="…">`. No page builds its own header, tab bar or
  toolbar.
- **SR-04** Only `immersive` hides in-screen chrome. Nothing ever hides the sidebar or the ORB.
- **SR-05** Admin screens keep `AdminTabs` as their section tabs (`docs/plans/admin-shell.md`).

### Dominance
- **SR-06** `focus-feed`, `storefront`, `detail` and `dashboard` screens show exactly one `spotlight` VCard in the first
  viewport.
- **SR-07** Nothing else on the screen uses the `spotlight` size.
- **SR-08** Rails hold only `compact` and `row` cards.

### Cards
- **SR-09** Content items render only through `VCard`. The raw shadcn `Card` is for operator panels, not member content.
- **SR-10** Media ratios are fixed:

  | VCard size | Media ratio |
  |---|---|
  | `spotlight` | 16:9 or 4:5 |
  | `standard` | 4:3 |
  | `compact` | 1:1, 64 px |
  | `row` | 1:1, 48 px |

- **SR-11** A grid row never mixes card sizes.
- **SR-12** Cards have no fixed pixel heights, and a card never sits inside another card.
- **SR-13** Grid and bento rows render only full rows, never empty slots.

### Layout and tokens
- **SR-14** Content widths come only from the tokens `stage` (680–760 px), `wide` (stage + gap + rail), `form` (680 px)
  and `full`. In Tailwind: `max-w-stage`, `max-w-wide`, `max-w-form`.
- **SR-15** Spacing comes from the 4 px scale.
- **SR-16** Type sizes are 12, 13, 14, 17, 20 and 24 px. 28 px is only for a storefront or dashboard hero title.
- **SR-17** Colours, radii and elevation come only from tokens in `src/index.css`. No raw Tailwind palette classes and no
  hex/rgb/hsl literals in pages or components.
- **SR-18** Semantic colour roles (light and dark):
  - the shadcn set: `primary`, `secondary`, `muted`, `accent`, `destructive`, `foreground`, `border`, `card`;
  - `pill.*` and `sys.*`;
  - `status.{success,warning,error,info}`, each with a `-subtle` background;
  - `severity.{low,medium,high,critical}`;
  - `category.1` … `category.8`;
  - `surface.{page,raised,sunken}` and `surface.page-from / -via / -to`.
- **SR-19** Use logical properties only (`ms-/me-`, `ps-/pe-`, `start-/end-`, `text-start/end`, `rounded-s/e`,
  `border-s/e`) so every screen mirrors in Arabic (RTL).

### Loading and motion
- **SR-20** After the first load there is no page-level spinner and no blank panel. Show `ArchetypeSkeleton` or
  `VCardSkeleton`.
- **SR-21** Images sit in fixed-ratio boxes, and layout shift (CLS) stays below 0.1.
- **SR-22** The only motion is a 150 ms cross-fade, and none at all under `prefers-reduced-motion`.
- **SR-23** Links prefetch their route chunk and data after ≥ 80 ms of hover or focus (Phase 1b).

### Honesty and states
- **SR-24** No fabricated numbers or lists.
- **SR-25** Every list or grid has loading, empty and error states built from shared components.
- **SR-26** Every control has a handler. No dead buttons or filters.

### Parity, i18n, accessibility, performance
- **SR-27** Every desktop element has its mobile counterpart (§D).
- **SR-28** i18n is German first. All text goes through `t()` / `notify()`, and dates and numbers through the `fmt*`
  helpers.
- **SR-29** WCAG 2.2 AA, including a keyboard path through the stage and the rail.
- **SR-30** Performance budgets are those of `tests/e2e/staging/screen-journey.staging.spec.ts`.

## C. Enforcement

### ESLint plugin `design`
The rules live in `eslint-rules/design/*.js`, are registered in `eslint.config.js`, and all run at **error** level on
`src/pages/**` and `src/components/**`. `src/components/ui/**` primitives and tests are exempt.

| Rule | Flags | Contract |
|---|---|---|
| `design/no-arbitrary-size` | `h-[…]`, `w-[…]`, `min-h-[…]`, `max-w-[…]`, `size-[…]` | SR-12, SR-14 |
| `design/no-raw-palette` | Tailwind palette scales (`text-green-600`, `from-purple-50`), `bg-white`/`text-black`, `bg-[#…]`, hex/rgb/hsl literals in `style` | SR-17 |
| `design/no-physical-direction` | `ml-/mr-/pl-/pr-/left-/right-`, `text-left/right`, `rounded-l/r`, `border-l/r` | SR-19 |
| `design/no-page-spinner` | `Loader2` or `animate-spin` in `src/pages/**` outside a button | SR-20 |
| `design/require-screen-frame` | a page that renders `AppLayout` without `ScreenFrame` | SR-03 |
| `design/no-raw-content-card` | `@/components/ui/card` imported by a member page | SR-09 |

**Escape hatch.** Put `// design-allow-next-line: <reason>` (or `{/* … */}` in JSX) on the line directly above the
offending code. The reason is mandatory; a bare allow is itself an error. `npm run design:allowances` lists every one.

**Ratchets.** All violations that existed when the rules arrived (6,345 in 861 files) are carried as per-file counts.
These counts may only go down:
- `scripts/ci/pr-gate/baseline/eslint.json` is the existing ESLint ratchet.
- `scripts/ci/pr-gate/baseline/design.json` is read by PR-GATE's **Design ratchet** step (`gate.mjs ratchet-design`).
  It compares against the copy of `design.json` on the **base commit**, so a PR cannot raise its own baseline. The only
  exception is a PR that changes `eslint-rules/design/**`, which is a contract change; such a PR must commit a baseline
  that equals the current counts exactly, so it cannot carry stale or inflated slack forward.

So **every new file must be clean**, and every migration PR lowers the baselines with
`node scripts/ci/pr-gate/gate.mjs baseline-design <eslint-json>` and `… baseline-eslint <eslint-json>`.

### Manifest test
`src/design/screen-manifest.test.ts` runs in `npm test` (§A).

### Staging design-lint
`tests/e2e/staging/design-contract.staging.spec.ts` is read-only. For every manifest entry with `status: "migrated"`, at
1024, 1440 and 1920 px and once with `dir="rtl"`, it checks:
- the sidebar chrome is present;
- exactly one `[data-vcard-size="spotlight"]` for the four dominant archetypes;
- no horizontal scroll;
- no `DelayedLoader` after the first load.

Role-gated operator routes (`/admin`, `/backoffice`, `/dev`, `/professional`, `/staff`) are left out of this loop: the
community test account cannot open them. Each operator phase ships its own staging spec that checks the screen for an
account with the role and the gate for one without it (VTID-05113 for admin).
Public, auth, legal and commerce-portal screens that render without the app shell (`NO_SHELL` in the spec: `/`,
`/maxina`, `/privacy`, `/logout`, `/oauth/*`, `/universal-cart`, `/shop`, `/commerce/*`, …) and member screens behind a
role the test account lacks (`ROLE_GATED`: the `/patient/*` screens with `requiredRole="patient"`, `/partner/connections`)
are left out as well. `vtid-05117-public-leftovers.staging.spec.ts` checks the no-shell screens (signed out, or signed in
without the sidebar check for the commerce shell and the cart); the VTID-05117 Vitest suites cover the auth hand-off and
role-gated screens.

`ScreenFrame` exposes `data-archetype` and `VCard` exposes `data-vcard-size`, so these checks read structure, not pixels.

## D. Desktop ↔ phone mapping

| Desktop | Phone |
|---|---|
| ORB at the bottom centre of the sidebar | ORB in the centre of the bottom nav |
| Language row (sidebar footer) | Language row (side drawer footer) |
| Soundscape row (sidebar footer) | Soundscape mute in the top app bar |
| User + role switcher (ProfileDrawer) | Avatar + role pill (side drawer header) |
| Global search (sidebar header) | Search in the drawer shortcut strip and the utility bar |
| Shortcut bar: Index · Calendar · Alerts · Wallet · Autopilot · Cart | Drawer shortcut strip + Index/Autopilot chips |
| SubNavigation tabs | Side drawer / section entry points |
| Header bar (compact StandardHeader) | Header title (mobile StandardHeader) |
| Utility bar | Utility bar (compact) |
| SplitBar at the end of the utility bar | MobileModePill in the utility bar |
| Spotlight stage, one dominant card | One card fills the view |
| Context rail | Below-the-card sections or sheets |

## E. Palette → token mapping (for migration PRs)

| Today (raw palette) | Use |
|---|---|
| `text-green-600`, `text-emerald-600` (success) | `text-status-success` |
| `bg-green-50`, `bg-emerald-50` | `bg-status-success-subtle` |
| `text-amber-600`, `text-yellow-600`, `text-orange-500` (warning) | `text-status-warning` |
| `bg-amber-50`, `bg-yellow-50` | `bg-status-warning-subtle` |
| `text-red-500/600`, `text-rose-600` (error) | `text-status-error` or `text-destructive` |
| `bg-red-50` | `bg-status-error-subtle` |
| `text-blue-600`, `text-sky-600` (info, links) | `text-status-info` or `text-primary` |
| `bg-blue-50` | `bg-status-info-subtle` |
| `text-gray-500`, `text-slate-500`, `text-zinc-500` | `text-muted-foreground` |
| `bg-gray-100`, `bg-slate-100` | `bg-muted` or `bg-surface-sunken` |
| `bg-white` (cards, panels) | `bg-card` or `bg-surface-raised` |
| `border-gray-200` | `border-border` (or plain `border`) |
| `from-purple-50 via-blue-50 to-pink-50` (page gradient) | `from-surface-page-from via-surface-page-via to-surface-page-to` |
| chart / category colours (`purple-500`, `pink-500`, …) | `category-1` … `category-8` |
| severity badges (low / medium / high / critical) | `severity-low` … `severity-critical` |
| `from-green-400/30 to-blue-500/30` (Vitana Index ring) | `from-status-success/30 to-status-info/30` |

## F. Checklist for a new or migrated screen
1. The route has a manifest entry with the right archetype (`npm run design:manifest`).
2. The page renders `<ScreenFrame archetype="…">`, with the screen's chrome passed as props.
3. Content renders through `VCard`, with one `spotlight` card for the four dominant archetypes.
4. Loading shows the archetype skeleton, and empty and error states exist.
5. `npx eslint <files>` shows no `design/*` errors, and the baselines are lowered.
6. The status is flipped to `migrated` in the manifest, so staging design-lint covers it.
7. Screenshots at 1440×900 (Spotlight on and off), RTL and 390×844 (unchanged).
