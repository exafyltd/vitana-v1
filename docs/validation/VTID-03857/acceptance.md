# VTID-03857 — Frontend: BackOffice Accounting Read screens

VTID: VTID-03857
Spec: approved (generate → validate pass → quality-check pass, known CRITICAL risk label → approve; `outputs/spec-*.json`).
Backend: `exafyltd/vitana-platform#3291` (VTID-03842 orchestrator) — not on staging yet; its migration awaits the owner's "apply now".
Stacked on the VTID-03856 branch (Finance & Treasury Read screens).

## What shipped

- `src/lib/backoffice-accounting.ts` — ERPClaw journal / chart-of-accounts / fiscal-year / GL-integrity shapes (captured from a
  real ERPClaw-on-Postgres instance, `outputs/erpclaw-shapes/`) and helpers: `flattenAccountTree` (depth-first order, computed
  depth, orphans and cycles surfaced instead of dropped), `summarizeChart`, `summarizeJournals`, `isBalancedEntry`,
  `journalLineTotals`, `fiscalYearState`, `defaultFiscalYear` (9 tests).
- BO-018 Journals — `accounting.journal.list` (KPIs: entries / posted debit / drafts / unbalanced, status filter + search) and
  `accounting.journal.get` on selection: header, balanced badge, and the entry's lines with totals.
- BO-019 Chart of Accounts — `accounting.coa.list` rendered as an indented tree (root-type filter + search, group / frozen /
  disabled flags) and `accounting.coa.get` on selection: balance, debit/credit totals, direction, parent.
- BO-020 Fiscal Periods & Close — `accounting.period.list` (state per year: current / ended-still-open / upcoming / closed),
  `accounting.gl.integrity_check` (balanced + difference, hash chain intact / broken links), `accounting.cost_center.list`,
  and `accounting.period.validate` for the selected year (close readiness: income, expense, net income, trial balance).
  The close itself is High-risk (`accounting.close`, maker-checker) and the card says so — nothing here writes.
- Gate per design gate §4.2: `accounting.view` on all three (an Exafy admin passes regardless).
- i18n DE-first (84 keys), en/es/sr/ar translated, fr/pl/pt/ru/tr/zh mirror EN; money/dates via `@/lib/locale-format`;
  RTL-safe (logical padding for the tree indent); inventory regenerated. Routes before the `/backoffice/*` placeholder;
  Tax / Fixed Assets / Intercompany / Budgets stay wave-2 placeholders.

## Deliberately NOT in this slice

- No Draft/Commit: no journal entry, submit, cancel, account create/freeze, fiscal-year create/close/reopen.
- No general ledger listing (`accounting.gl.list.general_ledger`) and no per-account balance as-of-date
  (`accounting.account.balance`): both need a date window the screen has no UI for yet, and `general-ledger` currently
  crashes on Postgres (below).

## Acceptance criteria

AC-1 — Every read is a typed Read command; payload carries only `limit`, one id (`journal_entry_id` / `account_id` / `fiscal_year_id`) or nothing
TEST: `grep -rn "useErpRead(" src/pages/backoffice/accounting` lists only `accounting.journal.list|get`, `accounting.coa.list|get`, `accounting.period.list|validate`, `accounting.gl.integrity_check`, `accounting.cost_center.list`; VTID-03849's hook tests pin the request shape.
UI: `outputs/playwright-run.log` / `outputs/stub-gateway.mjs` log — `stub read POSTs` are exactly those types; every non-read request aborted.

AC-2 — Tree, summaries and fiscal-year state are correct
TEST: `src/lib/backoffice-accounting.test.ts` — parent-above-children ordering with numeric account-number sort and computed depth; orphan kept as root; cycle never loops; chart summary with integer booleans; journal summary (posted debit only for submitted, unbalanced flagged); balance tolerance; line totals; fiscal-year state and default selection.

AC-3 — Journals: KPIs, status filter, detail with lines and totals
UI: `screenshots/01-accounting-journals-admin-en.png` (50 real entries, first selected), `04-accounting-journals-admin-de.png`.

AC-4 — Chart of Accounts: indented tree with flags, detail with balance
UI: `screenshots/02-accounting-chart-of-accounts-admin-en.png` (22 real accounts, `Cash and Bank` selected), `05-accounting-chart-of-accounts-admin-ar-rtl.png` (RTL — indent on the start side).

AC-5 — Fiscal Periods & Close: years with state, GL integrity, cost centers, close readiness — and an ERPClaw failure renders as `erpFailed`, not as a blank card
UI: `screenshots/03-accounting-periods-admin-en.png`, `06-accounting-periods-bookkeeper-de.png` (accounting.view via the bookkeeper grant; the readiness card shows the real `validate-period-close` Postgres failure, see below).

AC-6 — Capability gate: a salesperson (crm.view + sales.view) sees the no-access body and no ERP read is attempted
UI: `screenshots/07-accounting-journals-salesperson-no-access-en.png`; `outputs/playwright-run.log` shows zero stub read POSTs for that shot.

AC-7 — Nothing written anywhere during verification; type-check, lint (incl. i18n rules), unit tests, inventory
TEST: `outputs/checks.txt` — tsc 140 pre-existing errors on base and branch, 0 in new files; eslint 0 problems in the new files (App.tsx's 4 `no-explicit-any` are pre-existing, outside this PR's hunks); `vitest run` 34 files / 226 tests green (9 new); inventory regenerated. Harness: service worker blocked, Supabase auth served locally, every non-read request aborted.

## Findings owed to the bridge (ERPClaw-on-Postgres patch 0004, same family as VTID-03855/03856)

- `validate-period-close` and `general-ledger` both fail on Postgres with `operator does not exist: text - text`
  (`COALESCE(decimal_sum(g.credit), '0') - COALESCE(decimal_sum(g.debit), '0')` — `decimal_sum` returns text and the
  literal `'0'` is text, so the subtraction has no operator; SQLite coerces silently). Captured verbatim in
  `outputs/erpclaw-shapes/validate-period-close.txt` / `general-ledger.txt`. Until patched, BO-020's close-readiness card
  shows the `erpFailed` state on every tenant — the screenshot is the honest current behaviour, not a harness artefact.
- `check-gl-integrity` reports `chain_intact: false, broken_links: 121 / 180` on the spike DB — the hash chain was
  broken by the VTID-03840 concurrency/idempotency runs that inserted GL rows out of order. Real for that DB; the screen
  shows it as a warning, which is what a tenant should see if it ever happens to theirs.

## Notes from the screenshot review

- ERPClaw's `get-journal-entry` puts its own `"status": "ok"` at the top level (same as `get-sales-invoice` /
  `get-payment`), overwriting the document status; the detail panel takes the status from the list row.
- Accounts carry `currency: "USD"` because the spike company was created without an explicit currency (VTID-03855 note);
  the detail panel renders the account's own currency, the journal table renders amounts in the AED default.
- At 1400px the detail card stacks under the table (the `xl` breakpoint is 1280px of content width); it sits beside it on
  wider screens.
