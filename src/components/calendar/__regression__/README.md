# Calendar regression suite — app (VTID-04459)

This suite protects the calendar's existing behaviour whenever calendar code changes. The gateway half is in
`exafyltd/vitana-platform` → `services/gateway/test/calendar/` (VTID-04458).

    npm run test:calendar                              # what CI runs (CALENDAR-REGRESSION)
    UPDATE_CALENDAR_GOLDEN=1 npm run test:calendar     # re-record after an intended change

| File | What it covers |
|---|---|
| `calendar-logic.golden.test.ts` | The date range each view requests and how ‹ › step. Greeting, "in …", reminder chips and the next reminder. Kind, colour, emoji and source label. Gateway client requests and errors. The natural-language parser, the invite queue, and the older calendar cards. |
| `calendar-screen.golden.test.tsx` | The /calendar page and its views, cards, busy blocks and entry screen, in German and in Arabic (right-to-left). Marking done, moving, refused moves, errors, and the role passed to the gateway. |
| `calendar-sheets.golden.test.tsx` | The "Show in my calendar app" sheet and the Google sync card. |
| `calendar-coverage.guard.test.ts` | Every calendar file has a test. Every calendar text exists in all 11 languages. CI runs everything listed. |
| `__golden__/*.json` | The recorded expected outputs. Screens are kept as their visible text, labels and roles. |

The suite fixes the device timezone to Europe/Berlin itself, so results never depend on the machine it runs on.

When a change is **meant** to alter calendar behaviour, re-record the golden files and commit the diff in the same
PR, so the reviewer sees exactly which scenario changed. When a change is not meant to alter it, a failure here
is the bug.

New calendar code needs a test and an entry in `manifest.json`. The `uncovered` list holds the older calendar
UI that had no tests when this suite was built. It may only shrink.

Current behaviour this suite records but that is wrong (in `parseCalendarNL`, used by the older quick-add
input). If you fix one, re-record `nl.parse`:
- "übermorgen" lands on today;
- ranges like "14-16h" and "2-4pm" are ignored, so the entry gets the current time;
- "remind 1 hour" leaves "our" in the title.
