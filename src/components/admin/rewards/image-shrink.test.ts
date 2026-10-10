/**
 * VTID-05036 — the item photo is shrunk in the browser so the decoded image is
 * ≤ 1,468,006 bytes (the gateway's cap, VTID-05035): longest side 1600 px,
 * WebP (JPEG where WebP cannot be encoded), quality from 0.85 down.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  MAX_ITEM_IMAGE_BYTES,
  blobToBase64,
  fitWithin,
  prepareItemImage,
  shrinkImage,
  shrinkToLimit,
  type ShrinkDeps,
} from './image-shrink';

/** A fake canvas whose encoded size grows with pixels and quality, like a real photo. */
function fakeDeps(opts: { width: number; height: number; webp: boolean; bytesPerPixel: number }) {
  const canvases: Array<{ width: number; height: number }> = [];
  const calls: Array<{ type: string; quality: number; width: number; height: number }> = [];
  const deps: ShrinkDeps = {
    decode: async () => ({ width: opts.width, height: opts.height, source: {} as CanvasImageSource }),
    createCanvas: (width, height) => {
      canvases.push({ width, height });
      const canvas = {
        width,
        height,
        getContext: () => ({ fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn() }),
        toBlob: (cb: (b: Blob | null) => void, type: string, quality: number) => {
          calls.push({ type, quality, width, height });
          const outType = type === 'image/webp' && !opts.webp ? 'image/png' : type;
          const size = Math.round(width * height * opts.bytesPerPixel * quality);
          cb(new Blob([new Uint8Array(size)], { type: outType }));
        },
      };
      return canvas as unknown as HTMLCanvasElement;
    },
  };
  return { deps, canvases, calls };
}

describe('image shrink (VTID-05036)', () => {
  it('fits the longest side into 1600 px and never upscales', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(1200, 4800)).toEqual({ width: 400, height: 1600 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('the size loop lowers quality until the result fits', async () => {
    const seen: number[] = [];
    const blob = await shrinkToLimit(async (q) => {
      seen.push(q);
      return new Blob([new Uint8Array(q > 0.6 ? 2_000_000 : 1_000_000)], { type: 'image/webp' });
    });
    expect(blob.size).toBeLessThanOrEqual(MAX_ITEM_IMAGE_BYTES);
    expect(seen[0]).toBe(0.85);
    expect(seen.length).toBeGreaterThan(1);
  });

  it('gives up with IMAGE_TOO_LARGE instead of looping forever', async () => {
    await expect(shrinkToLimit(async () => new Blob([new Uint8Array(2_000_000)]))).rejects.toThrow('IMAGE_TOO_LARGE');
  });

  it('a large photo comes back as WebP ≤ 1.4 MB at 1600 px', async () => {
    // 1600×1200 at 0.85 would be ~2.4 MB; the loop has to step quality down.
    const { deps, canvases, calls } = fakeDeps({ width: 4000, height: 3000, webp: true, bytesPerPixel: 1.5 });
    const { blob, type } = await shrinkImage(new Blob(['x']), deps);
    expect(type).toBe('image/webp');
    expect(blob.size).toBeLessThanOrEqual(MAX_ITEM_IMAGE_BYTES);
    expect(canvases[0]).toEqual({ width: 1600, height: 1200 });
    expect(calls[0]).toMatchObject({ type: 'image/webp', quality: 0.85 });
    expect(calls.every((c) => c.type === 'image/webp')).toBe(true);
  });

  it('falls back to JPEG when the browser cannot encode WebP', async () => {
    const { deps, calls } = fakeDeps({ width: 2000, height: 1000, webp: false, bytesPerPixel: 0.5 });
    const { blob, type } = await shrinkImage(new Blob(['x']), deps);
    expect(type).toBe('image/jpeg');
    expect(blob.type).toBe('image/jpeg');
    expect(blob.size).toBeLessThanOrEqual(MAX_ITEM_IMAGE_BYTES);
    // One WebP probe, then JPEG only.
    expect(calls.filter((c) => c.type === 'image/webp')).toHaveLength(1);
  });

  it('an unreadable file is IMAGE_PROCESSING_FAILED', async () => {
    const deps: ShrinkDeps = { decode: async () => { throw new Error('bad'); }, createCanvas: () => { throw new Error('unused'); } };
    await expect(shrinkImage(new Blob(['x']), deps)).rejects.toThrow('IMAGE_PROCESSING_FAILED');
  });

  it('prepares the upload body: plain base64 (no data: prefix) plus the encoded type', async () => {
    const { deps } = fakeDeps({ width: 100, height: 100, webp: true, bytesPerPixel: 0.01 });
    const body = await prepareItemImage(new Blob(['x']), deps);
    expect(body.content_type).toBe('image/webp');
    expect(body.data_base64).not.toMatch(/^data:/);
    expect(body.data_base64).toMatch(/^[A-Za-z0-9+/]*={0,2}$/);
    expect(await blobToBase64(new Blob(['hi']))).toBe('aGk=');
  });
});
