# Plan: Desktop sidebar redesign (header, quick-access row, nav grouping, dock footer) — revision 2

Change class: **standard**
Repos: `exafyltd/vitana-v1` (implementation), `exafyltd/vitana-platform` (rule amendment only)
Mock-up (visual reference only, not the spec): https://claude.ai/artifact/Dg7298yjKVF54nECMM6zTa

Owner decisions already taken (not re-argued):
- Wordmark: "Vitanaland" (one word, matches the domain), with the tenant line "Maxina community" underneath.
- Quick-access row (Vitana Index, calendar, notifications, wallet, Autopilot, cart) stays in the header, under the wordmark.
- Nav grouping into three quiet section labels is accepted. The group membership is in Open Decisions below.

<!-- plan:begin -->
## Scope and intent
Restructure the desktop sidebar chrome in `AppLayout.tsx` so that, for the **community role only**:
1. The header shows the wordmark "Vitanaland" (replacing the hard-coded `"VITANA"` at `AppLayout.tsx:181`), the tenant
   subtitle from `getTenantDisplayName()` (unchanged source, `AppLayout.tsx:185`), and the existing quick-access row
   (Vitana Index chip, calendar, notification bell, wallet, Autopilot, cart) as one row, with existing badges and handlers.
2. Vertical spacing in the header block (tenant line → quick-access row → search bar → first section label) is one
   spacing token, `gap-2.5` (10px), applied with Tailwind classes, not pixel values.
3. The community nav list (`communityNavigation`, `src/config/role-navigation.ts:25-40`, 14 items) is rendered under
   three quiet section labels: Start, Connect, Grow. Each item appears in exactly one group. Route targets, labels,
   icons and translation keys of existing items are unchanged.
4. Section labels: 9px, uppercase, 50% opacity, `aria-hidden` decorative text plus a `role="presentation"` wrapper,
   not links, no hover or click behaviour. Label text comes from `t()` (new keys in `de` first, mirrored to `en`).
5. The footer becomes one dock card for **all roles** (profile name and role, sound on/off chip, language chip). The footer is a single shared block (`AppLayout.tsx:342-394`), so the dock applies to every role; only the nav list differs by role. The profile role label
   replaces its hard-coded English strings (`AppLayout.tsx:358-364`) with `t()` keys.
6. **ORB clearance is kept.** The `h-28` / `h-16` spacer at `AppLayout.tsx:391` is replaced by a spacer whose height is
   a pair of named constants, one expanded and one collapsed (matching the existing `open ? "h-28" : "h-16"` split, since the ORB moves between states: `index.css:732` and `:749`), each matched to the ORB footprint (measured on staging, not guessed). The ORB stays `position: fixed`
   (`src/index.css:721-750`); the dock sits above the reserved clearance and never under the ORB. The mock-up's
   orb placement is illustrative only.
7. `SoundscapeControl` toast strings (`SoundscapeControl.tsx:21`) move to `notify()` / `notifyError()` from
   `@/lib/i18n-toast` in the same change.

## Non-community roles
Admin, backoffice, patient, professional and staff navigation (`getEffectiveNavigation()`, `AppLayout.tsx:100-115`)
keep the current flat list, unchanged. Section labels render only when the active navigation is `communityNavigation`.
The footer dock applies to all roles, because the footer is one shared block; role labels and toast fixes also apply to
all roles. Listed in Open Decisions for the owner.

## Rule change (vitana-platform)
`CLAUDE.md` ALWAYS 31 currently says "exactly 10 items in their fixed order, Start Stream in the sidebar utility zone".
Verified against code (round 1): the community sidebar has 14 items and no Start Stream entry exists in the sidebar code.
The amendment therefore has two parts:
- (a) correct the baseline to what the code is today: the community sidebar item set, routes and order are fixed by
  `communityNavigation`; the item count is 14, not 10;
- (b) permit grouping of those items into labelled sections under this plan's VTID, with the item set, routes and
  Start Stream placement otherwise fixed.
The Start Stream absence is **not** resolved by this plan; it is an Open Decision (below).

## Files in scope
- `vitana-v1/src/components/AppLayout.tsx` — header (~170–293), nav (~294–341), footer (~342–394), spacer (391)
- `vitana-v1/src/config/role-navigation.ts` — read-only for this plan; the group map is a separate constant next to it
  (no change to `communityNavigation` entries)
- `vitana-v1/src/components/language/LanguageSidebarControl.tsx` — expanded row restyled to a dock chip (collapsed unchanged)
- `vitana-v1/src/components/audio/SoundscapeControl.tsx` — restyled to a dock chip; toast strings moved to `notify()` (line 21)
- `vitana-v1/src/components/AppLayout.colours.test.ts` — assertions on avatar fallback classes (lines 26-29) and
  `text-sidebar-foreground` count (36-38) updated to the new footer
