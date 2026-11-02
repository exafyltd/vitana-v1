# Maestro — public-profile lane (VTID-05430) — DEFERRED to G1 (`next_actor: owner`)

Device-runtime parity for the native `/u/:identifier` public profile and the
legacy `/profile/:id` redirect (tasks.md `public-profile` task 6). These flows
are **not run in CI** and are **not a merge blocker**. They need the isolated G1
test environment (iOS simulator + Android emulator). Recorded here and in
`docs/validation/VTID-05430/staging-tests.json`.

Flows (to author on G1):

- `01-public-profile-signed-out.yaml` — signed out, open `/u/<handle>` → the
  landing renders in the public shell (cover, avatar, name, @handle, VITANA
  Index, stats, milestones, photos); Follow / Message / View Full Profile open
  `/maxina?redirectTo=/u/<handle>`; screenshot parity vs the 390×844 read-only
  staging `/u/<handle>` signed out.
- `02-public-profile-signed-in.yaml` — signed in, open `/u/<handle>` and
  `/u/<handle>?match_intent=<id>` → the member layout renders in the member shell
  (identity card, Posts / About / Media / Groups tabs); screenshot parity vs the
  390×844 read-only staging page signed in.
- `03-legacy-redirect.yaml` — open `/profile/1` and `/profile/<uuid>`, signed in
  and out → replaced by `/u/sarahwellness` / `/u/<uuid>`; `/profile/not a handle!`
  → not found.

Until G1, the port is proven offline by the jest-expo + RNTL unit tests in
`apps/mobile/tests/public-profile/` and the typecheck / bundle / deps / parity gates.
