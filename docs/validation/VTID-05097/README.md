# VTID-05097 — diary voice recording fails in the Android app

**Report (owner, 2026-10-10 17:50 CEST):** Gesundheitstagebuch → mic → "Erkennungsfehler".

**Cause:** `shouldUseBackendSTT()` cached the Appilix check at import time (the bridge is
injected after page load) and the owner's Android build has no `wv` UA token
(`Mozilla/5.0 (Linux; Android; K) App11 … Chrome/120`). The screen therefore used the
WebView's Web Speech API, which fails at once. Supabase logs showed no `transcribe-audio`
request at all, so nothing reached the backend.

**Fix:** decide at tap time; when Web Speech fails with `not-allowed`, `service-not-allowed`
or `network` before any result, switch silently to MediaRecorder + `transcribe-audio` and
remember that for the page session (sessionStorage). Applied to `UnifiedCaptureCard`,
`VoiceDiaryRecorder` and `MobileSupport`. The stale `isAppilixWebView()` copy in
`diaryAudioRecorder.ts` is removed (no importers).

**Verification:** the three component tests fail on `main` and pass with the fix (checked by
swapping in the `main` component). Full suite 350 files / 2268 tests, build OK.
On-device proof: the owner retries the diary in the Android app after release.

**Follow-up (deferred, F5):** `src/components/feedback/FeedbackRecorder.tsx` (also on the
Diary page) uses Web Speech only and has no backend path, so it fails the same way in the
Android app. Adding a backend path there is a feature change for its own plan.
