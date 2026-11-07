# Maestro — health-hub lane (VTID-05455) — DEFERRED to G1 (`next_actor: owner`)

Device-runtime parity for the native Health dashboard (`/health`, `?mode=medical`,
`?mode=supplements`) and the Vitana Index overlay. These flows are **not run in CI**
and are **not a merge blocker** (plan decision 5, tasks.md health-hub task 9). They
need the isolated G1 test environment (and macOS minutes / G3 for iOS on a device).
Recorded here and in `docs/validation/VTID-05455/staging-tests.json`.

Parity reference (plan decision 6): the mobile-web (`useIsMobile` ≤ 1024 px) branch of
`src/pages/Health.tsx`, screenshot parity against the **read-only** 390×844 staging web
`/health` — never `vitanaland.com`.

Flows (to author on G1; sign in, navigate, read — a network guard aborts every non-GET
except sign-in; nothing is written to a live system):

- `01-health-overview.yaml` — `/health`: header, mode pill, Upload, the Vitana Index and
  Autopilot chips; snapshot (Index, standing, trend, tier, pillars), pillar agents,
  priority focus, Autopilot guidance; "Action" opens Health Actions (read only).
- `02-health-medical.yaml` — `/health?mode=medical`: the member's reports or the empty
  state; the upload sheet opens and its submit stays disabled.
- `03-health-supplements.yaml` — `/health?mode=supplements`: the filter pills and the
  supplement cards (delete disabled).
- `04-vitana-index-overlay.yaml` — tap the snapshot / chip: the Index sheet (Today, Next
  few days, 30-day horizon, Life Compass row), dismiss.

Until G1, the port is proven offline by the jest-expo + RNTL unit tests in
`apps/mobile/tests/health/` and the typecheck / bundle / deps / parity / core-closure gates.
