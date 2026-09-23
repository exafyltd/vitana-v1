# App side of VTID-04372 / VTID-04373 / VTID-04374 — calendar

This change is the app side of three backend changes on
`exafyltd/vitana-platform`, all on branch `claude/vitanaland-calendar-redesign-ryfg1l`.

- **Move an entry (VTID-04374).** The entry screen gets a 🗓️ Move button.
  It shows only when the gateway marks the item `movable`, meaning a
  one-off entry of the member's own. It opens a date/time picker; the
  entry keeps its length. If the gateway refuses the move (`409
  NOT_MOVABLE`), the toast explains why: booking/plan, series, done, or
  cancelled.
- **Google busy blocks (VTID-04372).** Busy time pulled from Google shows
  as "Busy (Google)" with 📆, and the hint says the time comes from the
  member's Google calendar.
- **Google sync card (VTID-04372).** This lives in the "Show in my calendar
  app" sheet. It is hidden while the gateway reports `not_configured`, so
  nothing is promised before sync is switched on. "Turn on" either
  enables sync, or sends the member to Google's permission screen with
  the `calendar_sync` scopes (`useStartUnifiedGoogleConnect`), and they
  come back to turn it on.
- **Quiet hours (VTID-04373).** A note explains that reminders arrive just
  before quiet hours, never during them. It links to the existing
  `/settings/notifications` DND setting; no new setting was built.

New strings are in all 11 locales, German first and in du-form. The
existing catalog test checks key parity across all locales.

## Acceptance criteria

- **AC-1:** Move sends `POST /events/:id/move {start_time}` with the role
  header. A refusal carries its reason, and an unknown reason is ignored.
  TEST: `vcal.test.ts` › move an entry.
- **AC-2:** Google status defaults to `not_configured`. Enable turns sync
  on, or on a 409 `not_connected` returns "connect Google first"; any
  other error throws.
  TEST: `vcal.test.ts` › Google Calendar sync.
- **AC-3:** Every locale ships the same vcal keys as German.
  TEST: `vcal.test.ts` › catalog.
- **AC-4:** Visual check (see below): the picker, a moved-toast, Google
  busy blocks, and the sync card off and on. Checked on mobile 390×844,
  desktop 1400×900, and Arabic RTL 390×844, with no horizontal scroll.

## Visual check

Script: `outputs/verify-calendar-app.cjs <outdir>`, run with `E2E_EMAIL` and
`E2E_PASSWORD` set. The window read, `/calendar/subscription`,
`/calendar/google` and `/calendar/events/:id/move` are stubbed with
`route.fulfill`, and every other non-GET request to a remote host is
aborted. **Nothing was moved, linked or synced on any live system.** Sign-in
is the only real request made as the test account. Result:
- `hscroll 0` on all three runs.
- The stubbed calls were `move POST {"start_time":…}`, `google GET/POST`.
- Every other remote write (telemetry, presence, preferences) was blocked.

Screenshots in `outputs/`:

| File | What it shows |
|---|---|
| `app-mobile-en-move-picker.png` | The Move picker on mobile |
| `app-desktop-en-day.png` | The day view with a "Busy (Google)" block at 15:00 |
| `app-mobile-en-google-off.png` | The sync card turned off, the quiet-hours link, and the "Moved ✨" toast |
| `app-desktop-en-google-on.png` | The sync card turned on, with the last-sync time |
| `app-mobile-ar-google-on.png` | The same card in Arabic RTL |

## Not verified

- Google's real consent screen and a real sync. The flag is off everywhere,
  and the Google OAuth client is not configured on staging.
