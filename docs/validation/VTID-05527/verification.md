# Verification — VTID-05527 (native-wave2-role-modes-r2 / staff)

Native staff-mode port: the 8 `/staff/*` ledger rows, 8 route files. Spec:
`.kiro/specs/native-wave2-role-modes-r2/` on the vitana-platform plan branch (plan PR #4635 still open;
plan block + `tasks.md` `<!-- lane: staff -->` govern).

**Not verified on staging:** device runtime (Maestro, simulators, screenshot parity) is deferred
to G1 (`next_actor: owner`), recorded in `staging-tests.json` and `apps/mobile/maestro/staff/README.md`.
Everything below ran offline against the in-memory Supabase double; `tests/helpers/no-network` makes
any `fetch` throw. Nothing is written anywhere.

## What the mobile web shows (the parity source)

| Route | Web source (mobile branch; Spotlight is desktop-only) | Native |
|---|---|---|
| `/staff/dashboard` | `src/pages/staff/Dashboard.tsx` — header, 4 stat cards (Patient queue 8, Hours today 6.5h, Tasks completed 12/18, Team coverage 4/5), Pending tasks (3 rows: destructive Urgent, outline Normal ×2), Quick actions (3 outline buttons with icons) | `DashboardScreen.tsx` |
| `/staff/queue` | `src/pages/staff/Queue.tsx` — header, 4 counters (Waiting / In progress / Urgent / Completed, icons in status-warning / info / error / success), Current queue: 3 cards with a 4 px start border in the status tone, tinted avatar initials, truncated name, reason, status badge (destructive / outline / secondary), wrapping metadata, actions below on a phone (`flex-1`) | `QueueScreen.tsx` |
| `/staff/{tasks,schedule,reports,communications,tools,time}` | `src/App.tsx:1769-1810` → `ComingSoonPlaceholder` (Activity / Calendar / BarChart3 / MessageSquare / Zap / Clock) | `ComingSoonScreen.tsx` |
| all 8 | `ProtectedRoute requiredRole="staff"` (`src/components/ProtectedRoute.tsx`) → loader / `NotAuthorized` | `StaffGate.tsx` |
| chrome | `AppLayout` → `MobileAppShell` (TopAppBar: menu, tenant, mute) + `SideDrawerNav` (`staffNavigation`); **no bottom bar**: `ROLE_NAV_ITEMS` has no `staff` entry (`src/components/mobile/MobileBottomNav.tsx:45-58`) and the VTID-03968 hide covers `/staff` (`:112`, `:118-121`, `:133-135`) | the N3 shell (already wired from `@vitana/core/nav`); asserted in `tests/staff/chrome.test.tsx` |

None of these pages renders a utility bar (search, calendar, Life Compass, gift voucher): the page files
import only Card / Badge / Button / Avatar / lucide icons / `AppLayout` (`Dashboard.tsx:1-8`, `Queue.tsx:1-9`,
`ComingSoonPlaceholder.tsx:14-20`); `GlobalSearch` / `UniversalCalendarButton` sit in `AppSidebar`
(`AppLayout.tsx:66-391`, `:219-291`), the desktop sidebar. On a phone shadcn's `Sidebar` is an off-canvas sheet
(`openMobile`, `src/components/ui/sidebar.tsx:84`, default closed) that nothing in the mobile chrome opens — the
mobile `TopAppBar` kebab opens `SideDrawerNav` (`src/components/mobile/MobileAppShell.tsx:59-60`).
No purchase surface, so no IAP gate is involved (drawer `iapRestricted` untouched). No hosted external page,
so no checkout / portal return leg applies. No sheet, modal, toast or animation is rendered by these pages.

## Data

The web screens fetch nothing (the queue is the web's demo copy: "there is no backing table for a staff patient
queue", `Queue.tsx:11-16`); the only call is `useRole()` → `get_role_preference` (RPC, read). The native gate uses
the existing native `useRole` twin (`src/identity/useRole.ts`) — same RPC, args and query key; asserted as the
only RPC in `screens.test.tsx`. No web hook imported, no `@vitana/core` entry added (plan decision 3);
`ROLE_LADDER` (already in core) gives the `ROLE_HIERARCHY` order.

## Decisions / deviations

- **Gate first resolution waits for the member and the active tenant.** The role query is disabled until
  both exist (TenantProvider sets the tenant one render after the session, on web and native). Counting that
  render as settled would skip the loader and flash Access Denied — the VTID-03909 flash ProtectedRoute
  prevents. Otherwise `settledFor` behaves as on the web.
- **Buttons have no `onPress`** because the web buttons have no `onClick` (`Dashboard.tsx:112-123`,
  `Queue.tsx:108-109, 138-139, 168`). Kept 1:1; tests assert a tap navigates nowhere.
- **Figures** `8`, `6.5h`, `12/18`, `4/5`, `5`, `2`, `24` are web literals; native prints them with
  `Intl.NumberFormat` in the member's language (`format.ts`; `6.5h` through the narrow hour unit, `6.5h` in
  English, with a `<n>h` fallback where the runtime lacks unit support).
- **Bottom padding** `pb-28` (112 px) on the dashboard and queue is kept from the web's phone branch.
- **New i18n keys:** `staffNative.comingSoon.{title,body}` in all 11 locales, DE first and equal to the web's
  German. The web's `screens.patient.comingSoon.*` is English in sr fr pl pt ru tr zh ar; the native shard has
  real translations (du / tu / você / ты / ti / sen / 你), the same wording as the professional lane's
  `professionalNative.comingSoon.*`. Every other string reuses existing web keys (`screens.staff.*`,
  `screens.common.*`, `screens.notauthorized.*`, `loading.default`).
- **Own port file** `src/ports/staff-ui.tsx` (glyphs + tinted avatar) instead of editing `src/ports/ui.tsx`, so
  the parallel role-mode lanes do not touch the same port file.

## Tests (`apps/mobile/tests/staff/`, helpers set `asyncUtilTimeout: 5000` + `jest.setTimeout(30000)`)

- `screens.test.tsx` — dashboard loaded (every section, row, badge variant, icon), queue loaded (counters with
  status-tone icons, three cards with start-border tone, tinted avatar, badge variant, wrapping metadata, actions),
  buttons navigate nowhere, 6 coming-soon screens (empty state with icon), loader, role-RPC error → Access Denied,
  community / patient / professional → Access Denied (+ its two buttons), backoffice / admin / Exafy admin pass,
  ROLE_HIERARCHY, settledFor; the only RPC is `get_role_preference`, no writes.
- `chrome.test.tsx` — **no bottom tab bar** on all 8 routes (top app bar present), none with the real dashboard
  mounted in the shell, drawer lists the 8 staff rows and a tap opens the native route.
- `routes.test.tsx` — 8 rows native (lane/source/scope unchanged), resolve to native, exactly 8 route files with
  no shadowing file, each route file renders its screen.
- `i18n-rtl.test.tsx` — 11 locales × 9 states without a raw key, `staffNative` complete / translated / register
  (de du, fr tu, pt você, ru ты, es tú), Arabic RTL, no physical left/right, no hard-coded text.

Counts: 188/188 lane tests (twice, default workers), 2863/2863 full mobile suite. See `commands.log`.
