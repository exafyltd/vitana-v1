# VTID-05531 — verification

Lane: native-wave2-events-calendar-r3/events-meetups. Spec: lanes/events-meetups.md on the plan branch (vitana-platform).

## What is built
- `/comm/events-meetups` (COMM.EVENTS, COMM.EVENTS_HOT, COMM.EVENTS_TODAY, COMM.EVENTS_UPCOMING, COMM.FEED, COMM.OVERVIEW): tab from the `tab` param and the filter sheet, card list with pull-to-refresh and incremental loading, loaded, empty and error states, search by title and place, a card opens the drawer, the `event` param opens a linked event.
- OVERLAY.EVENT_DRAWER and OVERLAY.MEETUP_DRAWER: the detail drawer (owner: edit and delete); create selection; create and edit forms for events and meetups.
- `/e/:slug`, `/pub/events/:id`: public event landing through the `resolve_event_by_slug` RPC.
- `/community/event-game` and `/e/game/:slug`: event game landing with the tenant flag, pre, live and ended phases, join and leaderboard.
- `@vitana/core` entries: events-hot, virtual-link, event-cover-image, profile-path (all class-A).

## Parity with the web (what is not in this port)
- Ticket sales and checkout (CreateEventPopup ticket types, the Stripe purchase, the "buy ticket" CTA). Purchase surface, so it is not ported here.
- Generated cover images (`generate-event-image`) and the image upload in the create and edit forms.
- Live-room cards in the hub list and the Go Live entry. They belong to the live-rooms lane (VTID-05532).
- Campaign promotion dialog, share dialog and the Autopilot chip (the chip navigates nowhere in this port).
- Drawer previous and next navigation, add-to-calendar and the attendee chat in the drawer.
- Game celebration overlay, rules sheet and post CTA.
- Date and time fields are typed text (YYYY-MM-DD, HH:MM), not native pickers.
- End time on the same day as the start only.

## Known parity gap (needs an owner decision)
- `/e/:slug` and `/pub/events/:id` are public on the web (no AuthGuard). The lane spec places their native routes under `app/(app)/`, and `(app)` sends signed-out visitors to sign-in unless the path is in `GUEST_PATHS`. Native signed-out visitors therefore land on sign-in for shared event links. The fix is a `(public)` route, which is outside the lane paths, or a web-side change; `GUEST_PATHS` cannot take these paths because check-shell-pins compares it with App.tsx `allowGuest` routes.
- `/e/game/:slug` is in GUEST_PATHS, so guests reach it.

## Checks
See commands.log. Summary: typecheck green; lane tests 46/46 on two default-worker runs; parity:check OK; core-closure --check up to date; deps:check green; bundle green with EXPO_NO_TELEMETRY=1; NATIVE-CI node tests 69/69; shell pins OK; i18n register and stale checks green. Full `npm test`: 149 of 150 suites pass; the one failing suite is outside the lane (tests/orb/nav-directive.test.ts, see below).

## Outside the lane: tests/orb/nav-directive.test.ts
Three assertions use `COMM.OVERVIEW` (`/comm/events-meetups?tab=hot`) as the example of a registry screen that is not ported yet, expecting `not_found` with `native_screen_not_ported`. With this port the same call returns `opened`. The fix is to use another unported destination, for example `COMM.LIVE_ROOMS` (`/comm/live-rooms`, live-rooms lane), in those three places. That file is not in the lane paths, so it is not changed in this PR.

## Not verified on staging
Device runtime (Maestro, simulator and emulator screenshots, real sign-in and reads against staging) is deferred to G1 (task 8, next_actor owner). The offline tests use the Supabase double and a fake gateway; no network call is made.
