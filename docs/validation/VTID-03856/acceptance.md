# VTID-03856 — Frontend: BackOffice Finance & Treasury Read screens

VTID: VTID-03856
Spec: approved (generate → validate pass → quality-check pass, known CRITICAL risk label → approve; `outputs/spec-*.json`).
Backend: `exafyltd/vitana-platform#3291` (VTID-03842 orchestrator) — not on staging yet; its migration awaits the owner's "apply now".
Stacked on the VTID-03855 branch (Sales & CRM Read screens).

## What shipped

- `src/lib/backoffice-finance.ts` — ERPClaw payment / FX shapes (captured from a real ERPClaw-on-Postgres instance,
  `outputs/erpclaw-shapes/`) and helpers: `reconciliationBuckets` (unallocated / drafts / settled + netted totals),
  `yearToDateWindow`, `isEnabledCurrency` (4 tests).
- BO-025 Payments — `finance.payment.summary` (year-to-date received/paid), `finance.payment.list` with type filter + search,
  `finance.payment.get` detail on selection (bank reference, accounts, currency/rate, allocations), plus Currencies
  (`finance.fx.list`) and Exchange rates (`finance.fx.list.list_exchange_rates`).
- BO-026 Bank Reconciliation — a read-only workbench over `finance.payment.list`: posted-but-unallocated, drafts never
  posted, settled — with netted totals per bucket and an explanation of what each bucket means for the reconciler.
- Gates per design gate §4.2: `finance.view` (Payments), `finance.view` or `finance.reconcile` (Bank Reconciliation).
- i18n DE-first (49 keys), en/es/sr/ar translated, fr/pl/pt/ru/tr/zh mirror EN; money/dates via `@/lib/locale-format`;
  RTL-safe; inventory regenerated. Routes before the `/backoffice/*` placeholder; Cash / Recurring Billing / Sync stay wave-2 placeholders.

## Deliberately NOT in this slice

- No Draft/Commit: no payment entry, submit, allocation or reconciliation (`finance.bank.reconcile` is Commit,
  `finance.reconcile`) — the workbench says so. No `finance.outstanding.read` / `finance.unallocated.read` /
  `finance.advances.read` calls: all three need a party id, so they belong to a per-customer detail, not a tenant view.

## Acceptance criteria

AC-1 — Every read is a typed Read command; payload carries only `limit`, one id (`payment_entry_id`) or the summary window (`from_date`/`to_date`)
TEST: `grep -rn "useErpRead(" src/pages/backoffice/finance` lists only `finance.payment.summary|list|get`, `finance.fx.list`, `finance.fx.list.list_exchange_rates`; VTID-03849's hook tests pin the request shape.
UI: `outputs/stub-reads.log` — `stub read POSTs` are exactly those types; every non-read request aborted.

AC-2 — Reconciliation buckets are correct
TEST: `src/lib/backoffice-finance.test.ts` — drafts / unallocated / settled split, cancelled skipped, totals netted by direction; empty list; year-to-date window; ERPClaw integer booleans.

AC-3 — Payments: KPIs, list with type filter, detail with bank reference and accounts, FX blocks
UI: `screenshots/01-finance-payments-admin-en.png` (2 real payments — one submitted and unallocated, one draft — first selected), `03-finance-payments-admin-de.png`.

AC-4 — Bank Reconciliation: three buckets with netted totals and explanations
UI: `screenshots/02-finance-bank-reconciliation-admin-en.png`, `04-finance-bank-reconciliation-admin-ar-rtl.png` (RTL), `06-finance-bank-reconciliation-bookkeeper-en.png` (finance.view + finance.reconcile).

AC-5 — Capability gate: a salesperson (crm.view + sales.view) sees the no-access body on Payments and no ERP read is attempted
UI: `screenshots/05-finance-payments-salesperson-no-access-en.png`; `outputs/stub-reads.log` shows zero stub read POSTs for that shot.

AC-6 — Nothing written anywhere during verification; type-check, lint (incl. i18n rules), unit tests, inventory
TEST: `outputs/checks.txt` — tsc 140 pre-existing errors on base and branch, 0 in new files; eslint 0 problems; `vitest run` 33 files / 217 tests green (4 new); inventory regenerated. Harness: service worker blocked, Supabase auth served locally, every non-read request aborted.

## Owed / not verified

- Real gateway round-trips need `#3291` on staging with its migration applied and the bridge provisioned (VTID-03840).
- `get-payment` returns `payment_currency: "USD"` for payments created without an explicit currency (same ERPClaw default noted in VTID-03855); list rows carry no currency and render in AED. The Draft slice should pass the company currency on creation.

## Notes from the screenshot review

- ERPClaw's `get-payment` (like `get-sales-invoice`) puts its own `"status": "ok"` at the top level, overwriting the
  document status; the detail panel therefore shows the status from the list row, never from the detail.
- The stub serves one fixed `get-payment` body for every id, so screenshot 01/03 show PAY-2026-00001's detail under the
  clicked PAY-2026-00002 row — a harness limitation, not a screen defect (the real gateway returns the selected id).

- The Playwright console output of this sweep was never written to a file, so the acceptance lines above now cite
  `outputs/stub-reads.log` — the stub gateway's own record of exactly which typed Read commands each persona's
  browser sent — instead of a `playwright-run.log` that does not exist. Later packs save the console output too.
