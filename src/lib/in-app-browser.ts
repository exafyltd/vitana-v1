/**
 * In-app browser (IAB) detection.
 *
 * Social apps open links in an embedded webview rather than the system
 * browser. Those webviews impose two restrictions that break naive
 * app-store redirect pages:
 *
 *   1. Programmatic top-level navigation that is NOT driven by a user
 *      gesture (i.e. `window.location.href = ...` fired from an effect)
 *      is silently dropped. No error, no navigation — the visitor just
 *      sits on the page. Instagram is the strictest offender here.
 *   2. Non-http(s) schemes (`market://`, `intent://`) are blocked
 *      outright, so the Android "hand off to the Play Store app" trick
 *      cannot be used.
 *
 * The consequence for us: inside an IAB the ONLY reliable way to reach a
 * store listing is a real `<a href>` the visitor taps themselves. Any
 * page that auto-redirects must therefore also render a tappable
 * fallback rather than trusting the redirect to land.
 *
 * Deliberately NOT treated as an in-app browser:
 *   - WhatsApp — opens links in the system browser on iOS and permits the
 *     programmatic store redirect on Android. It works today; keep it on
 *     the fast path.
 *   - The Appilix shell — that is our own app wrapper, handled separately
 *     by `@/lib/webview`, which routes out to the system browser.
 */

export type InAppBrowser =
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'snapchat'
  | 'linkedin'
  | 'twitter'
  | 'pinterest'
  | 'wechat'
  | 'line';

/** UA substrings that identify each embedded browser. Order is irrelevant — first match wins. */
const SIGNATURES: ReadonlyArray<readonly [InAppBrowser, RegExp]> = [
  ['instagram', /Instagram/i],
  // FBAN/FBAV/FB_IAB cover the Facebook + Messenger webviews across platforms.
  ['facebook', /\bFBAN\b|\bFBAV\b|FB_IAB|FBIOS|Messenger/i],
  // TikTok ships under the legacy "musical_ly" name plus a Bytedance webview marker.
  ['tiktok', /TikTok|musical_ly|BytedanceWebview|ByteLocale/i],
  ['snapchat', /Snapchat/i],
  ['linkedin', /LinkedInApp/i],
  ['twitter', /\bTwitter\b/i],
  ['pinterest', /\bPinterest\b/i],
  ['wechat', /MicroMessenger/i],
  ['line', /\bLine\//i],
];

/**
 * Identify the embedded browser the page is running inside, or `null` when
 * running in a normal browser (or a context we deliberately fast-path).
 */
export function detectInAppBrowser(ua?: string): InAppBrowser | null {
  const agent =
    ua ?? (typeof navigator !== 'undefined' ? navigator.userAgent || '' : '');
  if (!agent) return null;

  for (const [name, pattern] of SIGNATURES) {
    if (pattern.test(agent)) return name;
  }
  return null;
}

/**
 * True when a programmatic store redirect cannot be trusted to land and a
 * user-tappable link must be rendered instead.
 */
export function isInAppBrowser(ua?: string): boolean {
  return detectInAppBrowser(ua) !== null;
}
