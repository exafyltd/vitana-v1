/**
 * VTID-04516: fire-and-forget POST for anonymous telemetry beacons.
 *
 * `navigator.sendBeacon` always sends with credentials ("include"), and a
 * JSON body makes the browser preflight the request. The gateway runs with
 * `credentials: false` on purpose (VTID-02036), so every such preflight
 * failed with "Access-Control-Allow-Credentials ... must be 'true'" and the
 * beacon was dropped — while sendBeacon still returned true, so nothing
 * fell back.
 *
 * A keepalive fetch with credentials omitted is queued the same way
 * sendBeacon is (it survives page unload) and needs no credentialed CORS.
 * Returns true once the request is queued; never throws.
 */
export function sendAnonymousBeacon(url: string, body: string): boolean {
  try {
    if (typeof fetch !== 'function') return false;
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
      mode: 'cors',
      credentials: 'omit',
    }).catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}
