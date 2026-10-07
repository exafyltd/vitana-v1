# Plan sparring record — VTID-04956 (calendar round 3: day opens in place in Week and Month)

- Partner: independent plan-sparring-partner agent (read-only), 3 rounds, verdict **CONVERGED**.
- Owner approval: given in chat on 2026-10-07 ("yes, go ahead") after the final plan message, which included the owner's Month addition.
- Plan sha256 (text between the plan markers): `8cb18a12633f3eccb72c6a9a3e3eb50704cef6bc8c2a881cb1e076761d2267a5`
- Gateway sparring tier not live yet, so the record travels in the ledger row's metadata.

# Plan: calendar round 3 — Week day opens in place; Day screen back to its earlier content (repo exafyltd/vitana-v1, checkout /home/user/vitana-v1, origin/main 44867ea + test-only PR #1266)

Change class: standard (>3 files, i18n shard text change, goldens). Frontend only; no migrations, routes, auth, .github, deploy or LLM-routing files.

Scope (expected files):
- src/components/calendar/vcal/views.tsx (WeekView and MonthView expand a day in place; DayView reverted)
- src/pages/Calendar.tsx (stop passing the add row props to DayView; pass the add handler to WeekView; Week day click no longer changes view)
- src/components/calendar/__regression__/calendar-screen.golden.test.tsx + __golden__/calendar-screen.json (re-recorded)
- tests/e2e/staging/vtid-04812-calendar-add-and-type.staging.spec.ts (read-only; assertions follow the new behaviour), docs/validation/<VTID>/staging-tests.json
- src/whats-new/entries/calendar-day-overview.json (the card text said "tap a day to land on a Day view with an add button")
- no i18n shard changes: vcal.day.addFor is reused and the panel's close button uses the existing vcal.entry.close ("Close")

<!-- plan:begin -->
### Owner request (verbatim intent, after testing round 2 on staging)
"Now the cards are nicely aligned, but when we click on a specific day within the Week, we should stay on that screen — a field opens there for entering and viewing events for that day — not transfer you to the Day view; and the content of the Day screen remains the same as before, with the card-related changes you have already made."

### Current state (verified in code on main 44867ea)
- views.tsx WeekView: every day is a card `<section>` with a header button calling onPickDay(day); Calendar.tsx pickDay does setAnchor(day) + changeView("day"), i.e. it leaves the Week screen. A day card shows at most WEEK_LIMIT=3 compact entries plus a "+N more" button that also calls onPickDay.
- views.tsx DayView (round 2, VTID-04952): add-for-this-day button on top (vcal-add-day, text vcal.day.addFor), summary line, ALL entries (DAY_LIMIT cap and "+N more" removed). Before round 2 it was: summary in the hero, first DAY_LIMIT=5 entries plus "+N more", no add row.
- Calendar.tsx keeps one AddEntrySheet (state addOpen, `day={anchor}`), opened by the "+" FAB (vcal-add) and by the DayView add row.
- MonthView day click also does setAnchor + changeView("day") through onPickDay; the owner has asked for the same in-place behaviour there (see A, Month).
- The hero (same size in all views, eyebrow Day/Week/Month, one title line, gradient day number in the Day title) is what the owner calls "the cards"; they are happy with it.

### Changes
A. Week: a day opens in place (views.tsx WeekView, Calendar.tsx).
   - WeekView gets local state `openDay` (the day whose panel is open, null by default; it resets when the week changes because WeekView is keyed by the week anchor). Clicking a day's header button, or its "+N more", toggles that day's panel; clicking the open day again closes it. The view, the hero and the toggle do not change; the screen does not scroll away (the panel opens right where the day is).
   - The open day's card is marked (the same violet `SURFACE.today` ring family as today, but a distinct "selected" treatment so that today and selected remain distinguishable: today keeps its violet date; the selected card gets a violet border).
   - The panel (new `WeekDayPanel` in views.tsx), one card in the Index look (INDEX_CARD): title = the day's long date; a full-width add button ("New entry for <day>", existing key vcal.day.addFor) that calls onAdd(day); then every entry of that day one by one in time order, as in the Day list (time column + full EntryCard, milestones as quiet markers, busy blocks as grey blocks); empty day: the existing EmptyDay text. A close button (x) with an aria-label (existing key, see E). Entries open the entry screen as today (onOpen).
   - Placement: phone/tablet (single column): the panel is rendered directly under the selected day's card, so it opens in place. Desktop (md+, 7 columns): the same element is `md:order-last md:col-span-7`, i.e. one full-width row under the week grid.
   - "Add": the panel's add button is a button, not a text field (the text/mic bar was banned earlier); it opens the existing AddEntrySheet pre-set to that day via a new `onAdd(day: Date)` that does `setAddFor(day)`. The anchor is NEVER changed by adding (a neighbouring-month cell in the Month view would otherwise move the grid to another month and shift the data range, hero title and day summary). Calendar.tsx replaces `addOpen: boolean` by `addFor: Date | null`: the "+" FAB does `setAddFor(anchor)` (unchanged behaviour: the sheet opens for the shown day), the sheet renders `{addFor && <AddEntrySheet day={addFor} .../>}` and closes with `setAddFor(null)`.
   - Month (OWNER ADDITION after the Gate 1 message: "make for the month same rule as for the week, when we are there, we are there"): MonthView gets the same behaviour. Clicking a day cell toggles that day's panel in place, under the month grid card, full width (the cells are too small to hold it); the selected cell gets the violet selected treatment (a ring, distinct from today's filled violet circle); same `DayPanel` component (renamed from WeekDayPanel) with the same content, add button and close button, one open at a time; MonthView is keyed by the month (`key={viewRange("month", anchor).from.toISOString()}` plus anchor month) so it closes when the month changes. Cells from neighbouring months can be clicked too (the 6-week grid shows them); the panel then shows that date. BOTH views lose their `onPickDay` prop (the toggle is internal state) and `pickDay` is deleted from Calendar.tsx; WeekView and MonthView both get `onOpen` and `onAdd`. Nothing else in the Month grid changes (dots, today circle).
