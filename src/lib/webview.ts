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
 * True if the page is running inside the Appilix WebView.
 *
 * Checks three independent signals because each one is populated at a
 * different point in the WebView lifecycle. A user who taps Connect in
 * the first ~200ms after app launch may miss the first two signals, so
 * the UA-based fallback catches them.
 */
export function isAppilixWebView(): boolean {
  if (typeof window === "undefined") return false;
  if (isAppilix()) return true;
  if (typeof document !== "undefined" && /appilix_push_notification_user_identity=/.test(document.cookie || "")) {
    return true;
  }
  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  if (/Android.*\bwv\b/.test(ua) && typeof location !== "undefined" && /vitanaland\.com/.test(location.origin)) {
    return true;
  }
  return false;
}

/**
 * Route an OAuth authorization URL to a context where third-party cookies
 * survive: the Appilix native shell (preferred) or the OS system browser.
 * Falls back to same-window navigation off mobile.
 *
 * Order of preference inside the WebView:
 *   1. Appilix native bridge `launchExternal(url)` — opens via Android Intent,
 *      most reliable on Android 14+ where programmatic `window.open` is
 *      increasingly blocked.
 *   2. `window.open(url, "_system")` — fires the browser on older Appilix
 *      builds where the bridge isn't wired.
 *   3. Intent URL fallback — Android-only deep link into Chrome.
 */
export function redirectViaSystemBrowser(url: string): void {
  if (!isAppilixWebView()) {
    window.location.href = url;
    return;
  }

  if (launchExternal(url)) return;

  try {
    const opened = window.open(url, "_system");
    if (opened) return;
  } catch {
    // fall through to intent URL
  }

  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  if (/Android/i.test(ua)) {
    const intentUrl = `intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;
    window.location.href = intentUrl;
    return;
  }

  window.location.href = url;
}
