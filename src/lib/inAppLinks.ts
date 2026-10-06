/**
 * VTID-04902 — links into our own app that a chat message should open IN the
 * app instead of in a browser layer.
 *
 * Event share links (`getShareUrl('event', …)` → `https://vitanaland.com/events/<slug|id>`)
 * used to open with `target="_blank"`: a browser layer over the chat, through
 * the OG redirect, ending on the public event landing page. A member tapping
 * one should land on the Events screen with that event open.
 */

const EVENT_HOSTS = new Set(['vitanaland.com', 'www.vitanaland.com', 'e.vitanaland.com']);

function isOwnHost(host: string): boolean {
  if (EVENT_HOSTS.has(host)) return true;
  if (typeof window !== 'undefined' && window.location?.host === host) return true;
  return false;
}

/**
 * The in-app path for an event link, or null when the URL is not a link to
 * one of our events. Accepted shapes (on vitanaland.com, www., e. or the
 * current host):
 *   /events/:x   /e/:x   /pub/events/:x   /comm/events-meetups?event=:x
 * `:x` is an event id or slug; the Events screen resolves either.
 */
export function resolveInAppEventPath(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (!isOwnHost(url.host.toLowerCase())) return null;

  let ref: string | null = null;
  const path = url.pathname.replace(/\/+$/, '');
  const m = path.match(/^\/(?:events|e|pub\/events)\/([^/]+)$/);
  if (m) {
    ref = m[1];
  } else if (path === '/comm/events-meetups') {
    ref = url.searchParams.get('event');
  }
  if (!ref) return null;

  let decoded: string;
  try {
    decoded = decodeURIComponent(ref);
  } catch {
    return null;
  }
  if (!decoded.trim()) return null;
  return `/comm/events-meetups?event=${encodeURIComponent(decoded)}`;
}
