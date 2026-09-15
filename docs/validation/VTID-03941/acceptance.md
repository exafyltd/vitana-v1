# VTID-03941 — Commerce Partner Onboarding, Phase 3: real patient results screen + mobile role fix

VTID: VTID-03941
Backend: `exafyltd/vitana-platform#3331` (VTID-03939) — `GET /api/v1/patient/health-results`. Not yet merged; degrades
gracefully until VTID-03932's migration is applied (see that PR's own evidence pack).

## What shipped

Corrects two false premises the original 5-phase plan carried (see `docs/patient-phase3` planning notes / the plan
file this session worked from): the "already-working" `/health/my-biology` page actually references columns that
don't exist on the real `lab_reports` schema, and the mobile role-force override turned out to be narrower than
assumed — `ProtectedRoute`'s own `hasPermission()` already reads the unforced role, so route access was never
mobile-blind; what *was* mobile-blind is `useSmartRouting`'s dormant redirect logic and three messaging-context hooks.

| Piece | File | Notes |
|---|---|---|
| Real results screen | `src/pages/patient/Results.tsx` (new), replaces the inline `/patient/results` placeholder in `App.tsx` | `HorizontalCardList`/`StandardHorizontalCardProps`, same pattern as `MyBiology.tsx` but with a properly typed response |
| Hook | `src/hooks/usePatientHealthResults.ts` (new) | React Query + `adminFetch`, typed `PatientHealthResult[]` (not `any[]`) |
| Dashboard tile | `src/pages/patient/Dashboard.tsx` | "Recent Results" card, reuses the same hook, links to `/patient/results` |
| Explicit placeholders | `src/components/patient/ComingSoonPlaceholder.tsx` (new) | Replaces the bare `<h1>` inline placeholders for `/patient/{appointments,care-team,goals,insurance,notifications}` — no backend table exists for any of these; an honest "not available yet" state, not fabricated data |
| Mobile role fix (routing) | `src/hooks/useSmartRouting.tsx` | `useSmartRouting()`, `useRoleRouteEnforcement()`, **and `useRoleBasedRedirect()`** (a third instance of the same `currentRole`-reading pattern in the same file, found while implementing — used by the per-tenant post-email-confirmation landing pages, equally reachable on mobile) all switched from `currentRole` to `dbRole` |
| Mobile role fix (messaging) | `useHybridMessages.ts`, `useGlobalMessages.ts`, `useTenantMessages.ts` | Same `currentRole` → `dbRole` swap in their global-vs-tenant context checks — shipped together with the routing fix per the user's explicit confirmation (both are the same root cause; fixing only routing would leave mobile messaging inconsistent with the real role) |

**`ProtectedRoute`/`hasPermission()` deliberately NOT touched** — confirmed not mobile-blind before starting (it reads
`query.data` directly, never the mobile-forced `effectiveRole`), so there was nothing there to fix.

## Deliberately out of scope, and why

- Appointments/care-team/insurance/goals **data** — no backend table exists for any of these; building fake data
  would violate this codebase's own "never hallucinate data" rule. The explicit placeholder says so.
- `/patient/health` (vitals) — different data domain (wearables), no confirmed live data producer, not part of
  "aggregation across every partner org/professional" this phase is about.
- `MyBiology.tsx`'s own column-name bug — real, but a separate fix from building this new screen; not silently
  folded into this diff.
