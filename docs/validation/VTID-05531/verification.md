# VTID-05531 — verification

Lane: native-wave2-events-calendar-r3/events-meetups. Spec: lanes/events-meetups.md on the plan branch (vitana-platform). The lane file is not on vitana-platform main yet, so Lane scope reports "lane file not found" until the plan merges.

## What is built
- `/comm/events-meetups` (COMM.EVENTS, COMM.EVENTS_HOT, COMM.EVENTS_TODAY, COMM.EVENTS_UPCOMING, COMM.FEED, COMM.OVERVIEW): tab from the `tab` param and the filter sheet, card list with pull-to-refresh and incremental loading, loaded, empty and error states, search by title and place, a card opens the drawer, the `event` param opens a linked event.
- OVERLAY.EVENT_DRAWER and OVERLAY.MEETUP_DRAWER: the detail drawer (owner: edit and delete); create selection; create and edit forms for events and meetups.
- `/e/:slug`, `/pub/events/:id`: public event landing through the `resolve_event_by_slug` RPC.
- `/community/event-game` and `/e/game/:slug`: event game landing with the tenant flag, pre, live and ended phases, join and leaderboard.
- `@vitana/core` entries: events-hot, virtual-link, event-cover-image, profile-path (all class-A).

## Checks on the final code
- `npm run typecheck`: exit 0, 0 TS errors.
- `npx jest tests/events --ci`: 5 suites, 46/46 tests, two runs at default workers.
- `npx jest tests/orb/nav-directive.test.ts --ci`: 14/14 after the Option C change.
- `npm test` (full, apps/mobile): 150/150 suites, 4051/4051 tests, exit 0.
- `npm run parity:check`: OK, 435 rows, 75 native routes; the 12 events rows are native.
- `node scripts/native/core-closure.mjs --check`: up to date.
- `APP_PROFILE=development EXPO_OFFLINE=1 npm run deps:check`: exit 0.
- `APP_PROFILE=development npm run bundle` with `EXPO_NO_TELEMETRY=1`: exit 0 (iOS and Android). Without that variable the sandbox fails on Expo telemetry (`/root/.expo`).
- NATIVE-CI node tests (10 files in scripts/native/__tests__): 69/69. Shell pins: OK.
- Root `npm run i18n:register` and `i18n:stale`: exit 0.
- Root `npm run i18n:gate`: exit 1 with 10 review-queue and admin-key checks in existing shards; none mention eventsNative. It also needs SUPABASE_SERVICE_ROLE, which this sandbox lacks.

## Option C file (driver decision)
`apps/mobile/tests/orb/nav-directive.test.ts` is outside the lane paths. Its three assertions used COMM.OVERVIEW (`/comm/events-meetups?tab=hot`) as the unported example, which this port makes native. The example is now `/admin/activity`: a web console route that the browser opens (ledger out:system-browser), with no native route and no Wave 2 lane owner. The `not_found` and `native_screen_not_ported` expectations are unchanged. No ORB source changed.

## Parity gaps (not in this port)
- Ticket sales and checkout (ticket types, Stripe purchase, "buy ticket" CTA). A purchase surface, so it is not ported here.
- Generated cover images and cover upload in the create and edit forms.
- Live-room cards in the hub list and the Go Live entry. They belong to the live-rooms lane (VTID-05532).
- Campaign promotion dialog, share dialog, and the Autopilot chip (it does not navigate in this port).
- Drawer previous and next, add-to-calendar, and the attendee chat in the drawer.
- Game celebration overlay, rules sheet and post CTA.
- Date and time fields are typed text (YYYY-MM-DD, HH:MM), not native pickers.
- An event that ends on another day is saved with its end on the start date.

## Owner decision recorded (driver, 2026-11-05)
- `/e/:slug` and `/pub/events/:id` stay under `app/(app)/`, as the lane spec says. Web serves them without sign-in; native signed-out visitors are sent to sign-in. Moving the two routes to the public group is a follow-up for the public-entry lane.
- `/e/game/:slug` is in GUEST_PATHS, so guests reach it.

## Not verified on staging
Device runtime (Maestro, simulator and emulator screenshots, real sign-in and reads against staging) is deferred to G1 (task 8, next_actor owner). The offline tests use the Supabase double and a fake gateway; no network call is made.
