# Maestro — memory lane (VTID-05427) — DEFERRED to G1 (`next_actor: owner`)

Device-runtime parity for the native Memory overview / Timeline / Recall /
Permissions port. These flows are **not run in CI** and are **not a merge
blocker** (requirements R5.3, tasks.md memory task 7). They need the isolated
G1 test environment (and macOS minutes / G3 for iOS on a device). Recorded here
and in `docs/validation/VTID-05427/staging-tests.json`.

Parity reference (plan decision 6, sparring R1-F1): the four web memory pages
have no phone-shaped web branch (they render the responsive desktop
`AppLayout` on phones), so these flows check **body parity against the native
N3 shell baseline** (same data, controls, states and navigation targets), not a
web↔native pixel match.

Flows (to author on G1; sign in, navigate, read — no write is exercised
against a live system):

- `01-memory-overview.yaml` — `/memory`: week story, routines, what Vitana
  knows, the 13 garden categories with counts; open a category sheet; switch
  to the Timeline and Education tabs.
- `02-memory-timeline.yaml` — `/memory/timeline`: Index spotlight, pillar
  chips, a day with moments; open a moment's detail sheet (read only).
- `03-memory-recall.yaml` — `/memory/recall`: static body, honest empty state,
  Memory Actions sheet.
- `04-memory-permissions.yaml` — `/memory/permissions`: the learning switches
  render their saved state, the usage count renders (no switch is toggled).

Until G1, the port is proven offline by the jest-expo + RNTL unit tests in
`apps/mobile/tests/memory/` and the typecheck / bundle / deps / parity gates.
