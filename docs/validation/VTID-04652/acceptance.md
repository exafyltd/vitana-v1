# VTID-04652 — Community Autopilot: pop-up "Later" button + reminder Mark-done opens the suggestion

Plan `docs/COMMUNITY-AUTOPILOT-V2-PLAN.md` §4, found missing by the plan audit:
- §4.2 Pop-up: "snooze button". The gateway had `POST /recommendations/:id/snooze` since
  VTID-01180, but the pop-up offered only select/run and complete.
- §4.3 Calendar: "the reminder deep-links into the offer". Since VTID-04506 the gateway's
  reminder `complete` finishes the linked Autopilot slot and returns `autopilot_slot.route`,
  but the reminder overlay discarded the response, so Mark done never opened the suggestion.

## What changed
- `use-autopilot.ts`: `snoozeRecommendation(id, hours = 24)` calls the snooze route and removes the row.
- `AutopilotPopup.tsx`: a "Later" button on every pending suggestion. It snoozes for 24 h and
  never selects or runs the suggestion. The success and failure toasts go through the i18n helpers.
- `reminders-api.ts`: `completeReminderWithSlot` returns the reminder and the Autopilot slot result;
  `completeReminder` keeps its old contract. `autopilotSlotRoute` follows only an in-app path of
  a completed slot, never another origin.
- `ReminderInterruptOverlay.tsx`: Mark done on a reminder that belongs to an Autopilot slot opens
  the suggestion's screen. A failed complete closes the overlay and stays where it is.
- Strings in all 11 locales (German first).

## Acceptance criteria

AC-1: "Later" snoozes the suggestion for 24 hours and neither selects nor runs it; a failed snooze tells the member.
TEST: src/components/AutopilotPopup.snooze.test.tsx

AC-2: Mark done on a reminder linked to an Autopilot slot navigates to the suggestion's screen.
TEST: src/components/reminders/ReminderInterruptOverlay.autopilot.test.tsx

AC-3: An ordinary reminder, a failed complete, a failed slot and any non-app route never navigate.
TEST: src/components/reminders/ReminderInterruptOverlay.autopilot.test.tsx

## Evidence
- `outputs/staging-http.txt`: 4/4 read-only staging checks.
- `outputs/vitest-full.txt`: full suite, 192 files / 1143 tests.
- `outputs/mutation.txt`: both fixes mutation-checked.

Lint is clean on the changed lines. `tsc` reports no errors in the changed files; 166 errors
already on main elsewhere are unchanged.