B. Day screen back to its earlier content (views.tsx DayView, Calendar.tsx): remove the add row (vcal-add-day, props onAdd/dayLabel) and restore the VTID-04681 behaviour: re-introduce `export const DAY_LIMIT = 5` in views.tsx (it was deleted in VTID-04952; the value was 5, see `git show 9fd30c8:src/components/calendar/vcal/views.tsx`), add the local `all` state to DayView, show `entries.slice(0, DAY_LIMIT)` and render MoreButton for the rest, as before. The DayView signature changes: the `onAdd` and `dayLabel` props are REMOVED (the call site in Calendar.tsx and the four DayView calls in calendar-screen.golden.test.tsx are updated; `summary` stays). Keep the card-related changes: the shared hero and the summary line placed first in the day list (summary prop stays) — "with the card-related changes you have already made".
C. What's New card (calendar-day-overview.json): rewrite en/de so it is true: Day, Week and Month share one header; tap a day in the Week or Month to see everything planned for it and add an entry right there. Within the existing limits (title <=60, description <=220 chars, du-form). The entry is not yet published to members (production not promoted), so editing it now is safe; if it were already published the id would be kept and a new entry added instead.
D. Tests (same PR):
   - calendar-screen.golden.test.tsx: DayView tests go back to the earlier expectations (5 entries then "+N more" reveals the rest; no add row; summary present) — the "lists every entry / add row" test of round 2 is replaced; add Week tests: clicking a day header opens the panel and does NOT change the active tab/view (tab 0 not selected, `vcal-week` still present, hero unchanged), the panel lists all of that day's entries (an 8-entry day shows 8, no "+N more" inside the panel), clicking the day again closes it, the add button calls onAdd with that day, the panel has no input/textarea, only one panel open at a time; the page-level test: clicking a Week day and then its add button opens AddEntrySheet pre-set to that day (assert via the sheet's date value), and the Week hero is identical before and after. Re-record goldens, review the diff by hand.
   - The existing test "switching to week and month is remembered; picking a day returns to the day view" (calendar-screen.golden.test.tsx ~272-302) is rewritten: clicking a Month day (cell 8, Tue 6 Oct) now leaves the Month tab selected and `vcal-month` present and opens the panel (it no longer navigates to `vcal-day`); the Day view is reached by clicking the Day tab. Add a test that tapping the add button for a neighbouring-month cell leaves the anchor (hero title "Oktober 2026" and the month grid) unchanged and opens the sheet for that date.
   - typography.test.ts: still passes (no new pixel sizes, no own font; the "no text or microphone bar" assertion is kept).
   - Staging spec vtid-04812 (read-only): replace the assertion that the Day view starts with the add button by: Day view has no add row and no text field; in Week, tapping a day opens the panel in place (vcal-week still visible, tab selection unchanged) and the panel shows the add button; it never taps the add button.
E. i18n: no new key. The panel's close button uses the existing `vcal.entry.close`; the add button reuses `vcal.day.addFor`. Stamps untouched.
F. Visual verification before reporting done (as in round 2): local build pointed at the staging gateway, every request answered locally (nothing written anywhere), screenshots at 390x844 and 1400x900 of Week with a day open, Week with no day open, Day, Month; measuring that the hero height and the toggle position are identical in all views and unchanged when a Week day opens. The add button is never tapped in verification.

