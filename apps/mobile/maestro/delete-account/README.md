# Maestro — delete-account lane (VTID-05428) — DEFERRED to G1 (`next_actor: owner`)

Device-runtime parity for the native public `/delete-account` port. These flows are
**not run in CI** and are **not a merge blocker** (tasks.md delete-account task 5).
They need the isolated G1 test environment (and macOS minutes / G3 for iOS on a
device). Recorded here and in `docs/validation/VTID-05428/staging-tests.json`.

Flow (to author on G1):

- `01-delete-account.yaml` — signed out: `/delete-account` shows the
  sign-in-required view and its Sign In button opens `/maxina`; signed in: info →
  "Delete My Account" → type `DELETE` → "Permanently Delete" → the final dialog is
  **cancelled** (never confirmed: account deletion is a destructive write to the
  single production project on every host); parity vs the 390×844 read-only
  staging `/delete-account`.

Until G1, the port is proven offline by the jest-expo + RNTL unit tests in
`apps/mobile/tests/delete-account/` (the deletion request is asserted against a
mocked `functions.invoke` and never sent) and the typecheck / bundle / deps /
parity gates.
