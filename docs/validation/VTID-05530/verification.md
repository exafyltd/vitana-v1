# VTID-05530 — native calendar and reminders port (native-wave2-events-calendar-r3/calendar-reminders)

Lane spec: `.kiro/specs/native-wave2-events-calendar-r3/lanes/calendar-reminders.md` and the `calendar-reminders` section of
`tasks.md` on vitana-platform `origin/main`.

## What the lane ports
| Web destination | Native route file | Screen |
|---|---|---|
| `/calendar` (`CALENDAR.OVERVIEW`) | `apps/mobile/app/(app)/calendar/index.tsx` | `src/screens/calendar/CalendarScreen.tsx` |
| `/calendar/entry/:entryId` | `apps/mobile/app/(app)/calendar/entry/[entryId].tsx` | `CalendarScreen` with `entryId` + `EntryScreen.tsx` |
| `/reminders` (`REMINDERS.OVERVIEW`) | `apps/mobile/app/(app)/reminders/index.tsx` | `src/screens/calendar/RemindersScreen.tsx` |
| `/reminders/fire/:fireId` | `apps/mobile/app/(app)/reminders/fire/[fireId].tsx` | `RemindersScreen` with `fireId` + `ReminderFireOverlay.tsx` |

- Calendar: day / week / month (Monday weeks, 42-day month grid), the window read per range, busy blocks as time only, milestones
  as quiet markers, "+N more", the month/week day panel with "add for this day", prev / next / today, the quiet day summary, the
  remembered last view. Loaded, empty and error (retry) states.
- Entry screen (full-screen modal, close button and system back): emoji, date, time range, place, countdown, description, the
  reminders the gateway will send, mark done (Vitana Index gain toast), move (gateway reason copy on refusal), edit and remove
  (confirm) for the member's own entries, the community event / live room / audiobook source action, ended-event notice.
- Add entry: title, Today / Tomorrow / day stepper, start and end in 15-minute steps, find a time (gateway free slots), overlap
  warning, place, category; POST through the gateway.
- Reminders: suggested by Vitana, scheduled by you, recent, `?filter=upcoming|completed|missed`, mark done, delete and delete-all
  with confirm, add manually; the fire card (Mark done with the Autopilot slot route, Snooze 10 min, Dismiss).
- Data: the web gateway paths, bodies and answers (`/api/v1/calendar/events/*`, `/api/v1/calendar/conflicts`,
  `/api/v1/reminders/*`), the active role in `X-Vitana-Active-Role`, and the read-only `calendar_events` row the entry link uses to
  learn the day.

## Decisions taken
1. **No `@vitana/core` change.** The spec expected `calendar-entry.ts` and `vcal/{time,labels,guidance,theme}.ts` in core. The
   closure analysis (`node scripts/native/extraction-deps.mjs`) classes `src/lib/i18n-toast.ts` C (sonner, `import.meta.env`) and
   `src/lib/locale-format.ts` transitively C, and `time.ts` and `labels.ts` import both; `theme.ts` and `calendar-entry.ts` are
   pure but only used with them. The spec's own rule ("a helper the closure BFS proves reaches a class-C module is re-implemented
   natively") applies, so the rules are re-implemented in `src/screens/calendar/` (`time.ts`, `theme.ts`, `labels.ts`,
   `entry-actions.ts`) and `packages/core/**`, `closure.generated.json` and `mobile-ci-paths.generated.json` are unchanged.
   `guidance.ts` is not ported (the guide card is deferred).
2. **Native locale-format twin.** `format.ts` provides `fmtDate`, `fmtTime`, `fmtDateTime`, `fmtNumber`, `formatDate` (the five
   patterns the calendar uses) over `Intl.DateTimeFormat` in the viewer's catalog locale (`pt` → `pt-BR`, `zh` → `zh-CN`). It is the
   only file using `Intl` (guarded); no raw `toLocale*` and no `date-fns` anywhere in the lane (guarded).
3. **Pickers become steppers.** The web's `datetime-local`, the popover calendar and the 15-minute select become a day stepper and
   a 15-minute time stepper (`controls.tsx`). Values stay plain `Date`s; every label is formatted by the twin.
4. **Two new catalog keys** in `src/i18n/*/calendarNative.json` (DE first, du-form, mirrored to the other ten):
   `calendarNative.entry.notFound` and `calendarNative.reminders.fireNotFound`. Every other string (159 literal keys plus the key families for kinds, views, form types, move reasons and work kinds) is an existing
   `vcal.*`, `screens.reminders.*`, `toasts.reminders.*`, `errors.*` or `common.*` key; the guard test checks all of them in 11
   locales. The `{{title}}` / `{{time}}` placeholders of `vcal.overlap.*` are filled by `fillTemplate` (the native `t()` only knows
   `{name}`).
5. **No invented spoken sentence.** The web fills an empty "spoken message" with the English `Time to <text>`. A hardcoded spoken
   sentence breaks the platform's no-hardcoded-speech rule and shows an English sentence in a German app, so native sends no
   spoken message when the member leaves it empty; the reminders client then sends the reminder text itself (the client's existing
   `spoken_message || action_text` fallback). Conservative, easy to change if the owner wants the web wording.
6. **`NATIVE_PATTERNS` is unchanged.** `tests/discover-commerce/routes.test.tsx` pins it to the provider route (outside this lane's
   paths), so `/calendar/entry/:entryId` and `/reminders/fire/:fireId` are not added. Like the merged live-room viewer they resolve
   to their concrete route files (Expo Router ranks them above the catch-all). Only `/calendar` and `/reminders` are added to
   `NATIVE_ROUTES`. Follow-up for whoever owns that test: add both patterns and allow them there, so the ORB treats the links as
   native.
7. **Active role** is the shell's `useRole().dbRole` (the active mode on mobile, VTID-03993), sent as `X-Vitana-Active-Role`.
8. **Fire deep link** fetches the reminder by id and shows the card; it does not rewrite the URL afterwards (the web strips the id
   with `history.replaceState`; a native route change would remount the screen).

## Not ported in this lane (named so the reviewer can check them)
- Calendar: the Spotlight desktop layout, the enrichment card strip, the day guide card (`guidance.ts`), the journey / work /
  calendars folding sections, the connect-a-calendar card, the subscribe sheet and Google sync card, share to the news feed
  (`ShareToFeedPanel`), and the invite-to-chat sheet. The "Reminders" section is a row that opens the native reminders screen.
- Entry screen: "Ask Vitana" (the ORB opens from the shell's orb button).
- Reminders: the "enable notifications" prompt (a browser permission; native push is registered by the shell) and the live fire
  stream with chime and voice (`ReminderInterruptOverlay` SSE path). Only the deep-link path (the push tap) is ported.
- Device-runtime parity (Maestro, screenshots) is G1, `next_actor: owner`.

## Tests
`apps/mobile/tests/calendar/` (6 suites, 90 tests): `calendar.test.tsx`, `entry.test.tsx`, `addentry.test.tsx`,
`reminders.test.tsx`, `rules.test.ts`, `lane-guards.test.ts`. Every date and time assertion compares against the locale-format
twin's output. The clock is frozen at Wed 11 Nov 2026 12:07 local (timers stay real) so the suite does not depend on the time of
day it runs. Red on `origin/main`: `red-on-base.txt`.
