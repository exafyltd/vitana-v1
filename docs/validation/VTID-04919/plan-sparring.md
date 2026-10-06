# Plan: Share on Live Room cards always opens the native share drawer (vitana-v1)

Change class: **light** (one source file + one test; no migrations, routes, auth, .github, deploy, governance or LLM-routing files).
Owner request (2026-10-06, chat): "Share should always open native share drawer."

<!-- plan:begin -->
## Context (verified by the planner)
- The Share icon on the Live Room cards (Events and Live Rooms page) is `SocialShareButton` (`src/components/sharing/SocialShareButton.tsx`, onClick ~L170-190). It only attempts the native drawer when `canNativeShare` is true; otherwise it opens the custom Dialog (WhatsApp/Viber/Email/SMS/Copy Link/social).
- `canNativeShare` comes from `useNativeShare().isAvailable`, a `useMemo` evaluated ONCE at mount (`src/hooks/useNativeShare.ts` ~L17-20). The hook's own `share()` deliberately re-checks `navigator.share` at CALL time because the Appilix app shell injects its APIs after page load (comment at ~L24-27, `waitForAppilixBridge` in `lib/appilix.ts`). So the button's gate defeats the hook's own late-injection handling: if `navigator.share` is missing at mount, a tap never even tries the native sheet.
- `share()` returns "shared" | "cancelled" (AbortError, user dismissed) | "failed" (no API or any other error).

## Change
1. In `SocialShareButton`'s onClick, drop the `canNativeShare` precondition: always call `nativeShare(...)` first. Only when it returns "failed" (no `navigator.share` at call time, or the call threw) open the existing custom dialog as the fallback. "cancelled" does nothing (as today). The `isSharing` double-tap guard stays. The dialog's own "native share" button keeps using `canNativeShare`.
2. Keep the call synchronous inside the click handler (before any await) so the browser's user-activation requirement still holds.
3. Vitest: `SocialShareButton` with `navigator.share` absent at mount and defined at tap → native called, dialog not opened; with `navigator.share` rejecting `AbortError` → no dialog; rejecting `NotAllowedError`/absent → dialog opens.
4. Scope: this one button is shared by events, services, referrals and live rooms, so the behaviour applies to all of them (owner said "always"). No change to share text/links.

## Out of scope
Redesigning the fallback dialog; desktop browsers without Web Share keep the dialog (there is no native drawer to open).
<!-- plan:end -->

## Planner responses — round 1
- F1 ACCEPTED. Plan point 2 reworded: `navigator.share()` (via `nativeShare`) stays the FIRST await in the click handler, no async work before it.
- F2 ACCEPTED. The dialog's in-body native-share button stays gated by `canNativeShare`: if the outer button already tried and got "failed", the API is genuinely absent, so offering it again inside the fallback would just fail.
- F3 ACCEPTED. Tests go in a new `src/components/sharing/SocialShareButton.native-share.test.tsx`; the event card test (which stubs SocialShareButton) is not touched.
- F4 ACKNOWLEDGED (confirms scope: no i18n, What's New or route changes).
- F5 ACCEPTED. Added a test: generic Error rejection → dialog opens.
- Q1: the `isSharing` guard (`setIsSharing(true)` around the `nativeShare` call) stays unchanged.
