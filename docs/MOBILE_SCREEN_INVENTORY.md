# Mobile Screen Inventory & Navigation Containment

`BOOTSTRAP-MOBILE-NAV-CONTAINMENT`

This is the inventory of every surface a mobile user can be redirected to, and
the rules that keep the ORB / Vitana Navigator **redirecting only within them**.
On mobile, the navigator must never route-change a user onto a screen that has
no mobile rendering. When it would, it either (a) opens the equivalent mobile
overlay/popup in place, or (b) stays in voice.

## How containment works

There are three enforcement layers (defense-in-depth):

1. **Gateway navigation-catalog** — the single source of truth
   (`vitana-platform/services/gateway/src/lib/navigation-catalog.ts`). Each entry
   may carry:
   - `mobile_route` — on mobile, the navigator emits this instead of `route`
     (used to redirect a desktop full-page screen to its mobile overlay).
   - `viewport_only: 'desktop' | 'mobile'` — hard gate; the navigator refuses to
     emit the directive on the wrong viewport and the LLM stays in voice.
   The frontend sends `is_mobile` on every ORB context update so the gateway can
   apply these (`tool_navigate_to_screen` in `orb-tools-shared.ts`).

2. **Frontend ORB handler** (`src/hooks/useOrbVoiceWidget.ts` →
   `handleNavigationRequest`) — belt-and-suspenders, because the gateway deploys
   separately and can lag the catalog:
   - Refuses `/command-hub` (developer surface) — pre-existing.
   - Refuses the small `MOBILE_DESKTOP_ONLY_ROUTES` denylist on mobile.
   - Converts `?open=<marker>` directives into overlay CustomEvents (no route
     change) — this is how mobile redirects land inside drawers/popups.

3. **Per-page mobile self-defense** — several pages redirect mobile users to a
   mobile surface on mount (e.g. `/comm` → `/comm/events-meetups`, MyIntents →
   `/comm/find-partner`, `MobileSettings`), and `/reminders` now auto-opens the
   Calendar popup on mobile.

## Mobile overlays / drawers / popups (the non-route surfaces)

These are full mobile surfaces reached without a route change. The ORB opens
them by emitting a `?open=<marker>` directive that the frontend turns into a
CustomEvent.

| Surface | Marker (`?open=`) | Event | Mounted on mobile by |
|---|---|---|---|
| Calendar popup (agenda / month / **reminders** tabs) | `calendar` | `calendar:open` (`detail.tab`) | `MobileAppShell` (new) + `SideDrawerNav` |
| Autopilot popup | — (drawer quick action) | `autopilot:open` | `AppLayout` / `SideDrawerNav` |
| Wallet popup | `wallet` | `wallet:open` | `AppLayout` |
| Life Compass / Goals | `life_compass` / `goals` | `vitana:open-life-compass` | context provider |
| Vitana Index sheet | `index` / `vitana_index` | `vitana:open-index` | `VitanaIndexSheet` |
| Profile preview | `profile_preview` | `profile:open` | `ProfileDrawer` |
| Meetup / Event drawer | `meetup` / `event` | `meetup:open` / `event:open` | community pages |
| Master action | `master_action` | `master_action:open` | home |
| Notifications panel | — (drawer quick action) | — | `SideDrawerNav` |
| Cart sidebar | — (drawer quick action) | — | `SideDrawerNav` / `AppLayout` |
| Settings section jump | `settings_section` / `settings_toggle` | `vitana:settings-*` | `MobileSettings` |

## Mobile destination routes (responsive — safe to redirect to)

The app is mobile-first; the following routes render on mobile (via
`useIsMobile()` branches, `Mobile*` components, or responsive layouts that
collapse below the 1024px breakpoint). These are the curated drawer/bottom-nav
destinations plus their responsive sub-routes.

- **Home / Journey / AI:** `/home` (+ `/home/matches|aifeed|context|actions` → `/home`),
  `/autopilot`, `/ai`, `/ai/companion`, `/ai/recommendations`, `/ai/insights`,
  `/ai/daily-summary`, `/assistant`, `/search`, `/news/:id`
