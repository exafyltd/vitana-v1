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

import { isAppilix } from "@/lib/appilix";

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
 * survive: the OS system browser on mobile, or same-window nav off mobile.
 *
 * The Appilix `launch_external` bridge call was previously tried first,
 * but `window.appilix.postMessage(...)` returns no signal for whether the
 * native shell actually opened the URL — `post()` returns true as long
 * as the JS call didn't throw. On builds where the action is silently
 * dropped, the OAuth button looks dead (mutation resolves, no browser
 * opens, no error). Skip the bridge and use only the WebView paths that
 * have proven to work.
 *
 * Strategy by platform:
 *   - Android WebView → `window.open(url, "_system")`, then an Android
 *     `intent://` URL as a last resort.
 *   - iOS WKWebView → Appilix iOS intercepts external navigations in
 *     `decidePolicyForNavigationAction:` and hands them to Safari, so
 *     plain `window.location.href = url` works inside the user-gesture
 *     window. We fire it synchronously after the auth URL arrives.
 *   - Off-mobile → plain navigation.
 */
export function redirectViaSystemBrowser(url: string): void {
  if (!isAppilixWebView()) {
    window.location.href = url;
    return;
  }

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
