# Verification — VTID-05526 (native-wave2-role-modes-r2 / professional)

Native professional-mode port: the 8 `/professional/*` ledger rows, 8 route files. Spec:
`.kiro/specs/native-wave2-role-modes-r2/` on the vitana-platform plan branch (plan PR #4635 still open;
plan block + `tasks.md` `<!-- lane: professional -->` govern).

**Not verified on staging:** device runtime (Maestro, simulators, screenshot parity) is deferred
to G1 (`next_actor: owner`), recorded in `staging-tests.json` and `apps/mobile/maestro/professional/README.md`.
Everything below ran offline against the in-memory Supabase double; `tests/helpers/no-network` makes
any `fetch` throw. Nothing is written anywhere.

## What the mobile web shows (the parity source)

| Route | Web source (mobile branch; Spotlight is desktop-only) | Native |
|---|---|---|
| `/professional/dashboard` | `src/pages/professional/Dashboard.tsx` — header, 4 stat cards, Today's schedule (3 rows + outline time badge), Quick actions (3 outline buttons) | `DashboardScreen.tsx` |
| `/professional/patients` | `src/pages/professional/Patients.tsx` → `ComingSoonPlaceholder` (Users, `screens.professional.myPatients`) | `ComingSoonScreen.tsx` |
| `/professional/{schedule,tools,referrals,billing,profile,education}` | `src/App.tsx:1711-1752` → `ComingSoonPlaceholder` (Calendar / Stethoscope / FileText / Wallet / UserCheck / BookOpen) | `ComingSoonScreen.tsx` |
| all 8 | `ProtectedRoute requiredRole="professional"` (`src/components/ProtectedRoute.tsx`) → loader / `NotAuthorized` | `ProfessionalGate.tsx` |
| chrome | `AppLayout` → `MobileAppShell` (TopAppBar: menu, tenant, mute) + `MobileBottomNav` `ROLE_NAV_ITEMS.professional` | the N3 shell (already wired from `@vitana/core/nav`); asserted in `tests/professional/bottom-tabs.test.tsx` |

None of these pages renders a utility bar (search, calendar, Life Compass, gift voucher): the page files
import only Card / Badge / Button / lucide icons / `AppLayout` (`Dashboard.tsx:1-8`,
`ComingSoonPlaceholder.tsx:14-20`), and the mobile `TopAppBar.tsx` has menu, tenant name, mute and live only.
No purchase surface, so no IAP gate is involved (drawer `iapRestricted` untouched). No hosted external page,
so no checkout / portal return leg applies.

## Data

The web screens fetch nothing; the only call is `useRole()` → `get_role_preference` (RPC, read). The native
gate uses the existing native `useRole` twin (`src/identity/useRole.ts`) — same RPC, args and query key;
asserted as the only RPC in `screens.test.tsx`. No web hook imported, no `@vitana/core` entry added
(plan decision 3); `ROLE_LADDER` (already in core) gives the `ROLE_HIERARCHY` order.

## Decisions / deviations

- **Gate first resolution waits for the member and the active tenant.** The role query is disabled until
  both exist (TenantProvider sets the tenant one render after the session, on web and native). Counting that
  render as settled would skip the loader and flash Access Denied — the VTID-03909 flash ProtectedRoute
  prevents. Otherwise `settledFor` behaves as on the web.
- **Quick actions have no `onPress`** because the web buttons have no `onClick` (`Dashboard.tsx:111-122`).
  Kept 1:1, test asserts a tap navigates nowhere.
- **Figures** `12`, `5`, `$24,500` are web literals; native prints them with `Intl.NumberFormat` in the
  member's language (`format.ts`), `$24,500` as whole USD.
- **New i18n keys:** `professionalNative.comingSoon.{title,body}` in all 11 locales, DE first and equal to the
  web's German. The web's `screens.patient.comingSoon.*` is English in sr fr pl pt ru tr zh ar; the native
  shard has real translations (du / tu / você / ты / ti / sen / 你). Every other string reuses existing web
  keys (`screens.professional.*`, `screens.common.*`, `screens.notauthorized.*`, `loading.default`).
- **Not changed (other owners):** the bottom-tab labels `mobileNav.{dashboard,patients,schedule,settings}`
  are still English and `_pending_review` in several web shards (sr fr pl ru tr zh ar); they belong to the
  shared `mobileNav` shard, outside this lane's paths.

## Tests (`apps/mobile/tests/professional/`, helpers set `asyncUtilTimeout: 5000` + `jest.setTimeout(30000)`)

- `screens.test.tsx` — dashboard loaded (every section and row), 7 coming-soon screens (empty state with icon),
  loader, role-RPC error → Access Denied, patient → Access Denied (+ its two buttons), staff / admin / Exafy admin
  pass, ROLE_HIERARCHY, settledFor; the only RPC is `get_role_preference`, no writes.
- `bottom-tabs.test.tsx` — the professional bar on all 8 routes under the top app bar, `mobileNav.*` labels,
  active tab, taps navigate.
- `routes.test.tsx` — 8 rows native (lane/source/scope unchanged), resolve to native, exactly 8 route files with
  no shadowing file, each route file renders its screen.
- `i18n-rtl.test.tsx` — 11 locales × 9 states without a raw key, `professionalNative` complete / translated /
  register (de du, fr tu, pt você, ru ты, es tú), Arabic RTL, no physical left/right, no hard-coded text.

Counts: 184/184 lane tests (twice, default workers), 2857/2857 full mobile suite. See `commands.log`.
