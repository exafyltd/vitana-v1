# VTID-03888 — Frontend: BackOffice Commit-tier and High-risk cards

**Layer:** DEV / Frontend (`/backoffice`) · **Design gate:** `docs/backoffice/GOLDEN-WORKFLOWS.md` §1.3 (structured review card), §3.3 (tiers; maker-checker requester ≠ approver; explicit confirmation, never by voice), §4.3 (escalations) · **Gateway half:** VTID-03887 (`exafyltd/vitana-platform#3310`, merged) exposes the payload to the approver.

## What changed

- `src/lib/backoffice-draft.ts` — `DraftTier` + `tier` on the form spec (`draft` default); seven new cards: **Commit** `leadConvert` (crm.lead.convert), `opportunityWon`, `opportunityLost`, `invoiceSubmit` (sales.invoice.submit), `journalSubmit` (accounting.journal.submit); **High-risk** `invoiceCancel` (sales.invoice.cancel → finance.approve), `journalCancel` (accounting.journal.cancel → accounting.close). Payloads carry only the argparse fields ERPClaw reads (the bridge refuses undeclared flags). State guards mirror ERPClaw's own (`canSubmitInvoice/canCancelInvoice/canSubmitJournal/canCancelJournal/canConvertLead/canMarkOpportunity`).
- `src/hooks/useDraftCommand.ts` — `submit(payload, confirm)`; pure `draftPhaseFor()`: executed → done, 202/awaiting_approval → **queued** (refreshes approvals + commands), else failed.
- `src/components/backoffice/DraftCommandDialog.tsx` — tier badge from the spec; Commit/High-risk review shows a ticked confirmation box (`draft-confirm`) and the accept button stays disabled until ticked; accept sends `confirm: true`; High-risk accept is destructive-styled "Submit for approval"; queued state with the approval id, a no-eligible-approver warning and a link to My requests; tier-specific done/failed wording.
- `src/components/backoffice/ApprovalDecisionDialog.tsx` — renders `command.payload` (VTID-03887) so the approver sees what they decide on; falls back to the old note when absent.
- Pages: Leads (convert), Opportunities (won/lost), Invoices (post/cancel), Journals (post/cancel) — buttons render only with the capability (`DraftCommandButton`) and only in a state ERPClaw accepts.
- i18n: DE first, mirrored to en/es/sr/ar (translated) and fr/pl/pt/ru/tr/zh (EN mirrors); no DE word over 22 chars.
- Found by the sweep: `screens.backoffice.errors.erpFailed` still read "ERPClaw rejected the **read** command" (VTID-03849 wording) and now fronts Commit-tier refusals too — reworded to "rejected the command" in all 11 locales (`QueryState`, the draft dialog and the decision dialog all use it).

## Acceptance criteria

AC-1 — Commit tier needs an explicit, ticked confirmation before the accept button enables, and the POST carries `confirm: true`
TEST: `src/lib/backoffice-draft.test.ts` › "Commit-tier and High-risk cards" (tiers); stub log `outputs/stub-admin.log` (`COMMIT crm.lead.convert … confirm=true`)
UI: `screenshots/01-convert-lead-en-3-review-unconfirmed.png` (accept disabled — `outputs/playwright-run.log` `check:disabled … true`), `-4-review-confirmed.png`, `-5-executed.png`

AC-2 — The five Commit cards map 1:1 to the catalog's typed commands / ERPClaw actions and send only fields ERPClaw reads
TEST: `src/lib/backoffice-draft.test.ts` › "Commit/High-risk types and actions are the catalog's", "a card never sends a field ERPClaw does not read"

AC-3 — High-risk never executes from the card: it is queued (202 `awaiting_approval`) and the dialog ends in a queued state with the approval id and the way to My requests
TEST: `src/hooks/useDraftCommand.test.ts` › "a High-risk command answers 202 awaiting_approval — queued, never done, never failed"
UI: `screenshots/05-cancel-invoice-high-en-2-review-high-unconfirmed.png`, `-3-review-high-confirmed.png`, `-4-queued.png` (`phase: queued`, status "Queued — waiting for a second person · Approval id")

AC-4 — Rejected/failed answers (confirmation_required, missing_capability, erp_action_failed, bridge_not_configured) land in the failed state, never done
TEST: `src/hooks/useDraftCommand.test.ts` › "rejected … and failed answers are failed"
UI: `screenshots/06-post-journal-fails-en-2-erp-refused.png` — `phase: failed`, "Not executed", reason `erp_action_failed`; the stub answered with ERPClaw's real "GL Validation Step 6 … requires a cost_center_id" refusal (`outputs/shapes/submit-journal-entry-cost-center-failure.txt`), which the receipt block carries as `stderr_tail`

AC-5 — Buttons appear only in a state ERPClaw accepts (submit a draft; cancel a posted document; convert a non-converted lead; mark a non-terminal opportunity)
TEST: `src/lib/backoffice-draft.test.ts` › "the state guards mirror ERPClaw's own"
UI: `screenshots/04-post-invoice-en-1-draft-detail-actions.png` (Post on the draft), `05-cancel-invoice-high-en-1-posted-detail-actions.png` (Cancel on the posted one), `02-mark-won-en-1-board-actions.png`

AC-6 — The approver sees the request contents in the decision dialog when the gateway exposes them (VTID-03887)
UI: `screenshots/07-approver-sees-payload-en-1-decide-with-payload.png` (`decide-payload` block with `sales_invoice_id`)

AC-7 — RTL (ar) renders without horizontal overflow; the confirmation box and buttons stay reachable and mirror correctly
UI: `screenshots/09-convert-lead-ar-rtl-1-review-rtl.png` (`dir:rtl`, `hOverflow:false` in `outputs/playwright-run.log`; accept disabled until the box is ticked, same as LTR)
Mobile (390×844): not applicable — BackOffice is desktop-only by inheritance (`useRole` forces `community` on mobile widths, recorded in VTID-03849); the 390×844 attempt in `outputs/playwright-run.log` (`08-…`) lands on the community home, which is that rule working, not this change.

AC-8 — Catalogue completeness and repo gates
TEST: `src/lib/backoffice-draft.test.ts` › "every Commit/High-risk form is fully translated…", "every draft form is fully translated in the source catalogue"; full `vitest run` `outputs/vitest-full-tail.txt` (39 files / 271 tests); `tsc --noEmit -p tsconfig.app.json`: the error set is byte-identical to HEAD (`8b5677e`) measured in a clean worktree — 140 pre-existing errors in untouched files, none in any file this VTID changes (`outputs/tsc-baseline-vs-now.txt`); ESLint (i18n rules) clean on every changed file; `npm run i18n:inventory` committed.

## Not verified / owed

- Not run against the real gateway/bridge: the stub gateway (`outputs/stub-gateway.mjs`) implements the orchestrator's tier rules for the screenshots; the real 403 `confirmation_required` / 202 queue path is pinned by the gateway's own suite (`vitana-platform` `test/routes/backoffice-commands.test.ts`). A staging run needs the bridge provisioned (VTID-03840 owner actions).
- The requester's free-text reason for a High-risk cancel is not sent: ERPClaw's `cancel-sales-invoice` / `cancel-journal-entry` read only the id and the bridge refuses undeclared flags; the approver records the note on the decision instead.
- `journalCancel` requires `accounting.close` on the requester (catalog); a bookkeeper with `accounting.post` cannot request it — by design, recorded.
