# Verification — VTID-05525 (native-wave2-role-modes-r2 / patient)

Native patient-mode port: the 8 `/patient/*` ledger rows, 8 route files. Spec in vitana-platform
`.kiro/specs/native-wave2-role-modes-r2/` (plan PR #4635; read from the plan branch while it is
open). `plan.md` and `tasks.md` `<!-- lane: patient -->` govern.

**Not verified on staging:** device runtime (Maestro, simulators, screenshot parity) is deferred
to G1 (`next_actor: owner`), recorded in `staging-tests.json` and `apps/mobile/maestro/patient/README.md`.
Everything below ran offline. Patient health data exists only as test fixtures; the two writes
(link-request confirm / decline) are asserted as the built request against a fake gateway and
nothing reaches a network (`tests/helpers/no-network`).

## What changed

| Area | Files |
|---|---|
| Routes | `apps/mobile/app/(app)/patient/{appointments,care-team,dashboard,goals,health,insurance,notifications,results}.tsx`; `src/navigation/resolve.ts` `NATIVE_ROUTES` + the 8 paths |
| Screens | `src/screens/patient/{Dashboard,Health,Appointments,Results,ComingSoon}Screen.tsx`, `PartnerLinkRequestsCard.tsx`, `PatientGate.tsx` (ProtectedRoute + NotAuthorized), `components.tsx`, `format.ts` |
| Data | `src/screens/patient/data/requests.ts` (paths, types, request builders), `data/hooks.ts` (class-B web hooks re-implemented natively: same gateway paths, query keys, `retry: false` on link requests, same invalidations) |
| Port | `src/ports/patient-ui.tsx` — kit `Dialog`, `ResponsiveDialog*`, the lucide glyphs and the `--category-n` token colour (screens never import `@vitana/ui` / `@vitana/tokens`) |
| i18n | `src/i18n/*/patientNative.json` — 5 format keys (`figure.fraction`, `figure.bloodPressure`, `results.valueWithUnit`, `results.range`, `results.noValue`), DE first, mirrored to ar en es fr pl pt ru sr tr zh. Every visible word reuses an existing web key (`screens.patient.*`, `screens.common.*`, `screens.notauthorized.*`, `mobileNav.*`, `loading.default`) |
| Ledger | `apps/mobile/parity/ledger.json` — the 8 `/patient/*` rows `not_started` → `native` (owner kiro, 2026-11-03) |
| Tests | `apps/mobile/tests/patient/**` (new). No shared test changed |

No `@vitana/core` change (design §4 decision 3), no backend / gateway / migration, no web file
touched, nothing under `apps/mobile/src/orb/**`.

## Parity notes (mobile-web branch, 1:1)

The patient pages branch only on `useSpotlightEnabled()`, which is always false on a phone
(`src/hooks/useSpotlightEnabled.ts`: `enabled = !isMobile && …`), so the native screens port the
non-Spotlight branch of each page.

- **Dashboard** (`src/pages/patient/Dashboard.tsx:68-188`): header; `RecentResultsCard` with the
  member's real three newest results (`GET /api/v1/patient/health-results`), 3 row skeletons while
  loading, the empty line (also on error, as the web), "view all" → `/patient/results`; the 4 KPI
  panels, recent activity (success / info / warning dots) and quick actions, in that order.
- **Health** (`Health.tsx:24-143`) and **Appointments** (`Appointments.tsx:24-135`): the same
  cards, sample figures, badges and actions. The web has no data source for either.
- **Results** (`Results.tsx:61-166`): header, `PartnerLinkRequestsCard`, then 4 row skeletons /
  load-failed + Retry / empty state / one standard horizontal card per result (marker count,
  partner or "self reported", "N need attention" destructive or "all normal" secondary badge,
  report date `MMM dd, yyyy` in the member's locale). A card opens the centred `Dialog` with the
  biomarker table (marker, value + unit, range, status badge; `—` when missing).
- **"Is this your test?"** (`PartnerLinkRequestsCard.tsx`): hidden while loading, without
  requests or on failure; per request test, partner (or "Partner"), proposed date; Confirm opens
  the `ResponsiveDialog` (bottom sheet on a phone) → `POST …/link-requests/:id/confirm`; Not me →
  `POST …/decline`; the web toasts; both buttons disabled while a decision is in flight; success
  invalidates `['partner-link-requests']` and `['patient-health-results']`.
- **Care team / Goals / Insurance / Notifications** (`ComingSoonPlaceholder`, `App.tsx:1661-1688`):
  title + the dashed "coming soon" box with the route's icon (Users / ClipboardCheck / ShieldCheck /
  Bell).
- **Role gate**: seven routes are `AuthGuard` + `ProtectedRoute requiredRole="patient"`;
  `/patient/results` is `AuthGuard` only (VTID-03988). `PatientGate` ports `ProtectedRoute`
  (loader on the first resolution per member, then `NotAuthorized` unless
  `ROLE_HIERARCHY[dbRole] >= patient` or Exafy admin). The shell's `AuthGate` route guard (web
  `useRoleRouteEnforcement`) still runs first and bounces a community member off the gated
  routes to `/home`.
- **Bottom tabs** (design §2a): patient mode's own bar (Dashboard, Results, Health,
  Appointments around the ORB) is the N3 `BottomNav` already on main (`resolveRoleBottomNav` from
  `@vitana/core/nav`, web `MobileBottomNav.tsx:45-51`); on a `/patient/*` route without a mode bar
  (community member on `/patient/results`) the bar is hidden, as the web's VTID-03968 rule. Tests
  assert both on the patient screens inside `MobileAppShell`.
- **Utility bar**: the patient pages render no page-level utility bar (search, calendar, Life
  Compass, voucher); the mobile web shows only the shell top bar around them, which the N3
  `MobileAppShell` provides. Nothing is left unported on these screens.
- **External checkout / IAP**: no hosted page (Stripe, portal) and no purchase surface on these
  screens, so there is no return leg to build and no IAP gate to keep; `drawer.ts`
  `iapRestricted` is untouched.

## Documented deviations

- Sample figures the web hard-codes as literals (`85/100`, `7/10`, `2`, `120/80`, `8,247`, `342`)
  go through the locale number formatter and the `patientNative.figure.*` patterns, so German shows
  `8.247`. Biomarker values and ranges are locale-formatted the same way (web prints the raw number).
- `PatientGate` also treats "no session yet" and "active tenant not resolved yet" as loading. The
  native `TenantProvider` sets `activeTenantId` in an effect after the session arrives, and the
  role query reads as not loading with the `community` default until then; without this a patient's
  cold start would flash Access denied. The permission rule itself is the web's.
- The quick-action, "schedule new", reschedule / cancel / view notes / book follow-up buttons have
  no handler on the web; the native buttons are equally inert (no action invented).
- The `BottomNav:patient` ledger row (owned by N3, `in_progress`) is not this lane's row and was
  not changed.

## Red → green

`red-on-base.txt`: the lane's tests on a clean `origin/main` — the 3 patient suites fail (the
screen, gate and port modules do not exist). On the branch all pass (`commands.log`).
