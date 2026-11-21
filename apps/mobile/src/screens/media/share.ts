/**
 * VTID-05677 — share payloads, the native twin of the web handlers in
 * `MobileShortsFeed.tsx:125-146` (`navigator.share`) and `MobileMusicList.tsx:57-73`.
 * The URL is `config.webBaseUrl` + the web path shape (`src/lib/shareUrl.ts:39-41`
 * for a short, `/comm/media-hub?tab=music&track=<id>` for a track); with
 * `webBaseUrl` unset (every non-production profile) the URL is omitted, like
 * `src/identity/web-console.ts`. No production host literal lives in the app.
 */
import { Share } from 'react-native';
import { config } from '../../ports/env';

function absolute(path: string): string | null {
  const base = config.webBaseUrl;
  if (!base) return null;
  return `${base.replace(/\/+$/, '')}${path}`;
}

export const shortShareUrl = (id: string): string | null => absolute(`/shorts/${encodeURIComponent(id)}`);
export const trackShareUrl = (id: string): string | null => absolute(`/comm/media-hub?tab=music&track=${encodeURIComponent(id)}`);

export interface SharePayload {
  title: string;
  message: string;
  url?: string;
}

/** The text plus, when a URL exists, the URL (iOS `url`, Android appended to the message). */
export function buildSharePayload(title: string, text: string, url: string | null): SharePayload {
  return url ? { title, message: `${text}\n${url}`, url } : { title, message: text };
}

/** Opens the native share sheet; a dismissed sheet is not an error. Resolves false when sharing failed. */
export async function shareContent(payload: SharePayload): Promise<boolean> {
  try {
    await Share.share(payload.url ? { title: payload.title, message: payload.message, url: payload.url } : { title: payload.title, message: payload.message });
    return true;
  } catch {
    return false;
  }
}
