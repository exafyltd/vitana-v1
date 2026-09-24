# VTID-04459 — Calendar regression suite (app)

AC-1: Golden scenarios pin the calendar logic: the range each view requests (never over 62 days) and stepping; greeting, relative times, reminder chips and the next reminder; kind, colour, emoji and source label; gateway client requests and errors; natural-language parser; invite queue; older calendar cards.
TEST: src/components/calendar/__regression__/calendar-logic.golden.test.ts (17 tests)

AC-2: The /calendar screen is pinned as members and screen readers get it: day, week and month views, busy blocks (time only), next up, progress and entry screen; marking done, moving, refused moves and errors; the active role sent to the gateway; Arabic right-to-left.
TEST: src/components/calendar/__regression__/calendar-screen.golden.test.tsx (19 tests)

AC-3: "Show in my calendar app" and Google sync are pinned: the link is shown once, then replaced or turned off; the card stays hidden until configured, turns on and off, and asks Google for the sync permission first.
TEST: src/components/calendar/__regression__/calendar-sheets.golden.test.tsx (7 tests)

AC-4: A calendar file without a test fails the build. So does a new file parked as uncovered, or a calendar text missing or with different placeholders in any of the 11 languages.
TEST: src/components/calendar/__regression__/calendar-coverage.guard.test.ts

AC-5: The suite catches real regressions. Five deliberate breaks were each caught, and the result does not depend on the machine's timezone.
TEST: docs/validation/VTID-04459/outputs/mutation-check.txt

AC-6: CI runs it on every calendar change (`.github/workflows/CALENDAR-REGRESSION.yml`), and `npm run test:calendar` runs the suite plus the existing calendar tests. The normal unit-test job stays green: 928 tests.
TEST: docs/validation/VTID-04459/outputs/test-calendar.txt

Scope: test code, one package.json script, one workflow. No app source changed, no network, nothing written anywhere.
