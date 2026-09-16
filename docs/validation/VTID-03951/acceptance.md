# VTID-03951 — Commerce Partner Onboarding, Phase 4: real professional-facing health-test-orders view

VTID: VTID-03951
Backend: none new. Reuses `exafyltd/vitana-platform#3331`'s (VTID-03932) already-generalized
`/api/v1/admin/partner-health/*` routes and `GET /api/v1/partner-orgs/mine` as-is. Confirmed by
reading `org-access.ts`/`admin-partner-health.ts`/`partner-orgs.ts` in full before writing any
frontend code — this is a frontend-only phase.

## What shipped

The `/professional/*` route tree is gated by the Vitana-wide `dbRole`, an axis independent of
`partner_organization_members` membership (Phase 1's own role enum), which is what actually gates
every route this phase needed. A partner org's own `professional`/`staff`/`org_admin` member may
never have Vitana `dbRole==='professional'` set — mounting real order data under `/professional/*`
would have made it unreachable for exactly the users it's for. Followed Phase 2's own precedent
instead: this lives in Commerce Portal, gated the same way `PartnerOrgRoster.tsx` already is
(client-side via `GET /partner-orgs/mine`, enforced server-side per-route).

| Piece | File | Notes |
|---|---|---|
| Orders/inbox data hook | `src/hooks/usePartnerHealthOrders.ts` (new) | React Query + `adminFetch` (matches `usePatientHealthResults.ts`'s convention, not the admin `PartnerHealthOrders.tsx` page's older inline-`fetch` style); typed `PartnerHealthOrder`/`PartnerHealthInboxRow`, no `any` |
| "Am I a member, what role" hook | `src/hooks/useOrgMembers.ts` | Added `useMyPartnerOrgs()`, same shape as its siblings; imports `MyOrgRow` from `MyOrgCard.tsx` rather than redefining it |
| Real screen | `src/pages/CommerceHealthOrders.tsx` (new) | Orders table + role-aware Inbox tab (full-access only) + upload-result/confirm-match dialogs, restyled to Commerce Portal's slate/amber palette |
| Route | `src/App.tsx` | `/commerce/health-orders`, `AuthGuard` only — no `ProtectedRoute`/`requiredRole`, matching every other `/commerce/*` route |
| Portal entry point | `src/pages/CommercePortal.tsx` | One new card inside "YOUR ORGANIZATIONS", shown once `myOrgs.length > 0`, linking to the new route |
| `/professional/patients` disposition | `src/pages/professional/Patients.tsx` | Replaced the fully-hardcoded mock (3 fake patients, no state, no working buttons) with `ComingSoonPlaceholder` — a full patient roster (appointments, conditions, care plans) has no backing data source at all, a materially larger thing than "my assigned orders" |

**Deliberate deviation from the written plan, found while implementing:** the plan called for a new
`toasts.commerceportal.*` namespace mirroring the admin page's `toasts.admin.*`/`screens.admin.*`
strings. Checked first — every single one of those 24 strings (labels, help text, success/error
toasts) already exists verbatim in the catalog under `screens.admin.*`/`toasts.admin.*`, already
correctly translated in DE. Reused them directly instead of duplicating 24 keys with identical
meaning; only 5 genuinely new keys were added (`screens.commerceportal.healthOrders.{sectionTitle,
sectionSubtitle,pageTitle,notAMemberTitle,notAMemberBody}` — the new page-level chrome that has no
existing equivalent).

## Deliberately out of scope, and why

- **Assigning a professional to an order.** Grepped the whole platform repo: no route anywhere
  writes `assigned_professional_user_id` — nothing lets staff pick who fulfills a given order. A
  real, named backend gap, not silently built around or guessed at here.
- `professional/Dashboard.tsx`'s mock stats — separate, no backing data source, not this phase.
- A cross-link from `/professional/patients` to Commerce Portal — the two populations
  (`dbRole==='professional'` users vs. `partner_organization_members` rows) are mostly disjoint;
  not worth a network round-trip on a screen most visitors of which aren't org members.
- Refactoring the admin `PartnerHealthOrders.tsx` into a shared component with the new screen —
  different visual system, different assumed access level (always-full for the admin audience);
  the one worthwhile follow-on (export the two row types from the new hook for the admin page to
  import instead of its local duplicates) is a drive-by, not required for correctness, not done here.

## Acceptance criteria

AC-1 — A partner org's staff/professional member sees real orders, not a mock, scoped correctly by
the backend's own `resolveOrgHealthAccess()`.
TEST: `usePartnerHealthOrders()` calls `GET /api/v1/admin/partner-health/orders` via `adminFetch`;
`CommerceHealthOrders.tsx` renders `PartnerHealthOrder[]` through a real table. Backend scoping
(staff full-org, professional assigned-only) verified by reading `org-access.ts`/
`test/admin-partner-health.test.ts` directly, not re-implemented client-side as a security boundary
— the client-side `canActOn()` mirror is a UX nicety only.

AC-2 — A `professional`-only member never sees the "Inbox" tab or an unreachable upload/status
control on a row that isn't theirs (those routes 403 for them server-side).
TEST: `CommerceHealthOrders.tsx` — `{hasFullAccess && <TabsTrigger value="inbox">...}` and, per
order row, the status `<Select>`/"Upload Result" button both gated on
`canActOn(o) = hasFullAccess || o.assigned_professional_user_id === user?.id`; `usePartnerHealthInbox(enabled)`
is only ever invoked with `enabled = isMember && hasFullAccess`, so the inbox GET is never even
attempted for an assigned-only professional.

AC-3 — A user with no `partner_organization_members` row at all sees an honest "not a member" state,
never a table pretending to have real rows.
TEST: `CommerceHealthOrders.tsx` — `!isMember` branch renders the dashed-border empty-state card
before `usePartnerHealthOrders()`'s data is ever rendered.

AC-4 — `/professional/patients` no longer fabricates patient data.
TEST: `Patients.tsx` now renders only `ComingSoonPlaceholder`; `git diff` shows the three hardcoded
fake-patient `<Card>` blocks and their non-functional buttons removed entirely.

AC-5 — The new route is reachable by any signed-in user regardless of Vitana `dbRole`, matching the
real (org-membership-based) authorization model.
TEST: `App.tsx` — `<Route path="/commerce/health-orders" element={<AuthGuard><CommerceHealthOrders /></AuthGuard>} />`,
no `ProtectedRoute`/`requiredRole`; matches every sibling `/commerce/*` route's own gating.

AC-6 — Every new user-visible string is i18n'd, DE-first then EN, and no dead/duplicate keys were
introduced for strings that already existed.
TEST: `node scripts/generate-screen-inventory.mjs` reports `CommerceHealthOrders.tsx` and
`professional/Patients.tsx` both `✅ clean` (0 raw-string suspects); `node
scripts/i18n-stamp-source.mjs --check-all` reports 0 drift across all locales after stamping the
new EN keys against DE.

## Verification

**This sandbox cannot run `npm install`/build/vitest** (confirmed again this session: `npm ci`/`npm
install` return `403 Forbidden` from the registry, no `node_modules` present) — flagged plainly
rather than promising a screenshot that can't happen here.

- Ran: a narrow `tsc --noEmit` pass (standalone `/opt/node22/bin/tsc` via a scratch tsconfig
  mirroring `tsconfig.app.json`'s compiler options) over every new/changed file. Zero errors
  attributable to this change — the only errors reported are the same "Cannot find module
  'react'/'lucide-react'/'react-router-dom'/'@tanstack/react-query'" and "`BadgeProps` has no
  `children`" noise that appears identically across dozens of untouched pre-existing files in this
  same run (confirmed by checking the full unfiltered output), a known artifact of missing
  `node_modules`/component type stubs, not a real defect in this diff. `CommercePortal.tsx`'s two
  reported `TS2322`s are on pre-existing `ConnectionWorkbench`/`PartnerOrgRoster` render lines this
  diff didn't touch (shifted down by the new insertion), same root cause.
- Ran: `node scripts/generate-screen-inventory.mjs` — 347 pages (+1), both changed pages report
  clean; regenerated `docs/SCREEN_INVENTORY.md` committed.
- Ran: `node scripts/i18n-stamp-source.mjs --locale=en` then `--check-all` — 0 drift across all 10
  tracked locales.
- Manually traced: `App.tsx`'s new route against `AuthGuard.tsx` to confirm no `ProtectedRoute`
  leaks in; every new `t('screens.commerceportal.healthOrders.*')` call against both `de` and `en`
  `screens.json` to confirm the key exists in both; every reused `t('screens.admin.*')`/
  `t('toasts.admin.*')` call against the existing catalog to confirm it already existed verbatim
  (not assumed from the admin page's source alone).
- **Not done, no dedicated Vitest suite added.** Unlike Phase 3's `useSmartRouting.mobile.test.ts`
  (which pinned a real, subtle `currentRole`-vs-`dbRole` logic bug), this phase's new logic is a
  single straightforward boolean predicate (`canActOn`) with no comparable hidden-bug shape to pin,
  and this session cannot execute `vitest` regardless — noted explicitly rather than silently
  skipped.
- **Cannot verify in this sandbox at all:** a real signed-in session against a seeded
  `partner_organization_members` row exercising the assigned-only vs. full-access UI split live.
  Flagging this to the user as needing a real staging pass (with a seeded `professional`-role org
  member and a `staff`/`org_admin`-role org member) before this ships to production.
