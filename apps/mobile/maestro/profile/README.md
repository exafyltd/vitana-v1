# Maestro — profile lane (VTID-05429) — DEFERRED to G1 (`next_actor: owner`)

Device-runtime parity for the native `/me/profile` and `/profile/me/privacy` port.
These flows are **not run in CI** and are **not a merge blocker** (requirements
R5.3, tasks §6). They need the isolated G1 test environment (and macOS minutes / G3
for iOS on a device). This cluster is all write surfaces: a G1 run uses the
isolated environment only, never a live backend as the test account, and the flows
open sheets and cancel — they never save or cycle a tier. Recorded here and in
`docs/validation/VTID-05429/staging-tests.json`.

Flows (to author on G1):

- `01-my-profile.yaml` — open `/me/profile` → the Identity card (avatar, name,
  @handle, archetype, followers, Vitana Index), the stats strip and the Posts tab
  render; switch Identity / Social / Account / Business; open About / Media /
  Groups; open each edit sheet (Identity, About, Account, Showcase) and cancel;
  parity vs the 390×844 read-only staging `/me/profile`.
- `02-privacy.yaml` — open `/profile/me/privacy` → the five sections and their
  tier badges render; back returns; parity vs the 390×844 read-only staging
  `/profile/me/privacy`.

Until G1, the port is proven offline by the jest-expo + RNTL unit tests in
`apps/mobile/tests/profile/` and the typecheck / bundle / deps / parity gates.
