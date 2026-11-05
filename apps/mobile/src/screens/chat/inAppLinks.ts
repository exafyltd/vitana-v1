/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — event links
 * in a chat message open the Events screen in the app (VTID-04902), native twin
 * of web `src/lib/inAppLinks.ts` (class C there: it also accepts
 * `window.location.host`). The app has no page host, so the own hosts are the
 * web's fixed set plus the configured web base URL's host. Accepted shapes:
 * `/events/:x`, `/e/:x`, `/pub/events/:x`, `/comm/events-meetups?event=:x`
 * → `/comm/events-meetups?event=<x>`; the caller hands that web path to
 * `navigateToWebPath`, which opens the native Events route or, while that
 * screen is not native yet, the unported-route fallback.
 */
import { config } from '../../config/env';

const EVENT_HOSTS = new Set(['vitanaland.com', 'www.vitanaland.com', 'e.vitanaland.com']);

function configuredHost(): string | null {
  try {
    return config.webBaseUrl ? new URL(config.webBaseUrl).host.toLowerCase() : null;
  } catch {
    return null;
  }
}

export function resolveInAppEventPath(rawUrl: string, extraHost: string | null = configuredHost()): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.host.toLowerCase();
  if (!EVENT_HOSTS.has(host) && host !== extraHost) return null;
  let ref: string | null = null;
  const path = url.pathname.replace(/\/+$/, '');
  const m = path.match(/^\/(?:events|e|pub\/events)\/([^/]+)$/);
  if (m) ref = m[1];
  else if (path === '/comm/events-meetups') ref = url.searchParams.get('event');
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
