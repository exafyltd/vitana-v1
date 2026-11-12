# Maestro — health-plans-services lane (VTID-05456) — DEFERRED to G1 (`next_actor: owner`)

Device-runtime parity for the native pillars / conditions / education / plans /
services-hub port. These flows are **not run in CI** and are **not a merge
blocker** (tasks.md health-plans-services task 8). They need the isolated G1
test environment (and macOS minutes / G3 for iOS on a device). Recorded here
and in `docs/validation/VTID-05456/staging-tests.json`.

Parity reference: the 390×844 **read-only** staging web screen (the phone
branch of each page). Flows sign in, navigate and read; the network guard
aborts every non-GET except sign-in; never `vitanaland.com`.

Flows (to author on G1):

- `plans-services-01-pillars-conditions.yaml` — `/health/pillars`: five pillar
  cards, the Vitana Index tile (opens `/health`); `/health/conditions`.
- `plans-services-02-education.yaml` — `/health/education`: Articles /
  Videos / Podcasts tabs, `?tab=videos` and `?tab=podcasts`, the Education
  Actions popup.
- `plans-services-03-plans.yaml` — `/health/plans`: All Plans cards, the five
  pillar tabs and their `?tab=` links (Generate stays disabled; nothing is written).
- `plans-services-04-services-hub.yaml` — `/health/services-hub`: the five
  sections and their `?tab=` links, a service detail sheet (Book Now disabled),
  the Service Actions popup.

Until G1, the port is proven offline by the jest-expo + RNTL unit tests in
`apps/mobile/tests/health/plans-services/` and the typecheck / bundle / deps /
parity gates.
