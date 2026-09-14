# VTID-03872 — Frontend: BackOffice Accounting journal Draft card

VTID: VTID-03872
Spec: approved (generate → validate pass → quality-check pass, known CRITICAL risk label → approve; `outputs/spec-*.json`).
Backend: `exafyltd/vitana-platform#3291` (VTID-03842 orchestrator) — not on staging yet; its migration awaits the owner's "apply now".
Stacked on the VTID-03871 branch (Finance payment Draft card). Fourth Draft-tier slice on the VTID-03859 review card.

## What shipped

- `accounting.journal.create` card (`add-journal-entry`, `accounting.post`): posting date, entry type (the nine ERPClaw
  `VALID_ENTRY_TYPES`), remark, and debit/credit lines. Button on Accounting › Journals.
- Line editor upgrades: rows can be added and removed (two blank rows to start, never fewer than two); each line's account
  is a `lookup` column over `accounting.coa.list` (non-group, enabled accounts, `number · name`); a live footer shows the
  debit and credit totals and either "Balanced" or the exact difference. Validation mirrors ERPClaw's `_validate_lines`: at
  least two lines, every touched line needs an account and a debit or credit, and total debit must equal total credit to the
  cent. The review card repeats the lines with the resolved account, the id underneath, and the totals row. Blank amounts are
  sent as `0.00` (ERPClaw expects both keys on every line).
- 15 tests (3 new). i18n DE-first (25 new keys incl. the nine entry types), en/es/sr/ar translated, fr/pl/pt/ru/tr/zh
  mirror EN; inventory regenerated.

## Deliberately NOT in this slice

- Submitting (`accounting.journal.submit`, Commit) and cancelling (`accounting.journal.cancel`, High-risk).
- Per-line cost centre / party / remark, duplicate and amend (`accounting.journal.duplicate` / `amend`, both Draft — a
  follow-up card that pre-fills from an existing entry).

## Acceptance criteria

AC-1 — Balance rule: an unbalanced entry never reaches review; ERPClaw enforces the same rule server-side
TEST: `src/lib/backoffice-draft.test.ts` — "refuses an unbalanced entry, a line without an account, and a line with neither debit nor credit"; "sends every touched line with blank amounts defaulted to 0.00 and reports totals".
UI: `screenshots/01-draft-journal-bookkeeper-en-3-unbalanced-live.png` (footer "Difference AED 20.00"), `…-4-validation-unbalanced.png`; `outputs/erpclaw-shapes/add-journal-entry-unbalanced.txt` (ERPClaw: "Total debit (120.00) must equal total credit (100.00)").

AC-2 — At least two lines, each with an account and an amount
TEST: `src/lib/backoffice-draft.test.ts` — "starts with two blank rows and refuses fewer than two filled lines".
UI: `screenshots/01-…-1-form-empty.png` (two blank rows), `…-2-validation-no-lines.png` ("At least two lines with an account and an amount").

AC-3 — Accounts picked from the chart, sent as ids; a spare blank row is ignored
UI: `screenshots/01-…-5-balanced-with-spare-row.png` (third row added and left blank, footer "Balanced"); `outputs/stub-draft-posts.log` — `DRAFT accounting.journal.create … "lines":[{"account_id":"04310b4d-…","debit":"120","credit":"0.00"},{"account_id":"f529f450-…","debit":"0.00","credit":"120"}]` (two lines, `POST accounting.coa.list 200` before it).

AC-4 — End to end: form → review card with resolved accounts and totals → done with the bridge receipt; DE review card; Arabic RTL editor
UI: `screenshots/01-draft-journal-bookkeeper-en-{6-review-card,7-done}.png`, `02-draft-journal-bookkeeper-de-1-review-card.png`, `03-draft-journal-bookkeeper-ar-rtl-1-form.png`; `outputs/playwright-run.log`.

AC-5 — Capability gate: a salesperson (no accounting.post) sees no button
UI: `screenshots/04-draft-journal-hidden-salesperson-en.png`; `outputs/playwright-run.log` shows zero Draft POSTs for that shot.

AC-6 — Nothing written to any live system during verification; type-check, lint (incl. i18n rules), unit tests, inventory
TEST: `outputs/checks.txt` — tsc 140 pre-existing errors on base and branch, 0 in changed files; eslint 0 problems; `vitest run` 36 files / 247 tests green (3 new); inventory regenerated. Harness: every Draft POST went to the local stub, service worker blocked, Supabase auth served locally, every other non-read request aborted. The `add-journal-entry` receipt (and the unbalanced rejection) were captured from the local ERPClaw spike DB.

## Notes

- Two defects caught by the first sweep and fixed before the second: an empty journal reported the credit-note wording
  ("enter a quantity…") instead of the two-lines rule, and the footer said "Balanced" for an all-zero form. The run log keeps
  both sweeps.
- The bookkeeper persona holds `accounting.view`, so the account lookup loads; without it the cells degrade to typed ids
  exactly as the payment card does (VTID-03871).
