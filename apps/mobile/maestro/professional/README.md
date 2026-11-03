# Maestro — professional lane (VTID-05526) — DEFERRED to G1 (`next_actor: owner`)

Device-runtime parity for the native professional-mode port. These flows are **not
run in CI** and are **not a merge blocker** (requirements R5.3, tasks §6). They
need the isolated G1 test environment (and macOS minutes / G3 for iOS on a
device). Recorded here and in `docs/validation/VTID-05526/staging-tests.json`.

The eight screens only read the member's role preference; the flows sign in as a
professional-mode test member on the isolated environment, navigate and read.
Nothing is pressed that writes.

Flows (to author on G1):

- `01-dashboard.yaml` — open `/professional/dashboard`; header, four stat cards,
  today's schedule, quick actions, the professional bottom tabs (Dashboard,
  Patients, ORB, Schedule, Settings); parity vs the 390×844 read-only staging screen.
- `02-coming-soon.yaml` — open `/professional/patients`, `/schedule`, `/tools`,
  `/referrals`, `/billing`, `/profile`, `/education` (bottom tabs and drawer); each
  shows its title and the coming-soon box; parity vs staging.
- `03-access-denied.yaml` — as a patient-mode member, deep-link
  `/professional/dashboard`; Access Denied renders; parity vs staging.

Until G1, the port is proven offline by the jest-expo + RNTL unit tests in
`apps/mobile/tests/professional/` and the typecheck / bundle / deps / parity gates.
