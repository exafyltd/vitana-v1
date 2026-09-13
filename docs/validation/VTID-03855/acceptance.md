# VTID-03855 — Frontend: BackOffice Sales & CRM Read screens

VTID: VTID-03855
Spec: approved (generate → validate pass → quality-check pass, known CRITICAL risk label → approve; `outputs/spec-*.json`).
Backend: `exafyltd/vitana-platform#3291` (VTID-03842 orchestrator) — not on staging yet; its migration awaits the owner's "apply now".
Stacked on the VTID-03849 branch (wave-1 Read screens for Overview/Approvals/Audit/Company).

## What shipped

- `src/lib/backoffice-sales.ts` — the ERPClaw record shapes for leads, CRM contacts/companies, customers, opportunities,
  pipeline report, CRM tasks, activities, quotations, sales invoices, credit notes (captured from a real
  ERPClaw-on-Postgres instance, `outputs/erpclaw-shapes/`), plus pure helpers: `formatMoney` (document currency,
  AED default), `isOverdue`/`isTaskOverdue`, `groupOpportunitiesByStage`, `statusVariant`, `fullTextMatch`.
- `src/components/backoffice/` — `DocStatusBadge` (one translated pill for every ERPClaw status/lifecycle/priority word),
  `DetailList`, `DocumentItemsTable`.
