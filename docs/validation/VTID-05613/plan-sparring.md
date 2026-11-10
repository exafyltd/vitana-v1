# Plan sparring record: Vitana Index sheet above the chat layer (PR #1621)

Plan hash (sha256 of the text between the plan markers): b20080138639fe7eca7bcf79ccb77503ebb286310aa0268d3d776f2b115f69e9

Sparring partner: independent plan-sparring-partner agent, read-only, round 1.
Verdict: CONVERGED (no blocker or major). Minor findings: F1 no overlay dimming above the chat layer (accepted, documented); F2 overflow-y-auto sentence added to the plan; F3 no other sheet affected (none).
Owner instruction (Claude Code session 2026-11-07): fix and test on staging.

## Final plan

<!-- plan:begin -->
## Problem
The Vitana index card inside the Vitana chat opens the Index sheet. The sheet content is z-50 (shared sheet classes).
The Messages chat is a full-screen layer at z-[55] (src/pages/Messages.tsx:1281). The sheet renders under that layer,
so the screen looks frozen and the sheet is hidden. Reproduced in a headless browser: with a z-[55] layer present the
sheet screenshot was blank.

## Change
SheetContent in VitanaIndexSheet.tsx gets className "overflow-y-auto z-[60]". cn() merges, so z-[60] overrides z-50.
The overlay stays z-50 (behind the chat layer; no dimming, no blocking). No other behaviour changes.
`overflow-y-auto` is an addition unrelated to the z-index fix: the Index sheet has three scrollable sections (Today, Next few days, 30-day horizon), so long content needs to scroll.

## Test plan
- Headless check with a simulated z-[55] layer: sheet visible above it after the fix (screenshot overlay-after/index-overlay.png).
- Existing health tests (tests/health, src/components/health) run in CI.
- Not verified: inside the real Vitana chat on a device or staging.
<!-- plan:end -->
