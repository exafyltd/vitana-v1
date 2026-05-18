/**
 * BOOTSTRAP-NOTIF-MESSENGER-DIAG: client beacon for chat-notification deep-links.
 *
 * Android users in the Appilix WebView have reported a "Something went wrong"
 * screen when tapping chat push notifications. That screen does not match any
 * React error boundary in this app — it appears to be the WebView's native
 * "page failed to load" UI. Without instrumentation we can't tell whether
 *   (a) the URL never reaches our server,
 *   (b) it reaches the server but the React app fails to mount,
 *   (c) it mounts but a hook crashes during deep-link resolution.
 *
 * This module fires small fire-and-forget beacons to the gateway at the
 * earliest possible moment (before React mounts) and on any unhandled
 * error/rejection. Cloud Run logs can then be filtered with
 *   gcloud logging read 'textPayload:"[NotifDiag]"'
 * to see exactly what each tap produced.
 *
 * Deliberately self-contained: no React imports, no Supabase, no auth — so
 * a failure in those layers cannot suppress the beacon.
 */

type BeaconEvent =
  | 'boot'
  | 'deep_link_detected'
  | 'window_error'
  | 'unhandled_rejection'
  | 'ping';

function resolveGatewayBase(): string {
  // Same precedence other client helpers use (see src/lib/celebrate.ts).
  const env = (import.meta as any)?.env?.VITE_GATEWAY_URL as string | undefined;
  if (env) return env.replace(/\/+$/, '');
  // Hard fallback so the beacon still fires if VITE_GATEWAY_URL was not
  // baked into the build for some reason. Matches the preconnect in
  // index.html (Cloudflare-fronted gateway domain).
  return 'https://gateway.vitanaland.com';
}

function isAppilixWebView(): boolean {
  if (typeof window === 'undefined') return false;
  if ((window as any).appilix?.postMessage) return true;
  const ua = navigator.userAgent || '';
  if (/Android.*\bwv\b/.test(ua)) return true;
  const isiOSDevice = /iPhone|iPod|iPad/i.test(ua);
  const hasSafariToken = /Safari\//.test(ua);
  if (isiOSDevice && !hasSafariToken) return true;
  return false;
}

function snapshot(): Record<string, unknown> {
  const loc = typeof window !== 'undefined' ? window.location : ({} as Location);
  const nav = typeof navigator !== 'undefined' ? navigator : ({} as Navigator);
  const params = new URLSearchParams(loc.search || '');
  return {
    href: loc.href,
    pathname: loc.pathname,
    search: loc.search,
    recipient: params.get('recipient'),
    thread: params.get('thread'),
    context: params.get('context'),
    referrer: typeof document !== 'undefined' ? document.referrer : '',
    ua: nav.userAgent || '',
    is_appilix_webview: isAppilixWebView(),
    has_appilix_bridge: Boolean((window as any).appilix?.postMessage),
    has_appilix_fcm_token: Boolean((window as any).appilix_fcm_token),
    has_appilix_push_identity: Boolean((window as any).appilix_push_notification_user_identity),
    viewport: typeof window !== 'undefined'
      ? { w: window.innerWidth, h: window.innerHeight }
      : null,
    ts: new Date().toISOString(),
  };
}

function send(event: BeaconEvent, extra?: Record<string, unknown>): void {
  try {
    const url = `${resolveGatewayBase()}/api/v1/diag/notif-tap`;
    const body = JSON.stringify({ event, ...snapshot(), ...(extra || {}) });

    // Prefer sendBeacon — it survives page unload, which matters because the
    // Appilix WebView may be tearing the page down while we're still trying
    // to report what went wrong.
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      const ok = navigator.sendBeacon(url, blob);
      if (ok) return;
    }

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
      mode: 'cors',
      credentials: 'omit',
    }).catch(() => { /* fire-and-forget */ });
  } catch {
    /* never throw from a diagnostic path */
  }
}

let installed = false;

/**
 * Call once at app boot — before React mounts. Safe to call multiple times.
 *
 * Fires:
 *   - `boot` once
 *   - `deep_link_detected` if the URL carries `?recipient=` or `?thread=`
 *   - `window_error` for any uncaught error
 *   - `unhandled_rejection` for any unhandled promise rejection
 */
export function bootstrapNotifDiag(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  // Always fire a boot beacon so we can correlate any tap with a server log.
  send('boot');

  const params = new URLSearchParams(window.location.search || '');
  if (params.has('recipient') || params.has('thread')) {
    send('deep_link_detected');
  }

  window.addEventListener('error', (ev) => {
    send('window_error', {
      message: String(ev.message || '').slice(0, 500),
      filename: String(ev.filename || '').slice(0, 300),
      lineno: ev.lineno,
      colno: ev.colno,
      error_name: ev.error?.name,
      error_message: String(ev.error?.message || '').slice(0, 500),
    });
  });

  window.addEventListener('unhandledrejection', (ev) => {
    const reason: any = ev.reason;
    send('unhandled_rejection', {
      reason_name: reason?.name,
      reason_message: String(reason?.message || reason || '').slice(0, 500),
    });
  });
}
