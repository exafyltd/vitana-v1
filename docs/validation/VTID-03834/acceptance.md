# VTID-03834 — Frontend: ERP capability access (hooks, gated sections, Settings › Access)

Frontend half of VTID-03834 (backend: `exafyltd/vitana-platform#3284`).
Stacked on the VTID-03833 branch (`/backoffice` skeleton).

## What shipped

- `src/hooks/useBackOfficeAccess.ts` — `useMyErpAccess(enabled)`,
  `useErpAccessList()`, `useGrantErpCapability()`, `useRevokeErpCapability()`
  over `/api/v1/backoffice/*` via `adminFetch`; `isExplicitOnlyCapability()`.
  The browser never touches `erp_capability_grants`.
- `src/config/backoffice-navigation.ts` — per-section `capabilities` (any-of;
  Overview and Approvals carry none) and `canUseBackOfficeSection()`.
- `src/config/role-navigation.ts` — `getVisibleBackOfficeNavigation(canEnterAdmin,
  capabilities)` hides sections the caller cannot use; `null` (not loaded /
  unknown) hides nothing — the gateway enforces regardless.
- `src/components/AppLayout.tsx` — asks `/me` only on `/backoffice/*` and feeds
  the sidebar filter.
- `src/pages/backoffice/BackOfficePlaceholder.tsx` — no-access body on a gated
  section the caller lacks a capability for.
- `src/pages/backoffice/settings/Access.tsx` (`BO-060`) — cloned from
  `admin/members/RolesAccess.tsx`: members from the existing admin members
  endpoint, explicit grants as pills (click to revoke), a grant select over the
  gateway's catalog with personal-data capabilities flagged, the caller's own
  effective capabilities on top, and read-only rendering when `/me` says
  `can_manage_access: false`. Route `/backoffice/settings/access`.
- i18n DE-first: `screens.backoffice.access.*`, `screens.backoffice.noAccess`,
  `toasts.backoffice.*` — en/es/sr/ar translated, fr/pl/pt/ru/tr/zh mirror EN.

## Acceptance Criteria

AC-1 — Sections are gated any-of by capability; Overview/Approvals never; a
pure `backoffice` grant with no capabilities sees only Overview + Approvals; a
bookkeeper (`finance.view`, `accounting.view`, `reports.view`) sees exactly
Overview, Accounting, Finance, Reports, Approvals; unknown capabilities hide
nothing.

TEST: `src/config/backoffice-navigation.test.ts` — "VTID-03834: sections are
gated by ERP capabilities…" (`outputs/checks.txt`, full `vitest run` 29 files
/ 193 tests).

AC-2 — The Settings › Access screen renders inside the unchanged frame at
1400×900, LTR and RTL, showing the caller's effective capabilities, the member
table with grant controls for a manager, and the personal-data flag in the
grant select.

UI: `screenshots/01-settings-access-admin-en.png`,
`screenshots/04-settings-access-rtl-ar.png`. Harness (this container's
browser has no network egress, so nothing external can be reached, let
alone written): local Vite dev server pointed at a local stub gateway that
serves `/api/v1/backoffice/me`, `/access` and `/api/v1/admin/users` in the
routers' exact response shapes (three synthetic member rows); the documented
test user's session injected from a Node-side sign-in (the one permitted auth
write); the SDK's `/auth/v1/user` read answered from that sign-in response;
the two role RPCs mocked; **every other request to Supabase/the gateway
aborted at the network layer** (267 in the final run, `outputs/playwright-run.log`).

AC-3 — A bookkeeper's sidebar hides Sales & CRM, Marketing, HR, Operations,
Legal, Audit and Settings; opening a gated section shows the no-access body.

UI: `screenshots/02-sidebar-gated-bookkeeper-en.png`,
`screenshots/03-no-access-body-bookkeeper-de.png`.

AC-4 — `tsc --noEmit` clean; full vitest clean; i18n ESLint rules clean on
every changed file; `npm run i18n:inventory` committed.

TEST: `outputs/checks.txt` (tsc exit 0; 29/193; eslint exit 0 with only the
pre-existing `no-explicit-any` rule muted; inventory regenerated).

## Not verified / limits

- **RTL finding, pre-existing, not fixed here:** in Arabic the main content
  region sits under the sidebar on the left and leaves a band on the right
  (`04-settings-access-rtl-ar.png`); the same left-edge clipping shows on the
  VTID-03833 RTL tab row. It is the shared `AppLayout` content offset (a
  physical left margin), not this page — a one-line logical-property fix
  there, but out of this VTID's scope and global in effect; flagged for a
  follow-up VTID.

- Real grant/revoke round-trips need the gateway routes on staging (merge of
  #3284) and the applied migration (owner's "apply now"); until then the
  screen's mutations return an error toast.
- The screenshots use mocked `/me` and `/access` responses; the member rows
  are real (read-only) members of the test tenant.
