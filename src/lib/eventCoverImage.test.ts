/**
 * The storage image CDN crops when given only a width under its default
 * resize=cover (4032x2268 -> 1200x2268): every News feed photo rendered zoomed
 * in after VTID-05013. The transformed URL must ask for an aspect-preserving
 * downscale.
 */
import { describe, it, expect } from 'vitest';
import { transformedCoverUrl } from './eventCoverImage';

const OBJ = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co/storage/v1/object/public/media-uploads/u1/posts/1.jpeg';

describe('transformedCoverUrl', () => {
  it('requests an aspect-preserving resize (never the cropping default)', () => {
    const url = new URL(transformedCoverUrl(OBJ)!);
    expect(url.pathname).toBe('/storage/v1/render/image/public/media-uploads/u1/posts/1.jpeg');
    expect(url.searchParams.get('resize')).toBe('contain');
    expect(url.searchParams.get('width')).toBe('1200');
    expect(url.searchParams.has('height')).toBe(false);
  });

  it('keeps an existing query string (cache-buster) and still asks for contain', () => {
    const url = new URL(transformedCoverUrl(`${OBJ}?_cb=123`)!);
    expect(url.searchParams.get('_cb')).toBe('123');
    expect(url.searchParams.get('resize')).toBe('contain');
  });

  it('leaves non-Supabase URLs alone', () => {
    expect(transformedCoverUrl('https://images.unsplash.com/photo-1?w=800')).toBeUndefined();
  });
});
