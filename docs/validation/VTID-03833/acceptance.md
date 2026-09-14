# VTID-03833 — Frontend: `/backoffice` navigation skeleton (placeholder sections)

Second code VTID of the BackOffice plan (design gate: `exafyltd/vitana-platform`
`docs/backoffice/GOLDEN-WORKFLOWS.md`, PR #3282; role: VTID-03832). Stacked on
the VTID-03832 frontend branch because every `/backoffice/*` route is guarded
with `requiredRole="backoffice"`, which that VTID introduces.

## What shipped

- `src/config/backoffice-navigation.ts` — `BACKOFFICE_SECTIONS`, the single
  source of truth for the BackOffice sidebar and tabs: "← Admin" (adminOnly)
  + the 12 department sections of plan table B4 in order, 63 tabs, section
  `wave` 1|2|3 and per-tab `wave` overrides (e.g. Accounting › Tax is wave 2
  inside a wave-1 section, HR › Payroll is wave 3). Lookup helpers mirror
  `admin-navigation.ts`.
- `src/config/role-navigation.ts` — `backOfficeNavigation` derived from it
  (`i18nKey: sidebar.backoffice.<key>`), `getVisibleBackOfficeNavigation(canEnterAdmin)`
  which hides "← Admin" from users who cannot enter `/admin`, and
  `getRoleNavigation('backoffice')`.
- `src/components/AppLayout.tsx` — `getEffectiveNavigation()` branch for
  `/backoffice`, quick-actions row hidden there (as on `/admin`), an
  `iconClassName` pass-through so the back arrow flips in RTL.
- `src/components/backoffice/BackOfficeTabs.tsx` (mirror of `AdminTabs`,
  keys `backoffice.<section>.tabs.<tab>`) and
  `src/pages/backoffice/BackOfficePlaceholder.tsx` (mirror of
  `AdminPlaceholder`, wave 1/2/3 aware, 404 body inside `AppLayout`).
- `src/App.tsx` — `/backoffice` → `/backoffice/dashboard`; `/backoffice/*` →
  `<AuthGuard><ProtectedRoute requiredRole="backoffice"><BackOfficePlaceholder/>`
  placed before the catch-all.
- `src/config/admin-navigation.ts` — 14th `ADMIN_SECTIONS` item "Back Office"
  (`/backoffice/dashboard`).
- i18n: `sidebar.backoffice.*`, new shard `backoffice.json`
  (`backoffice.<section>.tabs.<tab>`), `screens.backoffice.*` — DE first,
  mirrored to en/es/sr/ar with real translations; fr/pl/pt/ru/tr/zh mirror EN
  (to be drained through the i18n audit workflow) so no key falls back mid-UI.
- `src/lib/screen-id.ts` — `BO-001`..`BO-063`, one per tab, plus
  `SCREEN_MAPPINGS` entries; `docs/SCREEN_INVENTORY.md` regenerated.
- `src/config/backoffice-navigation.test.ts` — 10 tests (shape, wave-1 scope,
  path/key uniqueness, helpers, per-tab waves, DE key coverage, cross-locale
  key parity, BO screen-ID ↔ tab parity, admin-link visibility, admin
  handshake).

## Acceptance Criteria

AC-1 — 13 sidebar items in plan order, "← Admin" first and adminOnly; wave-1
scope = Overview, Sales & CRM, Accounting, Finance, Reports, Approvals, Audit,
Settings; every tab path under its section; keys unique; per-tab waves.

TEST: `src/config/backoffice-navigation.test.ts` — first 5 tests; full
`vitest run` in `outputs/checks.txt`.

AC-2 — Every sidebar label, tab label and placeholder string exists in the DE
catalog, and every other locale carries the same key set.

TEST: `src/config/backoffice-navigation.test.ts` — "DE i18n … carries every
…" and "every other locale mirrors the DE key set".

AC-3 — Every content tab has exactly one `BO-###` screen ID and the admin
catalog gains the 14th "Back Office" item pointing at `/backoffice/dashboard`.

TEST: `src/config/backoffice-navigation.test.ts` — "every content tab has a
BO-### screen ID mapping" and "sidebar derivation and the /admin handshake".

AC-4 — "← Admin" is shown only to users who can enter `/admin`.

TEST: `src/config/backoffice-navigation.test.ts` — "\"← Admin\" is visible
only to users who can enter /admin" (`getVisibleBackOfficeNavigation(false)`
returns the 12 department items, no `/admin` path). Not exercisable in the
browser run below: the documented test account is an Exafy super-admin, whose
`hasPermission()` bypass shows the link regardless of the mocked role.

AC-5 — The skeleton renders inside the unchanged global frame at 1400×900:
sidebar, tab row, wave badge, placeholder body; LTR (EN/DE) and RTL (AR).

UI: `screenshots/01-backoffice-dashboard-admin-ltr-en.png`,
`02-backoffice-sales-leads-admin-ltr-en.png`, `05-backoffice-dashboard-rtl-ar.png`,
`06-backoffice-sales-leads-rtl-ar.png`, `07-backoffice-hr-payroll-wave3-de.png`
— captured against the local Vite dev server with Playwright, signed in as
the documented test user (sign-in is the one permitted auth write), service
worker blocked, and **every non-read request to Supabase/the gateway aborted
at the network layer** (65 such requests were blocked in the first pass;
nothing was written).

AC-6 — The two entry points work in the running app: the admin sidebar's
"Back Office" link lands on `/backoffice/dashboard` (h1 "Overview"), and
"← Admin" returns to `/admin/dashboard`.

UI: `outputs/admin-handshake-click.json` — recorded `afterClick` /
`afterBackClick` URLs and h1 from a real click sequence;
`screenshots/04-admin-sidebar-14-items-tall.png` shows the 14th item.

AC-7 — `tsc --noEmit` clean; full vitest clean; the i18n ESLint rules clean
on every changed file; `npm run i18n:inventory` committed.

TEST: `outputs/checks.txt`. The only ESLint hits on the changed files are
pre-existing `@typescript-eslint/no-explicit-any` / missing-rule-definition
errors on untouched lines (`git blame` → 2026-08-21 baseline; identical on
`origin/main`).

## Not verified / limits

- Role gating (`community` bounced, `staff` refused, `backoffice` admitted) is
  covered by the VTID-03832 hierarchy test and by `ProtectedRoute`'s existing
  behaviour, not by the browser run: with the Exafy test account every guard
  passes, and no non-privileged test account exists that this session may use.
- No staging URL yet: the PR's own preview (S3/CloudFront) is the place to
  review once it posts; the DB enum for the `backoffice` role is still not
  applied (VTID-03832), so on staging only admin-or-higher users can reach
  `/backoffice` for now.
- Non-core locales (fr/pl/pt/ru/tr/zh) carry English mirrors pending the
  translation/audit workflow.
