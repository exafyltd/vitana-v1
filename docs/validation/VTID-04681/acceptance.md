# VTID-04681 / VTID-04682 — a clean, calm calendar; connecting a calendar app that works

Owner feedback 2026-09-26 / 2026-09-28: every day was full of entries nobody
asked for; almost everything was bold; today's date was not prominent; the
Google / Apple / Outlook connect should be prominent and actually work.

AC-1: today's date leads the day view — large day number, weekday, "Heute · month year" — and a one-line summary replaces the progress ring and "next up" card.
  TEST: src/components/calendar/__regression__/calendar-screen.golden.test.tsx
AC-2: two weights only (normal, medium); no bold / extra-bold / semibold in any calendar screen.
  TEST: src/components/calendar/vcal/typography.test.ts
AC-3: a day shows at most 5 entries then "+N weitere"; a week column 3; a month cell at most 3 dots.
  TEST: src/components/calendar/__regression__/calendar-screen.golden.test.tsx
AC-4: a goal-plan milestone is a quiet marker, never counted as an entry.
  TEST: src/components/calendar/__regression__/calendar-screen.golden.test.tsx
AC-5: goal-plan habits live in Journey; one enters the calendar only when the member picks a time and taps "Eintragen" (daily until the plan's target date, through the gateway).
  TEST: src/components/calendar/vcal/sections.test.tsx
AC-6: staff work (reviews, ticket deadlines, approvals) is one folded line, fetched with include_work=true; members never ask for it; the calendar itself never shows work items.
  TEST: src/components/calendar/vcal/sections.test.tsx
AC-7: while no calendar app is connected, the day view shows the connect card right under the date; tapping an app whose sign-in is set up hands off to Connected Apps, otherwise opens the subscription sheet for that app.
  TEST: src/components/calendar/vcal/sections.test.tsx
AC-8: the subscription sheet opened for an app links straight to that app's add-by-URL page (Google cid=webcal, Outlook addfromweb, Apple webcal).
  TEST: src/components/calendar/vcal/typography.test.ts
AC-9: Vitana's suggestion card can be dismissed for the day.
  TEST: src/components/calendar/vcal/sections.test.tsx

Verified on a local build of this branch against the staging gateway,
read-only (every write aborted, production never contacted), 390x844 and
1400x900: date header, summary, caps, habits, connect card, per-app sheet,
no text heavier than 500, no horizontal scroll. Screenshots in the PR.
