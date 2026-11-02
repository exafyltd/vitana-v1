# Maestro — journey lane (VTID-05461) — DEFERRED to G1 (`next_actor: owner`)

Device-runtime parity for the native My Journey port (`/autopilot`,
`AUTOPILOT.MY_JOURNEY`). These flows are **not run in CI** and are **not a
merge blocker** (requirements R5.3, tasks.md journey task 8). They need the
isolated G1 test environment (and macOS minutes / G3 for iOS on a device).
Recorded here and in `docs/validation/VTID-05461/staging-tests.json`.

Parity reference: the mobile-web branch of `src/pages/AutopilotDashboard.tsx`
(`useIsMobile()`, :537-555), compared against the 390×844 **read-only**
staging web `/autopilot`.

Flows (to author on G1; sign in, navigate, read):

- `01-journey-full.yaml` — `/autopilot` as a Full-App member: header, utility
  bar (search, Autopilot chip), Guided/Full switch, the dream-board hero (ring,
  day, goal pill), future-self tiles, today's goal, matches, events, the
  Autopilot preview, "how you're doing" (Index card + trajectory). Read only.
- `02-journey-guided.yaml` — `/autopilot` in Guided Mode: next-session hero
  and stepper, "how it works", the session catalog with chapter pills; open a
  topic drawer (read only — closing it without "mark done").
- `03-journey-sheets.yaml` — open the Autopilot popup and the plan sheet, read
  them, close them. **No** activate / complete / snooze / goal save / plan
  generation against staging (every non-GET except sign-in is aborted by the
  network guard; never `vitanaland.com`).

Until G1, the port is proven offline by the jest-expo + RNTL unit tests in
`apps/mobile/tests/journey/` (fake gateway + Supabase double, every built
request asserted) and the typecheck / bundle / deps / parity / core gates.
