# Maestro — support-connectors lane (VTID-05432) — DEFERRED to G1 (`next_actor: owner`)

Device-runtime parity for the native `/support`, `/connectors` and
`/settings/connected-apps` ports. These flows are **not run in CI** and are
**not a merge blocker** (requirements R5.3, tasks §6). They need the isolated
G1 test environment (and macOS minutes / G3 for iOS on a device). This cluster
is all write surfaces: a G1 run uses the isolated test environment only, never
a live backend as the test account, and never submits a ticket, toggles a
connector or opens a provider consent screen against a live system.
Recorded here and in `docs/validation/VTID-05432/staging-tests.json`.

Flows (to author on G1):

- `01-support-tabs.yaml` — `/support` opens Contact; `?tab=tickets`, `?tab=faqs`,
  `?tab=community` open their tabs; an FAQ expands; parity vs the 390×844
  read-only staging `/support` (each tab). Never presses "Send to support".
- `02-connectors-categories.yaml` — `/connectors` and each `?tab=` category
  (agent, ai, fitness, health, media, other, productivity, social) render their
  section; `/settings/connected-apps` lands on `/connectors`; parity vs the
  390×844 read-only staging `/connectors`. Never flips a switch or taps Connect.
- `03-oauth-return.yaml` — on the isolated G1 environment only: the provider
  consent hand-off and the return leg into the app (`/oauth/complete`,
  `/settings/connected-apps?app=…`), which the JS build does not exercise.

Until G1, the port is proven offline by the jest-expo + RNTL unit tests in
`apps/mobile/tests/support/` (mocked gateway, mocked consent opener) and the
typecheck / bundle / deps / parity gates.
