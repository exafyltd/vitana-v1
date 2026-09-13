# VTID-03873 — Frontend: BackOffice Approvals decision screen (approve / reject + policy edit)

VTID: VTID-03873
Spec: approved (generate → validate pass → quality-check pass, known CRITICAL risk label → approve; `outputs/spec-*.json`).
Backend: `exafyltd/vitana-platform#3291` (VTID-03842 orchestrator: `POST /approvals/:id/approve|reject`, `PUT /policy`) — not on
staging yet; its migration awaits the owner's "apply now". Stacked on the VTID-03872 branch (Accounting journal Draft card).

## What shipped

- **Approve / Reject on the Queue (BO-053).** Pending rows the signed-in person may decide (`can_decide` from the gateway) get
  Approve and Reject buttons. The dialog shows the command (type, ERP action, tier, escalations, channel, requester, requested
  at, approver capability, reason) fetched from `GET /commands/:id`, a decision note (optional on approve, **required** on
  reject, ≤ 1000 chars), and a maker-checker line (not the requester, holds the approve capability, on the web). Submitting
  calls the gateway; the outcome card shows exactly what the gateway said: executed with the bridge receipt (200), rejected
  (200), approved-but-bridge-failed (502, with the receipt error), or one of the orchestrator's refusals (403
  `self_approval_forbidden` / `approver_capability_missing` / `platform_role_read_only` / `mfa_required` /
  `approval_requires_approvals_screen` / `no_approve_capability_on_request`, 409 `ALREADY_DECIDED`, 404) with a translated
  explanation. The queue, command list, command detail and audit trail are refetched afterwards whatever the outcome.
- **Edit policy on Policies (BO-055).** `approvals.policy` holders get an Edit policy button: High-risk threshold (0 … 10^12)
  and MFA switch, a "nothing changed" guard, a before/after review table showing only the changed settings, then `PUT
  /policy`. Readers without the capability see a read-only hint instead of the button.
- `src/lib/backoffice-approvals.ts` (pure: refusal map, outcome classifier, note and policy validation, change diff) with
  4 tests; `useApprovalDecision` / `usePolicyEdit` hooks; `ApprovalDecisionDialog`, `PolicyEditDialog`. i18n DE-first
  (50 new keys), en/es/sr/ar translated, fr/pl/pt/ru/tr/zh mirror EN; inventory regenerated.

## Deliberately NOT in this slice

- Voice approvals: High-risk is never confirmable by voice (brief §8); the dialog is web-only and the gateway enforces
  `approval_requires_approvals_screen`.
- Showing the command's submitted payload to the approver: `GET /commands/:id` does not expose it (gateway gap, flagged in
  the dialog and in the report). Requires a VTID-03842 follow-up.
- MFA step-up UI: when the policy requires MFA the gateway answers `mfa_required`; the dialog explains it, it does not start
  an MFA flow.

## Acceptance criteria

AC-1 — Only decidable rows offer Approve / Reject; own requests and foreign capabilities are explained, not actionable
UI: `screenshots/01-decide-approve-admin-en-1-queue-with-actions.png` — ap-0 (requester u-sales, needs finance.approve) shows
Approve / Reject; ap-1 (own request) says "Your own request – you cannot approve it yourself"; ap-2 (needs
accounting.close) says "Not yours to approve". `screenshots/06-decide-no-actions-bookkeeper-en.png` — no buttons for a
bookkeeper.

AC-2 — Approve: confirm → gateway executes → receipt shown → queue refetched with the decision and note
TEST: `src/lib/backoffice-approvals.test.ts` — "classifies every gateway outcome" (200 executed → `executed`).
UI: `screenshots/01-decide-approve-admin-en-{2-dialog,3-executed,4-queue-after}.png`; `outputs/stub-decision.log` —
`DECIDE approve ap-0 note="Matches the signed credit note; approved."` → `POST …/approvals/ap-0/approve 200`.

AC-3 — Reject requires a note; the command ends `rejected`, nothing executes
TEST: `src/lib/backoffice-approvals.test.ts` — "requires a note to reject and caps it".
UI: `screenshots/02-decide-reject-admin-en-{1-note-required,2-rejected}.png`, `screenshots/02-decide-reject-admin-en.png` (queue after); `outputs/stub-decision.log`
— `DECIDE reject ap-0 note="Amount does not match the signed order."` → 200 with `status: rejected`.

AC-4 — Approved but the bridge failed: the approval stands, the failure is shown with the receipt error
TEST: `src/lib/backoffice-approvals.test.ts` — "classifies every gateway outcome" (502 → `executedButFailed`).
UI: `screenshots/08-decide-approve-bridge-down-admin-en-1-approved-but-bridge-failed.png` (stub `BRIDGE=down` answers 502
`bridge_not_configured`).

AC-5 — Policy edit: validation, "nothing changed" guard, before/after review, save, refetched values
TEST: `src/lib/backoffice-approvals.test.ts` — "validates a policy edit and lists what changed".
UI: `screenshots/03-policy-edit-admin-en-{1-form,2-no-changes,3-review-before-after,4-saved,5-policies-after}.png`;
`outputs/stub-decision.log` — `POLICY PUT {"high_risk_amount_threshold":50000,"require_mfa_for_high":false}` → 200.

AC-6 — Capability gate on policy edit: the Edit button only renders for `approvals.policy`; a reader with `audit.view`
alone sees the read-only hint (`Policies.tsx`), and a persona with neither (the bookkeeper) is stopped at the section gate
before the page loads. The gateway's 403 on `PUT /policy` is the second gate.
UI: `screenshots/07-policy-read-only-bookkeeper-en.png` (section gate, `approvals.policy · audit.view` named); `outputs/stub-decision.log`
— `GET /api/v1/backoffice/policy 403` for the bookkeeper and no `PUT` at all.

AC-7 — German and Arabic (RTL) decision dialogs
UI: `screenshots/04-decide-approve-admin-de-1-dialog.png`, `screenshots/05-decide-approve-admin-ar-rtl-1-dialog.png`.

AC-8 — Nothing written to any live system during verification; type-check, lint (incl. i18n rules), unit tests, inventory,
DE long-word guard
TEST: `outputs/checks.txt` — tsc 140 pre-existing errors (same as base), 0 in changed files; eslint 0 problems; `vitest run`
37 files / 251 tests green (4 new); `i18n-long-words --locale=de --max-word-length=22` 0 flagged; inventory regenerated.
Harness: every decision POST and policy PUT went to the local stub on 127.0.0.1:8090; service worker blocked; Supabase auth
served locally from the one permitted sign-in; every other non-read request aborted (`outputs/playwright-run.log`).

## Notes

- Four defects caught by the first sweeps and fixed before the final one (the run log keeps every sweep): (1) the policy
  dialog was keyed on the policy values, so a successful save refetched the policy, changed the key and remounted the dialog
  back at the form instead of "saved" (`Policies.tsx` now keys one mount per opening); (2) `decisionOutcomeKey` classified
  every 200 as "executed", so a rejection's subtitle read "Approved and executed" above the "request is rejected" line — the
  classifier now takes the verdict; (3) a 502 carries its reason under `command.reason`, not `error`, so a bridge outage
  was reported with the Read-tier wording "ERPClaw rejected the read command" — `decisionReason()` reads both and the
  outcome uses the decision wording; (4) the screenshot stub itself parsed the wrong path segments for
  `/approvals/:id/:verdict` and answered 404 — a harness bug.
- The gateway does not return the command payload to approvers (`publicCommand` omits it). The dialog says so in plain
  words rather than pretending the approver saw the data. Tracked as an owner decision for VTID-03842.
