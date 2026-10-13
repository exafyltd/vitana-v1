# VTID-05097 — plan sparring record

- Partner: plan-sparring-partner (independent, read-only)
- Rounds: 2 — round 1 NOT CONVERGED (2 major, 3 minor, 3 questions), round 2 CONVERGED
- Plan hash (sha256 of text between the plan markers): `cdfea89a49e6820ff41c81fcba68716be89e24144fd0a7025de98c705b777f3f`
- Owner approval: "Yes" in the Claude Code session, 2026-10-12 (Gate 1)

## Round 2 verdict

F1–F5 and Q3 closed; no new blocker or major. CONVERGED.

## Final plan and planner responses

# Plan — diary voice recording fails in the Android app ("Erkennungsfehler")

<!-- plan:begin -->
## Problem (owner report 2026-10-10 17:50 CEST, screenshot)
In the Android app (Appilix), Gesundheitstagebuch → tap mic → red toast
"Erkennungsfehler — Die Spracherkennung hat einen Fehler festgestellt" (`capture.recognitionErrorDesc`).

## Evidence (read-only)
- Supabase `edge_logs` 15:40–16:05 UTC: the owner's device (UA `Mozilla/5.0 (Linux; Android; K) App11
  AppleWebKit/537.36 … Chrome/120.0.6099.144 Mobile Safari/537.36`) made normal REST/auth calls, but
  there was NO request to `/functions/v1/transcribe-audio`; `function_edge_logs` shows no
  `transcribe-audio` call since 2026-10-09 16:00. So the failure is on-device, before any backend call.
- `src/utils/diaryAudioRecorder.ts`: `IS_APPILIX_WEBVIEW` is a module-level constant
  (`!!window.appilix?.postMessage` evaluated once at import). `shouldUseBackendSTT()` returns true only
  for that constant or iOS. `src/lib/pushNotifications.ts:81` documents that the Appilix bridge is
  injected after page load, so a bare check at boot is a false negative (it waits up to 3 s there).
- `src/lib/webview.ts::isAppilixWebView()` falls back to the Android `wv` UA token — the owner's UA has
  no `wv`, so even a call-time UA check misses this device.
- With `shouldUseBackendSTT()` false on Android, `UnifiedCaptureCard` / `VoiceDiaryRecorder` use
  `ClientSTT` (webkitSpeechRecognition). `ClientSTT.isSupported()` only checks the constructor exists;
  in an Android WebView `start()` errors (`not-allowed` / `service-not-allowed` / `network`), which hits
  the generic `onError` → the toast seen. No network request — matches the logs.
- Diary volume is low (5 voice entries in Sept, last 2026-09-26), so the outage length is unknown.

## Fix (frontend only, vitana-v1)
1. `src/utils/diaryAudioRecorder.ts` — `shouldUseBackendSTT()` decides at CALL time, not import time:
   true when `isAppilix()` (bridge present now), or `isAppilixWebView()` from `src/lib/webview.ts`
   (bridge / Android `wv` / iOS WKWebView), or iOS; plus a session flag `markWebSpeechUnavailable()`
   that, once set, makes it return true for the rest of the page session (sessionStorage, try/catch).
   Remove the module constant `IS_APPILIX_WEBVIEW` and DELETE this file's own `isAppilixWebView()`
   export (it returns the stale constant and shadows `@/lib/webview`'s call-time version; grep shows
   no importer of it from `@/utils/diaryAudioRecorder` — only `DiaryAudioRecorder`,
   `shouldUseBackendSTT`, `transcribeAudioBlob` are imported). No user-agent guessing on `App11`.
   Step 1 only fixes the bridge-injected-late race. It does NOT catch the owner's device when the
   bridge is absent at tap time, because that UA has no `wv` token. Step 2 is the fix for that case.
   The session flag is sessionStorage on purpose: one silent fallback per app launch. localStorage
   would wrongly stick to backend STT if the same origin later runs in a real browser.
2. Self-healing fallback in all three callers of `shouldUseBackendSTT()`
   (`src/components/capture/UnifiedCaptureCard.tsx`, `src/components/memory/VoiceDiaryRecorder.tsx`,
   `src/pages/MobileSupport.tsx`): a per-recording ref `gotResultRef` is reset to false at start and
   set true on the first `onResult` callback. If `ClientSTT` reports `not-allowed`,
   `service-not-allowed` or `network` while `gotResultRef` is false, and
   `DiaryAudioRecorder.isSupported()`, then: stop ClientSTT silently (no error toast), call
   `markWebSpeechUnavailable()`, and immediately start the backend recording path
   (MediaRecorder → `transcribe-audio`). The component must read `shouldUseBackendSTT()` at tap time
   (state/ref), not only once at render, so later taps go straight to the backend path.
   If the backend path then also fails (e.g. mic permission denied), the existing error toast shows.
   Errors after a result arrived keep today's behaviour (MobileSupport keeps its existing
   per-error messages for that case).
3. `FeedbackRecorder.tsx` (also on the Diary page, `Diary.tsx:218`) uses `ClientSTT` with no backend
   path at all. Out of scope here (adding a backend path is a feature change); recorded as an explicit
   follow-up in `docs/validation/<VTID>/README.md`.

## Not changed
`transcribe-audio` edge function, gateway, DB, i18n strings (reuse existing keys), `ClientSTT`.

## Tests
- Vitest `src/utils/diaryAudioRecorder.test.ts` (new): bridge injected after import → true;
  `markWebSpeechUnavailable()` → true; plain desktop Chrome UA, no bridge → false; iOS → true;
  sessionStorage throwing → no crash.
- Vitest `src/components/capture/UnifiedCaptureCard.test.tsx` (extend): mocked ClientSTT emitting
  `not-allowed` before any result → no error toast, DiaryAudioRecorder.start called, second tap uses
  backend directly; `network` after a result → existing toast (unchanged behaviour).
- Same fallback case for `VoiceDiaryRecorder` and `MobileSupport` (new small tests, or one shared
  helper test if the fallback is factored into a small hook/helper in `diaryAudioRecorder.ts`).
- `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`.
- Staging gate: `docs/validation/<VTID>/staging-tests.json` with the Vitest suites (`existing` kind)
  plus the smoke suite; staging is read-only and has no mic, so the on-device proof is the owner
  re-trying the diary on the app after promotion (stated in Gate 2).

## Change class / scope
standard (4 source files + tests + validation docs). Files: `src/utils/diaryAudioRecorder.ts`,
`src/components/capture/UnifiedCaptureCard.tsx`, `src/components/memory/VoiceDiaryRecorder.tsx`,
`src/pages/MobileSupport.tsx`, tests above, `docs/validation/<VTID>/*`. No What's New entry (fix).
<!-- plan:end -->

## Planner responses — round 1
- F1 [major] MobileSupport omitted — ACCEPTED. Added as third caller; same tap-time read and fallback.
- F2 [major] shadowing `isAppilixWebView()` export — ACCEPTED. Export deleted; grep confirms no
  importer of it from `@/utils/diaryAudioRecorder`.
- F3 [minor] sessionStorage scope — ACCEPTED. Stated as intentional in step 1 (one silent fallback
  per launch; localStorage rejected because it would stick in a real browser).
- F4 [minor] step 1 alone does not fix the owner's device — ACCEPTED. Plan now says step 2 is the fix
  for the bridge-absent / no-`wv` case; step 1 covers the late-injection race.
- F5 [minor] FeedbackRecorder — ACCEPTED as DEFERRED: tracked as an explicit follow-up in
  `docs/validation/<VTID>/README.md`.
- Q3 result tracking — answered in step 2: per-recording `gotResultRef`, reset on start, set on first
  `onResult`.

## Round 1 findings (partner)

- **F1 [major]** MobileSupport.tsx is a third caller with the identical bug (`shouldUseBackendSTT()` read at render, same ClientSTT `onError` pattern) and is omitted. → add it to scope.
- **F2 [major]** `diaryAudioRecorder.ts` exports its own `isAppilixWebView()` returning the stale module constant, shadowing `@/lib/webview`'s call-time version. → remove or re-export; audit importers.
- **F3 [minor]** sessionStorage survives navigation but not app restart; state that one fallback per launch is intentional.
- **F4 [minor]** `webview.ts::isAppilixWebView()` also misses the owner's device (no bridge at tap, no `wv`); state that step 2 (self-healing fallback) is the actual fix and step 1 only fixes the late-injection race.
- **F5 [minor]** FeedbackRecorder.tsx (also on the Diary page) is ClientSTT-only; make the follow-up explicit in the validation docs.
- **Q1** Was MobileSupport intentionally omitted? **Q2** Any importers of the stale `isAppilixWebView`? **Q3** How is "before any result" tracked?
- Verdict: NOT CONVERGED (F1, F2).

## Round 2 (partner)

F1 closed (MobileSupport in scope), F2 closed (export deleted, no importers), F3 closed, F4 closed, F5 closed (follow-up in README), Q3 closed (`gotResultRef`). No new blocker or major. Verdict: CONVERGED.
