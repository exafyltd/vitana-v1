# VTID-03859 — Frontend: BackOffice Sales & CRM Draft screens (review card)

VTID: VTID-03859
Spec: approved (generate → validate pass → quality-check pass, known CRITICAL risk label → approve; `outputs/spec-*.json`).
Backend: `exafyltd/vitana-platform#3291` (VTID-03842 orchestrator) — not on staging yet; its migration awaits the owner's "apply now".
Stacked on the VTID-03858 branch (Reports Read screens). First Draft-tier slice; every earlier BackOffice slice was Read only.

## What shipped

- `src/lib/backoffice-draft.ts` — the five CRM Draft form specs (`crm.lead.create`, `crm.contact.create`,
  `crm.company.create`, `crm.task.create`, `crm.activity.create`; all `crm.manage`), each field keyed by the ERPClaw flag
  the bridge maps it to, option lists mirroring the script's `VALID_*` tuples, plus `validateDraft`, `buildDraftPayload`
  (only spec keys, trimmed, empties dropped — exactly what the card shows and the command sends), `draftIdempotencyKey`
  (one key per card, kept across retries) and `draftResultSummary` (6 tests).
- `src/hooks/useDraftCommand.ts` — form → review → submitting → done | failed; `POST /api/v1/backoffice/commands` with
  `channel: "web"`, `confirm: false`; on `executed` every cached ERP read for the tenant is invalidated so the list behind
  the card refetches; a rejected/failed command keeps its row, reason and receipt.
- `src/components/backoffice/DraftCommandDialog.tsx` — the review card (design gate §1.3): typed command, ERPClaw action,
  tier badge, capability, idempotency key, the exact payload with field labels and raw keys; accept → outcome with the
  bridge receipt; failure shows the mapped error, the reason code and — for a `*_ref` that did not resolve — the field,
  the reference and the candidate count. `DraftCommandButton` renders nothing without the capability.
- New buttons: Leads (New lead), Contacts & Companies (New contact, New company), Follow-ups (New task, Log activity).
  The activity form takes `lead_ref` (name or number) and lets the orchestrator resolve it — never a client-side guess.
- `AdminHeader`'s action slot: `ml-6` → `ms-6 shrink-0` (logical margin, RTL-safe; it had no BackOffice consumer before).
- i18n DE-first (84 keys: card, issues, field labels, ERPClaw choice labels, five forms), en/es/sr/ar translated,
  fr/pl/pt/ru/tr/zh mirror EN; labels + `aria-invalid`/`aria-describedby`/`role="alert"` on validation; inventory regenerated.

## Deliberately NOT in this slice

- No update/edit, no opportunity or lead-source forms, no task links (`--link-to`), no Commit or High-risk action.
- No client-side duplicate check — that is the orchestrator's `_ref` resolution and ERPClaw's own validation.

## Acceptance criteria

AC-1 — The write happens only on accept, as one typed Draft command with the card's payload and a stable idempotency key
TEST: `src/lib/backoffice-draft.test.ts` — payload = spec keys only, trimmed, empties dropped; key shape `ui.draft:<type>:<nonce>` matching the gateway's regex, unique per card, fixed nonce reproducible.
UI: `outputs/stub-draft-posts.log` — exactly one `DRAFT crm.lead.create … payload={"lead_name":"Fatima Al Mansoori",…}` per accepted card, none before accept; `screenshots/01-…-4-review-card.png` shows the same key the stub received.

AC-2 — Client-side validation mirrors what ERPClaw rejects, and the form cannot reach review with a required field empty
TEST: `src/lib/backoffice-draft.test.ts` — required, e-mail, date and out-of-list option issues; option lists non-empty for every select.
UI: `screenshots/01-…-2-validation.png` (EN "Required"), `02-…-2-validation-de.png` (DE "Pflichtfeld").

AC-3 — Lead flow end to end: form → review card → done with the bridge receipt → list refetched
UI: `screenshots/01-draft-lead-salesmanager-en-{1-form-empty,3-form-filled,4-review-card,5-done,6-list-refetched}.png`; `outputs/playwright-run.log` (`phase` form → review → done, status "Created as LEAD-2026-00003").

AC-4 — Task and company cards, and the activity card in Arabic RTL with the `lead_ref` field
UI: `screenshots/03-draft-task-salesmanager-en-{1-form,2-review-card,3-done}.png`, `05-draft-company-salesmanager-en-1-review-card.png`, `04-draft-activity-salesmanager-ar-rtl-{1-form,2-review-card}.png`.

AC-5 — A failed command is shown, not swallowed: bridge down → `bridgeUnavailable` + reason `bridge_not_configured`, with "edit and resend" keeping the same key
UI: `screenshots/06-draft-lead-bridge-down-salesmanager-en-1-failed.png`; `outputs/stub-draft-posts.log` (`POST crm.lead.create 503`).

AC-6 — Capability gate: a salesperson (crm.view + sales.view, no crm.manage) sees no New buttons at all
UI: `screenshots/07-draft-buttons-hidden-salesperson-en.png`; `outputs/playwright-run.log` shows zero Draft POSTs for that shot.

AC-7 — Nothing written to any live system during verification; type-check, lint (incl. i18n rules), unit tests, inventory
TEST: `outputs/checks.txt` — tsc 140 pre-existing errors on base and branch, 0 in new/changed files; eslint 0 problems; `vitest run` 36 files / 238 tests green (6 new); inventory regenerated. Harness: every Draft POST went to the local stub (`127.0.0.1:8090`), service worker blocked, Supabase auth served locally, every other non-read request aborted. The receipts the stub returns were captured from the local ERPClaw spike DB (`outputs/erpclaw-shapes/`), never from a live gateway.

## Findings

- **AppLayout in RTL overlaps the start edge of the content with the sidebar** (pre-existing, global frame, out of this
  slice's scope by the "never replace AppLayout" rule): with `dir="rtl"` the main column is laid out as if the sidebar
  were on the right while the sidebar stays physically left, so the first ~40 px of every card sit under it — visible in
  `screenshots/04-…-ar-rtl.png` (the "New task" button is half hidden) and, on re-inspection, in VTID-03857's Chart of
  Accounts RTL shot (the Flags column is cut). The harness had to open the RTL activity card with a dispatched click
  because a real click landed on the sidebar link underneath. Needs its own VTID against `AppLayout`.
- The stub serves one fixed `list-leads` body, so `01-…-6-list-refetched.png` proves the refetch happened (a second
  `crm.lead.list` POST after the accept) but cannot show the new row — the real gateway would.

## Notes from the screenshot review

- ERPClaw receipts wrap the created record under a per-entity key (`lead`, `crm_contact`, `crm_task`, `activity`);
  `draftResultSummary` finds it generically, so a new form needs no bespoke result parsing.
- `add-lead` rejects any `--source` outside its seven values (first probe used "Website" and failed) — that is why the
  form offers a select, never free text, for every enumerated ERPClaw flag.
