# Maestro — ai-coach lane (VTID-05523) — DEFERRED to G1 (`next_actor: owner`)

Device-runtime parity for the native AI coach pages (`/ai`, `/ai/insights`,
`/ai/recommendations`, `/ai/daily-summary`, `/ai/companion`). These flows are
**not run in CI** and are **not a merge blocker** (requirements R5.3, tasks §7).
They need the isolated G1 test environment (and macOS minutes / G3 for iOS on a
device). Recorded here and in `docs/validation/VTID-05523/staging-tests.json`.

The companion chat writes (a coach turn, the AI-consent preference, the
onboarding autopilot completion). At G1 the flows run only against the isolated
test environment and only open and read: no message is sent and consent is not
granted.

Flows (to author on G1):

- `01-ai-overview.yaml` — open `/ai`, then Insights and Recommendations through
  the AI sub-navigation; read each card stack; parity vs the 390×844 read-only
  staging `/ai`, `/ai/insights`, `/ai/recommendations`.
- `02-daily-summary.yaml` — open `/ai/daily-summary`; the learnings (or the empty
  line) and the Index card render; parity vs staging.
- `03-companion.yaml` — open `/ai/companion`; the coach chat, the Index mini,
  suggestions, Autopilot widget and card stack render; parity vs staging.

Until G1, the port is proven offline by the jest-expo + RNTL unit tests in
`apps/mobile/tests/ai-coach/` and the typecheck / bundle / deps / parity gates.
