# VTID-03943 — HiddenByLimitationsFooter `past_purchases` row test coverage

## Context

Rung 4 of a 5-rung staged trust-building exercise for the Operator/autopilot
execution plane, executed directly by this Claude Code session per explicit
platform-owner instruction. Cross-repo companion to
`exafyltd/vitana-platform` VTID-03943, which fixes the actual backend bug
(`/api/v1/discover/search`'s `hidden_breakdown` silently undercounted
past-purchase exclusions — only `/discover/feed` reported them correctly).

## What this repo's half covers

`HiddenByLimitationsFooter.tsx` already fully supported a `past_purchases`
key in its `HiddenBreakdown` type and its `REASON_LABELS` map — it was
already correct, and needed no code change. But it had **zero test
coverage** before this VTID, on either the `past_purchases` row or any
other reason. That's the same shape of gap that let the backend bug go
unnoticed: nothing anywhere asserted that a non-zero `past_purchases` count
actually renders, sorts, and totals correctly, so a regression on either
side (a backend field rename, a frontend label-map typo) would have gone
undetected identically to the original bug.

## Fix

New test file: `src/components/discover/HiddenByLimitationsFooter.test.tsx`
— no component code changes (none needed).

## Acceptance Criteria

AC-1 — Renders nothing when `breakdown` is null, and nothing when every
count (including `past_purchases`) is zero.

AC-2 — A non-zero `past_purchases` count is included in the total shown on
the collapsed header, and its row appears with the correct text once
expanded.

AC-3 — When combined with another non-zero reason, both rows render, sorted
by count descending (matching the component's own sort behavior), and the
total sums across both.

AC-4 — When `past_purchases` is absent from the breakdown (the pre-fix
Search response shape), its row is correctly omitted rather than rendered
as "undefined" or a stray row — i.e. the component degrades safely against
the exact malformed-but-real shape the backend bug was producing.

TEST: `src/components/discover/HiddenByLimitationsFooter.test.tsx` — 5
tests covering all four criteria above.

## Verification (against mocked i18n only — no network/backend calls)

- `tsc --noEmit`: clean (`outputs/tsc-noemit.txt`).
- New suite: `outputs/vitest-new-suite.txt` — 5/5 passing.
- Full frontend suite (regression check): `outputs/vitest-full-suite.txt`
  — 117/117 test files, 624/624 tests passing, 0 failures.

`react-router-dom`'s `Link` is exercised via a real `MemoryRouter` wrapper
(this repo's established pattern for components using `Link` — see
`ProfileDrawer.test.tsx`), and `@/lib/i18n-toast`'s `t()` is mocked to
return either the key or a deterministic templated string — no live
Supabase/gateway call of any kind, per this repo's absolute rule.

## What this does NOT do

- Does not modify `HiddenByLimitationsFooter.tsx`, `useMarketplace.ts`, or
  any consumer page (`Discover.tsx`, `discover/Supplements.tsx`) — all
  already correctly wired for this field.
- Does not touch sidebar navigation, Wallet routes, or any other
  forbidden-by-CLAUDE.md surface.

## OASIS impact

OASIS_IMPACT: no — test-only addition, no schema or event changes.
