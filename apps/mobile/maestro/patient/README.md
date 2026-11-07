# Maestro — patient lane (VTID-05525) — DEFERRED to G1 (`next_actor: owner`)

Device-runtime parity for the native patient-mode port (tasks.md lane `patient`,
task 6). These flows are **not run in CI** and are **not a merge blocker**
(requirements R5.3). They need the isolated G1 test environment (and macOS
minutes / G3 for iOS on a device). Recorded here and in
`docs/validation/VTID-05525/staging-tests.json`.

Patient health data: at G1 the flows run only against the isolated test
environment with a seeded test patient. They open and read. The partner
link-request card's Confirm / Not me buttons are never pressed (each one is a
write: `POST /partner-health/member/link-requests/:id/confirm|decline`).

Flows (to author on G1):

- `01-patient-tabs.yaml` — sign in as the seeded patient (patient mode), land
  on `/patient/dashboard`; the bottom bar shows Dashboard, Results, Health,
  Appointments around the ORB; tap each tab; screenshot parity vs the 390×844
  read-only staging screens.
- `02-results.yaml` — open `/patient/results`; the results list renders; open
  one card and read the biomarker table; close it. No link-request decision.
- `03-coming-soon.yaml` — open `/patient/care-team`, `/patient/goals`,
  `/patient/insurance`, `/patient/notifications`; each shows the "coming soon"
  state; parity vs staging.
- `04-access.yaml` — sign in as a community member: `/patient/results` opens
  (AuthGuard only on the web), `/patient/goals` bounces to `/home` (route
  guard), as on the web.

Until G1, the port is proven offline by the jest-expo + RNTL unit tests in
`apps/mobile/tests/patient/` and the typecheck / bundle / deps / parity gates.
