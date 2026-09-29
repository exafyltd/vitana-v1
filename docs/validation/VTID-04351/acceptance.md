# VTID-04351 — Calendar step 4: the new /calendar screen

Builds on the gateway window read (VTID-04331) and default reminders
(VTID-04338), `exafyltd/vitana-platform` PR #3604.

AC-1 — `/calendar` shows Day, Week and Month views over `GET /api/v1/calendar/events/window`, sending the bearer and the active role; the chosen view is remembered per viewer.
TEST: src/components/calendar/vcal/vcal.test.ts

AC-2 — Every entry gets a colour and emoji by kind (lab order, Vitana Index pillar, event type); entries from other roles show as grey busy blocks with time only.
TEST: src/components/calendar/vcal/vcal.test.ts

AC-3 — Tapping an entry opens it full-screen: emoji, title, when/where, countdown, description, the reminders the gateway will actually send, and actions (mark done, directions, ask Vitana). Recurring occurrences have no "mark done", so a tap can't complete a whole series.
TEST: src/components/calendar/vcal/vcal.test.ts

AC-4 — Today's progress ring and the "next up" card (with its next reminder time) use today's real entries only.
TEST: src/components/calendar/vcal/vcal.test.ts

AC-5 — Week starts Monday; month is the 6-week grid inside the gateway's 62-day cap.
TEST: src/components/calendar/vcal/vcal.test.ts

AC-6 — Every string comes from `src/i18n/<locale>/vcal.json`, present with identical keys in all 11 locales; du-form in German; RTL works in Arabic.
TEST: src/components/calendar/vcal/vcal.test.ts

## Visual verification

`outputs/verify-calendar-screen.cjs` runs the local dev build in Chromium.
- **The calendar feed is a local stub** (`route.fulfill`), so no calendar data is read from or written to any live system.
- Every other non-GET request to a remote host is aborted.
- Runs covered: 390×844 and 1400×900; German, English and Arabic.
- No horizontal scroll in any run; `dir=rtl` in Arabic.
- Screenshots are in `outputs/`.

Not verified here: the real feed on staging. That needs PR #3604 merged and deployed first.