### Out of scope
The Month grid's look (dots, today circle), the hero, the Day view's summary placement, backend, the Vitana Index page, entry screen, add sheet internals.

### Test plan / acceptance
1. Week: click a day -> still on Week (Week tab selected, hero unchanged); a panel for that day opens under that day's card (phone) or full width under the grid (desktop); it lists every entry of that day one by one and has the add button; click again -> closes; another day -> the first closes.
2. The panel's add button opens the add sheet for that day; the sheet saves through the existing createCalendarEntry path (existing tests green); no text field appears in the panel.
3. Day screen: first 5 entries, "+N more" for the rest, no add row; summary line first in the list; hero as now.
4. Month: click a day cell -> still on Month; the panel for that date opens under the grid with its entries and the add button; click again closes; month change closes; a neighbour-month cell opens that date; the Month hero, toggle and grid are unchanged. The Day view is now reached only through the Day tab (and the ‹ › / Today buttons).
5. German and English, plus Arabic (RTL golden), no raw strings; `npm run test:calendar`, whole vitest, eslint on changed files, no new type errors; i18n gate shows only the failures `main` already has.
6. After merge: STAGING-VERIFY passes for the merge commit (read-only specs + calendar regression suite).

### Decisions taken inside the plan (listed so the owner can veto at Gate 1)
- The panel's "entering" control is an add BUTTON that opens the existing add sheet for that day (a sheet over the Week screen, so the user never leaves it). It is not an inline text field, honouring the earlier "no text/mic bar" instruction. Alternative if the owner wants the form inside the panel: embed the existing MobileEventForm in the panel (more code; not planned).
- Week AND Month change behaviour (owner addition): a day tap opens the panel in place in both; the Day view is reached via the Day tab and the ‹ › / Today buttons.
- "Day screen same as before" = the pre-round-2 content (5 entries + "+N more", no add row); the new hero and the summary-in-list stay.
- One panel open at a time; it closes when the week changes.
- Desktop (7 columns): the panel is one full-width row UNDER the whole week grid, not directly under the clicked column (a popover-style placement would need a different layout and is not planned); the clicked day's card is highlighted so the link is visible. On phone/tablet it opens directly under the clicked day.
- The What's New card text is rewritten rather than adding a second card (not yet published).
<!-- plan:end -->

### Planner responses (round 1)
- F1 [major] ACCEPTED. DAY_LIMIT was deleted in VTID-04952; I verified the original value (5) in `git show 9fd30c8:src/components/calendar/vcal/views.tsx` (`export const DAY_LIMIT = 5;`). Plan B now says re-introduce it, with the `all` state and MoreButton.
- F2 [minor] ACCEPTED. B now states that DayView loses `onAdd` and `dayLabel`, and names the call sites to update (Calendar.tsx, four golden-test calls).
- F3 [minor] ACCEPTED. Close button pinned to `vcal.entry.close`; the add-a-key fallback is dropped.
- F4 [minor] ACCEPTED as an acknowledged trade-off: desktop = full-width row under the grid with the clicked day highlighted; listed under Decisions taken for the owner to veto.
- F5 [minor] ACCEPTED. WeekView gets `key={viewRange("week", anchor).from.toISOString()}` in Calendar.tsx so `openDay` resets on week change.
- Q1 yes, 5 (verified). Q2 yes: full-width row under the grid on desktop is intended.

### Owner addition (after Gate 1 message, round 3 of the plan)
Owner wrote: "make for the month same rule as for the week, when we are there, we are there". Plan section A (Month bullet), scope, acceptance 4 and Decisions changed accordingly; the golden/staging test lines gain Month cases (same assertions as Week: stays on Month, panel opens, closes, one at a time, add button). Nothing else changed.

### Planner responses (round 2, owner's Month addition)
- F6 [major] ACCEPTED. The add path no longer touches the anchor: `addOpen` becomes `addFor: Date | null` (see section A), so a neighbouring-month cell cannot move the Month grid, query range, hero title or day summary. A test covers it.
- F7 [minor] ACCEPTED. Both views lose `onPickDay`; `pickDay` is deleted from Calendar.tsx.
- F8 [minor] ACCEPTED. Section D now rewrites the existing 'picking a day returns to the day view' golden test.

## Partner findings (summary)
- Round 1: F1 major (DAY_LIMIT no longer existed — re-introduce it, value 5 verified in git), F2-F5 minor (DayView prop removal, close-button key, desktop placement trade-off, WeekView key to reset the open day). All accepted.
- Round 2 (owner added Month): F6 major (adding for a neighbouring-month cell would have moved the Month grid — add path now uses its own addFor state), F7-F8 minor (remove onPickDay from both views; rewrite the existing 'picking a day returns to the day view' test). All accepted.
- Round 3: all closed, no new findings. Verdict converged.
