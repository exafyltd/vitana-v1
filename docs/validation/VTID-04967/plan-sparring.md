# VTID-04967 — plan sparring record

- **Plan hash (sha256 of the text between the plan markers):** `4c5b57c29144fdf50cd8def32ea42f8f608ef39db81d8f4ae8ee264fca978a43`
- **Partner:** `plan-sparring-partner` agent (independent, read-only; saw only the plan file)
- **Rounds:** 2 (round 1: F1–F5 minor + 2 questions, F2 retracted by the partner; round 2: all closed, no new findings)
- **Verdict:** CONVERGED
- **Owner approval:** d.stevanovic@exafy.io in the Claude Code session, 2026-10-08 — "go ahead" (Gate 1). Binding exafy_admin click pending (`POST /api/v1/plans/spar/:id/approve`).

## Final plan

<!-- plan:begin -->
## Verified facts (read-only)
1. The shipped Month/Week behaviour (VTID-04956, live on production: the live Calendar chunk contains `vcal-day-panel`, `vcal-month-day`, `vcal-add-day`) opens `DayPanel` in place: Month renders it under the grid (`src/components/calendar/vcal/views.tsx` MonthView, `{openDay && <DayPanel …/>}`), Week renders it after the list (`md:order-last md:col-span-7`).
2. Nothing scrolls it into view. Measured on the production build served locally (Playwright, mocked data, 1 tap on a middle cell): the panel exists, its top is at y=640 on a 390×844 phone and on a 360×740 phone, scrollY stays 0. The page has a fixed bottom nav (~60px) and the "+" FAB (`Calendar.tsx:460`, `fixed … bottom-20`); on 390×844 only the panel's title and the add button's upper half are visible; on 360×740 only the title row. The entries list and "Nichts geplant" are below the fold. To the member "nothing opened". The page does have `pb-40`, so there is room to scroll.
3. The shipped tests assert the panel exists and its contents, never that it is on screen, which is why it passed staging verification.

## Change
A. `DayPanel` (views.tsx): a ref on its root; an effect that runs when the panel mounts or its `day` changes and calls `el.scrollIntoView({ block: "nearest", behavior: reduced-motion ? "auto" : "smooth" })`. The root gets `scroll-mb-28` (clears the bottom nav + FAB) and `scroll-mt-4`, which `scrollIntoView` honours. `block:"nearest"` means: no scroll when the panel is already fully visible (desktop, short months), the minimum scroll otherwise. Applies to Month and Week, which share `DayPanel`. Closing the panel does not scroll. No other behaviour changes; the Day view is untouched.
B. Tests (vitest): `DayPanel` calls `scrollIntoView` once on open and again when another day is opened, not on close and not on unrelated re-renders; honours `prefers-reduced-motion`. The existing calendar goldens stay unchanged (no DOM/class change visible to them except the added class — regenerated only if they pin the class list).
C. Visual verification before reporting done (CLAUDE.md rule 26): Playwright on the built app at 390×844 and 360×740, Month and Week: tap a day, then assert the panel's bottom edge is above the bottom nav and the "Neuer Eintrag" button is fully visible; screenshots read.
D. Staging spec (read-only, `tests/e2e/staging/vtid-04812-calendar-add-and-type.staging.spec.ts`, already taps Month/Week days): after the tap, assert the panel's top and the add button are inside the viewport (phone viewport project) — this is the check that was missing.
E. What's New: skipped (fix). `docs/validation/<VTID>/` evidence pack + sparring record.

## Out of scope
Changing where the panel opens (owner decision: in place, under the Month grid / Week list); the Day view; the app-wide audit of other screens (separate, not yet decided by the owner).
<!-- plan:end -->

## Planner responses

## Planner responses (round 1)
- F1 ACCEPTED — the plan now says it outright: the Vitest tests stub `Element.prototype.scrollIntoView` with `vi.fn()` (jsdom has none) and assert on the calls; no real scroll is relied on in the test runner. Plan text B is amended accordingly (below the markers, as the plan body is otherwise unchanged).
- F2 RETRACTED by the partner — `scroll-mb-28` / `scroll-mt-4` are valid Tailwind (scroll-margin-bottom/top). No change.
- F3 ACKNOWLEDGED — correct and intended: a small window scrolls minimally, a big one does not.
- F4 ACKNOWLEDGED — C is the pre-merge local check on the built app, D is the staging gate; both stay.
- F5 ACCEPTED (factual) — line 460 is the wrapper div; the FAB button is at 463–469. Does not change the fix.
- Q1 ANSWERED — Week on desktop: the panel spans all 7 columns after the list and is usually already inside the viewport, so `block:"nearest"` does nothing there; on a phone (single column) it scrolls minimally. Visual verification (C) covers both Week and Month at 390×844 and 360×740, plus one desktop width (1400×900) to confirm no jump.
- Q2 ANSWERED — `DayPanel` is not keyed by day, so the instance is reused when another day is opened; the effect depends on `[day]` and re-fires. A test pins this (open day A, open day B → second call).

## Implementation note (inside the approved plan)
The bottom scroll margin is `scroll-mb-36`, not `scroll-mb-28`: measured on the built app the "+" button overlapped the panel's bottom-right corner by ~20px at 28; at 36 the panel clears the bar and the "+" at 390×844, 360×740 and 1400×900.
