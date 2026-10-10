/**
 * VTID-05023: after the Aurora cutover VITE_SUPABASE_URL points at the
 * PostgREST-Aurora proxy (data.vitanaland.com), which passes /storage through
 * to Supabase. New uploads then get proxy-host URLs; they must keep the
 * cache-buster and the resized-thumbnail rewrite, exactly like the
 * *.supabase.co URLs stored before the switch.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const PROXY = 'https://data.vitanaland.com';
const OLD = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co/storage/v1/object/public/media-uploads/u1/a.jpeg';
const NEW = `${PROXY}/storage/v1/object/public/media-uploads/u1/b.jpeg`;

async function load(url: string) {
  vi.resetModules();
  vi.stubEnv('VITE_SUPABASE_URL', url);
  return import('./eventCoverImage');
}

afterEach(() => vi.unstubAllEnvs());

describe('storage URLs on the configured Supabase host', () => {
  it('rewrites proxy-host storage objects to the image CDN', async () => {
    const { transformedCoverUrl } = await load(PROXY);
    const u = new URL(transformedCoverUrl(NEW)!);
    expect(u.host).toBe('data.vitanaland.com');
    expect(u.pathname).toBe('/storage/v1/render/image/public/media-uploads/u1/b.jpeg');
    expect(u.searchParams.get('resize')).toBe('contain');
  });

  it('still rewrites pre-cutover *.supabase.co objects', async () => {
    const { transformedCoverUrl } = await load(PROXY);
    expect(new URL(transformedCoverUrl(OLD)!).pathname).toBe('/storage/v1/render/image/public/media-uploads/u1/a.jpeg');
  });

  it('cache-busts proxy-host storage URLs with the row version', async () => {
    const { sanitizeCoverUrl } = await load(PROXY);
    expect(sanitizeCoverUrl(NEW, '2026-10-10T00:00:00Z')).toBe(`${NEW}?_cb=${Date.parse('2026-10-10T00:00:00Z')}`);
  });

  it('leaves unrelated hosts alone', async () => {
    const { transformedCoverUrl, sanitizeCoverUrl } = await load(PROXY);
    const other = 'https://images.unsplash.com/storage/v1/object/public/x.jpg';
    expect(transformedCoverUrl(other)).toBeUndefined();
    expect(sanitizeCoverUrl(other)).toBe(other);
  });

  it('survives a malformed env value', async () => {
    const { transformedCoverUrl } = await load('not a url');
    expect(transformedCoverUrl(NEW)).toBeUndefined();
    expect(transformedCoverUrl(OLD)).toBeDefined();
  });
});
