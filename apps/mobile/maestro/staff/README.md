# Maestro — staff lane (VTID-05527) — DEFERRED to G1 (`next_actor: owner`)

Device-runtime parity for the native staff-mode port. These flows are **not run
in CI** and are **not a merge blocker** (requirements R5.3, tasks §6). They need
the isolated G1 test environment (and macOS minutes / G3 for iOS on a device).
Recorded here and in `docs/validation/VTID-05527/staging-tests.json`.

The eight screens only read the member's role preference; the flows sign in as a
staff-mode test member on the isolated environment, navigate and read. Nothing is
pressed that writes. Staff mode has no bottom tab bar; every flow navigates
through the drawer.

Flows (to author on G1):

- `01-dashboard.yaml` — open `/staff/dashboard`; header, four stat cards,
  pending tasks, quick actions; no bottom tab bar; parity vs the 390×844
  read-only staging screen.
- `02-queue.yaml` — open `/staff/queue` from the drawer; four counters and the
  three queue cards; parity vs staging.
- `03-coming-soon.yaml` — open `/staff/tasks`, `/schedule`, `/reports`,
  `/communications`, `/tools`, `/time` from the drawer; each shows its title and
  the coming-soon box; parity vs staging.
- `04-access-denied.yaml` — as a professional-mode member, deep-link
  `/staff/dashboard`; Access Denied renders; parity vs staging.

Until G1, the port is proven offline by the jest-expo + RNTL unit tests in
`apps/mobile/tests/staff/` and the typecheck / bundle / deps / parity gates.
