# Maestro — ai-assistants lane (VTID-05521) — DEFERRED to G1 (`next_actor: owner`)

Device-runtime parity for the native `/assistant` port. These flows are **not
run in CI** and are **not a merge blocker** (requirements R5.3, tasks §7). They
need the isolated G1 test environment (and macOS minutes / G3 for iOS on a
device). Recorded here and in `docs/validation/VTID-05521/staging-tests.json`.

Every tab is a write surface (`user_preferences` switches, selects and
sliders, `/vaea/config`, the voice preview, the sample greeting). At G1 the
flows run only against the isolated test environment and only open and read:
no switch, slider or select is changed and no preview, greeting or connect
button is pressed — except flow 02, which presses Preview on the G1 test
backend to hear the audio.

Flows (to author on G1):

- `01-assistant-tabs.yaml` — open `/assistant` (voice settings panel), then
  `ai`, `autopilot`, `proactive`, `referrals` through the tab strip; parity vs
  the 390×844 read-only staging `/assistant?tab=…`.
- `02-voice-preview-audio.yaml` — G1 test backend only: Preview plays the
  gateway's `/orb/tts` audio through `expo-audio` (a `data:` URI) on iOS and
  Android.

Until G1, the port is proven offline by the jest-expo + RNTL unit tests in
`apps/mobile/tests/ai-assistants/` and the typecheck / bundle / deps / parity
gates.
