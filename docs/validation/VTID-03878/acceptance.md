# VTID-03878 — Frontend: the sidebar overlapped the content in right-to-left

VTID: VTID-03878
Spec: approved (generate → validate pass → quality-check pass → approve; `outputs/spec-*.json`).
Stacked on the VTID-03876 branch. Found during the VTID-03859 Arabic screenshot sweeps, recorded then as
needing its own VTID; this is that VTID.

## The defect, measured

`src/components/ui/sidebar.tsx` builds the desktop sidebar from two elements: a **spacer** that reserves the
panel's width inside a flex row, and the **panel** itself, which is `fixed` and was pinned with the physical
inset `left-0` (for `side="left"`). The flex row follows the document's writing direction; a physical inset
does not. Under `dir="rtl"` they point at opposite sides.

Measured in a real browser at 1400×900 on `/backoffice/sales/followups` (`outputs/geometry.log`, probe in
`outputs/geometry-probe.mjs`):

| | panel | spacer | main column |
|---|---|---|---|
| LTR, before | 0 → 256 | 0 → 256 | 256 → 1400 |
| **RTL, before** | **0 → 256** | **1144 → 1400** | **0 → 1144** |
| LTR, after | 0 → 256 | 0 → 256 | 256 → 1400 |
| **RTL, after** | **1144 → 1400** | **1144 → 1400** | **0 → 1144** |

So in Arabic the content column started at x=0, underneath a 256px panel, and 256px of reserved space sat
unused at the other end. The tasks table starts at x=50, so its first 206px were covered and unclickable —
which is exactly what the Arabic sweep hit: a Playwright click on a table row landed on a sidebar link and
navigated away, and the sweep had to `dispatchEvent('click')` to work around it.

## The fix

The primitive now uses logical direction utilities throughout: `start-0`/`end-0` for the panel (with the
transition naming `inset-inline-start`/`inset-inline-end`, or the panel jumps instead of sliding),
`border-e`/`border-s` for the divider between sidebar and content, `start`/`end` for the resize rail and for
the pinned group action, menu action and badge, `text-start` for menu labels, and `border-s` plus explicit
`ltr:`/`rtl:` translates for the sub-menu rule. 14 substitutions, no behaviour added.

**Left-to-right output is unchanged by construction** — `start-0` compiles to `left: 0` there — and the
after-measurement confirms it: the LTR row is identical before and after.

## Acceptance criteria

AC-1 — In right-to-left the panel sits on its own spacer, not over the content
UI: `screenshots/02-before-rtl-overlap.png` vs `screenshots/04-after-rtl-fixed.png`; `outputs/geometry.log`
(panel 0→256 against a content column starting at 0, becoming panel 1144→1400 against a column ending at 1144).

AC-2 — Left-to-right is untouched
UI: `screenshots/01-before-ltr.png` vs `screenshots/03-after-ltr-unchanged.png`; `outputs/geometry.log` — the
two LTR rows are identical, panel 0→256 and main 256→1400 in both.

AC-3 — The cause cannot come back
TEST: `src/components/ui/sidebar.rtl.test.ts` — "uses logical properties, so the panel follows dir instead of
a physical side" walks the primitive and fails on any physical inset, border side, text alignment or
directional padding that is not explicitly `ltr:`/`rtl:`-prefixed; "pins the fixed panel and its border to the
inline axis" pins the four exact class strings. A layout measurement needs a browser, so the guard pins the
cause rather than the symptom.

AC-4 — Type-check, lint, unit tests
TEST: `outputs/checks.txt` — tsc 140 pre-existing errors (same as base), 0 in the changed file; eslint 0
errors (2 pre-existing fast-refresh warnings the file already had); `vitest run` 38 files / 262 tests (2 new);
zero physical direction utilities left in the primitive.

## Notes

- The mobile variant renders through a `Sheet` whose `side` prop is already direction-driven, so it was
  neither affected nor changed.
- This is a shared primitive: every screen with the app sidebar was affected in Arabic, not only BackOffice.
  That is why the fix is in the primitive and not in `AppLayout`, which only consumes it.
