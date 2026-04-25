/**
 * WebView OAuth routing helpers.
 *
 * Google's and Apple's account pickers break inside the Appilix Android
 * WebView because the embedded WebView isolates third-party cookies. This
 * module owns the detection + system-browser detour used by every OAuth
 * flow (Google data connectors via gateway, Apple Sign-In via Supabase,
 * and any future Supabase Auth provider) so we only have one place to
 * update when Appilix's surface changes.
 */

import { isAppilix, launchExternal } from "@/lib/appilix";

/**
 * True if the page is running inside the Appilix WebView (or any in-app
 * WebView wrapper) where third-party OAuth cookies are isolated and
 * navigations across `await` boundaries are silently blocked.
 *
 * Detection has to cover three platforms:
 *
 *   1. Android Appilix → the Android WebView UA marker `wv` is present.
 *   2. Appilix bridge present → `window.appilix.postMessage` is injected
 *      by some Appilix builds (mostly Android). Use as a positive signal
 *      whenever it appears.
 *   3. iOS Appilix (WKWebView) → no `wv` marker; the canonical
 *      WKWebView signature is "iOS device + AppleWebKit + NO `Safari/`
 *      suffix in UA". Real iOS Safari includes `Safari/`; an in-app
 *      WKWebView does not.
 *
 * The push-identity cookie (`appilix_push_notification_user_identity`)
 * is intentionally NOT a signal: `App.tsx` sets it on every login
 * regardless of platform, so it produced false positives on desktop
 * browsers that routed normal users through the mobile-only
 * `/oauth/complete` flow.
 */
export function isAppilixWebView(): boolean {
  if (typeof window === "undefined") return false;
  if (isAppilix()) return true;

  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";

  // Android Appilix: "wv" token in UA marks Android WebView.
  if (/Android.*\bwv\b/.test(ua)) return true;

  // iOS Appilix (WKWebView): iPhone/iPad/iPod + AppleWebKit + no Safari/.
  // - Real Safari UA: "...AppleWebKit/... Version/X Mobile/X Safari/X"
  // - WKWebView UA  : "...AppleWebKit/... Mobile/X"   (no Safari/ token)
  // Matching the absence of `Safari/` reliably distinguishes the two.
  const isiOSDevice = /iPhone|iPod|iPad/i.test(ua);
  const hasSafariToken = /Safari\//.test(ua);
  if (isiOSDevice && !hasSafariToken) return true;

  return false;
}

/**
 * Route an OAuth authorization URL to a context where third-party cookies
 * survive: the Appilix native shell (preferred) or the OS system browser.
 * Falls back to same-window navigation off mobile.
 *
 * Strategy by platform:
 *   - Appilix native bridge present → `launchExternal(url)` posts to
 *     the bridge which opens an Android Intent (or iOS UIApplication
 *     openURL on builds that proxy it the same way).
 *   - Android WebView without bridge → `window.open(url, "_system")`,
 *     then an Android `intent://` URL as a last resort.
 *   - iOS WKWebView without bridge → most Appilix iOS builds intercept
 *     external navigations in `decidePolicyForNavigationAction:` and
 *     route them to Safari automatically. So plain
 *     `window.location.href = url` actually works *if* it fires within
 *     the user-gesture window. We do that synchronously after the
 *     `await` returns the auth URL — iOS allows the navigation if it
 *     happens within ~5s of the click and no other navigations have
 *     occurred in between.
 *   - Off-mobile → plain navigation, same as before the fix.
 */
export function redirectViaSystemBrowser(url: string): void {
  if (!isAppilixWebView()) {
    window.location.href = url;
    return;
  }

  // Try the Appilix bridge first — works on builds that inject
  // `window.appilix.postMessage`.
  if (launchExternal(url)) return;

  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  const isiOS = /iPhone|iPod|iPad/i.test(ua);

  if (isiOS) {
    // iOS WKWebView: native shell typically intercepts external URLs and
    // hands them to Safari. Direct navigation works inside the user-
    // gesture window. window.open(_, "_system") is unreliable on iOS.
    window.location.href = url;
    return;
  }

  // Android WebView path
  try {
    const opened = window.open(url, "_system");
    if (opened) return;
  } catch {
    // fall through to intent URL
  }

  if (/Android/i.test(ua)) {
    const intentUrl = `intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;
    window.location.href = intentUrl;
    return;
  }

  // Last resort
  window.location.href = url;
}
