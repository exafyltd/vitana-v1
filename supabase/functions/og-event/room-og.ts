// Open Graph preview for a Live Room (VTID-04922). Pure — no Deno or Supabase imports —
// so it can be unit-tested from src/ (see src/lib/room-og.vtid-04922.test.ts).
//
// A Live Room is shared as https://vitanaland.com/events/<roomId>; the Cloudflare worker
// `vitanaland-og-proxy` hands crawlers to og-event, which falls back to this when the id is
// not a global_community_events row but is a community_live_streams row.

export const OG_DEFAULT_IMAGE =
  'https://inmkhvwdcuyhnxkgfvsb.supabase.co/storage/v1/object/public/covers/vitana-og-default.jpg';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): boolean {
  return !!value && UUID_RE.test(value);
}

/** Same rule as the community_live_streams public read policy (migration 20251022080341). */
export function isPublicRoomStatus(status: string | null | undefined, enableReplay: boolean | null | undefined): boolean {
  return status === 'pending' || status === 'live' || (status === 'ended' && enableReplay === true);
}

export interface RoomOgInput {
  id: string;
  title: string | null;
  description: string | null;
  cover_image_url: string | null;
  host_avatar_url: string | null;
}

export function sanitizeOgText(text: string | null | undefined, max = 160): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/“|”/g, '"')
    .replace(/‘|’/g, "'")
    .replace(/`/g, "'")
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim()
    .substring(0, max);
}

/**
 * WhatsApp drops og:image files over ~600 KB and handles WebP badly, and host photos / covers are
 * often multi-MB phone pictures. Supabase public-storage objects therefore go through the image
 * transformation endpoint at 1200x630, quality 80, in their original format.
 */
export function roomImageUrl(url: string | null | undefined): string | null {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  const clean = url.split('?')[0];
  const m = clean.match(/^(https:\/\/[a-z0-9-]+\.supabase\.co)\/storage\/v1\/(?:object|render\/image)\/public\/(.+)$/i);
  if (!m) return clean; // an external https image: use as is
  return `${m[1]}/storage/v1/render/image/public/${m[2]}?width=1200&height=630&resize=cover&quality=80&format=origin`;
}

/** cover image, else the host's avatar, else the branded default. */
export function pickRoomImage(cover: string | null | undefined, avatar: string | null | undefined): string {
  return roomImageUrl(cover) || roomImageUrl(avatar) || OG_DEFAULT_IMAGE;
}

function mimeFor(url: string): string {
  const u = url.toLowerCase();
  if (u.includes('.png')) return 'image/png';
  if (u.includes('.gif')) return 'image/gif';
  if (u.includes('.webp')) return 'image/webp';
  return 'image/jpeg';
}

export function roomUrls(id: string): { canonicalUrl: string; destinationUrl: string } {
  return {
    canonicalUrl: `https://vitanaland.com/events/${id}`,
    destinationUrl: `https://vitanaland.com/?share=room&id=${encodeURIComponent(id)}`,
  };
}

export function buildRoomOgHtml(room: RoomOgInput): string {
  const { canonicalUrl, destinationUrl } = roomUrls(room.id);
  const title = sanitizeOgText(room.title) || 'MAXINA Live Room';
  const description = sanitizeOgText(room.description) || 'Join this live room on MAXINA';
  const image = pickRoomImage(room.cover_image_url, room.host_avatar_url);
  const imageType = mimeFor(image);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | MAXINA</title>
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="MAXINA" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:image:url" content="${image}" />
  <meta property="og:image:secure_url" content="${image}" />
  <meta property="og:image:type" content="${imageType}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${image}" />
  <link rel="canonical" href="${canonicalUrl}" />
</head>
<body><p>${title}</p><a href="${destinationUrl}">Open live room</a></body>
</html>`;
}