- **Community:** `/comm/events-meetups`, `/comm/live-rooms`,
  `/comm/live-rooms/:roomId/view`, `/comm/media-hub`, `/comm/find-partner`,
  `/comm/open-asks`, `/comm/members`, `/comm/talk-to-vitana`, `/comm/groups`,
  `/comm/groups/:groupId`, `/intents/board`, `/intents/match/:match_id`,
  `/u/:identifier`, `/me/profile`
- **Health:** `/health`, `/health/my-biology`, `/health/plans`,
  `/health/education`, `/health/services-hub`, `/health/pillars`,
  `/health/conditions`, `/health/vitana-index`, `/health/biomarker-results`,
  `/health-tracker`
- **Discover:** `/discover`, `/discover/supplements`,
  `/discover/wellness-services`, `/discover/doctors-coaches`,
  `/discover/deals-offers`, `/discover/orders`, `/discover/ai-picks`,
  `/discover/marketplace`, `/discover/product/:id`, `/discover/provider/:id`,
  `/cart`
- **Business:** `/business` (+ tabs `services|clients|sell-earn|analytics`),
  `/business/listings`, `/business/opportunities`
- **Wallet:** `/wallet`, `/wallet/balance`, `/wallet/subscriptions`,
  `/wallet/rewards`
- **Memory:** `/memory`, `/memory/diary`, `/memory/timeline`, `/memory/recall`,
  `/memory/permissions`, `/daily-diary` (mobile-only)
- **Inbox / Messages:** `/inbox`, `/inbox/inspiration`, `/messages` (→ `/inbox`)
- **Settings / Sharing:** `/settings` (`MobileSettings`),
  `/settings/{privacy,notifications,preferences,connected-apps,billing,support,limitations}`
  (responsive; sub-nav scrolls horizontally), `/profile/me/privacy`,
  `/sharing`, `/sharing/{campaigns,distribution,data-consent}` (stack below `lg`)

## Redirected on mobile (full page → overlay)

| Screen | Desktop route | Mobile behaviour |
|---|---|---|
| `REMINDERS.OVERVIEW` | `/reminders` | `mobile_route` → Calendar popup, Reminders tab (`?open=calendar&tab=reminders`). `/reminders` also auto-opens the popup if reached directly. |
| `INBOX.REMINDERS` | `/inbox/reminder` | same as above |
| `MEMORY.DIARY` | `/memory/diary` | `mobile_route` → `/daily-diary` (`MobileDailyDiary`). Also enforced at the **frontend route level** (`DiaryRouter` in `App.tsx`): on mobile `/memory/diary` redirects to `/daily-diary` regardless of entry path (ORB, the Memory section sub-nav "Daily Diary" tab, or a deep link), since `/memory/diary` otherwise renders the desktop Memory hub "Daily Diary" tab. The dedicated mobile diary lives at `/daily-diary` (`viewport_only: 'mobile'`). |

## Desktop-only — never redirected to on mobile

| Screen | Route | Why | Mobile outcome |
|---|---|---|---|
| `INBOX.ARCHIVED` | `/inbox/archived` | Fixed `w-80` two-pane master/detail, no reflow | `viewport_only: 'desktop'` → ORB stays in voice |
| All `DEVHUB.*` | `/command-hub/**` | Developer Command Hub, role-gated | Refused by frontend net + role gate |
| `/admin/**`, `/staff/**`, `/professional/**`, `/patient/**` | — | Role surfaces, not in the community nav catalog | Not reachable by community ORB |

## Maintaining this inventory

- Adding a screen with no mobile layout → set `viewport_only: 'desktop'` in the
  catalog (and add the route to `MOBILE_DESKTOP_ONLY_ROUTES` if you want the
  frontend net to cover catalog lag).
- Adding a screen whose mobile UX is an overlay → set `mobile_route` to a
  `?open=<marker>` URL and ensure the marker is mapped in
  `useOrbVoiceWidget.ts` and the listener is mounted on mobile.
- Keep the denylist tight: only routes with genuinely no mobile rendering.