- Full org/professional attribution — degrades gracefully in the backend route until VTID-03932's migration lands;
  no frontend change needed when it does (the hook's response type already carries the fields as nullable).

## Acceptance criteria

AC-1 — `/patient/results` shows real data from the gateway, not a mock or bare placeholder.
TEST: `src/hooks/usePatientHealthResults.ts` calls `GET /api/v1/patient/health-results` via `adminFetch`;
`Results.tsx` renders `PatientHealthResult[]` through `HorizontalCardList`. Not independently runnable this session
(see Verification) — traced by hand against the real backend response shape (`docs/validation/VTID-03939/acceptance.md`
in the platform repo).

AC-2 — A report's card shows org attribution when available, and a neutral "self-reported" label when not (never
`undefined`, the exact bug `MyBiology.tsx` has today).
TEST: `Results.tsx`'s `orgLabel()` — `result.org.self_registered_name ?? result.org.display_name ??
t('screens.patient.results.selfReported')`, handling `org: null` explicitly rather than optional-chaining into
`undefined`.

AC-3 — The five data-less `/patient/*` routes show an honest "not available yet" state, not fabricated content and
not a bare title.
TEST: `App.tsx` routes for `appointments`/`care-team`/`goals`/`insurance`/`notifications` all render
`ComingSoonPlaceholder`; manual review — no hardcoded card/data content anywhere in that component.

AC-4 — `ProtectedRoute`'s `requiredRole="patient"` gate is unchanged; only the *redirect/context* hooks change.
TEST: `git diff` of this VTID's changes contains no edits to `ProtectedRoute.tsx`/`useRole.tsx`'s `hasPermission`.

AC-5 — A mobile patient (`useIsMobile() === true`) is routed to `/patient/dashboard` on cold start and bounced off
a community route to it, via the real (`dbRole`) role rather than the mobile-forced one.
TEST: `src/hooks/useSmartRouting.mobile.test.ts` — 3 tests (`useSmartRouting` cold-start redirect,
`useRoleRouteEnforcement` community-route bounce, and a negative control confirming no bounce when already on the
correct `/patient/*` route), all with `useIsMobile()` mocked `true` throughout.

AC-6 — `useRoleBasedRedirect()` (the third, previously-unflagged instance of the same bug — used by the per-tenant
email-confirmation landing pages) is fixed alongside the other two, not left inconsistent.
TEST: `git diff src/hooks/useSmartRouting.tsx` — `useRoleBasedRedirect()`'s `switch (currentRole)` → `switch (dbRole)`.
Not covered by a dedicated test this round (same file, same mechanism already covered by AC-5's tests structurally;
flagging as a real, acknowledged gap rather than implying full coverage).

AC-7 — No new hardcoded user-facing strings; i18n keys added DE-first, mirrored to EN.
TEST: `node scripts/generate-screen-inventory.mjs` — `src/pages/patient/Results.tsx` and `Dashboard.tsx` both report
"✅ clean"; manual grep of `ComingSoonPlaceholder.tsx` confirms no raw JSX text. `docs/SCREEN_INVENTORY.md`
regenerated and committed.

## Verification — and the same sandbox limitation as VTID-03936's Phase 2 pack

**This session's sandbox still blocks `npm install`** (confirmed again this round — same `403 Forbidden` from the
npm registry) — no local `npm run build`/full-project `tsc`/`vitest run`/Playwright screenshot was possible.

What COULD be run and was:
- `node scripts/generate-screen-inventory.mjs` (pure Node) — ran clean, `docs/SCREEN_INVENTORY.md` committed.
- A standalone `tsc` binary at `/opt/node22/bin/tsc`, narrow-checked against every file this VTID touches
  (`useSmartRouting.tsx`, the three messaging hooks, `useSmartRouting.mobile.test.ts`, `Results.tsx`,
  `usePatientHealthResults.ts`). Every error reported is either the expected "Cannot find module" noise from missing
  `node_modules`, or a pre-existing issue in an untouched part of the same file (confirmed by line number — e.g.
  `useTenantMessages.ts`'s implicit-`any` errors all sit well outside the 2 lines this VTID actually changed there).
  No new error is attributable to this VTID's own diff.
- Manual, line-by-line trace of `useSmartRouting.mobile.test.ts` against `useSmartRouting.tsx`'s actual branch logic
  (`COMMUNITY_PREFIXES`/`isOnCommunity`/the `switch (dbRole)` cases) to confirm each assertion matches a real code
  path, since `vitest run` itself could not execute.

**Not done, flagged rather than silently skipped:** a real browser screenshot of the results screen and the
coming-soon placeholders (this repo's own mandatory visual-verification protocol); an actual mobile-device or
mobile-viewport confirmation that the messaging-context switch behaves as intended in a real session. CI (which has
registry access) is the real gate for this PR.
