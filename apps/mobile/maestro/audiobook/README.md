# Maestro — autopilot-audiobook lane (VTID-05460) — DEFERRED to G1 (`next_actor: owner`)

Device-runtime parity for the native Audiobook port (`/autopilot/audiobook`, the
app-wide player and mini player, the reminder control). These flows are **not
run in CI** and are **not a merge blocker** (requirements R5.3, tasks.md
autopilot-audiobook task 7). They need the isolated G1 test environment, a
device or simulator **with an audio route** (playback is the most device-bound
check of the cluster), and macOS minutes / G3 for iOS on a device. Recorded
here and in `docs/validation/VTID-05460/staging-tests.json`.

Parity reference: web `src/components/audiobook/AudiobookMiniPlayer.tsx`,
`src/components/audiobook/AudiobookReminderControl.tsx` and the
`/autopilot/audiobook` entry of `src/pages/AutopilotDashboard.tsx:167-189`,
compared against the 390×844 **read-only** staging web.

Flows (to author on G1; sign in, navigate, listen, read):

- `01-audiobook-deeplink.yaml` — open the push `data.url` `/autopilot/audiobook` (cold
  start and warm): My Journey renders, the app settles on `/autopilot` in
  Guided mode, the mini player appears above the bottom bar and the first
  unheard topic is audible; screenshot vs staging.
- `02-audiobook-controls.yaml` — play / pause, previous (restart after 3 s,
  else step back), next, speed 1 → 1.25 → 1.5, sleep timer label, Ask Vitana
  opens the ORB, close hides the player; the lock screen / control centre shows
  title, "Vitana" and the album line.
- `03-audiobook-reminder.yaml` — read the "Daily reminder" row in the Guided
  view and open its list. **No** save against staging (the network guard aborts
  every non-GET except sign-in; never `vitanaland.com`).

Until G1 the port is proven offline by the jest-expo + RNTL unit tests in
`apps/mobile/tests/audiobook/` (fake gateway, fake `expo-audio` player, every
built request asserted) and the typecheck / bundle / deps / parity gates.
