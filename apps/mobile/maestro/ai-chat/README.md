# Maestro — ai-chat lane (VTID-05522) — DEFERRED to G1 (`next_actor: owner`)

Device-runtime parity for the native `/comm/talk-to-vitana` port. These flows are
**not run in CI** and are **not a merge blocker** (requirements R5.3, tasks §6). They
need the isolated G1 test environment (and macOS minutes / G3 for iOS on a device).
The screen submits feedback tickets: a G1 run uses the isolated test environment only
and never presses "Send to Vitana", "Yes, fixed" or "No, still broken" against a live
system. Recorded here and in `docs/validation/VTID-05522/staging-tests.json`.

Flow (to author on G1):

- `01-talk-to-vitana.yaml` — `/comm/talk-to-vitana` shows the title, the Community
  sections row, the form (topic list opens and closes), the AI note, the card strip and
  "Your reports"; `/comm/talk-to-vitana?ticket=<id>` highlights and scrolls to that
  ticket; parity vs the 390×844 read-only staging `/comm/talk-to-vitana`.

Until G1, the port is proven offline by the jest-expo + RNTL unit tests in
`apps/mobile/tests/ai-chat/` (mocked gateway, Supabase double) and the typecheck /
bundle / deps / parity gates.
