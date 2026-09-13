# VTID-03858 — Frontend: BackOffice Reports Read screens

VTID: VTID-03858
Spec: approved (generate → validate pass → quality-check pass, known CRITICAL risk label → approve; `outputs/spec-*.json`).
Backend: `exafyltd/vitana-platform#3291` (VTID-03842 orchestrator) — not on staging yet; its migration awaits the owner's "apply now".
Stacked on the VTID-03857 branch (Accounting Read screens).

## What shipped

- `src/lib/backoffice-reports.ts` — ERPClaw P&L / AR-aging / AP-aging shapes (captured from a real ERPClaw-on-Postgres
  instance, `outputs/erpclaw-shapes/`) and helpers: `presetWindow` (year to date / this month / last month / this quarter /
  last year as calendar dates), `agingTotals`, `overdueShare` (everything past 30 days; net-credit books never yield -0),
  `netMargin`, `sortByAmountDesc` (6 tests).
- BO-046 P&L — `reports.pnl` over a preset window: income / expenses / net income / margin KPIs, income and expenses by
  account with share of total, largest first.
- BO-050 AR / AP Aging — `reports.ar_aging` + `reports.ap_aging` as of today: outstanding receivables, payables, overdue
  (> 30 days) KPIs; per-customer and per-supplier bucket tables (current, 1–30, 31–60, 61–90, 91–120, > 120) with footer
  totals; overdue buckets highlighted; a note explaining negative amounts (unallocated credits).
- Gate per design gate §4.2: `reports.view` on both (an Exafy admin passes regardless).
- i18n DE-first (47 keys), en/es/sr/ar translated, fr/pl/pt/ru/tr/zh mirror EN; money/dates via `@/lib/locale-format`;
  RTL-safe; inventory regenerated. Routes before the `/backoffice/*` placeholder; Balance Sheet / Trial Balance / Cash
  Flow / By Dimension / Board Pack stay wave-2 placeholders as the navigation config already says.

## Deliberately NOT in this slice

- No free date inputs — presets only; a custom range is a small follow-up once someone asks for one.
- No Balance Sheet / Trial Balance screens even though both actions work on Postgres (`outputs/erpclaw-shapes/`): the
  navigation config marks them wave 2 and the brief's order is P&L and aging first. Cash Flow and comparative P&L
  cannot ship regardless — both crash on Postgres (below).

## Acceptance criteria

AC-1 — Every read is a typed Read command; payload carries only the window (`from_date`/`to_date`) or `as_of_date`
TEST: `grep -rn "useErpRead(" src/pages/backoffice/reports` lists only `reports.pnl`, `reports.ar_aging`, `reports.ap_aging`; VTID-03849's hook tests pin the request shape.
UI: `outputs/playwright-run.log` / stub log — `stub read POSTs` are exactly those types; every non-read request aborted.

AC-2 — Preset windows, aging totals, overdue share and margin are correct
TEST: `src/lib/backoffice-reports.test.ts` — every preset as calendar dates incl. January's last-month year rollover; bucket and grand totals; overdue share with zero-total guard and no `-0` on a net-credit book; margin null without income; amount sort without mutation.

AC-3 — P&L: preset selector with the resolved window, four KPIs, income and expenses by account with share
UI: `screenshots/01-reports-pnl-admin-en.png` (real spike data: one income account, one expense account, 99.9 % margin), `03-reports-pnl-admin-de.png`, `05-reports-pnl-bookkeeper-en.png` (reports.view via the bookkeeper grant).

AC-4 — Aging: as-of date, KPIs, AR and AP bucket tables with totals, empty AP state, credit note
UI: `screenshots/02-reports-aging-admin-en.png` (the spike's one customer carries a -5,000 credit — rendered as a negative current amount, no overdue, footer totals), `04-reports-aging-admin-ar-rtl.png` (RTL).

AC-5 — Capability gate: a salesperson (crm.view + sales.view) sees the no-access body and no ERP read is attempted
UI: `screenshots/06-reports-aging-salesperson-no-access-en.png`; `outputs/playwright-run.log` shows zero stub read POSTs for that shot.

AC-6 — Nothing written anywhere during verification; type-check, lint (incl. i18n rules), unit tests, inventory
TEST: `outputs/checks.txt` — tsc 140 pre-existing errors on base and branch, 0 in new files; eslint 0 problems in the new files; `vitest run` 35 files / 232 tests green (6 new); inventory regenerated. Harness: service worker blocked, Supabase auth served locally, every non-read request aborted.

## Findings owed to the bridge (ERPClaw-on-Postgres patch 0004, same family as VTID-03855/03856/03857)

- `cash-flow` and `comparative-pl` both fail on Postgres with `operator does not exist: text - text`
  (`COALESCE(decimal_sum(...), '0') - …`). Captured verbatim in `outputs/erpclaw-shapes/cash-flow.txt` /
  `comparative-pl.txt`. With `validate-period-close` and `general-ledger` (VTID-03857) that is four report/close
  actions blocked by the same one-line cast; the patch is one fix, not four.
- `comparative-pl` additionally requires `--periods` as a JSON array of `{from_date, to_date, label}` — the bridge's
  flat `param → --flag` mapping will need to JSON-encode that one argument when the comparative report ships.

## Notes from the screenshot review

- The spike's AR aging is negative (a receipt was recorded against the customer with no invoice allocated), so the
  "Outstanding receivables" KPI reads -AED 5,000.00 — real data, explained by the on-screen credit note, not a bug.
- The first sweep rendered "Receivables -0%" for that book (0 overdue ÷ a negative total); fixed in `overdueShare` and
  pinned by a test before the second sweep (`playwright-run.log` has both runs).
