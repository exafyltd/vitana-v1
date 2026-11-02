# Maestro — diary lane (VTID-05426) — DEFERRED to G1 (`next_actor: owner`)

Device-runtime parity for the native Daily Diary port (`/daily-diary`,
`/daily-diary?tab=health`, `/daily-diary?tab=bugs`). These flows are **not run
in CI** and are **not a merge blocker** (requirements R5.3, tasks.md diary
task 7). They need the isolated G1 test environment (and macOS minutes / G3 for
iOS on a device). Recorded here and in
`docs/validation/VTID-05426/staging-tests.json`.

Parity reference: the web source `src/pages/MobileDailyDiary.tsx` is
phone-shaped (it renders through `MobileAppShell`), so these flows compare
against the 390×844 **read-only** staging web `/daily-diary` (plan decision 6).

Flows (to author on G1; sign in, navigate, read):

- `01-diary-health.yaml` — `/daily-diary`: header, mode pill on Health Diary,
  capture card, Text / Photo option row, entry list grouped by day; open a photo
  entry in the viewer (read only).
- `02-diary-bugs.yaml` — `/daily-diary?tab=bugs`: capture card in bug mode,
  "My reports" with status, timeline and answer (read only).
- `03-diary-capture.yaml` — **G1 environment only, never a live system**: the
  camera / photo-library / microphone permission prompts (the iOS usage
  strings come from the `app.config.ts` config plugins), a photo picked and a
  voice recording transcribed. No diary write or ticket is sent to staging or
  production (root `CLAUDE.md` absolute rule).

Until G1, the port is proven offline by the jest-expo + RNTL unit tests in
`apps/mobile/tests/diary/` (picker and recorder faked) and the typecheck /
bundle / deps / parity gates.
