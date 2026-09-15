/**
 * Storage bridge client (Aurora migration B6, VTID-03815 continuation) —
 * the facade `supabase/functions/_shared/storage-bridge-client.ts` uses to
 * reach the gateway's new `/api/v1/storage-bridge/*` routes instead of
 * calling Supabase Storage directly. Same test-location rationale as
 * `bedrock-bridge-client.test.ts`: this module lives under
 * `supabase/functions/_shared` (no Deno test harness in this repo) and only
 * uses `Deno.env.get`/global `fetch`/`btoa`, all trivially stubbable under
 * Vitest.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  storageBridgeProvider,
  bytesToBase64,
  uploadFile,
  removeFiles,
  getPublicUrl,
  listFiles,
  getSignedUrl,
} from '../../supabase/functions/_shared/storage-bridge-client.ts';

function stubDenoEnv(vars: Record<string, string | undefined>) {
  (globalThis as any).Deno = {
    env: {
      get: (key: string) => vars[key],
    },
  };
}

describe('storage-bridge-client', () => {
  const realFetch = global.fetch;

  afterEach(() => {
    global.fetch = realFetch;
    delete (globalThis as any).Deno;
  });

  describe('storageBridgeProvider', () => {
    it('defaults to supabase — importing/loading this module flips nothing', () => {
      stubDenoEnv({});
      expect(storageBridgeProvider()).toBe('supabase');
    });

    it('selects bridge only on the exact opt-in value, case-insensitively', () => {
      stubDenoEnv({ STORAGE_BRIDGE_PROVIDER: 'BRIDGE' });
      expect(storageBridgeProvider()).toBe('bridge');
    });

    it('falls back to supabase on an unrecognised value rather than failing closed', () => {
      stubDenoEnv({ STORAGE_BRIDGE_PROVIDER: 's3-direct' });
      expect(storageBridgeProvider()).toBe('supabase');
    });
  });

  describe('bytesToBase64', () => {
    it('round-trips through atob to the original bytes', () => {
      const original = new Uint8Array([0, 1, 2, 253, 254, 255, 72, 101, 108, 108, 111]);
      const b64 = bytesToBase64(original);
      const decoded = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      expect(decoded).toEqual(original);
    });

    it('handles an input larger than one chunk (0x8000 bytes) without corruption', () => {
      const big = new Uint8Array(0x8000 + 137);
      for (let i = 0; i < big.length; i++) big[i] = i % 256;
      const b64 = bytesToBase64(big);
      const decoded = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      expect(decoded).toEqual(big);
    });
  });

  describe('uploadFile', () => {
    it('throws when GATEWAY_SERVICE_TOKEN is not configured, without calling fetch', async () => {
      stubDenoEnv({});
      const fetchSpy = vi.fn();
      global.fetch = fetchSpy as any;

      await expect(uploadFile('covers', 'x.jpg', new Uint8Array([1, 2, 3]))).rejects.toThrow(
        /GATEWAY_SERVICE_TOKEN/,
      );
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('posts base64 content to /upload with a Bearer service token', async () => {
      stubDenoEnv({ GATEWAY_SERVICE_TOKEN: 'shhh' });
      const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
      global.fetch = fetchSpy as any;

      await uploadFile('covers', 'x.jpg', new Uint8Array([104, 105]), { contentType: 'image/jpeg' });

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://gateway.vitanaland.com/api/v1/storage-bridge/upload',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer shhh' }),
        }),
      );
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body).toEqual({
        bucket: 'covers',
        path: 'x.jpg',
        contentBase64: bytesToBase64(new Uint8Array([104, 105])),
        contentType: 'image/jpeg',
        upsert: undefined,
        cacheControl: undefined,
      });
    });

    it('respects GATEWAY_URL override', async () => {
      stubDenoEnv({ GATEWAY_SERVICE_TOKEN: 'shhh', GATEWAY_URL: 'https://staging.example/api/v1' });
      const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
      global.fetch = fetchSpy as any;

      await uploadFile('covers', 'x.jpg', new Uint8Array([1]));
      expect(fetchSpy.mock.calls[0][0]).toBe('https://staging.example/api/v1/storage-bridge/upload');
    });

    it('throws with status+body on a non-OK response', async () => {
      stubDenoEnv({ GATEWAY_SERVICE_TOKEN: 'shhh' });
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 502, text: async () => 'upload_failed' }) as any;

      await expect(uploadFile('covers', 'x.jpg', new Uint8Array([1]))).rejects.toThrow(/502/);
    });
  });

  describe('removeFiles', () => {
    it('posts bucket+paths to /remove and returns the parsed response', async () => {
      stubDenoEnv({ GATEWAY_SERVICE_TOKEN: 'shhh' });
      const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, removed: 2 }) });
      global.fetch = fetchSpy as any;

      const result = await removeFiles('avatars', ['u1/a.png', 'u1/b.png']);
      expect(result).toEqual({ ok: true, removed: 2 });
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body).toEqual({ bucket: 'avatars', paths: ['u1/a.png', 'u1/b.png'] });
    });
  });

  describe('getPublicUrl', () => {
    it('GETs /public-url with query params and returns just the url', async () => {
      stubDenoEnv({ GATEWAY_SERVICE_TOKEN: 'shhh' });
      const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, url: 'https://x/y.jpg' }) });
      global.fetch = fetchSpy as any;

      const url = await getPublicUrl('covers', 'a b.jpg');
      expect(url).toBe('https://x/y.jpg');
      expect(fetchSpy.mock.calls[0][0]).toBe(
        'https://gateway.vitanaland.com/api/v1/storage-bridge/public-url?bucket=covers&path=a%20b.jpg',
      );
      expect(fetchSpy.mock.calls[0][1].method).toBe('GET');
    });
  });

  describe('listFiles', () => {
    it('posts bucket+prefix to /list and returns the files array', async () => {
      stubDenoEnv({ GATEWAY_SERVICE_TOKEN: 'shhh' });
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, files: [{ name: 'a.png' }] }),
      }) as any;

      const files = await listFiles('avatars', 'u1', { limit: 500 });
      expect(files).toEqual([{ name: 'a.png' }]);
    });
  });

  describe('getSignedUrl', () => {
    it('posts bucket+path+expiresInSeconds to /signed-url and returns just the url', async () => {
      stubDenoEnv({ GATEWAY_SERVICE_TOKEN: 'shhh' });
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, url: 'https://signed/x.pdf', expiresInSeconds: 900 }),
      });
      global.fetch = fetchSpy as any;

      const url = await getSignedUrl('voucher-pdfs', 'x.pdf', 900);
      expect(url).toBe('https://signed/x.pdf');
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body).toEqual({ bucket: 'voucher-pdfs', path: 'x.pdf', expiresInSeconds: 900 });
    });

    it('defaults expiresInSeconds to 3600 when omitted', async () => {
      stubDenoEnv({ GATEWAY_SERVICE_TOKEN: 'shhh' });
      const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, url: 'https://signed/x' }) });
      global.fetch = fetchSpy as any;

      await getSignedUrl('voucher-pdfs', 'x.pdf');
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.expiresInSeconds).toBe(3600);
    });
  });
});
