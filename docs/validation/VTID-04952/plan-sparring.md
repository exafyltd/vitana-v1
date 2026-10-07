# Plan sparring record — VTID-04952 (calendar design round 2)

- Partner: independent plan-sparring-partner agent (read-only), 3 rounds, verdict **CONVERGED**.
- Owner approval: given in chat on 2026-10-07 ("yes, approved, go ahead") after the final plan message.
- Plan sha256 (text between the plan markers): `d2d5bde6ae3897fd760ccb5c9d400c18cfc1e81a5a4e2f2703939e91106dea3b`
- Gateway sparring tier not live yet, so the record travels in the ledger row's metadata (`sparring_record`, `plan_hash`).

# Plan: calendar design round 2 (repo exafyltd/vitana-v1, checkout /home/user/vitana-v1, origin/main 17d8e15)

Change class: standard (touches >3 files, i18n shards in 11 locales, golden snapshots). Frontend only; no migrations, routes, auth, .github, deploy or LLM-routing files. No backend change.

Scope (expected files):
- src/pages/Calendar.tsx (hero + eyebrow + day add row wiring)
- src/components/calendar/vcal/views.tsx (DayView)
- src/lib/index-look.ts, src/lib/index-look.test.ts (drop the Index's number gradient/glow from the shared look)
- src/components/calendar/vcal/theme.ts (SURFACE.today)
- src/components/calendar/vcal/typography.test.ts (pixel-size allowance for 84px goes away)
- src/components/calendar/__regression__/calendar-screen.golden.test.tsx + __golden__/*.json (re-recorded)
- src/i18n/<locale>/*.json for 11 locales + i18n-source-stamps/<locale>.json (one new string)
- tests/e2e/staging/vtid-04812-calendar-add-and-type.staging.spec.ts, tests/e2e/staging/vtid-04681-calendar-clean.staging.spec.ts, docs/validation/<VTID>/staging-tests.json
- src/whats-new/entries/<id>.json (EN + DE du-form)

<!-- plan:begin -->
### Owner requests (verbatim intent)
1. Make the Day card the same size and dimensions as the Week and Month cards. No big empty space; content below the DAY / WEEK / MONTH toggle starts at the same vertical position in all three views.
2. Change the day-number colour: it is too reminiscent of the Vitana Index. The Vitana Index must remain recognisable as such.
3. On Week and Month cards replace the eyebrow "CALENDAR" with "Week" / "Month", so the card says what the overview below refers to.
4. Clicking a day in the Week (or Month) goes to the Day overview; the user expects the usual pattern: a place to enter a new event for that day, and a quick one-by-one overview of all events of that day.

### Current state (verified in code)
- Calendar.tsx:373-390: in Day view the hero shows the eyebrow "Today · <month year>", an 84px number (class text-[84px], style INDEX_NUMBER_STYLE, a teal-green gradient copied from VitanaIndexDetail.tsx:183, plus INDEX_GLOW_STYLE glow), the weekday as h1, and a summary line `vcal-summary`. Week/Month heroes show eyebrow t("vcal.title") ("Calendar") and a one-line h1 (rangeTitle). Hence the Day hero is ~2x taller (see owner screenshots).
- The nav buttons row (prev/next, Today pill) sits below; ViewSwitch sits directly under the hero, so the toggle and everything below it sits lower in Day view.
- views.tsx DayView: lists entries with a DAY_LIMIT=5 cap plus "+N more" (VTID-04681 "never floods"); WeekView day cards call onPickDay(day) -> setAnchor(day) + changeView("day"). MonthView day cells do the same.
- The "+" FAB (data-testid vcal-add) opens AddEntrySheet day={anchor}, so adding for the picked day already works, but there is no visible add affordance in the Day list.
- src/lib/index-look.ts INDEX_NUMBER_STYLE/INDEX_GLOW_STYLE are pinned to VitanaIndexDetail.tsx by src/lib/index-look.test.ts:35; typography.test.ts:47-48 asserts the calendar uses them with text-[84px].
- Owner standing instruction (this conversation, earlier): NO text field / mic bar in the calendar; entries only via the "+" button and ORB voice. The previous round removed exactly such a bar.

### Changes
A. One hero for all three views (Calendar.tsx). Same markup, same height class in Day, Week, Month: eyebrow, one h1 line, prev/(Today)/next row. No 84px number, no glow, no summary line inside the hero.
   - Eyebrow: Day -> t("vcal.views.day") ("Day"/"Tag"), Week -> t("vcal.views.week"), Month -> t("vcal.views.month"). No new keys; they already exist for the toggle. (Replaces both "Today · month" and "Calendar".)
   - h1 Day: weekday + date on one line, e.g. "Wednesday, 7 October" built with formatDate/fmtDate from @/lib/locale-format (locale-aware, not raw toLocale*); the day-of-month number inside the h1 is the only coloured element (see B).
   - h1 Week/Month: unchanged (rangeTitle).
   - The one-line day summary ("Nothing planned", "3 entries · next 14:30") moves out of the hero to the first line of DayView content (a small muted line above the list, keeping data-testid vcal-summary). This changes where content starts only inside the Day content area; the hero and toggle positions are identical in all views.
B. Number colour (theme.ts, index-look.ts, Calendar.tsx). OWNER UPDATE (after Gate 1 message): the day number should be "some nicely blended, lively colour". It is a blended gradient, not a solid: a warm sunset blend orange-700 (#C2410C) -> pink-600 (#DB2777) -> violet-700 (#6D28D9), applied as background-clip text to the day-of-month number inside the Day h1, defined as CALENDAR_NUMBER_STYLE in theme.ts (the calendar's own look, not index-look.ts). No teal/green, so the Vitana Index (teal-green number) stays unmistakable. No glow. A unit test checks each gradient stop has >=3:1 contrast against the hero's lightest and darkest background colours (large bold text, WCAG 2.2 AA). Remove the INDEX_NUMBER_STYLE and INDEX_GLOW_STYLE exports from index-look.ts. In index-look.test.ts remove the INDEX_NUMBER_STYLE import (L14) and the L35 assertion; every other pin (card, buttons, hero, eyebrow, tile, next-up) stays, so the Index page guard is unchanged. In typography.test.ts remove the INDEX_NUMBER_STYLE (L47) and text-[84px] (L48) assertions and add: Calendar.tsx does not contain INDEX_NUMBER_STYLE, INDEX_GLOW_STYLE or any text-[Npx] size. VitanaIndexDetail.tsx is not edited. SURFACE.link stays teal (#0F766E). The "today" markers in Week (ring + date) and Month (circle) use SURFACE.today = "#6D28D9" (the violet end of the blend, solid, white text on the Month circle is 7.1:1) so today has one family of colour across views.
C. Same-size cards. The container max-width (Calendar.tsx:369, max-w-2xl day/month, max-w-6xl week) is unchanged; the hero card now has identical markup and height in all three views by construction. Verified in the golden/DOM tests by asserting the header class list is identical across views, and in the browser by measuring the header box.
D. Day overview pattern (views.tsx DayView, Calendar.tsx):
   - A visible full-width "add" row at the top of the Day list: a button, not a text field: label "New entry for <weekday, d. month>" (one new i18n key, vcal.day.addFor, with {date}); it calls the same setAddOpen(true) as the FAB with day={anchor}, so AddEntrySheet opens pre-set to that day. No inline input is added, honouring the owner's earlier "no text/mic bar" rule. The FAB stays.
   - The list shows ALL of the day's entries one by one in time order (remove DAY_LIMIT cap and the "+N more" button in DayView; DAY_LIMIT export removed; WEEK_LIMIT, MONTH_DOTS unchanged). Milestones stay as quiet markers above the entries. Empty day keeps EmptyDay.
   - Week day card "+N more" and the day header still jump to the Day view as before.
E. i18n: add vcal.day.addFor to src/i18n/de first (du-form where applicable), then en, es, sr, ar and the other shipped shards (all 11 locales present in the repo for the vcal namespace), stamps via `node scripts/i18n-stamp-source.mjs`, check with --check-all. RTL: only logical classes (ms-/me-/text-start) in new markup. Run `npm run i18n:inventory` and commit the regenerated docs/SCREEN_INVENTORY.md.
F. Tests (same PR):
   - Update calendar-screen.golden.test.tsx assertions: header eyebrow per view, h1 content, summary now in DayView, add row present, all entries listed (a case with 7 entries shows 7), no "+N more" in day; re-record goldens with UPDATE_CALENDAR_GOLDEN=1 and review the diff by hand.
   - typography.test.ts: drop the 84px/INDEX_NUMBER_STYLE assertions; assert no px sizes at all and no teal-gradient number style in Calendar.tsx.
   - index-look.test.ts: remove the number/glow pins.
   - New unit test: DayView renders the add row and calls onAdd; renders >5 entries without a "+N more".
   - Confirm the existing "no text or microphone bar" assertion (typography.test.ts:52-56) still passes: the new add row is a button, its testid is vcal-add-day and its label does not match vcal-voice-add / voiceAdd / the mic emoji.
   - Staging specs (read-only, GET/navigate only): update vtid-04812 spec (weekday/title assertions use the new h1 / data-testid) and vtid-04681 spec (vcal-date/vcal-summary locators); new docs/validation/<VTID>/staging-tests.json listing them plus `npm run test:calendar`. Staging specs never create entries.
G. What's New card: src/whats-new/entries/<id>.json (EN + DE du-form) announcing the new "new entry for this day" row and the tidier calendar header, per CLAUDE.md VTID-04733 (user-visible redesign).
H. Visual verification before reporting done (CLAUDE.md Targeted Visual Verification): local build pointed at the staging gateway; sign-in is the only request that is not a GET; screenshots of Day, Week, Month at 390x844 and 1400x900, plus Day reached by clicking a day in Week. The add row is never tapped during verification (its behaviour is proven by the Vitest test); nothing is written to any live system.

### Out of scope
Backend/gateway, the Vitana Index page, the connect-card, section cards, entry screen, week/month cell internals other than the today colour.

### Test plan / acceptance
1. Day, Week, Month: hero card has identical height (measured bounding box within 1px at 390 wide for same locale) and the toggle top and the first content element top are identical across the three views.
2. Day number is the orange-pink-violet gradient (contrast-checked), no teal/green; Vitana Index page unchanged (VitanaIndexDetail.tsx untouched, its own tests green).
3. Week/Month eyebrow reads Week/Month (DE: Woche/Monat); Day eyebrow reads Day/Tag.
4. Click a day in Week and Month -> Day view for that day, add row visible at the top, shows that day's entries in time order, all of them (7-entry case).
5. Tapping the add row opens AddEntrySheet with that day; saving still goes through createCalendarEntry (existing tests green).
6. German, English, Arabic (RTL) golden renders; no raw strings (eslint i18n rules clean); `npm run test:calendar`, `npm run lint`, `npx tsc --noEmit -p tsconfig.app.json` (no new errors versus origin/main), i18n stamp check.
7. After merge: STAGING-VERIFY for the merge commit passes (smoke + the new staging-tests.json).

### Decisions taken inside the plan (listed so the owner can veto at Gate 1)
- Overrides VTID-04681's "a view never floods" for the DAY view only: the owner's request 4 asks for every event of the day one by one. WEEK_LIMIT and MONTH_DOTS stay. The views.tsx header comment is updated to say so.
- SURFACE.link stays teal (#0F766E). New constants in theme.ts: CALENDAR_NUMBER_STYLE (the sunset gradient for the Day h1 number) and SURFACE.today = "#6D28D9" (solid, for the Week/Month today markers); nothing hardcodes colours in views.tsx.
- Add affordance is a button row that opens the existing sheet, not an inline text field (owner banned the text bar earlier).
- "Same size" interpreted as: one hero component/height for all three views; day summary line moves into the Day content.
- New number colour: a lively sunset gradient (orange, pink, violet), per the owner's follow-up; today markers in Week/Month use its violet end.
<!-- plan:end -->


### Planner responses (round 1)
- F1 [major] ACCEPTED. Plan now states the override of VTID-04681 for the Day view only, updates the views.tsx header comment, and lists it under Decisions taken.
- F2 [major] ACCEPTED. Section B now names the exact assertions removed per file (index-look.test.ts L14 import + L35; typography.test.ts L47-48) and adds a negative assertion; the Index-page pins stay.
- F3 [minor] ACCEPTED. SURFACE.link stays teal; new SURFACE.today (indigo-600) constant in theme.ts used by the three today markers.
- F4 [minor] ACCEPTED. Section C reworded: container max-width untouched, hero identical by construction.
- F5 [minor] ACCEPTED. Section H states read-only precisely; the add row is not tapped in verification.
- F6 [minor] ACCEPTED. Section F confirms the no-text/mic-bar assertion; testid vcal-add-day.
- Q1 yes intentional; header comment updated. Q2 constant SURFACE.today (theme.ts added to scope). Q3 index-look.test.ts has no glow assertion; only the L14 import and L35 assertion go.


### Owner follow-up (after Gate 1 message, round 3)
Owner wrote: "The day number can be in some nicely blended, lively color". Plan section B, Decisions taken and test plan item 2 changed accordingly: gradient (orange-pink-violet) instead of solid indigo, with a contrast guard test; today markers use the violet end. Nothing else changed.

### Planner responses (round 3)
- F7 [major] ACCEPTED, verified by calculation: orange-600 #EA580C is 2.96:1 against the hero's darkest stop hsl(200,80%,91%), under the 3:1 guard. The first stop is now orange-700 #C2410C (4.31:1 against that stop, 4.47:1 against the lightest); pink-600 #DB2777 is 3.82:1 and violet-700 #6D28D9 is 5.91:1 against the same stop; white on #6D28D9 is 7.1:1. The guard test keeps the >=3:1 rule over all four hero stops (208/72/93, 200/80/91, 212/72/94, 225/65/95) for every gradient stop.

## Partner findings (verbatim summary)
- Round 1: F1 major (DAY_LIMIT override unacknowledged), F2 major (imprecise test-update instructions), F3-F6 minor (SURFACE.link vs today markers, container-width wording, read-only visual verification wording, no-text-bar assertion). All accepted; closed in round 2.
- Round 3 (owner changed the number colour to a blended gradient): F7 major — orange-600 #EA580C is 2.96:1 against the hero's darkest stop, under the 3:1 guard. Accepted (orange-700 #C2410C, 4.31:1); closed. Verdict converged.