- Screens, all Read tier over `useErpRead` (VTID-03849's hook → `POST /api/v1/backoffice/commands`):
  BO-005 Leads (`crm.lead.list`, `crm.lead.get` on selection), BO-006 Contacts & Companies (`crm.contact.list`,
  `crm.company.list`, `sales.customer.list`), BO-007 Opportunities (`crm.pipeline.report` + `crm.opportunity.list` as a
  board by stage), BO-008 Follow-ups (`crm.task.list`, `crm.activity.list`), BO-009 Quotations (`sales.quotation.list|get`),
  BO-011 Invoices (`sales.invoice.list|get`), BO-012 Credit Notes (`sales.credit_note.list`).
- Capability gates match the design gate §4.2: CRM tabs `crm.view`, selling tabs `sales.view`, Contacts & Companies either
  (each block says which one it needs). The gateway enforces; the gate only avoids a screen that can only 403.
- i18n DE-first (140 keys), en/es/sr/ar translated, fr/pl/pt/ru/tr/zh mirror EN; money via `fmtNumber` currency style,
  dates via `fmtDate`; RTL-safe (logical spacing, identifiers `dir="ltr"`); inventory regenerated.

## Deliberately NOT in this slice

- No Draft/Commit: no lead/contact/opportunity/quotation/invoice creation or edits, no submit, no convert — the
  Credit Notes screen states the High-risk rule. Sales Orders and Deliveries tabs stay placeholders (wave 2).
- `sales.customer.check_credit` and `sales.invoice.overdue` are not called: both ERPClaw actions fail on Postgres today
  (see Findings). Overdue is computed client-side from due date + outstanding amount.
- Board columns come from the pipeline report; drag-and-drop stage changes are Draft (`crm.opportunity.set_stage`) — next slice.

## Acceptance criteria

AC-1 — Every screen reads only through typed Read commands; the payload never carries a company id and never a free-text search (search/filter are client-side)
TEST: `grep -rn "useErpRead(" src/pages/backoffice/sales` lists only `crm.*.list/get`, `crm.pipeline.report`, `sales.*.list/get` types with `{ limit }` or one id key (`lead_id`, `quotation_id`, `sales_invoice_id`); `src/hooks/useBackOfficeCommands.test.ts` (VTID-03849) pins the request shape.
UI: `outputs/playwright-run.log` — `stub read POSTs` are exactly those types; every non-read request aborted.

AC-2 — Helpers are correct against the captured shapes
TEST: `src/lib/backoffice-sales.test.ts` (7 tests): decimal strings → numbers; AED default and document currency; overdue only when due-date passed, outstanding > 0 and the document is live (draft/paid/cancelled never overdue); task overdue only while open; board keeps the report's stage order, uses report totals and appends unknown stages with computed totals; status → badge variant; case-insensitive multi-field search.

AC-3 — Leads: list with status filter + search, row selection shows `crm.lead.get` detail; conversion state visible
UI: `screenshots/01-sales-leads-admin-en.png` (2 real leads, first selected with its detail panel).

AC-4 — Contacts & Companies: three blocks, each gated on its own capability, one search across all
UI: `screenshots/02-sales-contacts-admin-en.png` (contact linked to its company, customer with credit limit), `11-sales-contacts-salesperson-en.png` (crm.view + sales.view only — all three blocks still visible, no admin capabilities).

AC-5 — Opportunities: KPI cards from the pipeline report and a board with one column per stage, cards with expected revenue, probability and closing date
UI: `screenshots/03-sales-opportunities-admin-en.png`, `09-sales-opportunities-admin-ar-rtl.png` (RTL board scrolls the other way, amounts stay LTR).

AC-6 — Follow-ups: tasks with priority, due date and an overdue marker; activities timeline linked to their lead/opportunity/customer
UI: `screenshots/04-sales-followups-admin-en.png` (one overdue task marked, one activity on the opportunity).

AC-7 — Quotations / Invoices / Credit Notes: lists with amounts and status; selection shows the document with line items; invoice KPIs (count, outstanding, overdue)
UI: `screenshots/05-sales-quotations-admin-en.png`, `06-sales-invoices-admin-en.png`, `08-sales-invoices-admin-de.png`, `07-sales-credit-notes-admin-en.png` (empty state with the High-risk note — the spike DB has no posted invoice to credit, see Findings).

AC-8 — Capability gate: a bookkeeper (no crm.view/sales.view) sees the no-access body and no ERP read is attempted
UI: `screenshots/10-sales-leads-bookkeeper-no-access-en.png`; `outputs/playwright-run.log` shows zero stub read POSTs for that shot.

AC-9 — Nothing written anywhere during verification; type-check, lint (incl. i18n rules), unit tests, inventory
TEST: `outputs/checks.txt` — tsc 140 pre-existing errors on base and branch, 0 in new files; eslint 0 problems on new files; `vitest run` 32 files / 213 tests green (7 new); inventory regenerated. Harness: service worker blocked, Supabase auth served locally from the one permitted sign-in, every non-read request aborted.

## Findings (ERPClaw on Postgres, not this PR's to fix — owed to the VTID-03840 bridge as patch 0004)

Captured while seeding the local spike ERP (`outputs/checks.txt`, raw outputs in `outputs/erpclaw-shapes/`):
1. `submit-sales-invoice` fails: `COALESCE(decimal_sum("outstanding_amount"),0)` — text vs integer. Every invoice submit fails on Postgres. Blocks the Commit slice for invoices/credit notes (GW-1 step 7) until patched.
2. `check-credit-limit` fails with the same COALESCE error.
3. `check-overdue` fails: `si."outstanding_amount" + 0` — text + integer.
Same root cause as VTID-03840 patch 0002 (TEXT money columns + `decimal_sum`): cast to numeric in those three call sites.

## Owed / not verified

- Real gateway round-trips need `#3291` on staging with its migration applied and `ERP_BRIDGE_URL`/`ERP_BRIDGE_TOKEN` on the
  staging task def (VTID-03840 provisioning). Screenshots use the local stub for the gateway routes with real ERPClaw JSON.
- Credit-note columns are assumed to mirror sales invoices (`naming_series`, `customer_name`, `posting_date`, `grand_total`,
  `status`, `return_against`); the list came back empty because no invoice could be submitted (Finding 1).

## Notes from the screenshot review

- List rows from ERPClaw carry no `currency`, so list amounts render in the tenant default (AED); a document's detail uses
  its own `currency` field (the spike invoices/quotation were created without one, so ERPClaw stored `USD`). Both are
  shown as stored — the Draft slice should pass the company currency on creation so the two agree.
- A CRM contact linked to a company via `link-contact-to-company` gets a `crm_contact_role` row; `list-crm-contacts`
  does not surface it, so the Company column reads "—" for such contacts today.
