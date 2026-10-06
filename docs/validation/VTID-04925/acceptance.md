# VTID-04925 — Partner Terms sheet: tick and Accept always reachable

Reproduced on staging (read-only): at 1280×600 the wide-layout sheet had no height limit, the top was clipped and
Accept sat at 686–734 px, unreachable by scrolling; phone layouts were fine. Layout-only fix in
`src/components/commerce/PartnerTermsSheet.tsx`; no terms content, acceptance logic, backend or legal flow change.

- AC-1: wide screens (≥1024 px): sheet capped at the window height; header top, footer bottom, body scrolls.
- AC-2: one scroll area at every size (no nested scroll box); language switch returns to the top of the body.
- AC-3: the tick + explanation sit in the footer with Close/Accept; both visible without scrolling at 390×600,
  412×480 and 1280×600. Accept stays disabled until ticked.
- AC-4: unchanged behaviour (unit tests): unticked by default, switching keeps the tick and never accepts, accept
  body unchanged.

Tests: `tests/e2e/staging/vtid-04925-partner-terms-reachable.staging.spec.ts` (staging, read-only, Accept never
clicked) and `src/components/commerce/PartnerTermsSheet.vtid-04909.test.tsx`. What's New: skipped (fix).
Not changed: the shared `responsive-dialog.tsx` has the same wide-window height issue for other dialogs (several
already work around it) — a separate VTID if wanted.
