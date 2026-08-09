/**
 * Event cover image resolution — shared by the Events & MeetUps grid and the
 * mobile carousel (both previously kept private copies of this logic).
 *
 * Users upload covers as multi-megabyte phone photos; serving those originals
 * straight into card <img>s is why the Events screen showed gray boxes for
 * seconds. `resolveEventCover` routes Supabase-storage covers through the
 * storage image CDN (`/render/image/`), which resizes + re-encodes (WebP for
 * browsers that accept it) and edge-caches the result — measured ~150 KB vs a
 * ~2 MB original. The untransformed URL is returned as `fallbackSrc` so the
 * card can swap back if the transform endpoint ever rejects a file (animated
 * GIF, plan change, etc.).
 */

const OBJECT_PATH = '/storage/v1/object/public/';
const RENDER_PATH = '/storage/v1/render/image/public/';

/** Largest width a card renders at (mobile full-bleed @3x ≈ 1170px). */
export const CARD_COVER_WIDTH = 1200;

export interface EventCoverSource {
  /** URL to render in the card (CDN-transformed when possible). */
  src: string;
  /** Untransformed URL to fall back to if `src` fails to load. */
  fallbackSrc?: string;
  /** Original (sanitized or generated) URL — use for sharing/OG, never a resized variant. */
  originalSrc: string;
}

/**
 * Sanitize and validate an image URL. `version` (typically the event row's
 * `updated_at`) keys the cache-buster so a replaced image shows up on the
 * next data refresh; without it we fall back to a daily stamp. The old
 * always-daily stamp forced every user to re-download every cover cold once
 * per day even though covers virtually never change.
 */
export const sanitizeCoverUrl = (url?: string, version?: string): string | undefined => {
  if (!url) return undefined;
  const s = String(url).trim();
  if (!s) return undefined;
  const lower = s.toLowerCase();

  // Reject unsafe schemes and known bad placeholders
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('about:') ||
    lower.includes('undefined') ||
    s.startsWith('/api/placeholder')
  ) {
    return undefined;
  }

  const isHttp = /^https?:\/\//i.test(s);
  const isAsset = s.startsWith('/assets/');
  const isSupabaseStorage = lower.includes('.supabase.co/storage/');
  const isDataImage = lower.startsWith('data:image/');
  const isBlob = lower.startsWith('blob:');

  if (isHttp || isAsset || isSupabaseStorage || isDataImage || isBlob) {
    // Cache-bust Supabase storage URLs to pick up replaced images
    if (isSupabaseStorage && !s.includes('_cb=')) {
      const stamp = version ? Date.parse(version) : NaN;
      const cb = Number.isFinite(stamp) ? String(stamp) : new Date().toISOString().slice(0, 10);
      return s + (s.includes('?') ? '&' : '?') + '_cb=' + cb;
    }
    return s;
  }

  return undefined;
};

/** Deterministic stock fallback when an event has no usable cover. */
export const generateCoverUrl = (title: string, description?: string): string => {
  const images = [
    'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&h=600&fit=crop',
  ];
  const hash = (title + (description || '')).split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
  return images[Math.abs(hash) % images.length];
};

/**
 * Rewrite a Supabase public-object URL to the image-transform CDN endpoint.
 * Returns undefined for anything that isn't a plain Supabase storage object
 * (external images, data/blob URLs, already-transformed URLs).
 */
export const transformedCoverUrl = (url: string, width = CARD_COVER_WIDTH): string | undefined => {
  if (!url.toLowerCase().includes('.supabase.co' + OBJECT_PATH)) return undefined;
  const rewritten = url.replace(OBJECT_PATH, RENDER_PATH);
  return rewritten + (rewritten.includes('?') ? '&' : '?') + `width=${width}&quality=75`;
};

/** Resolve the cover image for an event row (or anything shaped like one). */
export const resolveEventCover = (event: {
  title: string;
  description?: string | null;
  image_url?: string;
  imageUrl?: string;
  updated_at?: string;
  metadata?: { image_url?: string; cover_image_url?: string } | null;
}): EventCoverSource => {
  const raw = event.image_url || event.imageUrl || event.metadata?.image_url || event.metadata?.cover_image_url;
  const safe = sanitizeCoverUrl(raw, event.updated_at);
  if (!safe) {
    const generated = generateCoverUrl(event.title, event.description || undefined);
    return { src: generated, originalSrc: generated };
  }
  const transformed = transformedCoverUrl(safe);
  return transformed
    ? { src: transformed, fallbackSrc: safe, originalSrc: safe }
    : { src: safe, originalSrc: safe };
};