- i18n shards `src/i18n/de/**` then `en/**` (new section-label keys and the role-label keys)
- New test: `vitana-v1/src/components/AppLayout.sidebar-groups.test.ts` (see Test plan)
- `vitana-platform/CLAUDE.md` — ALWAYS 31 amendment only (separate PR)

Out of scope: screens (`src/pages/**`), the ORB component and its CSS, the mobile drawer (`SideDrawerNav.tsx`),
`screen-manifest.json`, `screens.json`, `exclusions.json`, nav registry routes, `sidebar.tsx` primitives, auth, RLS.
No new routes. Section labels are never added to `screens.json` (they are not screens).

## Behaviour that must not change
- Collapsed sidebar: icon-only mode works; language and sound show icon-only; avatar stays.
- Quick-access row shown only when open and not on `/admin` or `/backoffice` (`AppLayout.tsx:214`).
- Badge data sources (calendar count, Autopilot pending, cart count) unchanged.
- Non-community roles: flat list unchanged; the footer dock applies to all roles.

## Test plan
1. Unit `AppLayout.sidebar-groups.test.ts`: for community, every `communityNavigation` item appears exactly once across
   the three groups; for each non-community role the rendered output has no section labels; route paths before/after
   are identical (snapshot).
2. Unit: wordmark text is "Vitanaland"; tenant subtitle still renders from `getTenantDisplayName()`.
3. Unit: spacing classes in the header block are `gap-2.5` (no arbitrary `[...]` sizes; design ESLint rules pass).
4. i18n: new keys exist in `de` and `en`; `i18n/no-raw-jsx-text` and `i18n/no-raw-toast-arg` lint pass.
5. Playwright on the **staging preview only** (read-only; network guard aborts non-GET except sign-in): desktop
   1400×900 and mobile 390×844; measure tenant→row, row→search, search→first label gaps equal within 1px; measure
   the ORB box does not intersect the dock; screenshot header, nav and footer for review; collapsed screenshot.
6. `npm test` and `npm run lint` pass; design ratchet and nav-registry tests do not regress.
7. Visual review of the screenshots before reporting done.

## Risks
- Grouping labels could be mistaken for navigation targets; they stay non-interactive and outside the registry.
- The ORB clearance constant depends on the staging measurement; if the measured ORB box changes, the constant changes
  with it, in the same PR.
- The rule amendment changes a standing platform rule; owner approval at Gate 1 is required.
<!-- plan:end -->

## Planner responses (round 1)

- **F1 [blocker] ORB overlap on spacer removal — ACCEPTED.** The plan no longer removes the clearance. Option (a) from
  the finding: a named-constant spacer matched to the measured ORB footprint. The mock-up's orb position is illustrative.
- **F2 [major] Non-community roles unaddressed — ACCEPTED.** Section labels render only for `communityNavigation`;
  other roles keep the flat list and current footer. (Default choice; owner decision listed below.)
- **F3 [major] ALWAYS 31 anchored on stale text — ACCEPTED.** The amendment corrects the baseline first (14 items),
  then permits grouping. The Start Stream discrepancy is an open owner question, not silently dropped.
- **F4 [major] No group mapping — ACCEPTED, proposal below.** Owner must confirm at Gate 1.
- **F5 [minor] Hard-coded role labels in the footer — ACCEPTED.** Moved to `t()` keys in the footer restyle.
- **F6 [minor] Raw toast in `SoundscapeControl` — ACCEPTED.** Moved to `notify()` in the same change.
- **F7 [minor] Pixel spacing vs. design contract — ACCEPTED.** Spacing is `gap-2.5`.
- **F8 [minor] `AppLayout.colours.test.ts` assertions — ACCEPTED.** Added to scope.

## Open decisions (for the owner at Gate 1)
1. **Group membership (proposal):**
   - Start: News, My Journey, Inbox
   - Connect: Community, Discover, Sharing, Connectors
   - Grow: Health, Memory, AI Assistant, Wallet, Business Hub
   - Settings and Support: at the bottom of Grow (proposal; or a fourth quiet group — owner's call)
2. **Start Stream:** the platform rule names it in the sidebar utility zone, but no Start Stream entry exists in the
   sidebar code. Is it to be added, or is the rule text to be removed? This plan does not add it.
3. **Non-community roles:** flat nav list, unchanged; footer dock for all roles (proposed) — confirm.

## Gate 1 approval (owner)

Approved by the owner in conversation, desktop only, with these decisions: Settings and Support in a fourth quiet group named Account; Start Stream removed from the platform rule; footer dock identical for all roles. Plan hash (sha256 of the plan:begin..plan:end body): f81a6bddf05cb300e82cc7d267e155fb4afebc31b70af5aeff35dd36954def37
