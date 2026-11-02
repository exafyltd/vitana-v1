# Verification — VTID-05426 (native-wave2-memory-diary-r2 / diary)

Native Wave 2 diary lane: the `/daily-diary` port (`MEMORY.DAILY_DIARY`, `MEMORY.DIARY`
`?tab=health`, `MEMORY.DIARY_BUGS` `?tab=bugs`; one route, the `tab` param picks the mode).
All commands run offline (the native app has no production profile; `assertNotProduction()`
refuses prod/staging hosts). Linux, worktree
`/projects/sandbox/vitana-v1/.worktrees/native-wave2-memory-diary-r2-diary`, base `origin/main`
a41e89a0. Every command and its counts: `commands.log`.

## What was built

- `apps/mobile/src/screens/diary/data/` — the class-B data paths re-implemented natively (plan
  decision 2): `client.ts` (`diaryJson`: `getGateway()` + `X-Vitana-Active-Role: community` +
  JSON content type, web `communityFetch` + `json()`), `entries.ts` (`DiaryEntryList` read of
  `diary_entries` + realtime refetch through the app's Supabase client; `memory-api`
  `saveDiaryEntry` / `deleteDiaryEntry`), `storage.ts` (`diary-photos` upload / public url /
  remove, `feedback-attachments` upload + 1-year signed url, the `transcribe-audio` backend
  STT), `tickets.ts` (`MyTicketsList` read + confirm / reopen, `submitFeedbackTicket`, and the
  pure `feedback-ticket.ts` status vocabulary mirrored).
- `apps/mobile/src/screens/diary/text.ts` — `formatIndexDelta`, `formatDuration`, the
  `DateGroupHeader` label, tag labels, time-ago, dates over the native `t()` and Hermes `Intl`.
- `DailyDiaryScreen.tsx` — 1:1 port of the phone-shaped `MobileDailyDiary.tsx`: header, mode
  pill (Health Diary / Bug Reports), `?tab=` handling like the web effect; Health: capture card,
  Text / Photo row with the inline panel, entry list; Bugs: capture card in bug mode + My reports.
- `CaptureCard.tsx` (`UnifiedCaptureCard`), `TextDiaryEditor.tsx`, `PhotoDiaryUploader.tsx`,
  `DiaryEntryList.tsx` (+ `PhotoEntryCard`, `DateGroupHeader`, `PhotoCarouselModal` twins),
  `FeedbackReportList.tsx` (`MyTicketsList` with the Diary's kinds, page size 5, "My reports").
- `apps/mobile/src/ports/diary.tsx` (kit `Textarea`, `Select*`, `Dialog*`,
  `ResponsiveConfirmDialog*`, `notifySuccess`, lucide glyphs) and `src/ports/diary-capture.ts`
  (`expo-image-picker` library / camera with permission, the `expo-audio` recorder hook, the
  local-file base64 read). `src/ports/ui.tsx` is untouched.
- Native deps (tasks.md diary task 2): `expo-image-picker` 57.0.20 and `expo-audio` 57.0.5
  (`expo-av` is not in SDK 57's bundled modules; `expo-audio` is the SDK's recorder), pinned
  exactly like the other deps; `package-lock.json` updated.
- `app.config.ts` `diaryCapturePlugins()` (plan decision 3, sparring R1-F1 + R2-F1): both
  packages registered as config plugins; camera / photo-library strings from
  `diaryNative.permissions.*`, the microphone string is `orbNative.micUsageDescription` (the one
  withVitanaVoice writes), all in the base locale of `native-locales.json`; no background audio.
- Route `apps/mobile/app/(app)/daily-diary/index.tsx`; `/daily-diary` in `NATIVE_ROUTES`; the 3
  ledger rows → `native` (owner kiro, 2026-11-01); `parity-ledger --sync` changes nothing else.
- `src/i18n/*/diaryNative.json` — 41 new keys (DE first, du-form; pt você; fr tu; ru ты; es tú;
  ar neutral), all 11 locales. Every other string reuses existing web keys (`diary.*`,
  `screens.diary.*`, `capture.*`, `supportTickets.*`, `toasts.diary.*`, `toasts.community.*`,
  `vitanaIndex.*`).
- No core change (`packages/core/**`, closure, mobile-ci-paths untouched; `core-closure --check`
  up to date).

## Results

- `npm run typecheck` → PASS.
- `npx jest tests/diary --ci` → PASS, 3 suites / 60 tests.
- `npm test -- --ci` → PASS (counts in `commands.log`).
- `APP_PROFILE=development npm run bundle` → PASS (ios + android `.hbc`, `Exported: dist`).
- `APP_PROFILE=development EXPO_OFFLINE=1 npm run deps:check` → PASS (up to date).
- `npm run parity:check` → PASS; `parity-ledger.mjs --sync` → no change.
- `node ../../scripts/native/core-closure.mjs --check` → up to date.
- i18n (repo root, the checks `i18n-check.yml` runs): register check, DE long words,
  subscriptions, locale registry, stamp-source, audit (no `diaryNative` error), web build +
  locale chunking, `vitest run src/i18n scripts/native` → all pass.
- Red → green: `red-on-base.txt` (the 3 diary suites and the updated app-config test fail on
  origin/main).

## Not verified on staging

Device runtime deferred to G1 (`staging-tests.json` `deferred_g1`, `next_actor: owner`),
including the live camera / microphone capture exercise and the per-language InfoPlist strings.

## Tests outside the lane paths (adapted, not loosened)

- `apps/mobile/tests/app-config.test.ts` — its exact plugin list now includes `expo-image-picker`
  and `expo-audio`.
- `apps/mobile/tests/orb/nav-directive.test.ts` — the "registry screen not ported yet" example
  was `MEMORY.DIARY` (→ `/daily-diary?tab=health`), which this lane ports; the three cases now
  use `COMM.OVERVIEW` (→ `/comm/events-meetups?tab=hot`, still unported) with the same
  `not_found` / `native_screen_not_ported` assertions.

## Deviations from the web (each recorded in the file header)

- Voice capture always records and transcribes through the backend STT (the web's iOS /
  Android WebView path); there is no live interim transcription, so the card shows the web's
  "transcription will appear after you tap Stop" hint while recording.
- The web utility bar's VitanaIndexChip / AutopilotChip / gift voucher / calendar button
  belong to other lanes' surfaces with no native twin yet (same deferral as the home lane);
  its search button stores a query nothing reads, so it is not ported. The bar holds the mode pill.
- The web `<input type="file" accept="image/*">` becomes a photo-source sheet (camera or
  library) in front of `expo-image-picker`; the photo viewer's "Download" hands the photo url to
  the system share sheet.
- The entry list shows an error notice with retry when the read fails (the web shows the
  empty card).
- Ticket status badge colours map to the kit Badge variants (tokens only); the web list's
  `?ticket=` highlight is not used on the Diary.
- Strings the web hard-codes in English are translated: the affected-screen options, the
  "Saved · Vitana Index +N" toast, the mic button labels.
- The microphone usage text is the ORB's (`orbNative.micUsageDescription`, "…so you can talk to
  her…"), the single source R2-F1 asks for. Its wording does not mention diary voice entries;
  widening that key is a follow-up for the `orbNative` owner (outside this lane's paths).
- Web catalog text defects seen, not fixed (outside the lane paths): en
  `screens.diary.lengthCharacters` is `{length}characters` and `loadMoreValue0Remaining` is
  `Load more ({value0}remaining)` (no space).
