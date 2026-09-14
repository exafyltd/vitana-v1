# VTID-03866 — Frontend: BackOffice Sales document Draft screens (customer, credit note)

VTID: VTID-03866
Spec: approved (generate → validate pass → quality-check pass, known CRITICAL risk label → approve; `outputs/spec-*.json`).
Backend: `exafyltd/vitana-platform#3291` (VTID-03842 orchestrator) — not on staging yet; its migration awaits the owner's "apply now".
Stacked on the VTID-03859 branch (CRM Draft cards). Second Draft-tier slice on the same review-card mechanism.

## Scope, and why it is narrower than the spec seed

The spec seed named four cards (customer, quotation, invoice, credit note). Checking the design gate before building:
`add-quotation` and a standalone `create-sales-invoice` both take `--items` with **item ids**, and the wave-1 mapping
(GOLDEN-WORKFLOWS §4.2) exposes **no item read at all** — inventory is "wave 2+, only with a named process owner". There is
no `item_ref` in the orchestrator's entity resolution either. A quotation/invoice card would therefore ask the user to type
raw item UUIDs, which is not a product. Shipped here: the two cards wave 1 fully supports; the other two are an owner decision
(below).

## What shipped

- `src/lib/backoffice-draft.ts` — two new field kinds: `number` (with `min`) and `lines` (row editor; rows carried as a JSON
  array; `display` columns are shown but never sent, `hidden` columns are sent but not shown, `maxFrom` caps a number at
  another column of the same row); `readOnly` fields for a prefilled id; `initial` values; `creditNoteLinesFromInvoice`,
  `parseLines`, `linesPayload`; `CUSTOMER_TYPES` and `CREDIT_NOTE_SOURCE_STATUSES` mirroring ERPClaw (`VALID_CUSTOMER_TYPES`,
  `create_credit_note`'s allowed original statuses). `buildDraftPayload` now returns `Record<string, unknown>` so a lines
  field is sent as a real array — the bridge JSON-encodes list/dict params (`_JSON_PARAM_TYPES`, VTID-03840), so `--items`
  arrives as ERPClaw expects. 9 tests (3 new).
- `sales.customer.create` card (`add-customer`, `sales.draft`): name, customer type (company / individual), tax ID, credit
  limit, address — on Contacts & Companies, in the Customers card header.
- `sales.credit_note.create` card (`create-credit-note`, `sales.draft`): opened from a **posted** invoice's detail panel
  (only for statuses ERPClaw accepts: submitted / overdue / partially_paid / paid — a draft invoice shows no button);
  against-invoice id read-only, posting date, reason, and one line per invoice item with the invoiced quantity shown and the
  returned quantity to enter (must be > 0 and ≤ invoiced; empty lines are not sent). The review card shows item name, invoiced
  and returned quantity and the item id; the payload carries only `item_id` + `qty`.
- i18n DE-first (24 new keys), en/es/sr/ar translated, fr/pl/pt/ru/tr/zh mirror EN; inventory regenerated.

## Deliberately NOT in this slice

- Quotation and standalone invoice creation (needs an item read — owner decision below).
- Submitting anything: `sales.credit_note.submit` is High-risk per GW-3, `sales.invoice.submit` is Commit; both out of scope.

## Acceptance criteria

AC-1 — Line rows: only rows with a returned qty are sent, stripped to `item_id` + `qty`; display columns never leave the browser
TEST: `src/lib/backoffice-draft.test.ts` — "seeds one blank row per invoice line and sends only rows with a returned qty, stripped to item_id + qty".
UI: `outputs/stub-draft-posts.log` — `DRAFT sales.credit_note.create … "items":[{"item_id":"8d1bd4bd-…","qty":"2"}]` (no item_name / original_qty).

AC-2 — Line validation mirrors ERPClaw: no lines, qty ≤ 0 and qty above the invoiced quantity are refused before review
TEST: `src/lib/backoffice-draft.test.ts` — "refuses no lines, a non-positive qty and a qty above the original".
UI: `screenshots/02-draft-credit-note-salesmanager-en-3-validation-no-lines.png`, `…-4-validation-qty-too-high.png`.

AC-3 — Credit-note flow end to end from a posted invoice: detail with button → lines form → review card (item, invoiced, returned, id) → done
UI: `screenshots/02-draft-credit-note-salesmanager-en-{1-posted-invoice-detail,2-form-lines,5-review-card,6-done}.png`; `outputs/playwright-run.log` (phase form → review → done).

AC-4 — The credit-note button exists only on a posted invoice
UI: `screenshots/05-draft-no-buttons-draft-invoice-salesmanager-en-1-draft-invoice-no-credit-note-button.png` (draft invoice selected, no button).

AC-5 — Customer flow end to end, with a numeric credit limit and the customer-type select
TEST: `src/lib/backoffice-draft.test.ts` — "customer: credit limit must be a non-negative number".
UI: `screenshots/01-draft-customer-salesmanager-en-{1-form-empty,2-form-filled,3-review-card,4-done}.png`, `03-draft-customer-salesmanager-de-1-review-card.png`; `outputs/stub-draft-posts.log` (`DRAFT sales.customer.create …`).

AC-6 — Arabic RTL line editor
UI: `screenshots/04-draft-credit-note-salesmanager-ar-rtl-1-form-lines.png`.

AC-7 — Capability gate: a salesperson (crm.view + sales.view, no sales.draft) sees no New customer button
UI: `screenshots/06-draft-buttons-hidden-salesperson-en.png`; `outputs/playwright-run.log` shows zero Draft POSTs for that shot.

AC-8 — Nothing written to any live system during verification; type-check, lint (incl. i18n rules), unit tests, inventory
TEST: `outputs/checks.txt` — tsc 140 pre-existing errors on base and branch, 0 in changed files; eslint 0 problems; `vitest run` 36 files / 241 tests green (3 new); inventory regenerated. Harness: every Draft POST went to the local stub, service worker blocked, Supabase auth served locally, every other non-read request aborted.

## Owner decision needed

- **Quotation / standalone invoice cards need an item read in wave 1.** Smallest change: expose `list-items`
  (erpclaw-inventory, Read, `sales.view`) as `sales.item.list` in the bridge and gateway catalogs plus an `item_ref` entry in
  the orchestrator's entity resolution — one platform VTID. Without it the two cards cannot be built honestly. Alternatively
  keep them for wave 2 with inventory, as §4.2 currently says.

## Findings

- `submit-sales-invoice` is still broken on Postgres (`COALESCE types text and integer cannot be matched`, patch 0004), so
  no spike invoice can reach a state ERPClaw accepts a credit note against. The `create-credit-note` receipt the stub returns
  is therefore **derived from the source's `ok({...})`** (`outputs/erpclaw-shapes/create-credit-note.txt`, keys
  `credit_note_id`, `against_invoice_id`, `grand_total`, `is_return`), not captured; and the harness's `list-sales-invoices`
  marks one spike invoice `submitted` so the card has a legal source (`outputs/erpclaw-shapes/list-sales-invoices.txt`, edited
  copy; the original captured file is in VTID-03855's pack). Everything else is captured verbatim.
- Correction to VTID-03858's note: the bridge already JSON-encodes array params (`runner.py` `_JSON_PARAM_TYPES`), so
  `comparative-pl --periods` needs no bridge change — only the Postgres cast fix.
