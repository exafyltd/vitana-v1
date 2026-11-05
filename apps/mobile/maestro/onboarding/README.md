# Maestro — onboarding lane (VTID-05450) — DEFERRED to G1 (`next_actor: owner`)

Device-runtime parity for the native `/onboarding/welcome` port. These flows are **not run
in CI** and are **not a merge blocker** (requirements R5.3, tasks.md onboarding task 5).
They need the isolated G1 test environment (a fresh G1 account that has not finished
onboarding) and macOS minutes / G3 for iOS on a device. Recorded here and in
`docs/validation/VTID-05450/staging-tests.json`.

Flows (to author on G1; never against production):

- `01-welcome-speech.yaml` — sign in on `/maxina` with a new G1 account → lands on
  `/onboarding/welcome`: "Welcome to Maxina", the speech bubbles one by one, "Skip intro".
- `02-name-handle.yaml` — the form: name pre-fill, handle suggestion, taken / invalid /
  available states, "Introduce me to the community", "Let's get started!" → the audiobook
  step → "Later" → `/home`.
- `03-redirect.yaml` — an already-onboarded G1 account opening `/onboarding/welcome` goes
  straight to `/home`; with `?redirectTo=` to that path.
- Screenshot parity of each vs the 390×844 **read-only** staging `/onboarding/welcome`
  (signed in, read-only), `de` and `ar`.

Until G1, the port is proven offline by the jest-expo + RNTL unit tests in
`apps/mobile/tests/onboarding/` and the typecheck / bundle / deps / parity gates.
