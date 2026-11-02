# Maestro — settings lane (VTID-05431) — DEFERRED to G1 (`next_actor: owner`)

Device-runtime parity for the native settings hub port. These flows are **not
run in CI** and are **not a merge blocker** (requirements R5.3, tasks §7). They
need the isolated G1 test environment (and macOS minutes / G3 for iOS on a
device). Recorded here and in `docs/validation/VTID-05431/staging-tests.json`.

This cluster is all write surfaces (notification / privacy / preference
switches, billing portal, creator onboarding, limitations, role / organisation
switch). At G1 the flows run only against the isolated test environment, never
against a live backend as the test account, and they only open and read: no
switch is toggled and no save button is pressed.

Flows (to author on G1):

- `01-settings-hub.yaml` — open `/settings`, then each `?mode=` section
  (notifications; privacy.visibility / .data / .security; preferences.appearance /
  .language; billing / .plan / .payment / .invoices / .creator) through the mode
  pill; parity vs the 390×844 read-only staging `/settings?mode=…`.
- `02-preferences-redirect.yaml` — open `/settings/preferences?section=accessibility`
  → the hub's notifications section (today's web fallback, requirements R1.5).
- `03-limitations.yaml` — open `/settings/limitations`; the counter and the
  saved sections render; parity vs staging.
- `04-tenant-role.yaml` — open `/settings/tenant-role`; current context and
  permissions render; parity vs staging.

Until G1, the port is proven offline by the jest-expo + RNTL unit tests in
`apps/mobile/tests/settings/` and the typecheck / bundle / deps / parity gates.
