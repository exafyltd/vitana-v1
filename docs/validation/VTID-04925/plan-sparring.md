# VTID-04925 — Plan sparring record

- Plan Sparring Gate: VTID-04868. Partner: `plan-sparring-partner` (independent, read-only).
- Change class: standard. Rounds: 3 (cap).
- Final plan hash: `877e9c8b745c79979d6e1892ef4c21fa08fe5eb8990fb5a0b3abee55d9963bdb`
- Verdict: **converged**. Owner approval: in session 2026-10-06 ("yes, approved, proceed").

## Final plan

<!-- plan:begin -->
## Problem (reproduced on staging, read-only, page.route mocks as in the VTID-04909 spec)
`src/components/commerce/PartnerTermsSheet.tsx` renders inside `ResponsiveDialogContent` (`src/components/ui/responsive-dialog.tsx`).
- Mobile layout (`useIsMobile`, width < 1024, `fullscreenOnMobile`): OK at 412×915, 390×600, 412×480, 360×640 — footer
  (Close/Accept) stays at the bottom; body scrolls.
- Desktop layout (width ≥ 1024): the content is a centered box (`top-[50%] translate-y-[-50%]`) with NO max-height
  and no overflow handling. At 1280×600 the Accept button sits at 686–734 px (viewport 600) and the top is clipped;
  wheel scrolling cannot reach it. This matches the owner's report (wide window + DevTools docked).

## Change (one component file + test updates; layout/scroll classes only)
`src/components/commerce/PartnerTermsSheet.tsx`:
1. One scroll surface at every size: the dialog body. Desktop (`lg:` = ≥1024 px, same breakpoint as `useIsMobile`):
   content `lg:max-h-[calc(100dvh-2rem)] lg:flex lg:flex-col lg:overflow-hidden`, the component's inner wrapper
   `lg:[&>div]:min-h-0 lg:[&>div]:flex-1` (the only `div` child on desktop; Close is a button), body
   `lg:min-h-0 lg:flex-1 lg:overflow-y-auto`. Mobile: body already `flex-1 overflow-y-auto`; add `min-h-0`.
   The terms text box loses its own `max-h-[50vh] overflow-y-auto md:max-h-96` cap, so there is no nested scroll
   container; the whole body (version, language, binding notice, text) scrolls as one.
2. Language switch keeps "back to the top of the text": the body gets `data-terms-body`, and `switchTo` resets
   `closest('[data-terms-body]')?.scrollTo?.({ top: 0 })` instead of the inner box (UI only; switch logic unchanged).
3. Move the checkbox + explanation from the end of the body into the footer, above the buttons, so both acceptance
   controls are on screen together at every size. Footer className becomes exactly
   `flex-col gap-3 sm:flex-col sm:justify-start sm:space-x-0` — the `sm:` overrides are needed because
   `ResponsiveDialogFooter`'s desktop base carries `sm:flex-row sm:justify-end sm:space-x-2` (responsive-dialog.tsx:199-204)
   and tailwind-merge only drops a base class when the override has the same breakpoint; the buttons sit in a nested
   `flex gap-2 justify-end` row (each `flex-1` below `sm`).
4. No change to: terms text, i18n keys/strings, testids, `agreed` state, `accept()`/`load()`, the disabled condition
   `!agreed || saving || switching`, the binding notice, the shared `responsive-dialog.tsx`, the gateway or any legal
   flow. What's New: skipped (layout fix, not a new feature).

## Tests
- Vitest `PartnerTermsSheet.vtid-04909.test.tsx` unchanged and must stay green (testids/behaviour unchanged); add
  one assertion that `partner-terms-agree` and `partner-terms-accept` are inside the dialog footer element.
- Staging Playwright (read-only, existing guard + page.route mocks): extend the VTID-04909 spec, or add a new spec,
  asserting at 390×600 (narrow mobile), 412×480 (short mobile) and 1280×600 (short desktop) that `partner-terms-agree`
  and `partner-terms-accept` are within the viewport without any scrolling, and that the terms text can still be
  scrolled (body scrollTop increases on wheel). The existing `scrollIntoViewIfNeeded` on the checkbox (spec:171)
  stays harmless; the new assertions check visibility WITHOUT scrolling. Accept is never clicked.
- Before merge: screenshots from the PR preview (or a local build if the preview is unavailable) at the same three
  sizes, shown to the owner; merge only after the owner looks at them.

## Risk
Small: classes on one component. The desktop change only applies ≥1024 px; the checkbox move changes position, not
logic. RTL: logical classes only (`ps-`, `me-`), no left/right.

Change class: standard (UI change, >1 file with tests).
<!-- plan:end -->

## Round 1 — partner findings (summary)
Verified: desktop content centered with no max-height (responsive-dialog.tsx:80-87, 112-116); useIsMobile < 1024
(use-mobile.tsx:3,8); checkbox inside the body (PartnerTermsSheet.tsx:264-277); `[&>div]` targets only the wrapper.
- F1 [major] nested scroll containers (body + inner text max-h-[50vh]).
- F2 [major] `[&>div]` selector not lg-scoped.
- F3 [minor] "one file" wording. F4 [minor] footer `sm:flex-row` would flatten the column.
- F5 [minor] staging spec's scrollIntoViewIfNeeded. F6 [minor] shared dialog bug for other consumers.
- F7 [minor] What's New rule not addressed. Verdict: NOT CONVERGED.

## Planner responses — round 1
F1 ACCEPTED (single scroll surface; inner cap removed; scroll reset via `closest('[data-terms-body]')`), F2 ACCEPTED,
F3 ACCEPTED, F4 ACCEPTED, F5 ACCEPTED, F6 DEFERRED (out of owner-scoped task; noted in PR), F7 ACCEPTED (skipped, fix).

## Round 2 — partner
F1, F2, F3, F5, F7 closed; F4, F6 acknowledged. New F8 [blocker]: `flex-col gap-3` does not neutralize the base
footer's `sm:flex-row sm:justify-end sm:space-x-2` (responsive-dialog.tsx:199-204; tailwind-merge only drops a class
at the same breakpoint). Single-scroll change and the scroll reset verified sound. Verdict: NOT CONVERGED.

## Planner responses — round 2
F8 ACCEPTED — footer className exactly `flex-col gap-3 sm:flex-col sm:justify-start sm:space-x-0`.

## Round 3 — partner
F8 closed. No new findings. Verdict: **CONVERGED**.
