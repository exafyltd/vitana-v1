# Plan sparring record — VTID-05000

- Partner: plan-sparring-partner (independent, read-only)
- Class: standard; rounds: 2 (cap 3)
- Plan hash (sha256 of text between plan markers, first 12): 684a9be00c6e
- Verdict: **converged** (no open or disputed blocker/major)
- Owner approval: chat, 2026-10-08 — "Yes" to the Gate 1 message.

## Rounds
- R1: F1 major ACCEPTED (`_vr` stated as the primary mechanism; Cache Storage delete scoped, skips `firebase-*`); F2 major ACCEPTED (boundary strings moved to i18n in this PR); F3 minor ACCEPTED (param renamed `_vr`); F4 minor ACCEPTED (abort is a client-side `page.route()`); F5 minor ACCEPTED (no What's New, no registry change). Q1 acknowledged (device error unobserved; `recovery_attempt` added to the beacon); Q2 acknowledged (stuck members need an app-data clear or reinstall until their shell refreshes).
- R2: F1-F5 closed, Q1-Q2 acknowledged, no new findings → converged.

## Decisions taken during implementation (owner may overrule)
- Auto-recovery marks the guard before navigating and the beacon reports `recovery_attempt` from the same check, so the log shows exactly what ran.
- When the 10 s guard is spent, the `vite:preloadError` handler does not call `preventDefault`, so the error still reaches the boundary and the member sees the (translated) recovery screen instead of a silent loop.
- The staging spec arms the chunk abort after DOMContentLoaded, so only lazy chunks (not the entry or modulepreloaded files) are failed.

## Plan and planner responses (verbatim)

# Plan: recover from "App updated — please reload" on mobile (Appilix WebView)

Change class: standard
Repo: exafyltd/vitana-v1 (frontend only)
Scope: src/components/GlobalErrorBoundary.tsx, src/main.tsx, new src/lib/stale-bundle-recovery.ts (+ unit test), four i18n keys (src/i18n/de + en screens shard), a read-only staging spec + docs/validation/<VTID>/staging-tests.json

<!-- plan:begin -->
## Problem
A member on Android (Appilix WebView) is stuck on the GlobalErrorBoundary screen "App updated — please reload". Tapping "Reload Page" appears to do nothing. The screen is shown when a lazy-loaded chunk fails to load (isChunkLoadError in src/components/GlobalErrorBoundary.tsx).

## Verified facts (planner's reading of the code at origin/main 758173b)
1. handleReload = sessionStorage.removeItem(RELOAD_KEY) + window.location.reload(). A plain reload revalidates only the main document; it does not clear Cache Storage and appends nothing to the URL, so a WebView that keeps serving a stale shell (nginx.conf already documents this for Appilix) gets the same shell back.
2. componentDidCatch already auto-reloads once per 10 s for ANY crash, so a persistent failure shows the screen again right after the reload (user sees "nothing happened").
3. handleGoHome sets location.href="/" — same stale shell.
4. There is no `vite:preloadError` handler anywhere in src/ (grep), so a failed dynamic-import preload is only caught if it bubbles into React.
5. nginx.conf serves /assets/* immutable for 1 year and index.html no-store. public/firebase-messaging-sw.js is the push service worker, registered in src/lib/pushNotifications.ts; public/sw.js is not registered by src (grep).
6. The crash beacon (reportReactError → /api/v1/diag/notif-tap) only reaches gateway stdout logs; the actual device error message has NOT been observed.

## Change
1. New module src/lib/stale-bundle-recovery.ts:
   - `buildCacheBustedUrl(href, now)`: returns the same URL with query param `_vr=<now>` (PRIMARY mechanism: a changed URL forces the WebView to bypass its HTTP cache for the document) set/replaced; all other query params (e.g. ?recipient=, ?thread= deep links) and the hash are preserved.
   - `recoverFromStaleBundle(target?)`: defensive, best-effort deletion of Cache Storage entries whose name does not start with `firebase-` (try/catch, never throws, bounded by a 1.5 s timeout; no cache is known to exist today, this only guards against an app-shell cache appearing later), then `location.replace(buildCacheBustedUrl(...))`. It does NOT unregister service workers (the push worker must survive).
   - `installPreloadErrorRecovery()`: `window.addEventListener('vite:preloadError', e => { e.preventDefault(); guarded recover })`, using the same sessionStorage guard key and 10 s window as the boundary, so at most one automatic recovery per 10 s and no reload loop.
   - `stripRecoveryParam()`: after boot, if `_vr` is in the URL, remove it with history.replaceState (clean URLs, no effect on routing/deep links).
2. GlobalErrorBoundary: the auto-reload, handleReload and handleGoHome call recoverFromStaleBundle (Go Home targets "/" with the cache-bust param). Behaviour, copy, and the guard semantics are unchanged otherwise.
2b. i18n: the boundary's four hardcoded English strings (heading + body, chunk-error and generic variants) become `t()` keys under screens.common.* (DE first, then EN; other locales via the existing I18N-PROPAGATE workflow). `reportReactError` extra gains `recovery_attempt: true|false` so gateway logs show whether recovery ran.
3. main.tsx: call installPreloadErrorRecovery() and stripRecoveryParam() before React mounts.
4. Tests (Vitest): URL builder (keeps params/hash, replaces existing _vr), guard (second call within 10 s is a no-op), recovery never throws when `caches` is undefined or rejects, the boundary's three actions go through the helper, push service worker is not touched.
5. Staging: a read-only Playwright spec (GET-only, per the Staging Verification Gate). The chunk failure is simulated with a client-side `page.route()` abort, so nothing is sent to or mutated on any server. It aborts one lazy chunk request on a staging page, asserts the app reloads once with `_vr` and then renders, plus staging-tests.json.

## Out of scope
- No What's New entry (fix, not a new feature). No screen registry change (no new routes).
- Root cause on the device is still unobserved; this change makes recovery robust to the likely causes (stale shell, cached 404 chunk, failed preload) but does not prove which one occurred. Follow-up: read the `react_error_boundary` beacon logs after release.
- Nginx / Cloudflare / ECS rollout changes (VTID-04949 already added deploy auto-rollback).
- Any production probing; the spec runs on staging only.

## Test plan
npm test (new + existing), npm run lint, npx vite build; staging spec after merge; Gate 2 message with evidence.
<!-- plan:end -->


## Planner responses (round 1)
- F1 ACCEPTED: `_vr` is stated as the primary mechanism; Cache Storage deletion is documented as defensive and now skips `firebase-*` caches.
- F2 ACCEPTED: the four strings move to i18n keys in this PR (scope and plan updated).
- F3 ACCEPTED: parameter renamed `_vr`.
- F4 ACCEPTED: the plan states the abort is a client-side `page.route()` interception.
- F5 ACCEPTED: no What's New entry, no registry change, stated under Out of scope.
- Q1: The device error has not been observed; no device-side diagnostic is available to this session. The plan now says so, adds `recovery_attempt` to the beacon, and lists reading the beacon logs as a follow-up.
- Q2: Correct, a member whose WebView keeps serving an old shell cannot receive this fix until the shell refreshes. This is not solvable in code; the owner is told in the approval message (clear Appilix app data/cache, or reinstall, as the interim step).
