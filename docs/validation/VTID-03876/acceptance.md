# VTID-03876 — Frontend: BackOffice CRM update Draft cards

VTID: VTID-03876
Spec: approved (generate → validate pass → quality-check pass → approve; `outputs/spec-*.json`).
Backend: `exafyltd/vitana-platform#3291` (VTID-03842 orchestrator) — not on staging yet; its migration awaits the owner's
"apply now". Stacked on the VTID-03873 branch (Approvals decision screen). Sixth Draft-tier slice on the VTID-03859 review card.

## What shipped

Six edit cards, all through the existing review card and `POST /api/v1/backoffice/commands` (channel `web`, idempotency key
`ui.draft:<type>:<nonce>`):

| Screen | Card | Typed command → ERPClaw action |
|---|---|---|
| Leads (BO-005) | Edit lead | `crm.lead.update` → `update-lead` |
| Opportunities (BO-006) | Edit opportunity | `crm.opportunity.update` → `update-opportunity` |
| Opportunities (BO-006) | Move stage | `crm.opportunity.set_stage` → `set-opportunity-pipeline-stage` |
| Follow-ups (BO-008) | Edit task | `crm.task.update` → `update-crm-task` |
| Follow-ups (BO-008) | Complete | `crm.task.complete` → `complete-crm-task` |
| Follow-ups (BO-008) | Cancel | `crm.task.cancel` → `cancel-crm-task` |

- Each card starts from the record and **a field left blank keeps its current value** — ERPClaw updates only the fields it
  is given — and the form says so rather than letting the user guess.
- **A frozen record offers no card at all.** ERPClaw refuses an update on a converted lead, a won/lost opportunity and a
  done/cancelled task; all three refusals were captured from the real router (`outputs/erpclaw-shapes/`), and the screens
  hide the button rather than offer one that can only fail.
- **The opportunity edit card has no stage select.** ERPClaw *stores* the stage as the pipeline stage's name ("Proposal")
  but *validates* `update-opportunity --stage` against its own snake_case enum ("proposal_sent"). A select prefilled from
  the record would be invalid the moment the card opened. Moving a stage is the dedicated card, which picks the tenant's
  own stages by id through `crm.pipeline_stage.list`.
- **An edit card is never described as a creation**: the confirm button, the "what happens" line and the done state each
  have an update twin, chosen by `draftCreates()`.
- 23 tests in the file (8 new). i18n DE-first, en/es/sr/ar translated, fr/pl/pt/ru/tr/zh mirror EN; inventory regenerated.

## Deliberately NOT in this slice

- Commit-tier `convert-lead-to-opportunity`, `mark-opportunity-won`, `mark-opportunity-lost` — reaching a terminal state is
  a different tier with its own confirmation.
- `link-task-to-entity` / `unlink-task-from-entity`.
- Voice: these are web cards, like every Draft card in this wave.

## Acceptance criteria

AC-1 — An edit card starts from the record; a blank field keeps its current value
TEST: `src/lib/backoffice-draft.test.ts` — "prefills what the record has and leaves the rest blank"; "sends only the filled
fields — a blank one keeps its current value".
UI: `screenshots/01-edit-lead-en-2-form-prefilled.png` (name, e-mail, source and status prefilled; company, territory and
industry blank because the record has none), `…-3-review.png`; `outputs/stub-draft-posts.log` — `DRAFT crm.lead.update …
payload={"lead_id":"5027a893-…","lead_name":"Bridge Lead","email":…,"phone":"+971 50 000 0001","source":"referral","status":"contacted"}`.

AC-2 — A frozen record offers no card, because ERPClaw would refuse it
TEST: `src/lib/backoffice-draft.test.ts` — "hides the card on a record ERPClaw has frozen".
ERP: `outputs/erpclaw-shapes/update-lead-converted.txt` ("Cannot update a converted lead. Work with the opportunity
instead."), `update-opportunity-terminal.txt` ("Opportunity is won. Terminal states cannot be updated."),
`update-crm-task-terminal.txt` ("Task is cancelled. Terminal tasks cannot be updated."), `complete-crm-task-again.txt`
("Task is already done.") — all captured from the real ERPClaw router on the spike database.

AC-3 — The opportunity edit card carries no stage; moving a stage picks a real pipeline stage by id
TEST: `src/lib/backoffice-draft.test.ts` — "keeps the stage out of the opportunity edit card — ERPClaw stores a name and
validates an enum"; "moves a stage by id, through the tenant's own pipeline stages".
UI: `screenshots/05-edit-opportunity-en-1-form-no-stage.png`, `screenshots/04-move-stage-en-{2-form,3-review}.png`;
`outputs/stub-draft-posts.log` — `DRAFT crm.opportunity.set_stage … payload={"opportunity":"…","stage":"<stage id>"}`.

AC-4 — Completing needs no reason, cancelling does; both carry the task id
TEST: `src/lib/backoffice-draft.test.ts` — "cancels only with a reason, completes without one, and always carries the record id".
UI: `screenshots/02-complete-task-en-{2-form,3-review,4-done}.png`, `screenshots/03-cancel-task-en-{1-reason-required,2-review,3-cancelled}.png`.

AC-5 — An edit card is never worded as a creation
TEST: `src/lib/backoffice-draft.test.ts` — the catalogue guard below covers the keys; `draftCreates()` picks the twin.
UI: `screenshots/01-edit-lead-en-3-review.png` ("Draft tier: changes an existing record … reversible by editing again",
button "Accept and save"), `…-4-saved.png` ("Saved").

AC-6 — Capability gate: without `crm.manage` no card appears anywhere
UI: `screenshots/08-no-actions-salesperson-en-1-tasks.png`, `screenshots/09-no-edit-salesperson-en-1-lead-detail.png`;
`outputs/playwright-run.log` shows zero Draft POSTs for that persona.

AC-7 — German and Arabic (RTL)
UI: `screenshots/06-edit-task-de-{1-form,2-review}.png`, `screenshots/07-edit-lead-ar-rtl-1-form.png`.

AC-8 — Nothing written to any live system; type-check, lint, unit tests, inventory, DE long-word guard
TEST: `outputs/checks.txt` — tsc 140 pre-existing errors (same as base), 0 in changed files; eslint 0; `vitest run`
37 files / 258 tests; long-word guard 0 flagged; inventory regenerated. Harness: every Draft POST went to the local stub on
127.0.0.1:8090, service worker blocked, Supabase auth served locally from the one permitted sign-in, every other non-read
request aborted.

## Notes

- The sweep caught a real defect on its first pass: the five new lead-status options had no entry in
  `screens.backoffice.draft.choices`, so both the form's select and the review card rendered
  `[[missing:screens.backoffice.draft.choices.contacted]]`. Fixed, and a new test now walks every form and fails if any
  form, field or select option lacks a label in the DE source catalogue — the class of defect, not just this instance.
- The `opportunity` payload key is deliberate, not a typo: ERPClaw names this flag `--opportunity`, not
  `--opportunity-id`, and the bridge derives the flag from the payload key.
