# VTID-03871 — Frontend: BackOffice Finance payment Draft card

VTID: VTID-03871
Spec: approved (generate → validate pass → quality-check pass, known CRITICAL risk label → approve; `outputs/spec-*.json`).
Backend: `exafyltd/vitana-platform#3291` (VTID-03842 orchestrator) — not on staging yet; its migration awaits the owner's "apply now".
Stacked on the VTID-03866 branch (Sales document Draft cards). Third Draft-tier slice on the VTID-03859 review card.

## What shipped

- `finance.payment.record` card (`add-payment`, any of `finance.approve` / `accounting.post` — the card now carries
  `alsoCapabilities` so the button and the review card reflect the gateway catalog's any-of rule): payment type
  (receipt / payment — `internal_transfer` needs no party and its own card), party type fixed to customer (supplier and
  employee parties have no wave-1 read to pick from), customer, amount, posting date, from-account, to-account, bank reference
  and reference date. Button on Finance › Payments.
- New `lookup` field kind: options loaded through a typed Read command — customers from `sales.customer.list`, ledger accounts
  from `accounting.coa.list` (non-group, enabled only, shown as `number · name`). When the read is refused (the user may record
  payments but lacks `sales.view`) the field degrades to a typed id with a note naming the command, so the card stays usable and
  honest instead of blank. The review card shows the resolved label with the id underneath.
- `draftCapabilities()` helper; 12 tests (3 new).
- i18n DE-first (16 new keys), en/es/sr/ar translated, fr/pl/pt/ru/tr/zh mirror EN; inventory regenerated.

## Deliberately NOT in this slice

- Submitting the payment (`finance.payment.submit`, Commit, escalates to High-risk for `kind: pay` per §4.3).
- Allocations to invoices (`--allocations`) — the Draft creates an unallocated entry; matching is the reconciliation slice.
- Supplier / employee parties, internal transfers, foreign-currency payments (`payment_currency` / `exchange_rate`).

## Acceptance criteria

AC-1 — The card is admitted by finance.approve OR accounting.post, exactly as the gateway catalog says
TEST: `src/lib/backoffice-draft.test.ts` — "is admitted by finance.approve OR accounting.post, matching the gateway catalog".
UI: `screenshots/01-draft-payment-admin-en-4-review-card.png` (Capability row `finance.approve | accounting.post`); `screenshots/05-draft-payment-hidden-salesperson-en.png` (no button without either).

AC-2 — Required party, both accounts and a positive amount; payload carries ids only
TEST: `src/lib/backoffice-draft.test.ts` — "needs a party, both accounts and a positive amount".
UI: `screenshots/01-…-2-validation.png` (four Required markers); `outputs/stub-draft-posts.log` — `DRAFT finance.payment.record … "party_id":"2a806449-…","paid_from_account":"bb531319-…","paid_to_account":"f529f450-…"`.

AC-3 — Lookups: customers and non-group accounts loaded through typed Reads, chosen by label, sent as ids
TEST: `src/lib/backoffice-draft.test.ts` — "account lookup keeps only enabled ledger (non-group) accounts".
UI: `screenshots/01-…-3-form-filled.png` (Acme Trading LLC, `1120 · Trade Receivables`, `1110 · Cash and Bank`); `outputs/stub-draft-posts.log` (`POST sales.customer.list 200`, `POST accounting.coa.list 200` before the Draft POST).

AC-4 — Refused lookup degrades to a typed id, with the reason
UI: `screenshots/04-draft-payment-bookkeeper-lookup-refused-en-1-form-customer-lookup-refused.png` (bookkeeper: `sales.customer.list` → 403, customer becomes an id input with the note; accounts still a pick list), `…-2-review-card.png`; `outputs/stub-draft-posts.log` (`POST sales.customer.list 403`).

AC-5 — End to end: form → review card → done with the bridge receipt; DE review card; Arabic RTL form
UI: `screenshots/01-draft-payment-admin-en-{1-form-empty,3-form-filled,4-review-card,5-done}.png`, `02-draft-payment-admin-de-1-review-card.png`, `03-draft-payment-admin-ar-rtl-1-form.png`; `outputs/playwright-run.log`.

AC-6 — Nothing written to any live system during verification; type-check, lint (incl. i18n rules), unit tests, inventory
TEST: `outputs/checks.txt` — tsc 140 pre-existing errors on base and branch, 0 in changed files; eslint 0 problems; `vitest run` 36 files / 244 tests green (3 new); inventory regenerated. Harness: every Draft POST went to the local stub, service worker blocked, Supabase auth served locally, every other non-read request aborted. The `add-payment` receipt the stub returns was captured from the local ERPClaw spike DB (`outputs/erpclaw-shapes/add-payment.txt`).

## Notes

- `add-payment` requires both `--paid-from-account` and `--paid-to-account` as ids; the orchestrator's `account_ref` resolves a
  single `account_id` field, so a lookup (not a `_ref`) is the right tool here — the ids are chosen from the chart, never typed by
  hand unless the read is refused.
- A `pay` to a customer is GW-3's refund case; the escalation to High-risk happens at submit, not at this Draft.
